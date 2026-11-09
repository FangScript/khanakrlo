import { DatabaseSync } from 'node:sqlite';
import {randomUUID} from 'node:crypto';
export class Fault extends Error { constructor(status,message){ super(message);this.status=status; } }
export function requireThat(value,status,message){if(!value)throw new Fault(status,message);}
export const TERMS={version:'partner-v1',text:'I confirm the information and documents are accurate. I accept branch review and the 20% prepaid commission reserve on accepted orders. I will keep my service area, operating hours and menu up to date and record cash handovers accurately.'};
export const uuid=()=>randomUUID();
export const now=()=>new Date().toISOString();
export function createStore(path){
 const db=new DatabaseSync(path);
 db.exec(`
 PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
 CREATE TABLE IF NOT EXISTS applications(id TEXT PRIMARY KEY,owner TEXT NOT NULL UNIQUE,name TEXT NOT NULL,address TEXT NOT NULL,city TEXT NOT NULL,email TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',termsVersion TEXT,submittedAt TEXT,reason TEXT NOT NULL DEFAULT '');
 CREATE TABLE IF NOT EXISTS documents(applicationId TEXT NOT NULL REFERENCES applications(id),kind TEXT NOT NULL,name TEXT NOT NULL,mime TEXT NOT NULL,bytes BLOB NOT NULL,PRIMARY KEY(applicationId,kind));
 CREATE TABLE IF NOT EXISTS branches(id TEXT PRIMARY KEY,applicationId TEXT NOT NULL REFERENCES applications(id),name TEXT NOT NULL,city TEXT NOT NULL,address TEXT NOT NULL,open INTEGER DEFAULT 0,hours TEXT NOT NULL,area TEXT NOT NULL DEFAULT '[]',pin TEXT,menu TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS staff(branchId TEXT NOT NULL REFERENCES branches(id),email TEXT NOT NULL,account TEXT,role TEXT NOT NULL,PRIMARY KEY(branchId,email));
 CREATE TABLE IF NOT EXISTS published_images(id TEXT PRIMARY KEY,branchId TEXT NOT NULL REFERENCES branches(id),slot TEXT NOT NULL,mime TEXT NOT NULL,bytes BLOB NOT NULL,UNIQUE(branchId,slot));
 CREATE TABLE IF NOT EXISTS topups(id TEXT PRIMARY KEY,branchId TEXT NOT NULL REFERENCES branches(id),requestKey TEXT NOT NULL,amount INTEGER NOT NULL,method TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',createdAt TEXT NOT NULL,reason TEXT,externalReference TEXT UNIQUE,UNIQUE(branchId,requestKey));
 CREATE TABLE IF NOT EXISTS reservations(branchId TEXT NOT NULL REFERENCES branches(id),orderId TEXT NOT NULL,amount INTEGER NOT NULL,status TEXT NOT NULL,createdAt TEXT NOT NULL,settledAt TEXT,PRIMARY KEY(branchId,orderId));
 CREATE TABLE IF NOT EXISTS handoffs(branchId TEXT NOT NULL,orderId TEXT NOT NULL,riderId TEXT NOT NULL,actor TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(branchId,orderId));
 CREATE TABLE IF NOT EXISTS receipts(branchId TEXT NOT NULL,orderId TEXT NOT NULL,amount INTEGER NOT NULL,actor TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(branchId,orderId));
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at TEXT,actor TEXT,resource TEXT,action TEXT,reason TEXT);
 CREATE TABLE IF NOT EXISTS closed_accounts(ownerHash TEXT PRIMARY KEY);
 `);
 const all=(q,...p)=>db.prepare(q).all(...p);
 const one=(q,...p)=>db.prepare(q).get(...p);
 const run=(q,...p)=>db.prepare(q).run(...p);
 function tx(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 function app(id){
   const a=one('SELECT * FROM applications WHERE id=?',id); if(!a)return null;
   const {owner,...publicInfo}=a;
   return {...publicInfo,termsAccepted:!!a.termsVersion,documents:all('SELECT kind,name,mime,length(bytes) AS size FROM documents WHERE applicationId=?',id)};
 }
 function audit(actor,resource,action,reason=''){run('INSERT INTO audit(at,actor,resource,action,reason) VALUES(?,?,?,?,?)',now(),actor,resource,action,reason);}
 function member(branchId,account){
   const b=one("SELECT b.*,a.owner FROM branches b JOIN applications a ON a.id=b.applicationId WHERE b.id=? AND a.status='approved'",branchId);
   if(!b)return null;
   if(b.owner===account.id)return {...b,role:'owner'};
   const row=one('SELECT role FROM staff WHERE branchId=? AND account=?',branchId,account.id);
   return row?{...b,role:row.role}:null;
 }
 function bindStaff(account){
   if(account.emailVerified===true)run('UPDATE staff SET account=? WHERE account IS NULL AND email=?',account.id,account.email.toLowerCase());
 }
 function branch(b){
   const {owner,applicationId,...pub}=b;
   return {...pub,...imageLinks(b),open:!!b.open,hours:JSON.parse(b.hours),area:JSON.parse(b.area),pin:b.pin?JSON.parse(b.pin):null,
     staff:['owner','manager'].includes(b.role)?all('SELECT email AS id,email,role FROM staff WHERE branchId=?',b.id):[]};
 }
 function imageLinks(b){
   const urls=new Map(all('SELECT id,slot FROM published_images WHERE branchId=?',b.id).map(row=>[row.slot,'/merchant/images/'+row.id]));
   return {imageUrl:urls.get('branch')||null,menu:JSON.parse(b.menu).map(d=>({...d,imageUrl:urls.get('dish:'+d.id)||null}))};
 }
 const branchList=(owner)=>all(`SELECT b.id,b.name,b.city,b.address,b.open,CASE WHEN a.owner=? THEN 'owner' ELSE s.role END AS role FROM branches b JOIN applications a ON b.applicationId=a.id LEFT JOIN staff s ON s.branchId=b.id AND s.account=? WHERE a.status='approved' AND (a.owner=? OR s.account=?)`,owner,owner,owner,owner).map(b=>({...b,open:!!b.open}));
 function available(branchId){
   const sums=one(`SELECT (SELECT COALESCE(SUM(amount),0) FROM topups WHERE status='approved' AND branchId=?) AS funded,
    (SELECT COALESCE(SUM(amount),0) FROM reservations WHERE status IN ('pending','reserved','charged') AND branchId=?) AS used,
    (SELECT COALESCE(SUM(amount),0) FROM reservations WHERE status IN ('pending','reserved') AND branchId=?) AS reserved`,branchId,branchId,branchId);
   return {available:sums.funded-sums.used,reserved:sums.reserved};
 }
 return {db,one,all,run,tx,app,audit,member,bindStaff,branch,branchList,available,imageLinks};
}
