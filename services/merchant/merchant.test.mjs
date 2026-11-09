import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createStore} from './store.mjs';
import {createMerchantServer} from './server.mjs';
import {contains,defaultHours,openNow,polygon} from './validation.mjs';

test('hours handle closed days and overnight schedules; boundaries reject self-crossing lines',()=>{
 const schedule=defaultHours();
 schedule[0]={day:0,enabled:true,open:'22:00',close:'03:00'};
 assert.equal(openNow(schedule,new Date('2026-11-08T18:00Z')),true);
 assert.equal(openNow(schedule,new Date('2026-11-08T20:00Z')),true);
 assert.equal(openNow(schedule,new Date('2026-11-09T05:00Z')),false);
 const map=[[33,73],[33.1,73.1],[33,73.1],[33.1,73]].map(([latitude,longitude])=>({latitude,longitude}));
 assert.throws(()=>polygon(map));
 assert.equal(contains([map[0],map[2],map[1],map[3]],{latitude:33.05,longitude:73.05}),true);
});

test('partner application, private evidence, review, publication, RBAC, charge-once cash lifecycle',async t=>{
 const s=createStore(':memory:'),servers=[];
 async function start(server){servers.push(server);server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;}
 t.after(async()=>{await Promise.all(servers.map(server=>new Promise(r=>server.close(r))));s.db.close();});
 const key='isolated-merchant-operation-key',eraseKey='isolated-merchant-erasure-key';
 const id='KK-0123456789ABCDEF';
 let branchId,order=null,rider=null,cash=false;
 const actors={owner:{staffRole:'admin'},manager:{staffRole:'manager'},kitchen:{},other:{}};
 const seen=[];
 const remote=await start(createServer(async(req,res)=>{
   const url=new URL(req.url,'http://test'),path=url.pathname;
   const actor=req.headers.authorization?.slice(7);
   const reply=(status,body)=>res.writeHead(status,{'content-type':'application/json'}).end(JSON.stringify(body));
   if(path==='/session'){
     if(!actors[actor])return reply(401,{});
     return reply(200,{id:actor,email:actor+'@example.test',emailVerified:true,...actors[actor]});
   }
   if(actor!==key)return reply(403,{});
   if(path==='/internal/dispatch')return reply(200,{orders:order?[order]:[]});
   if(path==='/internal/assignments/'+id)return rider?reply(200,{riderId:rider,cashHandoffs:cash?[branchId]:[]}):reply(404,{});
   if(path==='/internal/orders/'+id+'/events'){
     let text='';for await(const c of req)text+=c;const event=JSON.parse(text);
     if(!seen.includes(event.eventId)){order.branches[0].status=event.type;seen.push(event.eventId);}
     return reply(200,{recorded:true});
   }
   return reply(404,{});
 }));
 const base=await start(createMerchantServer(s,{identity:remote,orders:remote,rider:remote,key,erasureKey:eraseKey}));
 async function api(path,who='owner',input,expected=200){
   const url=base+(path.startsWith('/internal/')?path:'/merchant/'+path);
   const r=await fetch(url,{method:input?'POST':'GET',headers:{authorization:'Bearer '+who,'content-type':'application/json'},body:input?JSON.stringify(input):undefined});
   if(!r.headers.get('content-type')?.startsWith('application/json')){assert.equal(r.status,expected,path);return Buffer.from(await r.arrayBuffer());}
   const result=await r.json();assert.equal(r.status,expected,path+' '+JSON.stringify(result));return result;
 }
 const details={name:'Test only',email:'owner@example.test',city:'Islamabad',address:'Test pickup'};
 const {application}=await api('application','owner',details);
 await api('submit','owner',{termsVersion:'partner-v1'},400);
 const pdf=Buffer.from('%PDF-1.4 fixture only').toString('base64');
 const png=Buffer.from('89504e470d0a1a0a00000000','hex').toString('base64');
 await api('documents','owner',{kind:'cnic',name:'cnic.pdf',base64:png,mime:'application/pdf'},400);
 for(const kind of ['license','cnic','photo']){
   await api('documents','owner',{kind,name:'evidence',base64:kind==='photo'?png:pdf,mime:kind==='photo'?'image/png':'application/pdf'});
 }
 await api('submit','owner',{termsVersion:'wrong'},400);
 assert.equal((await api('submit','owner',{termsVersion:'partner-v1'})).application.status,'submitted');
 await api('reviews/'+application.id,'owner',{decision:'approved',reason:'self'},403);
 await api('reviews/'+application.id+'/documents/cnic','other',null,403);
 assert.equal((await api('reviews/'+application.id+'/documents/cnic','manager')).toString('base64'),pdf);
 await api('reviews/'+application.id,'manager',{decision:'approved',reason:'Reviewed fixture evidence.'});
 branchId=(await api('me')).branches[0].id;const branch='branches/'+branchId;
 assert.equal((await api(branch)).branch.open,false);
 await api(branch,'other',null,403);await api(branch+'/availability','owner',{open:true},409);
 await api(branch+'/staff','owner',{email:'kitchen@example.test',role:'kitchen'});
 assert.equal((await api('me','kitchen')).branches[0].role,'kitchen');
 await api(branch+'/staff','kitchen',{email:'other@example.test',role:'manager'},403);
 const hours=defaultHours().map(v=>({...v,open:'00:00',close:'23:59',enabled:true}));
 await api(branch+'/hours','owner',{hours});
 const area=[[33,73],[34,73],[34,74],[33,74]].map(([latitude,longitude])=>({latitude,longitude}));
 await api(branch+'/area','owner',{area,pin:area[0]});
 await api(branch+'/dishes','owner',{name:'Karahi',price:90000,photo:'karahi',available:true});
 await api(branch+'/availability','owner',{open:true});
 if(openNow(hours)){
   assert.equal((await api('/internal/catalogue?city=Islamabad&lat=33.5&lon=73.5',key)).restaurants[0].menu[0].price,90000);
   assert.equal((await api('/internal/catalogue?city=Islamabad&lat=32.5&lon=73.5',key)).restaurants.length,0);
 }
 await api(branch+'/availability','owner',{open:false});
 assert.equal((await api('/internal/catalogue?city=Islamabad',key)).restaurants.length,0);
 order={id,city:'Islamabad',createdAt:new Date().toISOString(),status:'received',payment:'cod',branches:[{id:branchId,status:'received'}],items:[{branchId,name:'Karahi',total:90000}]};
 await api(branch+'/queue/'+id,'owner',{action:'accepted'},409);
 const {topup}=await api(branch+'/topups','owner',{key:'topup-1',amount:100000,method:'bank'});
 await api('topups/'+topup.id,'owner',{decision:'approved',reason:'self',externalReference:'abc'},403);
 await api('topups/'+topup.id,'manager',{decision:'approved',reason:'Bank confirmed',externalReference:'unit-fixture'});
 await api('topups/'+topup.id,'manager',{decision:'approved',reason:'Bank confirmed',externalReference:'unit-fixture'});
 await api(branch+'/queue/'+id,'owner',{action:'accepted'});
 await api(branch+'/queue/'+id,'owner',{action:'accepted'});
 let finance=await api(branch+'/finance');
 assert.equal(finance.available,82000);assert.equal(finance.reserved,18000);
 await api(branch+'/queue/'+id,'kitchen',{action:'preparing'});await api(branch+'/queue/'+id,'kitchen',{action:'ready'});
 await api(branch+'/queue/'+id,'kitchen',{action:'picked_up'},409);rider='assigned';
 await api(branch+'/queue/'+id,'kitchen',{action:'picked_up'});
 assert.equal((await api('/internal/branch/'+branchId+'?orderId='+id,key)).handoffConfirmed,true);
 assert.equal(order.branches[0].status,'ready');
 order.status='delivered';order.branches[0].status='picked_up';order.deliveredAt=new Date().toISOString();
 await api(branch+'/receipts','owner',{orderId:id},409);cash=true;
 await api(branch+'/receipts','owner',{orderId:id});await api(branch+'/receipts','owner',{orderId:id});
 finance=await api(branch+'/finance');
 assert.equal(finance.available,82000);assert.equal(finance.reserved,0);
 assert.deepEqual([finance.statement.sales,finance.statement.codReceived,finance.statement.commission],[90000,90000,18000]);
 await api(branch+'/finance','kitchen',null,403);
 await api('/internal/accounts/owner/erase',eraseKey,{});
 assert.equal(s.one('SELECT count(*) AS n FROM documents').n,0);
 await api('me','owner',null,403);
 assert.equal((await api('me','kitchen')).branches.length,0);
});
