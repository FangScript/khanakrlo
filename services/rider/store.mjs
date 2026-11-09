import { DatabaseSync } from 'node:sqlite';

export function requireState(condition, status, message) {
  if (!condition) throw Object.assign(new Error(message), { status });
}
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS riders (
      id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL,city TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT, reviewer TEXT,online INTEGER NOT NULL DEFAULT 0,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS assignments (
      orderId TEXT PRIMARY KEY,riderId TEXT NOT NULL REFERENCES riders(id),status TEXT NOT NULL DEFAULT 'assigned',
      baseFee INTEGER,completed TEXT,payoutRef TEXT);
    CREATE UNIQUE INDEX IF NOT EXISTS current_trip ON assignments(riderId) WHERE status='assigned';
    CREATE TABLE IF NOT EXISTS stops (
      orderId TEXT NOT NULL REFERENCES assignments(orderId),branchId TEXT NOT NULL,name TEXT NOT NULL,amount INTEGER NOT NULL,
      picked INTEGER NOT NULL DEFAULT 0,cashGiven INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(orderId,branchId));
    CREATE TABLE IF NOT EXISTS payouts (
      reference TEXT PRIMARY KEY,riderId TEXT NOT NULL,amount INTEGER NOT NULL,actor TEXT NOT NULL,createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const list = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      db.exec('COMMIT');
      return result;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  }
  return {
    one,
    list,
    run,
    tx,
    close: () => db.close(),
    assign(order, riderId, fee) {
      return tx(() => {
        const prior = one('SELECT riderId,status FROM assignments WHERE orderId=?', order.id);
        if (prior?.riderId === riderId && prior.status === 'assigned') return;
        requireState(!prior, 409, 'Another rider has this delivery.');
        requireState(
          !one("SELECT 1 FROM assignments WHERE riderId=? AND status='assigned'", riderId),
          409,
          'Finish your current delivery first.',
        );
        requireState(
          one("SELECT online FROM riders WHERE id=? AND status='approved'", riderId)?.online,
          409,
          'Go online to accept a delivery.',
        );
        run('INSERT INTO assignments(orderId,riderId,baseFee) VALUES(?,?,?)', order.id, riderId, fee);
        for (const b of order.branches.filter((b) => b.status !== 'cancelled')) {
          const amount = order.items.filter((i) => i.branchId === b.id).reduce((sum, i) => sum + i.total, 0);
          run(
            'INSERT INTO stops(orderId,branchId,name,amount) VALUES(?,?,?,?)',
            order.id,
            b.id,
            b.name,
            amount,
          );
        }
      });
    },
    payout({ riderId, reference, amount }, actor) {
      return tx(() => {
        requireState(
          typeof riderId === 'string' &&
            typeof reference === 'string' &&
            reference.trim().length >= 4 &&
            reference.length <= 120 &&
            Number.isSafeInteger(amount) &&
            amount > 0,
          400,
          'Check the payout reference and amount.',
        );
        requireState(actor !== riderId, 403, 'An independent reviewer must approve this payout.');
        const existing = one('SELECT * FROM payouts WHERE reference=?', reference);
        if (existing) {
          requireState(
            existing.riderId === riderId && existing.amount === amount,
            409,
            'Payout reference already in use.',
          );
          return existing;
        }
        const pending = one(
          "SELECT sum(baseFee) AS due FROM assignments WHERE riderId=? AND status='delivered' AND payoutRef IS NULL AND baseFee IS NOT NULL",
          riderId,
        );
        requireState(pending.due === amount, 409, 'The transfer must match unpaid, priced deliveries.');
        run(
          'INSERT INTO payouts(reference,riderId,amount,actor) VALUES(?,?,?,?)',
          reference,
          riderId,
          amount,
          actor,
        );
        run(
          "UPDATE assignments SET payoutRef=? WHERE riderId=? AND status='delivered' AND baseFee IS NOT NULL AND payoutRef IS NULL",
          reference,
          riderId,
        );
        return one('SELECT * FROM payouts WHERE reference=?', reference);
      });
    },
  };
}
