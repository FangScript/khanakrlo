import {requireThat,TERMS,uuid,now} from './store.mjs';
import {text,email,city,document,defaultHours,point} from './validation.mjs';
export function addBranch(s,applicationId,input){
 const id=uuid(),pin=input.pin;
 requireThat(pin==null||point(pin),400,'Check pickup pin.');
 s.run('INSERT INTO branches(id,applicationId,name,address,city,hours,pin) VALUES(?,?,?,?,?,?,?)',id,applicationId,text(input.name,100,'branch name'),text(input.address,400,'pickup address'),city(input.city),JSON.stringify(defaultHours()),pin?JSON.stringify(pin):null);
 return id;
}
export function partnerRoute({s,account,parts,method,data,res}){
 const [path,id,sub,kind]=parts;
 const owner=account.id;
 const mine=s.one('SELECT id,status FROM applications WHERE owner=?',owner);
 const result=()=>({application:s.app(mine.id)});
 const editable=()=>requireThat(mine&&['draft','rejected'].includes(mine.status),409,'The application cannot be edited at this stage.');
 if(path==='me'&&method==='GET')return {application:mine?s.app(mine.id):null,branches:s.branchList(owner),terms:TERMS};
 if(path==='application'&&method==='POST'){
   if(mine)editable();
   const appId=mine?.id||uuid();
   s.run(`INSERT INTO applications(id,owner,name,address,city,email) VALUES(?,?,?,?,?,?) ON CONFLICT(owner) DO UPDATE SET name=excluded.name,address=excluded.address,city=excluded.city,email=excluded.email,status='draft',termsVersion=NULL`,appId,owner,text(data.name,120,'restaurant name'),text(data.address,400,'pickup address'),city(data.city),email(data.email));
   return {application:s.app(appId)};
 }
 if(path==='documents'&&method==='POST'){
   editable();const d=document(data);
   s.run(`INSERT INTO documents VALUES(?,?,?,?,?) ON CONFLICT(applicationId,kind) DO UPDATE SET name=excluded.name,mime=excluded.mime,bytes=excluded.bytes`,mine.id,d.kind,d.name,d.mime,d.bytes);
   return {document:{kind:d.kind,name:d.name,mime:d.mime,size:d.bytes.length}};
 }
 if(path==='submit'&&method==='POST'){
   requireThat(mine,409,'Save your application first.');
   if(mine.status==='submitted')return result();
   editable();requireThat(data.termsVersion===TERMS.version,400,'Accept the current partner terms.');
   requireThat(s.app(mine.id).documents.length===3,400,'Upload the three required documents.');
   return s.tx(()=>{s.run("UPDATE applications SET status='submitted',termsVersion=?,submittedAt=?,reason='' WHERE id=?",TERMS.version,now(),mine.id);
    s.audit(owner,mine.id,'submitted',TERMS.version);return result();});
 }
 if(path==='branches'&&!id&&method==='POST'){
   requireThat(mine?.status==='approved',403,'Approved restaurant owner required.');
   const branchId=addBranch(s,mine.id,data);s.audit(owner,branchId,'branch.created');return {branch:s.branch(s.member(branchId,account))};
 }
 if(path!=='reviews')return;
 requireThat(['reviewer','manager','admin'].includes(account.staffRole),403,'Reviewer access required.');
 if(!id&&method==='GET')return {applications:s.all("SELECT id FROM applications WHERE status!='draft' ORDER BY submittedAt DESC").map(a=>s.app(a.id))};
 const row=s.one("SELECT * FROM applications WHERE id=? AND status!='draft'",id||'');
 requireThat(row,404,'Application not found.');
 requireThat(owner!==row.owner,403,'Another reviewer must handle this application.');
 if(sub==='documents'&&kind&&method==='GET'){
   const file=s.one('SELECT mime,bytes FROM documents WHERE applicationId=? AND kind=?',id,kind);requireThat(file,404,'Evidence not found.');
   res.writeHead(200,{'content-type':file.mime,'content-disposition':'attachment; filename="evidence"','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'"});res.end(Buffer.from(file.bytes));return null;
 }
 if(sub)return;
 if(method==='GET')return {application:s.app(id)};
 if(method==='POST'){
   requireThat(['approved','rejected'].includes(data.decision),400,'Choose a review decision.');
   const reason=text(data.reason,1200,'review reason');
   return s.tx(()=>{
     if(row.status===data.decision&&row.reason===reason)return {application:s.app(id)};
     requireThat(row.status==='submitted',409,'Review is already complete.');
     s.run('UPDATE applications SET status=?,reason=? WHERE id=?',data.decision,reason,id);
     if(data.decision==='approved')addBranch(s,id,row);
     s.audit(owner,id,'review.'+data.decision,reason);return {application:s.app(id)};
   });
 }
}
