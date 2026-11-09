const app=document.querySelector('#app');
const names={overview:'Operations overview',merchant:'Merchant verification',rider:'Rider approvals',roles:'Roles and access',
  support:'Support cases',dispute:'Dispute review',refund:'Refund approval',balance:'Balance adjustment',payout:'Payout reconciliation',audit:'Audit history'};
const symbols={overview:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',merchant:'M3 10l2-6h14l2 6M4 10h16v10H4zm4 1v3h4v-3',
  rider:'M3 17a3 3 0 1 0 6 0 3 3 0 1 0-6 0m12 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0M6 17l4-8h5l3 8M8 7h4',
  roles:'M5 19v-2c0-4 10-4 10 0v2M13 8a3 3 0 1 1-6 0 3 3 0 1 1 6 0m3 4c3-1 5 1 5 4',
  support:'M3 4h18v12H9l-6 4z',dispute:'M12 3l10 17H2zm0 5v6m0 2v1',refund:'M8 7H3l5-5M3 7h11a7 7 0 1 1 0 14h-3',
  balance:'M3 6h18v14H3zm0 4h18m-5 5h3',payout:'M3 8l9-5 9 5zm2 3v7m5-7v7m5-7v7m4-7v7M3 21h18',
  audit:'M12 3a9 9 0 1 1-8 5M2 3v5h5m5-2v6l4 2'};
