import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {allowed,field,Failure,groups} from './store.mjs';

const assets={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css'],
  '/chef.png':['chef.png','image/png'],'/karahi.jpg':['karahi.jpg','image/jpeg']};
const staff=new Set(Object.values(groups).flat());
const financialKinds=['refund','balance','payout','dispute'];
async function jsonInput(req){
  if((req.headers['content-type']||'').split(';')[0]!=='application/json')throw new Failure(415,'Send JSON.');
  let n=0;const parts=[];
  for await(const b of req){n+=b.length;if(n>16000)throw new Failure(413,'Form too large.');parts.push(b);}
  try{const value=JSON.parse(Buffer.concat(parts).toString());if(value && typeof value==='object'&&!Array.isArray(value))return value;}catch{}
  throw new Failure(400,'Invalid form.');
}
function asError(status,result){return new Failure(status>=500?503:status,typeof result?.error==='string'?result.error:'Service unavailable.');}
export function adminServer(store,cfg){
  const bucket=new Map();
  const secure=cfg.publicOrigin?.startsWith('https://');
  const cookie=(token)=>'kk_staff='+token+'; Path=/admin/api; HttpOnly; SameSite=Strict'+(secure?'; Secure':'')+(token?'':'; Max-Age=0');
  async function upstream(origin,path,auth,method='GET',data,headers={}){
    if(!origin)throw new Failure(503,'The required service is unavailable.');
    const r=await fetch(new URL(path,origin),{method,headers:{authorization:auth||'','content-type':'application/json',...headers},
      body:data===undefined?undefined:JSON.stringify(data),redirect:'error',signal:AbortSignal.timeout(7000)});
    const result=await r.json().catch(()=>null);
    if(!r.ok)throw asError(r.status,result);
    if(!result)throw new Failure(502,'Invalid service response.');
    return result;
  }
  function caseAuth(){
    if(!cfg.orderKey)throw new Failure(503,'Order support connection is unavailable.');
    return 'Bearer '+cfg.orderKey;
  }
  function checkLoginRate(key){
    const now=Date.now();let rate=bucket.get(key);
    if(!rate||rate.until<now){rate={n:0,until:now+60000};bucket.set(key,rate);}
    if(++rate.n>15)throw new Failure(429,'Please wait a minute before signing in again.');
    if(bucket.size>1000)for(const [k,v] of bucket)if(v.until<now)bucket.delete(k);
  }
  async function recorded(actor,action,reference,reason,operation){
    store.audit(actor,action+' requested',reference,reason);
    try {
      const result=await operation();
      store.audit(actor,action+' recorded',reference,reason);return result;
    } catch(e){store.audit(actor,action+' unsuccessful',reference,'Check the source record before retrying.');throw e;}
  }
  return createServer(async(req,res)=>{
    const send=(status,data)=>res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(data));
    res.setHeader('x-content-type-options','nosniff');res.setHeader('cache-control','no-store');
    res.setHeader('referrer-policy','no-referrer');res.setHeader('x-frame-options','DENY');
    res.setHeader('content-security-policy',"default-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    try{
      const configured=cfg.publicOrigin?new URL(cfg.publicOrigin):null;
      const host=req.headers.host||'';
      if(configured?host!==configured.host:!(/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/i.test(host)))throw new Failure(403,'Host not allowed.');
      const expectedOrigin=configured?.origin||'http://'+host;
      if(req.method!=='GET' && req.headers.origin && req.headers.origin!==expectedOrigin)throw new Failure(403,'Origin not allowed.');
      const {pathname,searchParams}=new URL(req.url,expectedOrigin);
      if(req.method==='GET'&&Object.hasOwn(assets,pathname)){
        const [file,type]=assets[pathname];
        const content=await readFile(new URL('./public/'+file,import.meta.url));
        return res.writeHead(200,{'content-type':type}).end(content);
      }
      if(!pathname.startsWith('/admin/api/'))throw new Failure(404,'Page not found.');
      const path=pathname.slice('/admin/api'.length);
      if(path==='/login'&&req.method==='POST'){
        checkLoginRate(req.socket.remoteAddress);
        const body=await jsonInput(req);
        const login=await upstream(cfg.identity,'/login','','POST',{email:body.email,password:body.password});
        const user=await upstream(cfg.identity,'/session','Bearer '+login.token);
        if(!staff.has(user.staffRole)){
          await upstream(cfg.identity,'/session','Bearer '+login.token,'DELETE');
          throw new Failure(403,'Staff access required.');
        }
        res.setHeader('set-cookie',cookie(login.token));store.audit(user,'Staff sign in',user.id);
        return send(200,{staff:user.staffRole,email:user.email});
      }
      const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>/^kk_staff=[a-f0-9]{64}$/.test(x))?.slice(9);
      if(!token)throw new Failure(401,'Sign in to continue.');
      const auth='Bearer '+token;
      if(path==='/logout'&&req.method==='POST'){
        await jsonInput(req);
        res.setHeader('set-cookie',cookie(''));
        await upstream(cfg.identity,'/session',auth,'DELETE');return send(200,{signedOut:true});
      }
      const actor=await upstream(cfg.identity,'/session',auth);
      if(!staff.has(actor.staffRole))throw new Failure(403,'Staff access required.');
      if(path==='/session'&&req.method==='GET')return send(200,{staff:actor.staffRole,email:actor.email,
        areas:Object.keys(groups).filter(k=>groups[k].includes(actor.staffRole))});
      if(path==='/overview'&&req.method==='GET'){
        const rows=[];
        for(const kind of financialKinds)if(groups[kind].includes(actor.staffRole))rows.push({area:kind,pending:store.pending(kind)});
        const kinds=[['merchant',cfg.merchant,'/merchant/reviews','applications'],['rider',cfg.rider,'/rider/reviews','applications'],
          ['support',cfg.orders,'/internal/cases','cases']].filter(([kind])=>groups[kind].includes(actor.staffRole));
        const upstreamRows=await Promise.all(kinds.map(async([area,origin,url,key])=>{
          try{const result=await upstream(origin,url,area==='support'?caseAuth():auth);
            return {area,pending:(result[key]||[]).filter(row=>area==='support'||['pending','submitted','under_review'].includes(row.status)).length};}
          catch{return {area,unavailable:true};}
        }));
        return send(200,{rows:[...upstreamRows,...rows]});
      }
      const match=/^\/(merchant|rider)(?:\/([a-zA-Z0-9_-]{1,100})(?:\/documents\/([a-zA-Z0-9_-]{1,55}))?)?$/.exec(path);
      if(match){
        const [,area,id,kind]=match;allowed(actor,area);
        const origin=cfg[area],url='/'+area+'/reviews'+(id?'/'+id:'');
        if(req.method==='GET'&&kind){
          const r=await fetch(new URL(url+'/documents/'+kind,origin),{headers:{authorization:auth},redirect:'error',signal:AbortSignal.timeout(5000)});
          if(!r.ok)throw asError(r.status,null);
          const bytes=await r.arrayBuffer(),type=(r.headers.get('content-type')||'').split(';')[0];
          const preview=kind==='photo'&&searchParams.get('preview')==='1'&&['image/jpeg','image/png'].includes(type);
          return res.writeHead(200,{'content-type':preview?type:'application/octet-stream',
            'content-disposition':(preview?'inline':'attachment')+'; filename="'+kind+'"'}).end(Buffer.from(bytes));
        }
        if(req.method==='GET')return send(200,await upstream(origin,url,auth));
        if(req.method==='POST'&&id&&!kind){
          const body=await jsonInput(req),decision=body.decision,reason=field(body,'reason');
          if(!['approved','rejected'].includes(decision))throw new Failure(400,'Choose a decision.');
          return send(200,await recorded(actor,area+' '+decision,id,reason,()=>upstream(origin,url,auth,'POST',{decision,reason})));
        }
      }
      if(path==='/roles'){
        allowed(actor,'roles');
        if(!cfg.adminKey)throw new Failure(503,'Staff directory is unavailable.');
        const headers={'x-admin-key':cfg.adminKey};
        if(req.method==='GET')return send(200,await upstream(cfg.identity,'/internal/staff',auth,'GET',undefined,headers));
        if(req.method==='POST'){
          const data=await jsonInput(req),email=field(data,'email',254).toLowerCase(),role=data.role;
          if(!staff.has(role)&&role!==null)throw new Failure(400,'Unknown role.');
          if(email===actor.email.toLowerCase())throw new Failure(403,'Ask another administrator to change your role.');
          const reason=field(data,'reason');
          return send(200,await recorded(actor,'Staff access '+(role||'removed'),email,reason,
            ()=>upstream(cfg.identity,'/internal/staff',auth,'POST',{email,role},headers)));
        }
      }
      const support=/^\/support(?:\/(KK-[A-F0-9]{16}))?$/.exec(path);
      if(support){
        allowed(actor,'support');
        const id=support[1],url='/internal/cases'+(id?'/'+id:'');
        if(req.method==='GET')return send(200,await upstream(cfg.orders,url,caseAuth()));
        if(req.method==='POST'&&id){
          const body=await jsonInput(req),text=field(body,'text',2000);
          return send(200,await recorded(actor,'Support reply',id,'Reply to customer',()=>upstream(cfg.orders,url,caseAuth(),'POST',{text,actorId:actor.id})));
        }
      }
      const topup=/^\/topups(?:\/([a-zA-Z0-9_-]{1,100}))?$/.exec(path);
      if(topup){
        allowed(actor,'balance');const id=topup[1],url='/merchant/topups'+(id?'/'+id:'');
        if(req.method==='GET')return send(200,await upstream(cfg.merchant,url,auth));
        if(req.method==='POST'&&id){
          if(!['manager','admin'].includes(actor.staffRole))throw new Failure(403,'Manager approval required.');
          const data=await jsonInput(req),reason=field(data,'reason'),decision=data.decision;
          if(!['approved','rejected'].includes(decision))throw new Failure(400,'Choose a decision.');
          const externalReference=decision==='approved'?field(data,'externalReference',120):'';
          return send(200,await recorded(actor,'Top-up '+decision,id,reason,()=>upstream(cfg.merchant,url,auth,'POST',{reason,decision,externalReference})));
        }
      }
      const review=/^\/(dispute|refund|balance|payout)(?:\/([a-f0-9-]{36}))?$/.exec(path);
      if(review){
        const [,kind,id]=review;allowed(actor,kind);
        if(req.method==='GET'&&!id)return send(200,{reviews:store.list(kind)});
        if(req.method==='POST'){
          const data=await jsonInput(req);
          if(kind==='payout'&&id&&data.decision==='approved'){
            if(!cfg.adminKey)throw new Failure(503,'Rider reconciliation is unavailable.');
            const row=store.reservePayout(actor,id,data);
            try{
              await upstream(cfg.rider,'/rider/payouts/confirm',auth,'POST',{
                riderId:row.riderId,reference:row.reference,amount:row.amount},{'x-admin-key':cfg.adminKey});
            }catch(e){
              if(e instanceof Failure&&e.status<500)store.finishPayout(actor,id,false);
              throw e;
            }
            store.finishPayout(actor,id,true);return send(200,{status:'reconciled'});
          }
          return id?send(200,store.decide(actor,kind,id,data)):send(201,store.create(actor,kind,data));
        }
      }
      if(path==='/audit'&&req.method==='GET'){allowed(actor,'audit');return send(200,{events:store.events()});}
      throw new Failure(404,'Page not found.');
    }catch(e){if(!res.headersSent)send(e instanceof Failure?e.status:503,{error:e instanceof Failure?e.message:'Service unavailable. Please retry.'});}
  });
}
