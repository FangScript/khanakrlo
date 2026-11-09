import {requireThat} from './store.mjs';

const valid=value=>requireThat(value,400,'Choose a valid JPEG or PNG up to 4096 pixels per side.');
const dimensions=(w,h)=>valid(w>0&&h>0&&w<=4096&&h<=4096);

// Keep only the pixels, transparency and rendering information needed by the public menu.
export function publicPhoto(bytes,mime){
 if(mime==='image/png'){
   const kept=[bytes.subarray(0,8)];let offset=8,sawPixels=false,sawHeader=false;
   while(offset+12<=bytes.length){
     const size=bytes.readUInt32BE(offset),end=offset+12+size;
     valid(end<=bytes.length);
     const type=bytes.toString('ascii',offset+4,offset+8);
     if(!sawHeader){
       valid(type==='IHDR'&&size===13);
       dimensions(bytes.readUInt32BE(offset+8),bytes.readUInt32BE(offset+12));sawHeader=true;
     }
     if(['IHDR','IDAT','IEND','PLTE','tRNS','gAMA','sRGB','cHRM','sBIT','bKGD'].includes(type))kept.push(bytes.subarray(offset,end));
     if(type==='IDAT')sawPixels=true;
     if(type==='IEND'){valid(sawPixels&&size===0);return Buffer.concat(kept);}
     offset=end;
   }
   valid(false);
 }
 valid(bytes.length>=10&&bytes[0]===255&&bytes[1]===216);
 const kept=[bytes.subarray(0,2)];let offset=2,foundDimensions=false,inScan=false;
 while(offset<bytes.length){
   if(inScan){
     const start=offset;
     while(offset<bytes.length){
       if(bytes[offset]!==255){offset++;continue;}
       const next=bytes[offset+1];
       if(next===0||(next>=208&&next<=215)){offset+=2;continue;}
       break;
     }
     kept.push(bytes.subarray(start,offset));inScan=false;
   }
   valid(bytes[offset]===255);
   while(bytes[offset+1]===255)offset++;
   const marker=bytes[offset+1];valid(marker!==undefined);
   if(marker===217){valid(foundDimensions);kept.push(bytes.subarray(offset,offset+2));return Buffer.concat(kept);}
   valid(offset+4<=bytes.length);
   const size=bytes.readUInt16BE(offset+2),end=offset+size+2;valid(size>=2&&end<=bytes.length);
   if([192,193,194].includes(marker)){valid(size>=8);dimensions(bytes.readUInt16BE(offset+7),bytes.readUInt16BE(offset+5));foundDimensions=true;}
   if(marker===218){valid(foundDimensions);inScan=true;}
   if(marker!==254&&!(marker>=225&&marker<=239))kept.push(bytes.subarray(offset,end));
   offset=end;
 }
 valid(false);
}