let session=null,page='',items={},selection='',filter='',generation=0,busy=false;
let content,notice,searchBox;
function node(type,attrs={},...kids){
  const el=document.createElement(type);
  for(const [key,val] of Object.entries(attrs)){
    if(val==null)continue;
    if(key.startsWith('on'))el.addEventListener(key.slice(2),val);
    else if(key==='class')el.className=val;
    else if(['required','disabled','checked','selected'].includes(key))el[key]=!!val;
    else el.setAttribute(key,val);
  }
  el.append(...kids.flat().filter(x=>x!==null&&x!==undefined));return el;
}
function icon(name){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(svg.namespaceURI,'path');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','glyph');
  path.setAttribute('d',symbols[name]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');
  path.setAttribute('stroke-width','1.8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path);return svg;
}
const button=(label,fn,css='')=>node('button',{type:'button',class:css,onclick:fn},label);
const heading=text=>node('h2',{},text);
const card=(...kids)=>node('section',{class:'card'},kids);
const hint=text=>node('p',{class:'muted'},text);
const lines=arr=>node('dl',{class:'detailList'},arr.flatMap(([k,v])=>[node('dt',{},k),node('dd',{},v??'—')]));
const status=v=>node('span',{class:'status '+(v==='pending'?'pending':v==='rejected'?'rejected':'')},String(v||'Unknown').replaceAll('_',' '));
const date=s=>s?new Date(s).toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short'}):'—';
const cash=n=>Number.isSafeInteger(n)?'PKR '+(n/100).toLocaleString('en-PK',{maximumFractionDigits:2}):'—';
const brand=()=>node('div',{class:'brand'},node('img',{src:'/chef.png',alt:''}),node('span',{},'Khana Krlo',node('small',{},'Admin')));
const empty=text=>node('p',{class:'empty'},text);
const formField=(title,name,kind='text',options={})=>node('label',{},title,kind==='textarea'?node('textarea',{name,required:true,maxlength:1000,...options}):
  node('input',{type:kind,name,required:true,maxlength:200,...options}));
const selectField=(title,name,values)=>node('label',{},title,node('select',{name,'aria-label':title},values.map(([v,label])=>node('option',{value:v},label))));
const matches=row=>!filter||Object.values(row).filter(v=>typeof v==='string'||typeof v==='number').join(' ').toLowerCase().includes(filter.toLowerCase());
async function api(path,data){
  const r=await fetch('/admin/api/'+path,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'content-type':'application/json'},
    body:data===undefined?undefined:JSON.stringify(data),credentials:'same-origin',cache:'no-store'});
  const value=await r.json().catch(()=>({}));
  if(!r.ok){
    if(r.status===401&&path!=='login'){session=null;login();}
    throw Error(value.error||'Could not reach the service.');
  }
  return value;
}
function msg(text,error=false){if(notice)notice.replaceChildren(node('p',{class:error?'error':'message',role:error?'alert':'status'},text));}
function form(fields,submitName,onSubmit){
  const el=node('form',{class:'fields'},...fields,node('button',{type:'submit',class:'primary'},submitName));
  el.addEventListener('submit',async e=>{
    e.preventDefault();if(busy)return;busy=true;const buttons=[...el.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    try{await onSubmit(Object.fromEntries(new FormData(el)));}catch(err){msg(err.message,true);}
    finally{busy=false;buttons.forEach(b=>b.disabled=false);}
  });return el;
}
function table(headers,rows,message){
  return rows.length?node('div',{class:'tableWrap'},node('table',{},node('thead',{},node('tr',{},headers.map(h=>node('th',{scope:'col'},h)))),
    node('tbody',{},rows.map(row=>node('tr',{},row.map(v=>node('td',{},v??'—'))))))):empty(message);
}
function login(){
  generation++;page='';session=null;app.setAttribute('aria-busy','false');document.title='Staff sign in · Khana Krlo';notice=node('div');
  const loginForm=form([node('h1',{},'Staff sign in'),notice,formField('Staff email','email','email',{autocomplete:'username'}),
    formField('Password','password','password',{autocomplete:'current-password',maxlength:256})],'Sign in',async data=>{
      await api('login',data);session=await api('session');await route();
    });
  app.replaceChildren(node('section',{class:'signin'},node('div',{class:'intro'},node('img',{src:'/karahi.jpg',alt:''}),brand()),loginForm));
}
function go(area){if(location.hash==='#'+area){route();return;}location.hash=area;}
function scaffold(){
  const nav=node('nav',{'aria-label':'Admin navigation'},['overview',...session.areas].map(k=>
    node('button',{type:'button',class:'nav'+(k===page?' active':''),'aria-current':k===page?'page':null,onclick:()=>go(k)},icon(k),k==='overview'?'Case queues':names[k])));
  searchBox=node('input',{type:'search','aria-label':'Filter current view',placeholder:'Filter this view…',oninput:e=>{filter=e.target.value.trim();paint();}});
  content=node('div',{class:'content'});notice=node('div',{'aria-live':'polite'});
  app.replaceChildren(node('div',{class:'frame'},node('div',{class:'layout'},node('aside',{},brand(),nav),
    node('section',{class:'mainPane'},node('header',{class:'top'},searchBox,node('div',{class:'account'},
      node('div',{class:'actor'},node('strong',{},session.email),session.staff),
      button('Sign out',async()=>{try{await api('logout',{});login();}catch(e){msg(e.message,true);}},'simple'))),content))));
  app.setAttribute('aria-busy','false');
}
async function route(){
  if(!session)return login();
  page=location.hash.slice(1)||'overview';if(page!=='overview'&&!session.areas.includes(page))page='overview';
  selection='';filter='';items={};document.title=names[page]+' · Khana Krlo';scaffold();await load();
}
async function load(keepMessage=''){
  const version=++generation,key=page;
  content.replaceChildren(node('h1',{},names[key]),notice,hint('Loading…'));
  try{
    const result=await api(key);let extra=null;
    if(key==='balance'){try{extra=await api('topups');}catch(e){extra={error:e.message};}}
    if(version!==generation)return;
    items={...result,extra};paint();if(keepMessage)msg(keepMessage);
  }catch(e){if(version!==generation)return;content.replaceChildren(node('h1',{},names[key]),notice,button('Try again',()=>load()));msg(e.message,true);}
}
function title(){return node('div',{class:'titleRow'},node('h1',{},names[page]),button('Refresh',()=>load(),'simple'));}
function overview(){
  const rows=items.rows.filter(matches);
  return [node('div',{class:'stats'},rows.map(r=>button([icon(r.area),names[r.area],node('strong',{},r.unavailable?'—':r.pending)],()=>go(r.area),'stat'))),
    node('div',{class:'columns'},card(heading('Case queues'),table(['Queue','Pending',''],rows.map(r=>[names[r.area],r.unavailable?'Unavailable':r.pending,button('Open',()=>go(r.area),'rowSelect')]),'No matching queues.')),
      card(node('img',{class:'media',src:'/karahi.jpg',alt:''}),heading('Staff access'),lines([['Signed in as',session.email],['Role',session.staff]])))];
}
function fieldSet(rows){return Object.entries(rows).filter(([,v])=>v!==undefined&&v!==null&&v!=='');}
function selectRow(id){selection=id;paint();}
function applications(){
  const rows=(items.applications||[]).filter(matches),selected=rows.find(r=>r.id===selection)||rows[0];
  const result=[];
  if(selected){
    const id=selected.id,docs=selected.documents||[];
    result.push(node('div',{class:'columns'},card(heading(selected.name||selected.email||'Application'),
      page==='merchant'&&docs.some(d=>d.kind==='photo')?node('img',{class:'media',alt:'Submitted restaurant photo',src:'/admin/api/merchant/'+encodeURIComponent(id)+'/documents/photo?preview=1'}):null,
      lines(fieldSet({Email:selected.email,City:selected.city,Address:selected.address,Status:selected.status,Terms:selected.termsVersion,
        'Terms accepted':selected.termsAccepted==null?null:selected.termsAccepted?'Yes':'No',Submitted:selected.submittedAt&&date(selected.submittedAt)})),
      ...docs.map(d=>page==='merchant'?node('a',{class:'button',href:'/admin/api/merchant/'+encodeURIComponent(id)+'/documents/'+encodeURIComponent(d.kind),download:''},d.name||d.kind):hint(d.name||d.kind))),
      card(heading('Reviewer decision'),['approved','rejected'].includes(selected.status)?
        lines([['Decision',selected.status],['Reason',selected.reason||selected.decisionReason]]):
        form([selectField('Decision','decision',[['approved','Approve'],['rejected','Reject']]),formField('Reviewer reason','reason','textarea')],'Record decision',async data=>{
          await api(page+'/'+encodeURIComponent(id),data);await load('Decision recorded.');
        }))));
  }
  result.push(card(heading('Applications'),table(['Applicant','City','Status','Submitted',''],
    rows.map(r=>[r.name||r.email,r.city||r.address,status(r.status),date(r.submittedAt||r.createdAt),button('Review',()=>selectRow(r.id),'rowSelect')]),
    filter?'No matching applications.':'No applications are waiting for review.')));
  return result;
}
function roles(){
  const entries=(items.staff||[]).filter(matches);
  return [node('div',{class:'columns'},card(heading('Staff access'),form([formField('Registered email','email','email'),
    selectField('New role','role',[['reviewer','Reviewer'],['support','Support'],['finance','Finance'],['manager','Manager'],['admin','Admin'],['','Remove staff access']]),
    formField('Reason','reason','textarea')],'Save access',async data=>{await api('roles',{...data,role:data.role||null});await load('Staff access updated.');})),
    card(heading('Permissions'),table(['Role','Area'],[['Reviewer','Merchant and rider applications'],['Support','Customer cases and disputes'],
      ['Finance','Financial review requests'],['Manager','Operations, approvals and audit'],['Admin','Operations, approvals, audit and staff access']],'No permissions.'))),
    card(heading('Staff directory'),table(['Email','Role'],entries.map(r=>[r.email,status(r.role||r.staffRole)]),'No matching staff.'))];
}
async function selectCase(id){
  const version=++generation;
  try{const result=await api('support/'+encodeURIComponent(id));if(version!==generation)return;selection=id;items.detail=result;paint();}
  catch(e){if(version===generation)msg(e.message,true);}
}
function support(){
  const rows=(items.cases||[]).filter(matches),details=items.detail;
  const result=[card(heading('Orders with support messages'),table(['Order','Subject','Updated',''],rows.map(r=>[r.orderId||r.id,r.subject||r.lastMessage,date(r.createdAt),
    button('Open case',()=>selectCase(r.orderId||r.id),'rowSelect')]),'No matching support cases.'))];
  if(details)result.push(node('div',{class:'columns'},card(heading('Order '+selection),lines([['Order status',details.order?.status],
    ['Payment status',details.order?.paymentStatus],['Total',cash(details.order?.total)]]),
    node('div',{class:'conversation'},(details.messages||[]).map(m=>node('div',{class:'bubble '+(m.role==='staff'?'staff':'')},
      node('small',{},m.role+' · '+date(m.createdAt)),node('p',{},m.text||m.body||''))))),
    card(heading('Reply to customer'),form([formField('Message','text','textarea',{maxlength:2000})],'Send reply',async data=>{
      await api('support/'+encodeURIComponent(selection),data);await selectCase(selection);msg('Reply sent.');
    }))));
  return result;
}
const reviewCopy={
  dispute:['Open dispute','Disputed order reference','Open dispute','Record resolution'],
  refund:['Request refund review','Refund request reference','Submit refund request','Record refund decision'],
  balance:['Request balance adjustment','Adjustment reference','Submit adjustment','Record adjustment decision'],
  payout:['Reconcile a payout','Bank transfer reference','Submit reconciliation','Record reconciliation'],
};
function finance(){
  const kind=page,[newTitle,referenceLabel,createLabel,approveLabel]=reviewCopy[kind],rows=(items.reviews||[]).filter(matches),
    selected=rows.find(r=>r.id===selection)||rows[0],isDispute=kind==='dispute';
  const fields=[formField(referenceLabel,'reference','text',{maxlength:120})];
  if(kind==='payout')fields.push(formField('Rider account ID','riderId','text',{maxlength:100}));
  if(!isDispute)fields.push(formField(kind==='balance'?'Adjustment amount (PKR, signed)':'Amount (PKR)','amount','text',{inputmode:'decimal',maxlength:12}));
  fields.push(formField('Reason','reason','textarea'),formField('Evidence or statement reference','evidence','text',{maxlength:600}));
  const detail=selected?card(heading('Review '+selected.reference),lines([['Status',status(selected.status)],...(!isDispute?[['Amount',cash(selected.amount)]]:[]),
    ...(selected.riderId?[['Rider account ID',selected.riderId]]:[]),['Evidence',selected.evidence],['Reason',selected.reason],['Decision reason',selected.decisionReason]]),
    ['pending','confirming'].includes(selected.status)&&['admin','manager'].includes(session.staff)?form([
      selectField('Decision','decision',[['approved',kind==='payout'?'Confirm bank record':'Approve'],...(selected.status==='confirming'?[]:[['rejected','Reject']])]),
      formField('Decision reason','reason','textarea')],approveLabel,async data=>{
      await api(kind+'/'+selected.id,data);await load('Decision recorded.');
    }):null):card(heading('Review queue'),empty('No review selected.'));
  const result=[node('div',{class:'columns'},card(heading(newTitle),form(fields,createLabel,async data=>{
    const r=await api(kind,data);selection=r.id;await load('Request added to the review queue.');
  })),detail),card(heading('Review history'),table(['Reference',...(isDispute?[]:['Amount']),'Status','Requested',''],
    rows.map(r=>[r.reference,...(isDispute?[]:[cash(r.amount)]),status(r.status),date(r.createdAt),button('Review',()=>selectRow(r.id),'rowSelect')]),'No matching reviews.'))];
  if(kind==='balance')result.push(topups());
  return result;
}
function topups(){
  const extra=items.extra||{},rows=(extra.topups||[]).filter(matches),selected=rows.find(r=>r.id===selection);
  const panel=card(heading('Merchant top-ups'),extra.error?hint('Top-up service unavailable.'):table(['Branch','Amount','Method','Status',''],
    rows.map(r=>[r.branchName||r.branchId,cash(r.amount),r.method,status(r.status),button('Review',()=>selectRow(r.id),'rowSelect')]),'No matching top-ups.'));
  if(selected?.status==='pending'&&['manager','admin'].includes(session.staff))panel.append(form([
    selectField('Decision','decision',[['approved','Approve reconciled transfer'],['rejected','Reject']]),
    formField('Statement reference (required for approval)','externalReference','text',{required:false,maxlength:120}),
    formField('Reviewer reason','reason','textarea')],'Submit top-up decision',async data=>{
    await api('topups/'+selected.id,data);await load('Top-up decision recorded.');
  }));
  return panel;
}
function audit(){
  const rows=(items.events||[]).filter(matches);
  return [card(heading('Activity'),table(['Time','Event','Role','Record','Details'],rows.map(r=>[date(r.createdAt),r.action,status(r.role),r.reference,r.detail||'—']),'No matching activity.'))];
}
function paint(){
  if(!content||!session)return;
  const parts=page==='overview'?(items.rows?overview():[]):['merchant','rider'].includes(page)?applications():page==='roles'?roles():
    page==='support'?support():page==='audit'?audit():finance();
  content.replaceChildren(title(),notice,...parts);
}
window.addEventListener('hashchange',()=>{if(session)route();});
try{session=await api('session');await route();}catch{login();}
