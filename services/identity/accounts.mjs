import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(scrypt);
const hash = value => createHash('sha256').update(value).digest('hex');
const dummySalt = randomBytes(16).toString('hex');
const dummyDigest = Buffer.alloc(64);

export async function accounts(req, res, pool) {
  function reply(status, body) {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(body));
  }
  if (req.url === '/session') {
    const token = req.headers.authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) return reply(401, { error: 'Sign in to continue.' });
    if (req.method === 'DELETE') {
      await pool.query('DELETE FROM identity.sessions WHERE token_hash=$1',[hash(token)]);
      return reply(200,{ signedOut:true });
    }
    if (req.method !== 'GET') return reply(405,{error:'Method unavailable.'});
    const result = await pool.query('SELECT a.email FROM identity.accounts a JOIN identity.sessions s ON s.account_id=a.id WHERE s.token_hash=$1',[hash(token)]);
    return result.rowCount ? reply(200,result.rows[0]) : reply(401,{error:'Session expired.'});
  }
  if (req.method !== 'POST') return reply(405,{error:'Method unavailable.'});
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > 4096) return reply(413,{error:'Request too large.'});
  }
  let input;
  try { input = JSON.parse(body); } catch { return reply(400,{error:'Invalid form.'}); }
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
    return reply(201,{email,token});
  }
  const {rows:[user]} = await pool.query('SELECT id,salt,digest FROM identity.accounts WHERE email=$1',[email]);
  const actual = await derive(password,user?.salt ?? dummySalt,64);
  if (!timingSafeEqual(actual,user ? Buffer.from(user.digest,'hex') : dummyDigest) || !user)
    return reply(401,{error:'Check your email and password.'});
  const token = randomBytes(32).toString('hex');
  await pool.query('INSERT INTO identity.sessions(token_hash,account_id) VALUES($1,$2)',[hash(token),user.id]);
  return reply(200,{email,token});
}
