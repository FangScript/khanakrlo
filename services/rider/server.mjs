import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { requireState as check } from './store.mjs';

const digest = (v) =>
  createHash('sha256')
    .update(String(v || ''))
    .digest();
const same = (a, b) => !!a && !!b && timingSafeEqual(digest(a), digest(b));
async function read(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    check(size <= 8192, 413, 'Form too large.');
    chunks.push(chunk);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks));
    if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  } catch {}
  check(false, 400, 'Invalid form.');
}
export function riderServer(store, env) {
  const { one, list, run } = store;
  const key = env.ORDER_OPERATIONS_KEY,
    ops = 'Bearer ' + key;
  async function request(origin, path, authorization, body) {
    const response = await fetch(new URL(path, origin), {
      method: body ? 'POST' : 'GET',
      headers: { authorization, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json().catch(() => ({}));
    check(
      response.ok,
      response.status >= 500 ? 503 : response.status,
      data.error || 'Delivery service unavailable.',
    );
    return data;
  }
  const stops = (id) =>
    list('SELECT branchId,name,amount,picked,cashGiven FROM stops WHERE orderId=? ORDER BY rowid', id);
  const dispatch = async () => (await request(env.ORDERS_ORIGIN, '/internal/dispatch', ops)).orders;
  const getBranch = (id, order) =>
    request(
      env.MERCHANT_ORIGIN,
      '/internal/branch/' + encodeURIComponent(id) + '?orderId=' + encodeURIComponent(order),
      ops,
    );
  return createServer(async (req, res) => {
    function send(data, status = 200) {
      res
        .writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' })
        .end(JSON.stringify(data));
    }
    try {
      const path = new URL(req.url, 'http://rider').pathname,
        get = req.method === 'GET',
        post = req.method === 'POST';
      const erase = /^\/internal\/accounts\/([\da-f-]{36})\/(erase|can-close)$/.exec(path);
      if (erase && post) {
        check(
          same(req.headers.authorization, 'Bearer ' + env.ACCOUNT_ERASURE_KEY) &&
            env.ACCOUNT_ERASURE_KEY?.length >= 24,
          403,
          'Access denied.',
        );
        check(
          !one("SELECT 1 FROM assignments WHERE riderId=? AND status='assigned'", erase[1]),
          409,
          'Complete your active delivery before closing your account.',
        );
        if (erase[2] === 'erase')
          run(
            "UPDATE riders SET name='',email='',city='',online=0,status='closed',reason=NULL WHERE id=?",
            erase[1],
          );
        return send({ ok: true });
      }
      if (path.startsWith('/internal/')) {
        check(get && key?.length >= 24 && same(req.headers.authorization, ops), 403, 'Access denied.');
        const [, area, id] = path.slice(1).split('/');
        if (area === 'workspace')
          return send({ approved: one('SELECT status FROM riders WHERE id=?', id)?.status === 'approved' });
        check(area === 'assignments', 404, 'Route unavailable.');
        const trip = one('SELECT riderId,status FROM assignments WHERE orderId=?', id);
        check(trip, 404, 'Assignment not found.');
        const rows = stops(id);
        return send({
          ...trip,
          pickups: rows.filter((s) => s.picked).map((s) => s.branchId),
          cashHandoffs: rows.filter((s) => s.cashGiven).map((s) => s.branchId),
        });
      }
      const auth = req.headers.authorization;
      check(/^Bearer [a-f0-9]{64}$/.test(auth || ''), 401, 'Sign in to continue.');
      const user = await request(env.IDENTITY_ORIGIN, '/session', auth);
      const rider = one('SELECT id,name,city,status,reason,online FROM riders WHERE id=?', user.id);
      if (path === '/rider/me' && get) return send({ rider: rider || null });
      if (path === '/rider/apply' && post) {
        const { name, city } = await read(req);
        check(
          typeof name === 'string' &&
            name.trim().length >= 2 &&
            name.length <= 100 &&
            ['Rawalpindi', 'Islamabad'].includes(city),
          400,
          'Enter your name and choose a delivery city.',
        );
        check(!rider || rider.status === 'rejected', 409, 'Your application has already been submitted.');
        run(
          "INSERT INTO riders(id,name,email,city) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,city=excluded.city,status='pending',reviewer=NULL,reason=NULL WHERE riders.status='rejected'",
          user.id,
          name.trim(),
          user.email,
          city,
        );
        return send({ submitted: true }, 201);
      }
      if (path.startsWith('/rider/reviews')) {
        check(['admin', 'reviewer', 'manager'].includes(user.staffRole), 403, 'Reviewer access required.');
        if (path === '/rider/reviews' && get)
          return send({
            applications: list(
              'SELECT id,name,email,city,status,reason,createdAt FROM riders ORDER BY createdAt DESC',
            ),
          });
        const match = /^\/rider\/reviews\/([\w-]+)$/.exec(path);
        if (match && get) {
          const record = one(
            'SELECT id,name,email,city,status,reason,createdAt FROM riders WHERE id=?',
            match[1],
          );
          check(record, 404, 'Application unavailable.');
          return send({ application: record });
        }
        check(match && post, 404, 'Application unavailable.');
        const { decision, reason } = await read(req);
        check(user.id !== match[1], 403, 'Another reviewer must review this application.');
        check(
          ['approved', 'rejected'].includes(decision) &&
            typeof reason === 'string' &&
            reason.trim() &&
            reason.length <= 1000,
          400,
          'Enter a decision and reason.',
        );
        check(
          run(
            "UPDATE riders SET status=?,reason=?,reviewer=? WHERE id=? AND status='pending'",
            decision,
            reason.trim(),
            user.id,
            match[1],
          ).changes,
          409,
          'Application is no longer pending.',
        );
        return send({ status: decision });
      }
      if (path === '/rider/payouts/confirm' && post) {
        check(
          same(req.headers['x-admin-key'], env.ADMIN_ACCESS_KEY) &&
            ['admin', 'manager'].includes(user.staffRole),
          403,
          'Payout reviewer required.',
        );
        return send(store.payout(await read(req), user.id));
      }
      check(rider?.status === 'approved', 403, 'Your rider application must be approved.');
      if (path === '/rider/availability' && post) {
        const { online } = await read(req);
        check(typeof online === 'boolean', 400, 'Choose a status.');
        run('UPDATE riders SET online=? WHERE id=?', Number(online), user.id);
        return send({ online });
      }
      if (path === '/rider/earnings' && get) {
        const deliveries = list(
          "SELECT orderId,baseFee,completed,payoutRef FROM assignments WHERE riderId=? AND status='delivered' ORDER BY completed DESC",
          user.id,
        );
        return send({
          deliveries,
          payouts: list(
            'SELECT reference,amount,createdAt FROM payouts WHERE riderId=? ORDER BY createdAt DESC',
            user.id,
          ),
        });
      }
      const orders = await dispatch();
      // Recover after an upstream event succeeds but this service restarts before its local update.
      for (const trip of list(
        "SELECT orderId FROM assignments WHERE riderId=? AND status='assigned'",
        user.id,
      )) {
        const order = orders.find((o) => o.id === trip.orderId);
        if (!order) continue;
        for (const b of order.branches) {
          if (b.status === 'cancelled')
            run('DELETE FROM stops WHERE orderId=? AND branchId=? AND picked=0', order.id, b.id);
          if (b.status === 'picked_up')
            run('UPDATE stops SET picked=1 WHERE orderId=? AND branchId=?', order.id, b.id);
        }
        if (['cancelled', 'delivered'].includes(order.status))
          run(
            'UPDATE assignments SET status=?,completed=CURRENT_TIMESTAMP WHERE orderId=?',
            order.status,
            order.id,
          );
      }
      const active = one("SELECT orderId FROM assignments WHERE riderId=? AND status='assigned'", user.id);
      const ready = (o) =>
        o.city === rider.city &&
        o.status === 'ready' &&
        o.branches.every((b) => ['ready', 'cancelled'].includes(b.status));
      if (path === '/rider/offers' && get) {
        const offers =
          active || !rider.online
            ? []
            : orders
                .filter((o) => ready(o) && !one('SELECT 1 FROM assignments WHERE orderId=?', o.id))
                .map((o) => ({
                  id: o.id,
                  city: o.city,
                  restaurants: o.branches.filter((b) => b.status === 'ready').map((b) => b.name),
                }));
        return send({
          offers,
          active: active?.orderId || null,
          recent: list(
            "SELECT orderId FROM assignments WHERE riderId=? AND status='delivered' ORDER BY completed DESC",
            user.id,
          ),
        });
      }
      const match = /^\/rider\/trips\/(KK-[0-9A-F]{16})(?:\/(claim|pickup|deliver|cash))?$/.exec(path);
      check(match, 404, 'Route unavailable.');
      const [, id, action] = match,
        order = orders.find((o) => o.id === id);
      check(order, 404, 'Order unavailable.');
      if (action === 'claim' && post) {
        check(ready(order), 409, 'This offer is no longer available.');
        const fee = env.RIDER_BASE_PAISA && Number(env.RIDER_BASE_PAISA);
        store.assign(order, user.id, Number.isSafeInteger(fee) && fee >= 0 ? fee : null);
        return send({ orderId: id });
      }
      const trip = one('SELECT * FROM assignments WHERE orderId=? AND riderId=?', id, user.id);
      check(trip, 404, 'Assignment unavailable.');
      if (!action && get) {
        const locations = await Promise.all(
          stops(id).map(async (s) => {
            const branch = await getBranch(s.branchId, id);
            const receipt = s.cashGiven
              ? await request(
                  env.MERCHANT_ORIGIN,
                  '/internal/receipt/' + id + '/' + encodeURIComponent(s.branchId),
                  ops,
                )
              : null;
            return { ...s, address: branch.address, pin: branch.pin, confirmed: !!receipt?.confirmed };
          }),
        );
        return send({
          order: {
            id,
            status: order.status,
            city: order.city,
            address: order.address,
            pin: order.pin,
            total: order.total,
            subtotal: order.subtotal,
            payment: order.payment,
          },
          stops: locations,
        });
      }
      check(post, 405, 'Unsupported method.');
      const input = await read(req);
      if (action === 'deliver') {
        if (trip.status === 'delivered') return send({ delivered: true });
        check(
          order.status === 'on_the_way' && /^\d{4}$/.test(input.code || ''),
          409,
          'Collect each pickup and enter the customer’s four-digit code.',
        );
        await request(env.ORDERS_ORIGIN, '/internal/orders/' + id + '/events', ops, {
          eventId: 'delivery_' + id,
          type: 'delivered',
          code: input.code,
          cashCollected: input.cashCollected,
        });
        run("UPDATE assignments SET status='delivered',completed=CURRENT_TIMESTAMP WHERE orderId=?", id);
        return send({ delivered: true });
      }
      const stop = stops(id).find((s) => s.branchId === input.branchId);
      check(stop, 404, 'Pickup unavailable.');
      if (action === 'pickup') {
        if (stop.picked) return send({ picked: true });
        check(trip.status === 'assigned', 409, 'This trip is closed.');
        const branch = await getBranch(stop.branchId, id);
        check(
          branch.handoffConfirmed && branch.handoffRiderId === user.id,
          409,
          'Ask the restaurant to confirm the handoff first.',
        );
        await request(env.ORDERS_ORIGIN, '/internal/orders/' + id + '/events', ops, {
          eventId: 'pickup_' + digest(stop.branchId).toString('hex'),
          type: 'picked_up',
          branchId: stop.branchId,
        });
        run('UPDATE stops SET picked=1 WHERE orderId=? AND branchId=?', id, stop.branchId);
        return send({ picked: true });
      }
      check(
        action === 'cash' && order.payment === 'cod' && trip.status === 'delivered',
        409,
        'Deliver this cash order first.',
      );
      run('UPDATE stops SET cashGiven=1 WHERE orderId=? AND branchId=?', id, stop.branchId);
      return send({ recorded: true });
    } catch (e) {
      send(
        { error: e.status ? e.message : 'Delivery service unavailable. Please try again.' },
        e.status || 503,
      );
    }
  });
}
