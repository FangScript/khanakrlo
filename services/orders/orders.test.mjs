import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createStore } from './store.mjs';
import { createOrdersServer } from './server.mjs';
import { parseCart, priceCart } from './quote.mjs';

const owner = '486c62cf-b369-43df-8f35-a55b164f9366';
const other = '68c0ec05-6001-437a-b476-7b99d85d2896';
const erasureKey = 'a-test-erasure-credential-only';
const operationsKey = 'an-operations-credential-only-for-tests';
const items = [
  {branchId:'a',dishId:'rice',addon:true,qty:2},
  {branchId:'b',dishId:'naan',qty:1,addon:false}
];
const input = {
  city:'Islamabad',address:'Street 1',items,payment:'cod',idempotencyKey:'checkout-test-1'
};
const restaurants = [
  {id:'a',city:input.city,name:'Kitchen A',menu:[{id:'rice',name:'Rice',photo:'biryani',price:60000,available:true,addon:{name:'Raita',price:5000}}]},
  {id:'b',city:input.city,name:'Kitchen B',menu:[{id:'naan',name:'Naan',photo:'wrap',price:25000,available:true}]}
];
let base,remote,server,store,directory,filename;
async function start(s) {
  s.listen(0,'127.0.0.1'); await once(s,'listening');
  return 'http://127.0.0.1:'+s.address().port;
}
async function call(path, method, token, input) {
  const response = await fetch(base+path,{
    method,headers:{authorization:'Bearer '+token,'content-type':'application/json'},
    body:input && JSON.stringify(input)
  });
  return {status:response.status,body:await response.json()};
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(),'khana-orders-'));
  filename = join(directory,'orders.sqlite');
  store = createStore(filename);
  remote = createServer((req,res) => {
    const token = req.headers.authorization?.slice(7);
    if (req.url === '/session') {
      if (!['first','second','unverified'].includes(token)) return res.writeHead(401).end();
      return res.end(JSON.stringify({id:token==='second'?other:owner,emailVerified:token!=='unverified'}));
    }
    res.end(JSON.stringify({restaurants}));
  });
  const origin = await start(remote);
  server = createOrdersServer(store,{identityOrigin:origin,catalogueOrigin:origin,delivery:12000,taxBps:0,erasureKey,operationsKey});
  base = await start(server);
});
after(async () => {
  await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>remote.close(r))]);
  store.close();
  await rm(directory,{recursive:true,force:true});
});

test('requires configured preview tariff, integer quantities and available options',() => {
  const cart = parseCart(input);
  assert.throws(()=>priceCart(cart,restaurants,{}),{status:503});
  assert.throws(()=>parseCart({...input,items:[...items,items[0]]}),{status:400});
  assert.throws(()=>parseCart({...input,items:[{...items[0],qty:'2'}]}),{status:400});
  assert.throws(()=>priceCart(cart,[],{delivery:0,taxBps:0}),{status:409});
});

test('places one owner-scoped COD order, persists the receipt and scrubs closed-account data',async () => {
  assert.equal((await call('/orders','GET','unknown')).status,401);
  assert.equal((await call('/orders','POST','unverified',input)).status,403);
  assert.equal((await call('/orders','POST','first',{...input,payment:'digital'})).status,409);
  const quote = await call('/orders/quote','POST','first',input);
  assert.equal(quote.status,200);
  assert.equal(quote.body.total,168000);
  assert.equal(quote.body.items[0].unit,65000);
  assert.equal(quote.body.pricingMode,'preview');
  assert.equal((await call('/orders','POST','first',{...input,expectedTotal:42})).status,409);
  const requests = await Promise.all([1,2,3].map(()=>call('/orders','POST','first',input)));
  assert.deepEqual(requests.map(r=>r.status).sort(),[200,200,201]);
  const order = requests[0].body.order;
  assert.equal(new Set(requests.map(r=>r.body.order.id)).size,1);
  assert.equal(order.subtotal,155000);
  assert.equal(order.paymentStatus,'unpaid');
  assert.equal(order.branches.length,2);
  assert.equal((await call('/orders','POST','first',{...input,address:'Another street'})).status,409);
  const list = await call('/orders','GET','first');
  assert.equal(list.body.orders.length,1);
  assert.equal(list.body.orders[0].otp,undefined);
  assert.deepEqual((await call('/orders','GET','second')).body.orders,[]);
  const path = '/orders/'+order.id;
  assert.equal((await call(path,'GET','second')).status,404);
  assert.equal((await call(path+'/otp','GET','second')).status,404);
  const otp = (await call(path+'/otp','GET','first')).body.code;
  assert.match(otp,/^\d{4}$/);
  assert.equal((await call(path+'/otp','GET','first')).body.code,otp);
  assert.equal((await call(path+'/support','POST','second',{text:'hello'})).status,404);
  assert.equal((await call(path+'/support','POST','first',{text:'  '})).status,400);
  assert.equal((await call(path+'/support','POST','first',{text:'Where is my order?'})).status,201);
  assert.equal((await call(path+'/support','GET','first')).body.messages[0].text,'Where is my order?');
  assert.equal((await call('/notifications','GET','first')).body.notifications[0].orderId,order.id);
  assert.deepEqual((await call('/notifications','GET','second')).body.notifications,[]);
  assert.deepEqual((await call('/workspaces','GET','first')).body.workspaces.map(w=>w.id),['customer']);
  const anotherConnection = createStore(filename);
  assert.equal(anotherConnection.read(owner,order.id).total,order.total);
  anotherConnection.close();
  const events = '/internal/orders/'+order.id+'/events';
  const cancelled = {eventId:'cancel-b-001',type:'cancelled',branchId:'b'};
  assert.equal((await call(events,'POST','first',cancelled)).status,403);
  assert.equal((await call(events,'POST',operationsKey,cancelled)).status,200);
  assert.equal((await call(events,'POST',operationsKey,cancelled)).status,200);
  const adjusted = (await call(path,'GET','first')).body.order;
  assert.equal(adjusted.adjustments.length,1);
  assert.equal(adjusted.adjustments[0].amount,25000);
  assert.equal(adjusted.adjustments[0].refundAmount,0);
  assert.equal(adjusted.total,143000);
  assert.equal(adjusted.status,'received');
  for (const type of ['accepted','preparing','ready','picked_up']) {
    assert.equal((await call(events,'POST',operationsKey,{eventId:type+'-a-001',type,branchId:'a'})).status,200);
  }
  assert.equal((await call(path,'GET','first')).body.order.status,'on_the_way');
  const delivered = {eventId:'delivered-001',type:'delivered',cashCollected:adjusted.total,code:otp};
  const wrong = otp==='0000' ? '1234' : '0000';
  assert.equal((await call(events,'POST',operationsKey,{...delivered,code:wrong})).status,409);
  assert.equal((await call(events,'POST',operationsKey,delivered)).status,200);
  assert.equal((await call(path,'GET','first')).body.order.paymentStatus,'paid');
  assert.equal((await call(path+'/otp','GET','first')).status,409);
  assert.equal((await call('/notifications','GET','first')).body.notifications.length,7);
  const erasure = '/internal/accounts/'+owner+'/erase';
  assert.equal((await call(erasure,'POST','first')).status,403);
  assert.equal((await call(erasure,'POST',erasureKey)).status,200);
  assert.equal((await call(erasure,'POST',erasureKey)).status,200);
  assert.throws(()=>store.read(owner,order.id),{status:404});
  assert.equal((await call('/orders','POST','first',input)).status,403);
});
