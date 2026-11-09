import {uuid,requireThat} from './store.mjs';
import {text,email,hours,polygon,amount,point,openNow,contains,document} from './validation.mjs';
import {publicPhoto} from './photo.mjs';
export function collectMenu(s,url) {
 const city=url.searchParams.get('city');
 const pin=url.searchParams.has('lat')||url.searchParams.has('lon')?{latitude:Number(url.searchParams.get('lat')),longitude:Number(url.searchParams.get('lon'))}:null;
 if(pin)requireThat(url.searchParams.has('lat')&&url.searchParams.has('lon')&&point(pin),400,'Invalid delivery coordinates.');
 const rows=s.all("SELECT b.* FROM branches b JOIN applications a ON a.id=b.applicationId WHERE b.open=1 AND a.status='approved' AND b.city=?",city||'');
 return {restaurants:rows.filter(b=>openNow(JSON.parse(b.hours))&&(!pin||contains(JSON.parse(b.area),pin))).map(b=>{
   const {imageUrl,menu}=s.imageLinks(b);
   return {id:b.id,name:b.name,city:b.city,cuisine:'Pakistani',address:b.address,pin:JSON.parse(b.pin||'null'),imageUrl,menu:menu.filter(d=>d.available)};
 }).filter(b=>b.menu.length)};
}
export function editBranch({s,account,method,data},b,action){
 const fresh=()=>({branch:s.branch(s.member(b.id,account))});
 if(!action&&method==='GET')return fresh();
 if(method!=='POST'||!['availability','hours','area','staff','dishes','image'].includes(action))return;
 const roles={staff:['owner'],dishes:['owner','manager','menu'],image:data.kind==='dish'?['owner','manager','menu']:['owner','manager'],hours:['owner','manager'],area:['owner','manager'],availability:['owner','manager']};
 requireThat(roles[action].includes(b.role),403,'Your branch role cannot make this change.');
 return s.tx(()=>{
   switch(action){
     case 'image':{
       requireThat(['branch','dish'].includes(data.kind),400,'Choose a branch or dish photo.');
       if(data.kind==='dish')requireThat(JSON.parse(b.menu).some(d=>d.id===data.dishId),404,'Save the dish before uploading its picture.');
       requireThat(typeof data.base64==='string'&&data.base64.length<=4*Math.ceil(5*1024*1024/3),413,'Public photo exceeds 5 MiB.');
       const d=document({kind:'photo',name:'public-photo',mime:data.mime,base64:data.base64});
       const slot=data.kind==='branch'?'branch':'dish:'+data.dishId,id=uuid();
       s.run('DELETE FROM published_images WHERE branchId=? AND slot=?',b.id,slot);
       s.run('INSERT INTO published_images VALUES(?,?,?,?,?)',id,b.id,slot,d.mime,publicPhoto(d.bytes,d.mime));
       s.audit(account.id,b.id,'image.published',slot);
       return {imageUrl:'/merchant/images/'+id,...fresh()};
     }
     case 'availability':{
       requireThat(typeof data.open==='boolean',400,'Choose open or paused.');
       if(data.open)requireThat(JSON.parse(b.hours).some(h=>h.enabled)&&JSON.parse(b.area).length>=3&&JSON.parse(b.menu).some(d=>d.available),409,'Set weekly hours, a delivery area and an available dish first.');
       s.run('UPDATE branches SET open=? WHERE id=?',Number(data.open),b.id);break;
     }
     case 'hours':s.run('UPDATE branches SET hours=? WHERE id=?',JSON.stringify(hours(data.hours)),b.id);break;
     case 'area':{
       if(data.pin!=null)requireThat(point(data.pin),400,'Check pickup pin.');
       const area=polygon(data.area);
       s.run('UPDATE branches SET area=?,pin=COALESCE(?,pin) WHERE id=?',JSON.stringify(area),data.pin?JSON.stringify(data.pin):null,b.id);break;
     }
     case 'staff':{
       const addr=email(data.email);
       requireThat(addr!==account.email.toLowerCase(),400,'Owner membership is already active.');
       requireThat(['manager','kitchen','menu','remove'].includes(data.role),400,'Unknown staff role.');
       if(data.role==='remove')s.run('DELETE FROM staff WHERE branchId=? AND email=?',b.id,addr);
       else s.run('INSERT INTO staff(branchId,email,role) VALUES(?,?,?) ON CONFLICT(branchId,email) DO UPDATE SET role=excluded.role',b.id,addr,data.role);
       break;
     }
     case 'dishes':{
       const menu=JSON.parse(b.menu),productId=data.id?text(data.id,120,'dish identifier'):uuid();
       if(data.id)requireThat(menu.some(d=>d.id===data.id),404,'Dish not found.');
       const photo=data.photo||'biryani';
       requireThat(['biryani','karahi','wrap'].includes(photo)&&typeof data.available==='boolean',400,'Choose a dish image and availability.');
       const item={id:productId,name:text(data.name,120,'dish name'),price:amount(data.price),photo,available:data.available,
         addon:data.addon?{name:text(data.addon.name,90,'add-on name'),price:amount(data.addon.price,true)}:null};
       if(data.description)item.description=text(data.description,300,'dish description');
       if(data.category)item.category=text(data.category,60,'dish category');
       const next=data.id?menu.map(it=>it.id===item.id?item:it):[...menu,item];
       s.run('UPDATE branches SET menu=? WHERE id=?',JSON.stringify(next),b.id);break;
     }
   }
   s.audit(account.id,b.id,action+'.updated');return fresh();
 });
}
