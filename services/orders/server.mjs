import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { OrderError, parseCart, priceCart } from './quote.mjs';

async function readBody(req) {
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 32768) throw new OrderError(413,'Cart or message is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new OrderError(400,'Invalid request.'); }
}

function matchesSecret(authorization, secret) {
  if (!secret || secret.length < 24) return false;
  const hash = value => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(authorization || ''),hash('Bearer ' + secret));
}

export function createOrdersServer(store, config) {
  return createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'});
      res.end(JSON.stringify(data));
    };
    try {
      const path = new URL(req.url,'http://orders').pathname;
      if(path==='/internal/dispatch' && req.method==='GET'){
        if(!matchesSecret(req.headers.authorization,config.operationsKey))throw new OrderError(403,'Access denied.');
        return reply(200,{orders:store.dispatch()});
      }
      const caseRoute=/^\/internal\/cases(?:\/(KK-[0-9A-F]{16}))?$/.exec(path);
      if(caseRoute){
        if(!matchesSecret(req.headers.authorization,config.operationsKey))throw new OrderError(403,'Access denied.');
        if(req.method==='GET')return reply(200,caseRoute[1]?store.caseDetail(caseRoute[1]):{cases:store.cases()});
        if(req.method==='POST'&&caseRoute[1]){
          const data=await readBody(req);
          if(typeof data?.text!=='string'||!data.text.trim()||data.text.length>2000||typeof data.actorId!=='string'||!data.actorId.trim())throw new OrderError(400,'A support actor and message are required.');
          return reply(201,{message:store.replyToCase(caseRoute[1],data.text.trim(),data.actorId)});
        }
      }
      const event = /^\/internal\/orders\/(KK-[0-9A-F]{16})\/events$/.exec(path);
      if (event && req.method === 'POST') {
        if (!matchesSecret(req.headers.authorization,config.operationsKey)) throw new OrderError(403,'Access denied.');
        return reply(200,store.recordEvent(event[1],await readBody(req)));
      }
      const erase = /^\/internal\/accounts\/([\da-f-]{36})\/erase$/i.exec(path);
      if (erase && req.method === 'POST') {
        if (!matchesSecret(req.headers.authorization, config.erasureKey)) throw new OrderError(403,'Access denied.');
        store.erase(erase[1]);
        return reply(200,{erased:true});
      }
      if (!req.headers.authorization?.startsWith('Bearer ')) throw new OrderError(401,'Sign in to continue.');
      const session = await fetch(new URL('/session',config.identityOrigin), {
        headers:{authorization:req.headers.authorization},signal:AbortSignal.timeout(3000)
      });
      if (session.status === 401) throw new OrderError(401,'Sign in to continue.');
      if (!session.ok) throw new OrderError(503,'Account service unavailable.');
      const account = await session.json();
      if (!account?.id || typeof account.id !== 'string') throw new OrderError(503,'Account identity unavailable.');
      const owner = account.id;
      store.usable(owner);
      if (path === '/orders' && req.method === 'GET') return reply(200,{orders:store.list(owner)});
      if (path === '/workspaces' && req.method === 'GET') {
        const workspaces=[{id:'customer',name:'Customer'}];
        const checks=[['restaurant','Restaurant',config.merchantOrigin],['rider','Rider',config.riderOrigin]];
        for(const grant of account.workspaces||[]){
          if(!checks.some(([id,,origin])=>origin&&id===grant.id)&&!workspaces.some(w=>w.id===grant.id))workspaces.push(grant);
        }
        const dynamic=await Promise.all(checks.map(async([id,name,origin])=>{
          if(!origin)return null;
          const r=await fetch(new URL('/internal/workspace/'+encodeURIComponent(owner),origin),{
            headers:{authorization:'Bearer '+config.operationsKey,'x-workspace-email':encodeURIComponent(account.email||''),'x-workspace-verified':String(account.emailVerified===true)},signal:AbortSignal.timeout(3000)});
          if(!r.ok)throw new OrderError(503,'Workspace availability could not be checked.');
          return (await r.json()).approved?{id,name}:null;
        }));
        return reply(200,{workspaces:[...workspaces,...dynamic.filter(Boolean)]});
      }
      if (path === '/notifications' && req.method === 'GET') {
        return reply(200,{notifications:store.notifications(owner)});
      }
      if (req.method === 'POST' && (path === '/orders' || path === '/orders/quote')) {
        const input = await readBody(req);
        const cart = parseCart(input);
        const placing = path === '/orders';
        if (placing) {
          if (account.emailVerified !== true) throw new OrderError(403,'Verify your email before placing your first order.');
          if (typeof input.idempotencyKey !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(input.idempotencyKey)) {
            throw new OrderError(400,'A checkout request key is required.');
          }
          const existing = store.previous(owner,input.idempotencyKey,cart);
          if (existing) return reply(200,{order:existing});
          if (cart.payment !== 'cod') throw new OrderError(409,'Digital payments are not available yet. Choose cash on delivery.');
        }
        const target = new URL('/restaurants',config.catalogueOrigin);
        target.searchParams.set('city',cart.city);
        if(cart.pin){target.searchParams.set('lat',cart.pin.latitude);target.searchParams.set('lon',cart.pin.longitude);}
        const response = await fetch(target,{signal:AbortSignal.timeout(3000)});
        if (!response.ok) throw new OrderError(503,'The menu is unavailable. Please retry.');
        const {restaurants} = await response.json();
        const quote = priceCart(cart,restaurants,config);
        if (!placing) return reply(200,quote);
        if (input.expectedTotal !== undefined && input.expectedTotal !== quote.total) {
          throw new OrderError(409,'The total has changed. Review your order again.');
        }
        const result = store.place(owner,input.idempotencyKey,cart,quote);
        return reply(result.created ? 201 : 200,{order:result.order});
      }
      const detail = /^\/orders\/(KK-[0-9A-F]{16})(?:\/(otp|support))?$/.exec(path);
      if (detail) {
        const [,id,view] = detail;
        if (req.method === 'GET') {
          if (view === 'otp') return reply(200,{code:store.otp(owner,id)});
          if (view === 'support') return reply(200,{messages:store.messages(owner,id)});
          return reply(200,{order:store.read(owner,id)});
        }
        if (view === 'support' && req.method === 'POST') {
          const input = await readBody(req);
          const text = typeof input?.text === 'string' && input.text.trim();
          if (!text || text.length > 2000) throw new OrderError(400,'Write a message of up to 2,000 characters.');
          return reply(201,{message:store.addMessage(owner,id,text)});
        }
      }
      return reply(404,{error:'Page not found.'});
    } catch (error) {
      if (error instanceof OrderError) return reply(error.status,{error:error.message});
      // No bearer tokens, OTPs, text or customer addresses in logs.
      console.warn('Orders request failed:',error.name);
      return reply(503,{error:'Order service unavailable. Please try again.'});
    }
  });
}
