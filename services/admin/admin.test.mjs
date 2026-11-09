import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import {adminServer} from './server.mjs';
import {adminStore} from './store.mjs';

async function listen(server){
  server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;
}
test('staff boundaries, financial separation, reviews, payout retries, redacted audit and session revocation',async(t)=>{
  const users=new Map(['customer','reviewer','manager','finance','admin','support'].map(role=>
    [role,{id:role+'-id',email:role+'@example.test',staffRole:role==='customer'?null:role}]));
  const tokens=new Map();let payoutCount=0,temporaryPayoutFailure=true;const staffWrites=[];
  const service=createServer(async(req,res)=>{
    const chunks=[];for await(const part of req)chunks.push(part);
    const body=JSON.parse(Buffer.concat(chunks).toString()||'{}'),bearer=req.headers.authorization?.replace('Bearer ',''),
      answer=(status,data)=>res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(data));
    if(req.url==='/login'){
      const user=users.get(body.email?.split('@')[0]);if(!user)return answer(401,{error:'Invalid credentials'});
      const token=randomBytes(32).toString('hex');tokens.set(token,user);return answer(200,{token});
    }
    if(req.url==='/session'&&req.method==='DELETE'){tokens.delete(bearer);return answer(200,{});}
    if(req.url==='/session'){const user=tokens.get(bearer);return answer(user?200:401,user||{});}
    if(req.url==='/internal/staff'){
      if(req.headers['x-admin-key']!=='internal-test')return answer(403,{});
      if(req.method==='POST')staffWrites.push(body);return answer(200,{staff:[...users.values()]});
    }
    if(req.url==='/rider/payouts/confirm'){
      if(req.headers['x-admin-key']!=='internal-test'||tokens.get(bearer)?.staffRole!=='manager')return answer(403,{});
      if(temporaryPayoutFailure){temporaryPayoutFailure=false;return answer(503,{error:'Service unavailable'});}
      payoutCount++;return answer(200,{});
    }
    if(req.url.startsWith('/internal/cases'))return answer(bearer==='order-secret'?200:403,{cases:[]});
    if(req.url.endsWith('/reviews'))return answer(200,{applications:[]});
    return answer(404,{});
  });
  const origin=await listen(service),store=adminStore(':memory:');
  const server=adminServer(store,{identity:origin,orders:origin,merchant:origin,rider:origin,adminKey:'internal-test',orderKey:'order-secret'});
  const url=await listen(server);
  t.after(async()=>{await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>service.close(r))]);store.close();});
  function request(path,cookie,data,originOverride){
    return fetch(url+'/admin/api/'+path,{method:data===undefined?'GET':'POST',headers:{
      ...(cookie?{cookie}:{}),...(data===undefined?{}:{'content-type':'application/json'}),...(originOverride?{origin:originOverride}:{})},
    body:data===undefined?undefined:JSON.stringify(data)});
  }
  async function login(role){
    const r=await request('login',null,{email:role+'@example.test',password:'test'});
    assert.equal(r.status,200);const header=r.headers.get('set-cookie');
    assert.match(header,/HttpOnly/);assert.match(header,/SameSite=Strict/);assert.ok(!(await r.json()).token);
    return header.split(';')[0];
  }
  assert.equal((await request('overview')).status,401);
  assert.equal((await request('login',null,{email:'customer@example.test',password:'test'})).status,403);
  const reviewer=await login('reviewer'),finance=await login('finance'),manager=await login('manager'),admin=await login('admin');
  assert.equal((await request('merchant',reviewer)).status,200);
  assert.equal((await request('balance',reviewer)).status,403);
  assert.equal((await request('roles',manager)).status,403);
  assert.equal((await request('roles',admin,{email:users.get('admin').email,role:null,reason:'self'})).status,403);
  assert.equal((await request('roles',admin,{email:users.get('finance').email,role:'support',reason:'Rotation'})).status,200);
  assert.equal(staffWrites.length,1);
  const refund={reference:'Order 22 / item 6',amount:'120.50',evidence:'Statement line 4',reason:'Cancelled item'};
  assert.equal((await request('refund',finance,refund,'https://elsewhere.test')).status,403);
  const {id}=await (await request('refund',finance,refund)).json();
  assert.equal((await request('refund',finance,refund)).status,409);
  assert.equal((await request('refund/'+id,finance,{decision:'approved',reason:'Reviewed'})).status,403);
  const decision={decision:'approved',reason:'Receipt checked'};
  assert.equal((await (await request('refund/'+id,manager,decision)).json()).status,'approved_pending_processor');
  assert.equal((await request('refund/'+id,manager,decision)).status,409);
  const payout={reference:'Bank transfer 123',amount:'385.00',reason:'Daily rider payout',evidence:'Statement 17',riderId:'rider-one'};
  const self=await (await request('payout',manager,{...payout,reference:'Self review'})).json();
  assert.equal((await request('payout/'+self.id,manager,decision)).status,403);
  const p=await (await request('payout',finance,payout)).json();
  assert.equal((await request('payout/'+p.id,manager,decision)).status,503);
  assert.equal((await request('payout/'+p.id,manager,{decision:'rejected',reason:'Response missing'})).status,409);
  assert.equal((await (await request('payout/'+p.id,manager,decision)).json()).status,'reconciled');
  assert.equal(payoutCount,1);
  assert.equal((await request('audit',finance)).status,403);
  assert.ok((await (await request('audit',manager)).json()).events.some(e=>e.action==='refund approved_pending_processor'));
  assert.equal((await request('logout',admin,{})).status,200);assert.equal((await request('roles',admin)).status,401);
  users.get('reviewer').staffRole=null;assert.equal((await request('merchant',reviewer)).status,403);
});
