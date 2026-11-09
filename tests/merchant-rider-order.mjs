import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';

// A fresh Compose project with private credentials, disposable volumes and loopback-only ports.
const cwd=fileURLToPath(new URL('../',import.meta.url));
const secret=()=>randomBytes(32).toString('hex');
const project='khana-e2e-'+randomBytes(6).toString('hex');
async function freePort(){
  const socket=createServer();
  socket.listen(0,'127.0.0.1');await once(socket,'listening');
  const port=socket.address().port;await new Promise(done=>socket.close(done));return String(port);
}
const ports=new Set();
while(ports.size<3)ports.add(await freePort());
const [gw,ad,mail]=[...ports];
const env={...process.env,POSTGRES_PASSWORD:secret(),IDENTITY_PASSWORD:secret(),NATS_TOKEN:secret(),ORDER_OPERATIONS_KEY:secret(),CODE_SECRET:secret(),ADMIN_ACCESS_KEY:secret(),ACCOUNT_ERASURE_KEY:secret(),
 GATEWAY_BIND:'127.0.0.1',GATEWAY_PORT:gw,ADMIN_PORT:ad,MAILBOX_PORT:mail,PREVIEW_DELIVERY_PAISA:'12000',PREVIEW_TAX_BPS:'0',RIDER_BASE_PAISA:'8000',CATALOGUE_FILE:'',
 SMTP_HOST:'mailbox',SMTP_PORT:'1025',SMTP_USER:'',SMTP_PASSWORD:'',SMTP_REQUIRE_TLS:'false',ALLOW_DEV_RESET_HTTP:'true',RESET_URL:'http://localhost:'+gw};
