import {createHmac, randomBytes, randomInt, timingSafeEqual, scrypt} from 'node:crypto';
import {promisify} from 'node:util';
import nodemailer from 'nodemailer';

const derive = promisify(scrypt);
const sentMessage = {message:'If the email is registered, a reset link will arrive shortly.'};
const invalidLink = {error:'This link has expired or was already used. Request a new link.'};
const invalidCode = {error:'This code is incorrect or expired. Check your email or request a new code.'};
const smtp = process.env.SMTP_HOST && nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_PORT === '465',
  requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false' && process.env.SMTP_PORT !== '465',
  auth: process.env.SMTP_USER ? {user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD} : undefined,
  connectionTimeout: 2000, greetingTimeout: 2000, socketTimeout: 3000,
});
function digest(purpose, value) {
  const key = process.env.CODE_SECRET;
  if (!key || Buffer.byteLength(key)<32) throw Error('Mail code secret unavailable');
  return createHmac('sha256',key).update(purpose+'|'+value).digest('hex');
}
async function sendChallenge(db, account, purpose) {
  const previous = (await db.query(`SELECT sent_count, digest, sent_since > now() - interval '1 hour' AS recent
    FROM identity.challenges WHERE account_id=$1 AND purpose=$2`,[account.id,purpose])).rows[0];
  if (previous?.recent && previous.sent_count>=8) return false;
  let code, hashed;
  do {
    code=purpose==='verify' ? randomInt(0,1000000).toString().padStart(6,'0') : randomBytes(32).toString('hex');
    hashed=digest(purpose,purpose==='verify' ? account.id+'|'+code : code);
  } while (hashed===previous?.digest);
  const result=await db.query(`INSERT INTO identity.challenges(account_id,purpose,digest,expires_at)
    VALUES($1,$2,$3,now()+interval '15 minutes') ON CONFLICT(account_id,purpose) DO UPDATE SET
    digest=excluded.digest, expires_at=excluded.expires_at, remaining_attempts=5,
    sent_since=CASE WHEN $4 THEN identity.challenges.sent_since ELSE now() END,
    sent_count=CASE WHEN $4 THEN identity.challenges.sent_count+1 ELSE 1 END RETURNING expires_at`,
    [account.id,purpose,hashed,Boolean(previous?.recent)]);
  let text;
  if (purpose==='reset') {
    const url = new URL(process.env.RESET_URL);
    if (!['https:','khanakrlo:','exp:'].includes(url.protocol) && !(url.protocol==='http:' && process.env.ALLOW_DEV_RESET_HTTP==='true'))
      throw Error('Secure reset URL required');
    url.searchParams.set('resetToken', code);
    text='Open this link to choose a new Khana Krlo password. It is valid for 15 minutes.\n\n'+url;
  } else text='Your Khana Krlo email verification code is '+code+'. It is valid for 15 minutes.';
  if (!smtp) throw Error('Mail is unavailable');
  await smtp.sendMail({from:process.env.MAIL_FROM || 'Khana Krlo <accounts@khana.test>',to:account.email,
    subject:purpose==='verify'?'Verify your Khana Krlo email':'Reset your Khana Krlo password',text});
  return result.rows[0].expires_at;
}
export async function security(path,input,tokenHash,pool) {
  const db=await pool.connect();
  try {
    await db.query('BEGIN');
    const result=await handle(db,path,input,tokenHash);
    await db.query('COMMIT');
    return result;
  } catch (e) {
    await db.query('ROLLBACK');
    throw e;
  } finally {db.release();}
}
async function handle(db,path,input,tokenHash) {
  if (path==='/reset/request') {
    const email=typeof input.email==='string' ? input.email.trim().toLowerCase() : '';
    if (email.length<=254) {
      const user=(await db.query('SELECT id,email FROM identity.accounts WHERE email=$1 FOR UPDATE',[email])).rows[0];
      if (user) await sendChallenge(db,user,'reset');
    }
    return [200,sentMessage];
  }
  if (path==='/reset/confirm') {
    const {token,password}=input;
    if (typeof token!=='string' || !/^[a-f0-9]{64}$/.test(token)) return [400,invalidLink];
    if (typeof password!=='string' || password.length<8 || Buffer.byteLength(password)>256)
      return [400,{error:'Use a password of at least 8 characters (maximum 256 bytes).'}];
    const lookup=digest('reset',token);
    const user=(await db.query(`SELECT a.id FROM identity.accounts a JOIN identity.challenges c ON c.account_id=a.id
      WHERE c.purpose='reset' AND c.digest=$1 AND c.expires_at>clock_timestamp() FOR UPDATE OF a`,[lookup])).rows[0];
    if (!user) return [400,invalidLink];
    const consumed=await db.query(`UPDATE identity.challenges SET digest=NULL WHERE account_id=$1 AND purpose='reset'
      AND digest=$2 AND expires_at>clock_timestamp()`,[user.id,lookup]);
    if (!consumed.rowCount) return [400,invalidLink];
    const salt=randomBytes(16).toString('hex');
    const pw=(await derive(password,salt,64)).toString('hex');
    await db.query('UPDATE identity.accounts SET salt=$1,digest=$2 WHERE id=$3',[salt,pw,user.id]);
    await db.query('DELETE FROM identity.sessions WHERE account_id=$1',[user.id]);
    return [200,{message:'Password updated. Sign in with your new password.'}];
  }
  if (!tokenHash) return [401,{error:'Sign in to continue.'}];
  const user=(await db.query(`SELECT a.id,a.email,a.salt,a.digest,a.email_verified FROM identity.accounts a
    JOIN identity.sessions s ON s.account_id=a.id WHERE s.token_hash=$1 FOR UPDATE OF a`,[tokenHash])).rows[0];
  if (!user) return [401,{error:'Sign in to continue.'}];
  if (path==='/close') {
    if (typeof input.password!=='string' || Buffer.byteLength(input.password)>256 ||
        !timingSafeEqual(await derive(input.password,user.salt,64),Buffer.from(user.digest,'hex')))
      return [403,{error:'Enter your current password to confirm closure.'}];
    if (!process.env.ACCOUNT_ERASURE_KEY) throw Error('Closure unavailable');
    const response=await fetch(new URL('/internal/accounts/'+user.id+'/erase',process.env.ORDERS_ORIGIN),{
      method:'POST',headers:{authorization:'Bearer '+process.env.ACCOUNT_ERASURE_KEY},signal:AbortSignal.timeout(3500)});
    if (response.status===409) return [409,{error:'Complete your open order before closing your account.'}];
    if (!response.ok) throw Error('Closure unavailable');
    await db.query('DELETE FROM identity.accounts WHERE id=$1',[user.id]);
    return [200,{closed:true}];
  }
  if (path==='/verify/request') {
    if (user.email_verified) return [200,{emailVerified:true}];
    const expiresAt=await sendChallenge(db,user,'verify');
    return expiresAt ? [200,{expiresAt}] : [429,{error:'Too many code requests. Try again in an hour.'}];
  }
  if (path==='/verify/confirm') {
    if (user.email_verified) return [409,{error:'This account is already verified.'}];
    if (typeof input.code!=='string'||!/^\d{6}$/.test(input.code)) return [400,invalidCode];
    const challenge=(await db.query(`UPDATE identity.challenges SET remaining_attempts=remaining_attempts-1
      WHERE account_id=$1 AND purpose='verify' AND expires_at>clock_timestamp() AND remaining_attempts>0 RETURNING digest`,
      [user.id])).rows[0];
    const expected=digest('verify',user.id+'|'+input.code);
    if (!challenge?.digest || !timingSafeEqual(Buffer.from(challenge.digest,'hex'),Buffer.from(expected,'hex')))
      return [400,invalidCode];
    await db.query('UPDATE identity.accounts SET email_verified=true WHERE id=$1',[user.id]);
    await db.query("UPDATE identity.challenges SET digest=NULL WHERE account_id=$1 AND purpose='verify'",[user.id]);
    return [200,{id:user.id,email:user.email,emailVerified:true}];
  }
  return [404,{error:'Unknown account action.'}];
}
