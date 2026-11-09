import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://gateway');
  const origin = req.headers.origin;
  if (origin && (process.env.WEB_ORIGINS || '').split(',').includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary','Origin');
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, DELETE'}).end();
      return;
    }
  }
  const accountRoute = /^\/identity\/(?:session|register|login|close|verify\/(?:request|confirm)|reset\/(?:request|confirm))$/.test(url.pathname);
  const orderRoute = /^\/(?:workspaces|notifications|orders(?:\/(?:quote|KK-[0-9A-F]{16}(?:\/(?:otp|support))?))?)$/.test(url.pathname);
  const workspace = url.pathname.match(/^\/(merchant|rider)\/[A-Za-z0-9/_-]+$/)?.[1];
  if (/^\/(?:merchant\/(?:reviews|topups)|rider\/(?:reviews|payouts\/confirm))(?:\/|$)/.test(url.pathname)) {
    res.writeHead(404).end();
    return;
  }
  if (accountRoute || orderRoute || workspace) {
    try {
      const target = accountRoute
        ? new URL(url.pathname.slice('/identity'.length), process.env.IDENTITY_ORIGIN)
        : new URL(url.pathname, workspace === 'merchant' ? process.env.MERCHANT_ORIGIN : workspace === 'rider' ? process.env.RIDER_ORIGIN : process.env.ORDERS_ORIGIN);
      target.search = url.search;
      const chunks = [];
      let length = 0;
      for await (const chunk of req) {
        length += chunk.length;
        if (length > (workspace === 'merchant' ? 14 * 1024 * 1024 : accountRoute ? 4096 : 32768)) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      const upstream = await fetch(target, {method:req.method, headers:{'content-type':'application/json', authorization:req.headers.authorization || ''}, body:req.method==='POST'?Buffer.concat(chunks):undefined, signal:AbortSignal.timeout(15000)});
      const type = upstream.headers.get('content-type')?.split(';')[0];
      if (workspace === 'merchant' && req.method === 'GET' && url.pathname.startsWith('/merchant/images/') && ['image/jpeg','image/png','image/webp'].includes(type)) {
        res.writeHead(upstream.status,{'content-type':type,'cache-control':'private, max-age=3600','x-content-type-options':'nosniff'}).end(Buffer.from(await upstream.arrayBuffer()));
      } else {
        res.writeHead(upstream.status,{'content-type':'application/json','cache-control':'no-store'}).end(await upstream.text());
      }
    } catch { res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'Service unavailable. Please try again.'})); }
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