function compose(args,input){
 return execFileSync('docker',['compose','-f','compose.yaml','-p',project,...args],{cwd,env,input,encoding:'utf8',maxBuffer:16*1024*1024});
}
const gateway='http://127.0.0.1:'+gw;
const admin='http://127.0.0.1:'+ad+'/admin/api';
const mailbox='http://127.0.0.1:'+mail;
let cookie,checkpoint='building stack';
async function api(path,token,body,expected,staff=false){
 const r=await fetch((staff?admin:gateway)+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(staff&&cookie?{cookie}:{}),...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(18000)});
 if(staff&&path==='/login'&&r.ok)cookie=r.headers.get('set-cookie').split(';')[0];
 const data=await r.json().catch(()=>({}));
 assert.ok(expected?r.status===expected:r.ok,`${path}: HTTP ${r.status} ${data.error||''}`);return data;
}
const staff=(path,body,expected)=>api(path,null,body,expected,true);
async function register(name){
 const email=name+'@isolated.example.test',password=secret();
 const account=await api('/identity/register',null,{email,password});
 return {...account,email,password};
}
async function verify(user){
 await api('/identity/verify/request',user.token,{});
 let code;
 for(let i=0;i<30&&!code;i++){
   const matches=await (await fetch(mailbox+'/api/v1/search?query='+encodeURIComponent('to:'+user.email))).json();
   if(matches.messages.length){
     const message=await (await fetch(mailbox+'/api/v1/message/'+matches.messages[0].ID)).json();
     code=message.Text.match(/code is (\d{6})/)?.[1];
   }
   if(!code)await wait(200);
 }
 assert.ok(code,'Disposable inbox did not receive verification code.');
 await api('/identity/verify/confirm',user.token,{code});
}
async function onboardOwner(label,price){
 const user=await register(label),auth=user.token;
 const details={name:label,city:'Islamabad',email:user.email,address:'QA restaurant pickup'};
 const {application}=await api('/merchant/application',auth,details);
 const note=Buffer.from('%PDF-1.4\nDisposable integration fixture\n%%EOF').toString('base64');
 const pic='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAJ3q6j4AAAAASUVORK5CYII=';
 for(const kind of ['license','cnic','photo'])await api('/merchant/documents',auth,{kind,name:'fixture',mime:kind==='photo'?'image/png':'application/pdf',base64:kind==='photo'?pic:note});
 const me=await api('/merchant/me',auth);
 await api('/merchant/submit',auth,{termsVersion:me.terms.version});
 await staff('/merchant/'+application.id,{decision:'approved',reason:'Reviewed test documents.'});
 const branch=(await api('/merchant/me',auth)).branches[0],base='/merchant/branches/'+branch.id;
 const hours=Array.from({length:7},(_,day)=>({day,open:'00:00',close:'24:00',enabled:true}));
 await api(base+'/hours',auth,{hours});
 const area=[[33.5,73],[33.8,73],[33.8,73.3],[33.5,73.3]].map(([latitude,longitude])=>({latitude,longitude}));
 await api(base+'/area',auth,{area,pin:area[0]});
 const item=(await api(base+'/dishes',auth,{name:label+' dish',price,available:true,photo:'karahi'})).branch.menu[0];
 for(const kind of ['branch','dish']){
   const published=await api(base+'/image',auth,{kind,dishId:item.id,mime:'image/png',base64:pic});
   const r=await fetch(gateway+published.imageUrl);
   assert.equal(r.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await r.arrayBuffer()).toString('base64'),pic);
 }
 await api('/merchant/reviews/'+application.id+'/documents/cnic',auth,null,404);
 await api(base+'/availability',auth,{open:true});
 const topup=(await api(base+'/topups',auth,{key:'topup-01',method:'bank',amount:200000})).topup;
 await staff('/topups/'+topup.id,{decision:'approved',reason:'Isolated bank reconciliation fixture.',externalReference:'isolated-'+label});
 assert.ok((await api('/workspaces',auth)).workspaces.some(w=>w.id==='restaurant'));
 return {user,branch,item,base};
}
try{
 compose(['up','-d','--build']);
 for(let i=0;i<70;i++){try{if((await fetch(gateway+'/identity/ready')).ok)break;}catch{}await wait(500);}
 checkpoint='create staff through protected bootstrap';
 const adminUser=await register('reviewer');
 // Bootstrap only this project's initial staff role. All business operations below use authenticated service APIs.
 compose(['exec','-T','db','psql','-q','-v','ON_ERROR_STOP=1','-U','postgres','-d','identity'],
  "INSERT INTO identity.staff_grants(account_id,role) SELECT id,'admin' FROM identity.accounts WHERE email='reviewer@isolated.example.test';");
 await staff('/login',{email:adminUser.email,password:adminUser.password});
 checkpoint='approve two independent restaurants';
 const a=await onboardOwner('restaurant-a',60000),b=await onboardOwner('restaurant-b',90000);
 await api(b.base+'/queue',a.user.token,null,403);
 checkpoint='rider approval and workspace access';
 const rider=await register('rider');
 await api('/rider/apply',rider.token,{name:'QA rider',city:'Islamabad'});
 const riderId=(await api('/identity/session',rider.token)).id;
 await staff('/rider/'+riderId,{decision:'approved',reason:'Reviewed test rider.'});
 await api('/rider/availability',rider.token,{online:true});
 assert.ok((await api('/workspaces',rider.token)).workspaces.some(w=>w.id==='rider'));
 checkpoint='customer two-restaurant checkout';
 const customer=await register('customer');await verify(customer);
 const branches=[a,b],pin={latitude:33.6,longitude:73.15};
 const restaurants=(await api('/catalogue/restaurants?city=Islamabad&lat=33.6&lon=73.15')).restaurants;
 assert.equal(restaurants.length,2);assert.ok(restaurants.every(b=>b.imageUrl&&b.menu[0].imageUrl));
 assert.equal((await api('/catalogue/restaurants?city=Islamabad&lat=32&lon=72')).restaurants.length,0);
 const input={city:'Islamabad',address:'Test delivery street',pin,payment:'cod',idempotencyKey:'integration-order-1',
   items:branches.map(x=>({branchId:x.branch.id,dishId:x.item.id,qty:1,addon:false}))};
 const quote=await api('/orders/quote',customer.token,input);assert.equal(quote.total,163000);
 const {order}=await api('/orders',customer.token,{...input,expectedTotal:quote.total});
 const path='/orders/'+order.id;
 checkpoint='restaurant acceptance, preparation and commission';
 for(const x of branches){
   const queue=(await api(x.base+'/queue',x.user.token)).orders;
   assert.equal(queue[0].items.length,1);
   for(const action of ['accepted','preparing','ready'])await api(x.base+'/queue/'+order.id,x.user.token,{action});
   assert.equal((await api(x.base+'/finance',x.user.token)).reserved,x.item.price/5);
 }
 await api('/identity/close',customer.token,{password:customer.password},409);
 checkpoint='multi-pickup, verification and COD cash';
 assert.equal((await api('/rider/offers',rider.token)).offers.length,1);
 const trip='/rider/trips/'+order.id;
 await api(trip+'/claim',rider.token,{});
 const stops=(await api(trip,rider.token)).stops;assert.equal(stops.length,2);assert.ok(stops.every(s=>s.address===('QA restaurant pickup')));
 for(const x of branches){
   await api(trip+'/pickup',rider.token,{branchId:x.branch.id},409);
   await api(x.base+'/queue/'+order.id,x.user.token,{action:'picked_up'});
   await api(trip+'/pickup',rider.token,{branchId:x.branch.id});
 }
 const {code}=await api(path+'/otp',customer.token);
 await api(trip+'/deliver',rider.token,{code:code==='0000'?'9999':'0000',cashCollected:quote.total},409);
 await api(trip+'/deliver',rider.token,{code,cashCollected:quote.total});
 const receipt=(await api(path,customer.token)).order;
 assert.equal(receipt.paymentStatus,'paid');assert.equal(receipt.total,163000);
 checkpoint='staff support response and customer erasure before merchant settlement';
 await api(path+'/support',customer.token,{text:'Check this test order.'});
 await staff('/support/'+order.id,{text:'We checked your order.'});
 assert.equal((await api(path+'/support',customer.token)).messages.at(-1).role,'support');
 assert.ok((await staff('/audit')).events.length>0);
 await api('/identity/close',customer.token,{password:customer.password});
 await api('/identity/session',customer.token,null,401);
 checkpoint='COD settlement survives customer erasure';
 assert.equal((await api(trip,rider.token)).order.address,undefined);
 for(const x of branches){
   await api(x.base+'/receipts',x.user.token,{orderId:order.id},409);
   await api(trip+'/cash',rider.token,{branchId:x.branch.id});
   await api(x.base+'/receipts',x.user.token,{orderId:order.id});
   const finance=await api(x.base+'/finance',x.user.token);
   assert.equal(finance.statement.codReceived,x.item.price);
   assert.equal(finance.reserved,0);assert.equal(finance.available,200000-x.item.price/5);
 }
 assert.ok((await api(trip,rider.token)).stops.every(s=>s.confirmed));
 console.log('PASS: isolated gateway, staff reviews, two merchants, live menus, rider, email, checkout, kitchen, OTP, cash ledger, support and account closure.');
}catch(error){
 console.error('Failed at '+checkpoint+': '+error.message);process.exitCode=1;
}finally{
 compose(['down','--volumes','--remove-orphans','--rmi','local']);
}
