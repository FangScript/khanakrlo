import {createServer} from 'node:http';
import {createHash,timingSafeEqual} from 'node:crypto';
import {Fault,requireThat} from './store.mjs';
import {text} from './validation.mjs';
import {partnerRoute} from './partners.mjs';
import {collectMenu,editBranch} from './branches.mjs';
import {operations} from './operations.mjs';

async function read(req,limit){
 let size=0;const chunks=[];
 for await(const buf of req){size+=buf.length;requireThat(size<=limit,413,'File or form too large.');chunks.push(buf);}
 try{const value=JSON.parse(Buffer.concat(chunks).toString()||'{}');requireThat(value&&!Array.isArray(value)&&typeof value==='object',400,'Invalid form.');return value;}
 catch{throw new Fault(400,'Invalid form.');}
}
function trusted(actual,key){
 const hash=x=>createHash('sha256').update(x).digest();
 requireThat(key?.length>=24&&timingSafeEqual(hash(actual||''),hash('Bearer '+key)),403,'Access denied.');
}
function internalRoute(s,parts,url,req,data,config){
 const [path,id,opt]=parts;
 if(path==='catalogue'&&req.method==='GET')return collectMenu(s,url);
 if(path==='accounts'&&opt==='erase'&&req.method==='POST'){
   trusted(req.headers.authorization,config.erasureKey);
   return s.tx(()=>{
    s.run('INSERT OR IGNORE INTO closed_accounts VALUES(?)',createHash('sha256').update(id).digest('hex'));
    const app=s.one('SELECT id FROM applications WHERE owner=?',id);
    if(app){
      s.run('DELETE FROM documents WHERE applicationId=?',app.id);
      s.run("UPDATE applications SET owner=id,name='Closed restaurant',email='',address='',termsVersion=NULL,reason='',status='closed' WHERE id=?",app.id);
      s.run("UPDATE branches SET open=0,pin=NULL,area='[]',address='' WHERE applicationId=?",app.id);
      s.run('DELETE FROM staff WHERE branchId IN (SELECT id FROM branches WHERE applicationId=?)',app.id);
      s.run('DELETE FROM published_images WHERE branchId IN (SELECT id FROM branches WHERE applicationId=?)',app.id);
    }
    s.run('DELETE FROM staff WHERE account=?',id);return {erased:true};
   });
 }
 trusted(req.headers.authorization,config.key);
 requireThat(req.method==='GET',405,'Unsupported method.');
 if(path==='workspace'){
   // Invitations are claimed only for an email verified by the identity service.
   if(req.headers['x-workspace-email']&&req.headers['x-workspace-verified']==='true'){
     s.bindStaff({id,email:decodeURIComponent(req.headers['x-workspace-email']),emailVerified:true});
   }
   return {approved:s.branchList(id).length>0};
 }
 if(path==='receipt')return {confirmed:!!s.one('SELECT 1 FROM receipts WHERE orderId=? AND branchId=?',id,opt)};
 if(path==='branch'){
   const b=s.one('SELECT name,address,pin FROM branches WHERE id=?',id);requireThat(b,404,'Branch not found.');
   const handoff=s.one('SELECT riderId FROM handoffs WHERE branchId=? AND orderId=?',id,url.searchParams.get('orderId')||'');
   return {...b,pin:b.pin?JSON.parse(b.pin):null,handoffConfirmed:!!handoff,handoffRiderId:handoff?.riderId||null};
 }
}
function reviewTopups({s,account,method,data},id){
 requireThat(['manager','admin'].includes(account.staffRole),403,'Manager approval required.');
 if(!id&&method==='GET')return {topups:s.all('SELECT t.*,b.name AS branchName FROM topups t JOIN branches b ON b.id=t.branchId ORDER BY t.createdAt DESC')};
 if(!id||method!=='POST')return;
 return s.tx(()=>{
   const row=s.one('SELECT * FROM topups WHERE id=?',id);requireThat(row,404,'Top-up not found.');
   requireThat(!s.member(row.branchId,account),403,'An independent manager must approve.');
   requireThat(['approved','rejected'].includes(data.decision),400,'Invalid decision.');
   const reason=text(data.reason,600,'decision reason');
   const ref=data.decision==='approved'?text(data.externalReference,160,'cleared bank transaction reference'):null;
   if(row.status===data.decision&&row.externalReference===ref&&row.reason===reason)return {topup:row};
   requireThat(row.status==='pending',409,'Top-up already decided.');
   if(ref){requireThat(row.method==='bank',409,'This payment method requires provider confirmation.');requireThat(!s.one('SELECT id FROM topups WHERE externalReference=?',ref),409,'Bank transaction was already credited.');}
   s.run('UPDATE topups SET status=?,reason=?,externalReference=? WHERE id=?',data.decision,reason,ref,id);
   s.audit(account.id,id,'topup.'+data.decision,reason);
   return {topup:s.one('SELECT * FROM topups WHERE id=?',id)};
 });
}
export function createMerchantServer(s,config){
 return createServer(async(req,res)=>{
   const reply=(status,data)=>res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}).end(JSON.stringify(data));
   try{
    const url=new URL(req.url,'http://merchant'),[base,...parts]=url.pathname.split('/').filter(Boolean);
    let result;
    if(base==='internal'){
      result=internalRoute(s,parts,url,req,null,config);
    }else{
      requireThat(base==='merchant',404,'Page not found.');
      if(parts[0]==='images'&&parts.length===2&&req.method==='GET'){
        const img=s.one('SELECT mime,bytes FROM published_images WHERE id=?',parts[1]);requireThat(img,404,'Photo not found.');
        res.writeHead(200,{'content-type':img.mime,'x-content-type-options':'nosniff','cache-control':'public,max-age=3600','content-security-policy':"default-src 'none'"}).end(Buffer.from(img.bytes));return;
      }
      const token=req.headers.authorization;requireThat(token?.startsWith('Bearer '),401,'Sign in to continue.');
      const auth=await fetch(new URL('/session',config.identity),{headers:{authorization:token},signal:AbortSignal.timeout(3000)});
      requireThat(auth.ok,auth.status===401?401:503,'Account service unavailable or session expired.');
      const account=await auth.json();requireThat(account.id&&account.email,401,'Sign in to continue.');
      requireThat(!s.one('SELECT 1 FROM closed_accounts WHERE ownerHash=?',createHash('sha256').update(account.id).digest('hex')),403,'Account closed.');
      s.bindStaff(account);
      const method=req.method;
      const data=method==='POST'?await read(req,parts[0]==='documents'?14*1024*1024:parts[2]==='image'?7*1024*1024:65536):{};
      requireThat(!s.one('SELECT 1 FROM closed_accounts WHERE ownerHash=?',createHash('sha256').update(account.id).digest('hex')),403,'Account closed.');
      const ctx={s,account,data,parts,method,url,res,config};
      if(parts[0]==='topups')result=reviewTopups(ctx,parts[1]);
      else if(parts[0]==='branches'&&parts[1]){
        const b=s.member(parts[1],account);requireThat(b,403,'You do not have access to this branch.');
        result=editBranch(ctx,b,parts[2]);
        if(result===undefined)result=await operations(ctx,b,parts[2],parts[3]);
      }else result=partnerRoute(ctx);
    }
    if(res.writableEnded)return;
    requireThat(result!=null,404,'Page not found.');reply(200,result);
   }catch(e){if(!res.writableEnded)reply(e instanceof Fault?e.status:503,{error:e instanceof Fault?e.message:'Restaurant service unavailable. Please retry.'});}
 });
}
