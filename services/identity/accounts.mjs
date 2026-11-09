import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { security } from './security.mjs';
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const dummySalt = randomBytes(16).toString('hex');
const dummyDigest = Buffer.alloc(64);

export async function accounts(req, res, pool) {
  function reply(status, body) {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));
  }
  const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (req.url === '/session') {
    if (!token) return reply(401, { error: 'Sign in to continue.' });
    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM identity.sessions WHERE token_hash=$1',[hash(token)]);
      return reply(200,{ signedOut:true });
    }
    if (req.method !== 'GET') return reply(405,{error:'Method unavailable.'});
    const result = await pool.query(`SELECT a.id,a.email,a.email_verified AS "emailVerified",
      COALESCE((SELECT json_agg(json_build_object('id',g.role,'name',g.label) ORDER BY g.role)
                FROM identity.workspace_grants g WHERE g.account_id=a.id),'[]') AS workspaces
      FROM identity.accounts a JOIN identity.sessions s ON s.account_id=a.id WHERE s.token_hash=$1`,[hash(token)]);
    return result.rowCount ? reply(200,result.rows[0]) : reply(401,{error:'Session expired.'});
  }
  if (req.method !== 'POST') return reply(405,{error:'Method unavailable.'});
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) return reply(413,{error:'Request too large.'});
  }
  let input;
  try { input = JSON.parse(body || '{}'); } catch { return reply(400,{error:'Invalid form.'}); }
  if (!input || typeof input!=='object' || Array.isArray(input)) return reply(400,{error:'Invalid form.'});
  if (!['/register','/login'].includes(req.url)) {
    const [status,result]=await security(req.url,input,token?hash(token):null,pool);
    return reply(status,result);
  }
  const email = typeof input?.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = input?.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || typeof password!=='string' || !password.length || Buffer.byteLength(password)>256)
    return reply(400,{error:'Check your email and password.'});
  const signup = req.url === '/register';
  if (signup && password.length<8) return reply(400,{error:'Use at least 8 characters for your password.'});
  let userId;
  if (signup) {
    userId = randomUUID();
    const salt = randomBytes(16).toString('hex');
    const digest = (await derive(password,salt,64)).toString('hex');
    const token = randomBytes(32).toString('hex');
    const result = await pool.query('WITH fresh AS (INSERT INTO identity.accounts(id,email,salt,digest) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id) INSERT INTO identity.sessions(token_hash,account_id) SELECT $5,id FROM fresh',[userId,email,salt,digest,hash(token)]);
    if (!result.rowCount) return reply(409,{error:'This email is already registered. Try signing in.'});
    return reply(201,{id:userId,email,token,emailVerified:false});
  }
  const {rows:[user]} = await pool.query('SELECT id,salt,digest FROM identity.accounts WHERE email=$1',[email]);
  const actual = await derive(password,user?.salt ?? dummySalt,64);
  if (!timingSafeEqual(actual,user ? Buffer.from(user.digest,'hex') : dummyDigest) || !user)
    return reply(401,{error:'Check your email and password.'});
  const sessionToken = randomBytes(32).toString('hex');
  const fresh=await pool.query(`WITH current_account AS (
    SELECT id,email_verified FROM identity.accounts WHERE id=$1 AND digest=$2 FOR SHARE
  ), issued AS (
    INSERT INTO identity.sessions(token_hash,account_id) SELECT $3,id FROM current_account RETURNING account_id
  ) SELECT email_verified FROM current_account JOIN issued ON account_id=id`,[user.id,user.digest,hash(sessionToken)]);
  if (!fresh.rowCount) return reply(401,{error:'Your password changed. Sign in again.'});
  return reply(200,{id:user.id,email,token:sessionToken,emailVerified:fresh.rows[0].email_verified});
}
