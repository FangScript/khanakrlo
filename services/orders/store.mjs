import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { OrderError } from './quote.mjs';
import { updateBranch } from './transitions.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const missing = () => new OrderError(404, 'Order not found.');
export function createStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, owner TEXT, request_key TEXT, request_hash TEXT,
      summary TEXT NOT NULL, otp TEXT, created TEXT NOT NULL,
      UNIQUE(owner,request_key)
    );
    CREATE INDEX IF NOT EXISTS orders_by_owner ON orders(owner,created);
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id),
      role TEXT NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_by_order ON messages(order_id);
    CREATE TABLE IF NOT EXISTS erased_accounts (owner_hash TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS events (
      order_id TEXT NOT NULL REFERENCES orders(id), event_key TEXT NOT NULL,
      signature TEXT NOT NULL, title TEXT NOT NULL, created TEXT NOT NULL,
      PRIMARY KEY(order_id,event_key)
    );
    CREATE TABLE IF NOT EXISTS rejected_codes (
      order_id TEXT PRIMARY KEY REFERENCES orders(id), failures INTEGER NOT NULL, since INTEGER NOT NULL
    );
  `);

  function usable(owner) {
    if (db.prepare('SELECT 1 FROM erased_accounts WHERE owner_hash=?').get(digest(owner))) {
      throw new OrderError(403, 'This account is closed.');
    }
  }
  function orderRow(owner, id) {
    const row = db.prepare('SELECT summary,otp FROM orders WHERE owner=? AND id=?').get(owner, id);
    if (!row) throw missing();
    return row;
  }
  function transaction(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  function previous(owner, key, cart) {
    const row = db.prepare('SELECT summary,request_hash FROM orders WHERE owner=? AND request_key=?').get(owner,key);
    if (!row) return null;
    if (row.request_hash !== digest(JSON.stringify(cart))) throw new OrderError(409, 'This checkout was used for a different cart.');
    return JSON.parse(row.summary);
  }
  function list(owner) {
    return db.prepare('SELECT summary FROM orders WHERE owner=? ORDER BY created DESC,rowid DESC')
      .all(owner).map(row => JSON.parse(row.summary));
  }
  return {
    close: () => db.close(),
    usable, list, previous,
    dispatch() {
      return db.prepare('SELECT summary FROM orders ORDER BY created DESC').all().map(({summary})=>{
        const o=JSON.parse(summary);
        return {id:o.id,createdAt:o.createdAt,deliveredAt:o.deliveredAt,status:o.status,city:o.city,address:o.address,pin:o.pin,branches:o.branches,
          items:o.items,payment:o.payment,paymentStatus:o.paymentStatus,subtotal:o.subtotal,delivery:o.delivery,total:o.total};
      });
    },
    cases() {
      return db.prepare(`SELECT o.id,o.id AS orderId,(SELECT created FROM messages WHERE order_id=o.id ORDER BY rowid DESC LIMIT 1) AS createdAt,
        (SELECT body FROM messages WHERE order_id=o.id ORDER BY rowid DESC LIMIT 1) AS lastMessage,
        (SELECT body FROM messages WHERE order_id=o.id ORDER BY rowid ASC LIMIT 1) AS subject,
        (SELECT CASE role WHEN 'customer' THEN 'open' ELSE 'replied' END FROM messages WHERE order_id=o.id ORDER BY rowid DESC LIMIT 1) AS status
        FROM orders o WHERE o.owner IS NOT NULL AND EXISTS (SELECT 1 FROM messages m WHERE m.order_id=o.id) ORDER BY createdAt DESC`).all();
    },
    caseDetail(id) {
      const row=db.prepare('SELECT owner,summary FROM orders WHERE id=? AND owner IS NOT NULL AND EXISTS (SELECT 1 FROM messages WHERE order_id=?)').get(id,id);
      if(!row)throw missing();
      const {address,pin,...order}=JSON.parse(row.summary);
      return {messages:this.messages(row.owner,id),order};
    },
    replyToCase(id,text,actorId) {
      this.caseDetail(id);
      const message={id:randomUUID(),role:'support',text,createdAt:new Date().toISOString()};
      db.prepare('INSERT INTO messages(id,order_id,role,body,created) VALUES(?,?,?,?,?)').run(message.id,id,message.role,text,message.createdAt);
      return message;
    },
    read: (owner,id) => JSON.parse(orderRow(owner,id).summary),
    notifications(owner) {
      // UNION supports orders placed before event storage was introduced.
      return db.prepare(`SELECT id || '-received' AS id,id AS orderId,'Order received' AS title,created AS createdAt
        FROM orders WHERE owner=? UNION ALL
        SELECT e.order_id || '-' || e.event_key,e.order_id,e.title,e.created FROM events e
        JOIN orders o ON e.order_id=o.id WHERE o.owner=? ORDER BY createdAt DESC`).all(owner,owner);
    },
    otp: (owner,id) => {
      const row = orderRow(owner,id);
      if (!row.otp || ['delivered','cancelled'].includes(JSON.parse(row.summary).status)) {
        throw new OrderError(409, 'There is no active handover code for this order.');
      }
      return row.otp;
    },
    place(owner, key, cart, quote) {
      return transaction(() => {
        usable(owner);
        const existing = previous(owner,key,cart);
        if (existing) return {created:false,order:existing};
        const id = 'KK-' + randomBytes(8).toString('hex').toUpperCase();
        const createdAt = new Date().toISOString();
        const order = { id, createdAt, status:'received', paymentStatus:'unpaid', payment:cart.payment,
          city:cart.city, address:cart.address, ...(cart.pin ? {pin:cart.pin} : {}), ...quote, adjustments:[] };
        const code = String(randomInt(10000)).padStart(4,'0');
        db.prepare('INSERT INTO orders(id,owner,request_key,request_hash,summary,otp,created) VALUES(?,?,?,?,?,?,?)')
          .run(id,owner,key,digest(JSON.stringify(cart)),JSON.stringify(order),code,createdAt);
        return {created:true,order};
      });
    },
    recordEvent(id,event) {
      if (typeof event?.eventId !== 'string' || !/^[a-zA-Z0-9_-]{8,128}$/.test(event.eventId)) {
        throw new OrderError(400,'A unique event identifier is required.');
      }
      const result = transaction(() => {
        const row = db.prepare('SELECT owner,summary,otp FROM orders WHERE id=?').get(id);
        if (!row?.owner) throw missing();
        const order = JSON.parse(row.summary);
        const signature = digest(JSON.stringify([event.type,event.branchId || null]));
        const prior = db.prepare('SELECT signature FROM events WHERE order_id=? AND event_key=?').get(id,event.eventId);
        if (prior) {
          if (prior.signature !== signature) throw new OrderError(409,'Event identifier already used.');
          return {recorded:true};
        }
        if (['delivered','cancelled'].includes(order.status)) throw new OrderError(409,'This order is closed.');
        const now = new Date();
        const createdAt = now.toISOString();
        let title;
        if (event.type==='delivered') {
          if (order.status!=='on_the_way') throw new OrderError(409,'Pickup is incomplete.');
          if (event.cashCollected !== order.total) throw new OrderError(409,'Confirm the cash amount collected.');
          const fail = db.prepare('SELECT failures,since FROM rejected_codes WHERE order_id=?').get(id);
          const recent = fail && now.getTime()-fail.since < 120000;
          if (recent && fail.failures>=5) throw new OrderError(429,'Too many code attempts. Try again later.');
          if (typeof event.code !== 'string' || !/^\d{4}$/.test(event.code) || event.code!==row.otp) {
            db.prepare('INSERT OR REPLACE INTO rejected_codes VALUES(?,?,?)').run(id,recent ? fail.failures+1 : 1,recent ? fail.since : now.getTime());
            return {rejected:true}; // Commit the failure counter before returning the error.
          }
          order.status = 'delivered';
          order.deliveredAt = createdAt;
          order.paymentStatus = 'paid';
          title = 'Order delivered';
        } else {
          title = updateBranch(order,event,createdAt);
        }
        const code = ['delivered','cancelled'].includes(order.status) ? null : row.otp;
        db.prepare('UPDATE orders SET summary=?,otp=? WHERE id=?').run(JSON.stringify(order),code,id);
        db.prepare('INSERT INTO events VALUES(?,?,?,?,?)').run(id,event.eventId,signature,title,createdAt);
        return {recorded:true};
      });
      if (result.rejected) throw new OrderError(409,'The handover code is incorrect.');
      return result;
    },
    messages(owner,id) {
      orderRow(owner,id);
      return db.prepare('SELECT id,role,body AS text,created AS createdAt FROM messages WHERE order_id=? ORDER BY rowid')
        .all(id);
    },
    addMessage(owner,orderId,text) {
      return transaction(() => {
        orderRow(owner,orderId);
        const message = {id:randomUUID(),role:'customer',text,createdAt:new Date().toISOString()};
        db.prepare('INSERT INTO messages(id,order_id,role,body,created) VALUES(?,?,?,?,?)')
          .run(message.id,orderId,message.role,text,message.createdAt);
        return message;
      });
    },
    erase(owner) {
      return transaction(() => {
        for (const order of list(owner)) {
          if (['delivered','cancelled'].includes(order.status)) continue;
          // Before a kitchen commits work, closure can withdraw the outstanding COD request.
          if (order.branches.some(b=>!['received','cancelled'].includes(b.status))) {
            throw new OrderError(409,'Finish your active order before closing your account.');
          }
          for(const b of order.branches.filter(b=>b.status==='received')){
            updateBranch(order,{type:'cancelled',branchId:b.id},new Date().toISOString());
          }
          db.prepare('UPDATE orders SET summary=? WHERE id=?').run(JSON.stringify(order),order.id);
        }
        db.prepare('INSERT OR IGNORE INTO erased_accounts(owner_hash) VALUES(?)').run(digest(owner));
        db.prepare('DELETE FROM messages WHERE order_id IN (SELECT id FROM orders WHERE owner=?)').run(owner);
        db.prepare(`UPDATE orders SET owner=NULL,request_key=NULL,request_hash=NULL,otp=NULL,
          summary=json_remove(summary,'$.address','$.pin') WHERE owner=?`).run(owner);
      });
    }
  };
}
