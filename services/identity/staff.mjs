import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (text) => createHash('sha256').update(text).digest();
export async function manageStaff(req, pool, token, reply) {
  const secret = process.env.ADMIN_ACCESS_KEY;
  if (!secret || !token || !timingSafeEqual(digest(secret), digest(String(req.headers['x-admin-key'] || ''))))
    return reply(403, { error: 'Staff administrator access required.' });
  let form;
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 4096) return reply(413, { error: 'Request too large.' });
    }
    try {
      form = JSON.parse(body);
    } catch {
      return reply(400, { error: 'Invalid request.' });
    }
    if (
      typeof form?.email !== 'string' ||
      ![null, 'admin', 'manager', 'reviewer', 'support', 'finance'].includes(form.role)
    )
      return reply(400, { error: 'Select an account and a valid role.' });
  } else if (req.method !== 'GET') return reply(405, { error: 'Unsupported method.' });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    if (form) await db.query('SELECT pg_advisory_xact_lock(84923017)');
    const {
      rows: [actor],
    } = await db.query(
      "SELECT s.account_id FROM identity.sessions s JOIN identity.staff_grants g ON g.account_id=s.account_id WHERE token_hash=$1 AND role='admin'",
      [token],
    );
    if (!actor) return reply(403, { error: 'Staff administrator access required.' });
    if (!form) {
      const { rows } = await db.query(
        'SELECT id,email,role FROM identity.staff_grants JOIN identity.accounts ON id=account_id ORDER BY email',
      );
      return reply(200, { staff: rows });
    }
    const {
      rows: [user],
    } = await db.query(
      'SELECT id,role FROM identity.accounts LEFT JOIN identity.staff_grants ON id=account_id WHERE email=$1',
      [form.email.trim().toLowerCase()],
    );
    if (!user) return reply(404, { error: 'Registered account not found.' });
    if (actor.account_id === user.id)
      return reply(409, { error: 'Another administrator must manage your role.' });
    if (form.role)
      await db.query(
        'INSERT INTO identity.staff_grants VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET role=excluded.role',
        [user.id, form.role],
      );
    else await db.query('DELETE FROM identity.staff_grants WHERE account_id=$1', [user.id]);
    await db.query(
      'INSERT INTO identity.staff_changes(actor,subject,previous_role,new_role) VALUES($1,$2,$3,$4)',
      [actor.account_id, user.id, user.role, form.role],
    );
    await db.query('COMMIT');
    return reply(200, { updated: true });
  } finally {
    try {
      await db.query('ROLLBACK');
    } finally {
      db.release();
    }
  }
}
