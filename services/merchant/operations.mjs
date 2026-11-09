import {requireThat,Fault,uuid,now} from './store.mjs';
import {text,amount} from './validation.mjs';

export async function internal(origin,path,key,body) {
  requireThat(origin&&key?.length>=24,503,'Partner connection unavailable.');
  let res;
  try{res=await fetch(new URL(path,origin),{method:body?'POST':'GET',headers:{authorization:'Bearer '+key,'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(4500)});}
  catch{throw new Fault(503,'Partner service unavailable. Please retry.');}
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Fault(res.status,data.error||'Partner service unavailable.');
  return data;
}
const dayFor=date=>new Date(new Date(date).getTime()+18000000).toISOString().slice(0,10);
export async function operations(ctx,b,action,orderId){
  const {s,account,method,data,url,config}=ctx;
  if(!['queue','finance','topups','receipts'].includes(action))return;
  const roleAllowed=action==='queue'?['owner','manager','kitchen']:['owner','manager'];
  requireThat(roleAllowed.includes(b.role),403,'This branch role cannot access the requested records.');
  const ordersApi=(path,body)=>internal(config.orders,path,config.key,body);
  const assignment=async id=>{
    try{return await internal(config.rider,'/internal/assignments/'+id,config.key);}
    catch(e){if(e.status===404)return null;throw e;}
  };
  const event=(id,type,actorId,reason)=>ordersApi('/internal/orders/'+id+'/events',{eventId:'merchant-'+b.id+'-'+type,branchId:b.id,type,actorId,reason});
  if(action==='topups'&&method==='POST'){
    const value=amount(data.amount),key=text(data.key,100,'request identifier');
    requireThat(['bank','card','wallet'].includes(data.method),400,'Choose a payment method.');
    let row=s.one('SELECT * FROM topups WHERE branchId=? AND requestKey=?',b.id,key);
    if(row)requireThat(row.amount===value&&row.method===data.method,409,'This request was already used.');
    else{
      const id=uuid();
      s.run('INSERT INTO topups(id,branchId,requestKey,amount,method,createdAt) VALUES(?,?,?,?,?,?)',id,b.id,key,value,data.method,now());
      row=s.one('SELECT * FROM topups WHERE id=?',id);s.audit(account.id,id,'topup.requested');
    }
    return {topup:row};
  }
  const response=await ordersApi('/internal/dispatch');
  let queue=response.orders.flatMap(order=>{
    const branch=order.branches.find(br=>br.id===b.id);
    if(!branch)return [];
    const items=order.items.filter(it=>it.branchId===b.id);
    const subtotal=items.reduce((n,it)=>n+it.total,0);
    return [{id:order.id,createdAt:order.createdAt,deliveredAt:order.deliveredAt,status:branch.status,items,subtotal,
      commission:Math.round(subtotal/5),delivered:order.status==='delivered',payment:order.payment,handedOff:!!s.one('SELECT 1 FROM handoffs WHERE branchId=? AND orderId=?',b.id,order.id)}];
  });
  // Persist holds before sending acceptance. An uncertain response can be retried safely using the same event ID.
  for(const order of queue){
    const hold=s.one('SELECT status FROM reservations WHERE branchId=? AND orderId=?',b.id,order.id);
    if(!hold)continue;
    if(order.status==='cancelled')s.run("UPDATE reservations SET status='released' WHERE branchId=? AND orderId=?",b.id,order.id);
    else if(order.delivered)s.run("UPDATE reservations SET status='charged',settledAt=COALESCE(settledAt,?) WHERE branchId=? AND orderId=?",order.deliveredAt||now(),b.id,order.id);
    else if(hold.status==='pending'){
      if(order.status==='received'){
        await event(order.id,'accepted','recovery','Retry previously authorized acceptance');
        order.status='accepted';
      }
      s.run("UPDATE reservations SET status='reserved' WHERE branchId=? AND orderId=? AND status='pending'",b.id,order.id);
    }
  }
  if(action==='queue'){
    const branchAssignments=await Promise.all(queue.filter(o=>o.status==='ready'&&!o.handedOff).map(async(o)=>[o.id,await assignment(o.id)]));
    const byId=new Map(branchAssignments);
    queue=queue.map(o=>({...o,riderId:byId.get(o.id)?.riderId||null}));
    if(method==='GET'&&!orderId)return {orders:queue};
    requireThat(method==='POST',405,'Unsupported method.');
    const order=queue.find(o=>o.id===orderId);requireThat(order,404,'Order not found for this branch.');
    const type=data.action;
    requireThat(['accepted','cancelled','preparing','ready','picked_up'].includes(type),400,'Unknown order action.');
    if(['accepted','cancelled'].includes(type))requireThat(['owner','manager'].includes(b.role),403,'Manager permission required.');
    if(type==='picked_up'){
      requireThat(order.status==='ready'||order.handedOff,409,'The order must be ready.');
      if(order.handedOff)return {ok:true};
      requireThat(order.riderId,409,'Wait for an assigned rider.');
      s.run('INSERT OR IGNORE INTO handoffs VALUES(?,?,?,?,?)',b.id,order.id,order.riderId,account.id,now());
      s.audit(account.id,order.id,'handoff.restaurant',b.id);return {ok:true};
    }
    const reason=type==='cancelled'?text(data.reason,500,'cancellation reason'):'';
    if(type==='accepted'){
      requireThat(order.status==='received'||order.status==='accepted',409,'Order is no longer awaiting acceptance.');
      s.tx(()=>{
        const hold=s.one('SELECT status FROM reservations WHERE branchId=? AND orderId=?',b.id,order.id);
        if(hold){requireThat(hold.status!=='released',409,'Reserve has been released.');return;}
        requireThat(s.available(b.id).available>=order.commission,409,'Available balance is too low for the commission reserve.');
        s.run("INSERT INTO reservations(branchId,orderId,amount,status,createdAt) VALUES(?,?,?,'pending',?)",b.id,order.id,order.commission,now());
      });
    }
    try{await event(order.id,type,account.id,reason);}
    catch(e){
      if(type==='accepted'&&e.status>=400&&e.status<500)s.run("DELETE FROM reservations WHERE branchId=? AND orderId=? AND status='pending'",b.id,order.id);
      throw e;
    }
    if(type==='accepted')s.run("UPDATE reservations SET status='reserved' WHERE branchId=? AND orderId=? AND status='pending'",b.id,order.id);
    if(type==='cancelled')s.run("UPDATE reservations SET status='released' WHERE branchId=? AND orderId=?",b.id,order.id);
    s.audit(account.id,order.id,'order.'+type,reason);return {ok:true};
  }
  const delivered=queue.filter(o=>o.delivered&&o.status!=='cancelled'&&o.payment==='cod');
  async function receipt(o){
    const received=s.one('SELECT createdAt FROM receipts WHERE branchId=? AND orderId=?',b.id,o.id);
    const job=received?null:await assignment(o.id);
    return {orderId:o.id,amount:o.subtotal,received:!!received,receivedAt:received?.createdAt,canConfirm:!received&&Array.isArray(job?.cashHandoffs)&&job.cashHandoffs.includes(b.id)};
  }
  if(action==='receipts'&&method==='POST'){
    const order=delivered.find(o=>o.id===data.orderId);requireThat(order,409,'A delivered COD order from this branch is required.');
    const entry=await receipt(order);
    if(!entry.received){
      requireThat(entry.canConfirm,409,'Wait for the rider to record the cash handover.');
      s.run('INSERT OR IGNORE INTO receipts VALUES(?,?,?,?,?)',b.id,order.id,entry.amount,account.id,now());s.audit(account.id,order.id,'cash.received',b.id);
    }
    return {ok:true};
  }
  requireThat(action==='finance'&&method==='GET',405,'Unsupported request.');
  const receipts=await Promise.all(delivered.map(receipt));
  const day=url.searchParams.get('day')||dayFor(now());
  requireThat(/^\d{4}-\d{2}-\d{2}$/.test(day),400,'Invalid statement date.');
  const sales=delivered.filter(o=>dayFor(o.deliveredAt||o.createdAt)===day);
  const rows=s.all("SELECT amount,settledAt FROM reservations WHERE branchId=? AND status='charged'",b.id);
  const statement={day,sales:sales.reduce((sum,o)=>sum+o.subtotal,0),commission:rows.filter(r=>dayFor(r.settledAt)===day).reduce((sum,r)=>sum+r.amount,0),codReceived:receipts.filter(r=>r.received&&dayFor(r.receivedAt)===day).reduce((sum,r)=>sum+r.amount,0),digital:0,payout:0};
  return {...s.available(b.id),receipts,statement,topups:s.all('SELECT * FROM topups WHERE branchId=? ORDER BY createdAt DESC',b.id)};
}
