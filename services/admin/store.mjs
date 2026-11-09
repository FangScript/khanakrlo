import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';

export class Failure extends Error {
  constructor(status,message){super(message);this.status=status;}
}
export const groups = {
  merchant:['reviewer','manager','admin'], rider:['reviewer','manager','admin'],
  roles:['admin'], support:['support','manager','admin'], dispute:['support','manager','admin'],
  refund:['finance','manager','admin'], balance:['finance','manager','admin'],
  payout:['finance','manager','admin'], audit:['manager','admin'],
};
export function allowed(actor,area) {
  if(!actor?.id || !groups[area]?.includes(actor.staffRole))throw new Failure(403,'Access denied.');
}
export function field(input,key,max=500) {
  const text=input?.[key];
  if(typeof text!=='string'||!text.trim()||text.trim().length>max)throw new Failure(400,'Provide a valid '+key+'.');
  return text.trim();
}
function money(input,kind){
  if(typeof input!=='string'||!/^-?\d{1,8}(?:\.\d{1,2})?$/.test(input))throw new Failure(400,'Enter the amount in PKR.');
  const value=Math.round(Number(input)*100);
  if(!value||(kind!=='balance'&&value<0))throw new Failure(400,'Check the amount.');
  return value;
}
export function adminStore(path){
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=4000;
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY, kind TEXT NOT NULL, reference TEXT NOT NULL COLLATE NOCASE,
      amount INTEGER NOT NULL, reason TEXT NOT NULL, evidence TEXT NOT NULL, requestedBy TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending', createdAt TEXT NOT NULL, decidedBy TEXT, decisionReason TEXT,
      decidedAt TEXT, riderId TEXT, UNIQUE(kind,reference));
    CREATE TABLE IF NOT EXISTS audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actorId TEXT NOT NULL, role TEXT NOT NULL, action TEXT NOT NULL,
      reference TEXT NOT NULL, detail TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS audit_immutable BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries are immutable');END;
    CREATE TRIGGER IF NOT EXISTS audit_keep BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'Audit entries are immutable');END;`);
  if(!db.prepare('PRAGMA table_info(reviews)').all().some(column=>column.name==='riderId'))db.exec('ALTER TABLE reviews ADD COLUMN riderId TEXT');
  const audit=(actor,action,reference,detail='')=>db.prepare('INSERT INTO audit(actorId,role,action,reference,detail,createdAt) VALUES(?,?,?,?,?,?)')
    .run(actor.id,actor.staffRole,action,reference,detail,new Date().toISOString());
  function tx(fn){
    db.exec('BEGIN IMMEDIATE');
    try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}
  }
  function list(kind) {return db.prepare('SELECT * FROM reviews WHERE kind=? ORDER BY createdAt DESC LIMIT 300').all(kind);}
  return {
    close:()=>db.close(),audit,list,
    pending:(kind)=>db.prepare("SELECT COUNT(*) AS count FROM reviews WHERE kind=? AND status='pending'").get(kind).count,
    events:()=>db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 500').all(),
    create(actor,kind,input){
      allowed(actor,kind);
      const reference=field(input,'reference',120),reason=field(input,'reason',1000),evidence=field(input,'evidence',600);
      const amount=kind==='dispute'?0:money(input.amount,kind);
      const riderId=kind==='payout'?field(input,'riderId',100):null;
      if(db.prepare('SELECT id FROM reviews WHERE kind=? AND reference=?').get(kind,reference))
        throw new Failure(409,'A review already exists for this reference.');
      return tx(()=>{
        const id=randomUUID();
        db.prepare('INSERT INTO reviews(id,kind,reference,amount,reason,evidence,requestedBy,createdAt,riderId) VALUES(?,?,?,?,?,?,?,?,?)')
          .run(id,kind,reference,amount,reason,evidence,actor.id,new Date().toISOString(),riderId);
        audit(actor,kind+' requested',reference,reason);
        return {id};
      });
    },
    decide(actor,kind,id,input){
      allowed(actor,kind);
      if(!['admin','manager'].includes(actor.staffRole))throw new Failure(403,'A manager must record this decision.');
      const reason=field(input,'reason',1000),decision=input.decision;
      if(!['approved','rejected'].includes(decision))throw new Failure(400,'Choose approve or reject.');
      if(kind==='payout'&&decision==='approved')throw new Failure(409,'Confirm this payout against rider earnings.');
      return tx(()=>{
        const row=db.prepare('SELECT * FROM reviews WHERE kind=? AND id=?').get(kind,id);
        if(!row)throw new Failure(404,'Review not found.');
        if(row.requestedBy===actor.id)throw new Failure(403,'Another manager must review your request.');
        if(row.status!=='pending')throw new Failure(409,'This review already has a decision.');
        const status=decision==='rejected'?'rejected':({dispute:'resolved',payout:'reconciled',refund:'approved_pending_processor',balance:'approved_pending_posting'})[kind];
        db.prepare('UPDATE reviews SET status=?,decidedBy=?,decisionReason=?,decidedAt=? WHERE id=?')
          .run(status,actor.id,reason,new Date().toISOString(),id);
        audit(actor,kind+' '+status,row.reference,reason);
        return {status};
      });
    },
    reservePayout(actor,id,input){
      if(!['manager','admin'].includes(actor.staffRole))throw new Failure(403,'Manager approval required.');
      const reason=field(input,'reason',1000);
      return tx(()=>{
        const row=db.prepare("SELECT * FROM reviews WHERE kind='payout' AND id=?").get(id);
        if(!row)throw new Failure(404,'Payout not found.');
        if(row.requestedBy===actor.id)throw new Failure(403,'Another manager must review your request.');
        if(!row.riderId)throw new Failure(400,'This request has no rider.');
        if(!['pending','confirming'].includes(row.status))throw new Failure(409,'A decision already exists.');
        db.prepare("UPDATE reviews SET status='confirming',decidedBy=?,decisionReason=? WHERE id=?").run(actor.id,reason,id);
        audit(actor,'Payout confirmation requested',row.reference,reason);
        return row;
      });
    },
    finishPayout(actor,id,success){
      return tx(()=>{
        const row=db.prepare("SELECT * FROM reviews WHERE id=? AND kind='payout'").get(id);
        if(!row||row.status!=='confirming')return;
        const status=success?'reconciled':'pending';
        db.prepare("UPDATE reviews SET status=?,decidedAt=? WHERE id=?").run(status,success?new Date().toISOString():null,id);
        audit(actor,'Payout '+status,row.reference,success?'Rider earnings reconciled to bank reference.':'Transfer details require review.');
      });
    },
  };
}
