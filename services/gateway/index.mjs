import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

createServer(async (req, res) => {
  if (req.method !== 'GET' || req.url !== '/identity/ready') {
    res.writeHead(404).end();
    return;
  }
  const id = randomUUID();
  let ready = false;
  try {
    const upstream = await fetch(new URL('/ready', process.env.IDENTITY_ORIGIN), {
      signal: AbortSignal.timeout(2500), headers: { 'x-request-id': id },
    });
    ready = upstream.ok && (await upstream.json()).ready === true;
  } catch { /* Upstream unavailable. */ }
  console.info(JSON.stringify({ id, ready }));
  res.writeHead(ready ? 200 : 503, { 'x-request-id': id, 'content-type': 'application/json' });
  res.end(JSON.stringify({ ready }));
}).listen(8080);
