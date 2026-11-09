import { createServer } from 'node:http';
import pg from 'pg';
import { accounts } from './accounts.mjs';

const database = new pg.Pool({ max: 4, connectionTimeoutMillis: 1200, query_timeout: 1200 });
database.on('error', () => console.warn('Idle database connection lost'));
createServer(async (req, res) => {
  if (['/register','/login','/session'].includes(req.url)) {
    try { await accounts(req, res, database); }
    catch { res.writeHead(503, { 'content-type': 'application/json' }).end(JSON.stringify({error:'Account service unavailable.'})); }
    return;
  }
  if (req.method !== 'GET' || req.url !== '/ready') {
    res.writeHead(404).end();
    return;
  }
  let ready = false;
  try {
    const [schema, broker] = await Promise.all([
      database.query('SELECT version FROM identity.schema_version WHERE version = 1'),
      fetch('http://broker:8222/healthz?js-enabled-only=true', { signal: AbortSignal.timeout(1200) }),
    ]);
    ready = schema.rowCount === 1 && broker.ok;
  } catch { /* Check dependencies again on the next request. */ }
  console.info(JSON.stringify({ id: req.headers['x-request-id'], ready }));
  res.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ ready }));
}).listen(8081);
