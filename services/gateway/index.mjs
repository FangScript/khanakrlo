import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://gateway');
  if (['/identity/register','/identity/login','/identity/session'].includes(url.pathname)) {
    try {
      const target = new URL(url.pathname.slice('/identity'.length), process.env.IDENTITY_ORIGIN);
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body)>4096) { res.writeHead(413).end(); return; }
      }
      const upstream = await fetch(target, {method:req.method, headers:{'content-type':'application/json', authorization:req.headers.authorization || ''}, body: req.method==='POST' ? body : undefined, signal:AbortSignal.timeout(5000)});
      const result = await upstream.text();
      res.writeHead(upstream.status,{'content-type':'application/json','cache-control':'no-store'}).end(result);
    } catch { res.writeHead(503).end(); }
    return;
  }
  if (req.method === 'GET' && url.pathname === '/catalogue/restaurants') {
    try {
      const target = new URL('/restaurants', process.env.CATALOGUE_ORIGIN);
      target.search = url.search;
      const upstream = await fetch(target, { signal: AbortSignal.timeout(2500) });
      const body = await upstream.text();
      res.writeHead(upstream.status, { 'content-type': 'application/json' }).end(body);
    } catch {
      res.writeHead(503).end();
    }
    return;
  }
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
}).listen(Number(process.env.PORT || 8080));
