import {requireThat} from './store.mjs';
export function text(val,max,label){requireThat(typeof val==='string'&&val.trim()&&val.trim().length<=max,400,'Check '+label+'.');return val.trim();}
export function email(val){const result=text(val,254,'email address').toLowerCase();requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result),400,'Check email address.');return result;}
export function city(val){requireThat(['Islamabad','Rawalpindi'].includes(val),400,'Choose a supported city.');return val;}
export function amount(val,allowZero=false){requireThat(Number.isSafeInteger(val)&&val>=(allowZero?0:1)&&val<=100000000,400,'Check amount in paisa.');return val;}
export function document(input){
  const {kind,mime,base64}=input;
  const limit=(kind==='photo'?10:5)*1024*1024;
  requireThat(['license','cnic','photo'].includes(kind),400,'Choose a document type.');
  requireThat((kind==='photo'?['image/jpeg','image/png']:['application/pdf','image/jpeg']).includes(mime),400,'Unsupported document format.');
  requireThat(typeof base64==='string'&&base64.length>0&&base64.length<=4*Math.ceil(limit/3)&&base64.length%4===0,400,'Document empty or too large.');
  const bytes=Buffer.from(base64,'base64');
  requireThat(bytes.length<=limit&&bytes.toString('base64')===base64,400,'Invalid attachment encoding.');
  const signatures={'application/pdf':Buffer.from('%PDF-'),'image/jpeg':Buffer.from('ffd8ff','hex'),'image/png':Buffer.from('89504e470d0a1a0a','hex')};
  const sig=signatures[mime];requireThat(bytes.subarray(0,sig.length).equals(sig),400,'File contents do not match the selected format.');
  return {kind,mime,bytes,name:text(input.name,160,'file name').replace(/[\/\\\r\n]/g,'_')};
}
export function hours(val){
  requireThat(Array.isArray(val)&&val.length===7&&new Set(val.map(v=>v?.day)).size===7,400,'Provide seven days of hours.');
  return val.map(v=>{
    requireThat(Number.isInteger(v.day)&&v.day>=0&&v.day<=6&&typeof v.enabled==='boolean'&&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(v.open)&&(v.close==='24:00'||/^([01]\d|2[0-3]):[0-5]\d$/.test(v.close)),400,'Check opening hours.');
    requireThat(!v.enabled||v.open!==v.close,400,'Choose different opening and closing times.');
    return {day:v.day,enabled:v.enabled,open:v.open,close:v.close};
  });
}
export const defaultHours=()=>Array.from({length:7},(_,day)=>({day,open:'11:00',close:'22:00',enabled:false}));
export function openNow(schedule,time=new Date()){
  const local=new Date(time.getTime()+5*3600000);
  const day=local.getUTCDay(),clock=local.toISOString().slice(11,16);
  return schedule.some(h=>h.enabled&&(h.open<h.close ?
    h.day===day&&clock>=h.open&&clock<h.close :
    (h.day===day&&clock>=h.open)||((h.day+1)%7===day&&clock<h.close)));
}
export function point(p){return p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;}
const cross=(a,b,p)=>(b.longitude-a.longitude)*(p.latitude-a.latitude)-(b.latitude-a.latitude)*(p.longitude-a.longitude);
const between=(a,b,p)=>Math.abs(cross(a,b,p))<1e-12&&p.latitude>=Math.min(a.latitude,b.latitude)&&p.latitude<=Math.max(a.latitude,b.latitude)&&p.longitude>=Math.min(a.longitude,b.longitude)&&p.longitude<=Math.max(a.longitude,b.longitude);
function intersects(a,b,c,d){return (cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||between(a,b,c)||between(a,b,d)||between(c,d,a)||between(c,d,b);}
export function polygon(input){
  requireThat(Array.isArray(input)&&input.length>=3&&input.length<=64&&input.every(point),400,'Mark 3–64 boundary points.');
  const p=input.map(v=>({latitude:v.latitude,longitude:v.longitude}));
  requireThat(new Set(p.map(v=>v.latitude+','+v.longitude)).size===p.length,400,'Remove duplicate boundary points.');
  let area=0;
  for(let i=0;i<p.length;i++){
    const j=(i+1)%p.length;
    area+=p[i].longitude*p[j].latitude-p[j].longitude*p[i].latitude;
    for(let k=i+2;k<p.length;k++){const l=(k+1)%p.length;if(l!==i)requireThat(!intersects(p[i],p[j],p[k],p[l]),400,'Boundary lines cannot cross.');}
  }
  requireThat(Math.abs(area)>1e-10,400,'Select an area with nonzero size.');return p;
}
export function contains(p,v){
  let hit=false;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const a=p[i],b=p[j];if(between(a,b,v))return true;
    if((a.latitude>v.latitude)!==(b.latitude>v.latitude)&&v.longitude<(b.longitude-a.longitude)*(v.latitude-a.latitude)/(b.latitude-a.latitude)+a.longitude)hit=!hit;
  }
  return hit;
}
