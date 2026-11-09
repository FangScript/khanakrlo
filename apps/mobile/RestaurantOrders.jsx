import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
  Button,
  Card,
  Choice,
  Field,
  Food,
  Heading,
  Hero,
  money,
  Pair,
  Row,
  s,
  toPaisa,
} from './RestaurantUI';
const labels = {
  received: 'New',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready',
  picked_up: 'Collected',
  cancelled: 'Cancelled',
};
export function Queue({ orders, select, refresh }) {
  const [filter, setFilter] = useState('All');
  const subset = orders.filter((o) => filter === 'All' || o.status === filter);
  return (
    <>
      <Heading title="Kitchen orders" />
      <View style={s.wrap}>
        {['All', 'received', 'preparing', 'ready'].map((f) => (
          <Choice key={f} label={labels[f] || f} on={filter === f} onPress={() => setFilter(f)} />
        ))}
        <Choice label="Refresh" onPress={refresh} />
      </View>
      {subset.map((o) => (
        <Row
          key={o.id}
          title={o.id}
          detail={
            (labels[o.status] || o.status) +
            ' · ' +
            (o.items || []).map((i) => i.qty + ' × ' + i.name).join(', ')
          }
          icon={o.status === 'ready' ? 'check' : 'orders'}
          onPress={() => select(o)}
        />
      ))}
      {!subset.length && (
        <Card>
          <Text style={s.sub}>Your queue is clear</Text>
          <Text style={s.body}>Orders for this branch appear here.</Text>
        </Card>
      )}
    </>
  );
}
export function OrderTask({ order: o, finance, act, busy, stage, showCancel = true }) {
  const [cancel, setCancel] = useState(false),
    [reason, setReason] = useState('');
  const decision = stage === 'decision',
    prep = stage === 'prepare';
  const items = o.items || [];
  return (
    <>
      <Heading
        title={decision ? 'Accept order' : prep ? 'Prepare order' : 'Rider pickup'}
        desc={o.id + ' · ' + (labels[o.status] || o.status)}
      />
      {o.status === 'cancelled' ? (
        <Card>
          <Text style={s.body}>This order was cancelled.</Text>
        </Card>
      ) : (
        <>
          {decision ? (
            <Card>
              <View style={s.row}>
                <Food dish={items[0]} style={{ width: 80, height: 65, borderRadius: 13 }} />
                <Text style={s.sub}>{items.reduce((a, i) => a + i.qty, 0)} items · Delivery</Text>
              </View>
              <Pair label="Your items" value={money(o.subtotal)} />
              <Pair label="Commission reserve · 20%" value={money(o.commission)} />
              {Number.isFinite(finance?.available) && (
                <Pair label="Available balance" value={money(finance.available)} />
              )}
            </Card>
          ) : prep ? (
            <Hero name="orderRice" height={165} />
          ) : (
            <Hero name="handover" height={170} />
          )}
          <Card>
            {items.map((i, n) => (
              <Text key={i.dishId + '-' + n} style={s.body}>
                {i.qty} × {i.name}
                {i.addon ? ' · ' + i.addon : ''}
              </Text>
            ))}
          </Card>
          {!decision && !prep && !o.handedOff && (
            <Row
              title={o.riderId ? 'Assigned rider' : 'Awaiting rider assignment'}
              detail={o.riderId || 'Handoff opens once the assigned rider arrives.'}
              icon="user"
            />
          )}
          {o.status === 'received' && showCancel && (
            <Button label="Accept order" disabled={busy} onPress={() => act('accepted')} />
          )}
          {o.status === 'accepted' && (
            <Button label="Start preparing" disabled={busy} onPress={() => act('preparing')} />
          )}
          {o.status === 'preparing' && (
            <Button label="Mark ready" disabled={busy} onPress={() => act('ready')} />
          )}
          {o.status === 'ready' && !o.handedOff && (
            <Button
              label="Confirm handoff"
              disabled={busy || !o.riderId}
              onPress={() => act('picked_up')}
            />
          )}
          {(o.status === 'picked_up' || o.handedOff) && (
            <Card tone="green">
              <Text style={s.sub}>{o.delivered ? 'Delivered' : 'Pickup confirmed'}</Text>
            </Card>
          )}
          {showCancel &&
            ['received', 'accepted', 'preparing', 'ready'].includes(o.status) &&
            (cancel ? (
              <Card>
                <Field label="Cancellation reason" value={reason} set={setReason} />
                <Button
                  label="Confirm cancellation"
                  tone="cream"
                  disabled={busy || reason.trim().length < 2}
                  onPress={() => act('cancelled', reason.trim())}
                />
                <Choice label="Keep order" onPress={() => setCancel(false)} />
              </Card>
            ) : (
              <Choice label="Cancel branch items" onPress={() => setCancel(true)} />
            ))}
        </>
      )}
    </>
  );
}
export function Balance({ finance, go }) {
  return (
    <>
      <Heading title="Prepaid balance" />
      <Hero name="wallet" height={180} />
      <Card>
        <Pair label="Available" value={money(finance.available)} />
        <Pair label="Reserved commission" value={money(finance.reserved)} />
      </Card>
      <Button label="Top up balance" onPress={() => go('topup')} />
      <View style={s.wrap}>
        <Choice label="COD receipts" onPress={() => go('receipts')} />
        <Choice label="Daily statement" onPress={() => go('statement')} />
      </View>
      {!!finance.topups?.length && (
        <Card>
          <Text style={s.sub}>Recent top-ups</Text>
          {finance.topups.slice(0, 5).map((t) => (
            <Pair key={t.id} label={t.status} value={money(t.amount)} />
          ))}
        </Card>
      )}
    </>
  );
}
export function Topup({ save, busy }) {
  const [amount, setAmount] = useState('1000'),
    [method, setMethod] = useState('bank');
  return (
    <>
      <Heading title="Add prepaid funds" />
      <Field label="Amount in PKR" keyboardType="decimal-pad" value={amount} set={setAmount} />
      <View style={s.wrap}>
        {['500', '1000', '2000', '5000'].map((a) => (
          <Choice
            key={a}
            label={Number(a).toLocaleString('en-PK')}
            on={a === amount}
            onPress={() => setAmount(a)}
          />
        ))}
      </View>
      <Text style={s.sub}>Payment method</Text>
      {[
        ['card', 'Card'],
        ['wallet', 'Mobile wallet'],
        ['bank', 'Bank transfer'],
      ].map(([k, v]) => (
        <Row
          key={k}
          title={v}
          icon={k === 'bank' ? 'cash' : k}
          detail={k === 'bank' ? 'Credit follows confirmed transfer' : 'Provider unavailable'}
          active={k === method}
          disabled={k !== 'bank'}
          onPress={() => setMethod(k)}
        />
      ))}
      <Button
        label="Request bank top-up"
        disabled={busy || toPaisa(amount) <= 0 || !Number.isSafeInteger(toPaisa(amount))}
        onPress={() => save(toPaisa(amount), method)}
      />
    </>
  );
}
export function Receipts({ finance, confirm, busy }) {
  return (
    <>
      <Heading title="COD receipts" />
      <Hero name="orderRice" height={149} />
      {!finance.receipts?.length && (
        <Card>
          <Text style={s.body}>Cash receipts for this branch appear after COD deliveries.</Text>
        </Card>
      )}
      {finance.receipts?.map((r) => (
        <Card key={r.orderId}>
          <Text style={s.sub}>{r.orderId}</Text>
          <Pair label="Restaurant share" value={money(r.amount)} />
          <Pair label={r.received ? 'Cash received' : 'Cash due from rider'} value={money(r.amount)} />
          {r.received ? (
            <Text style={s.small}>Receipt confirmed</Text>
          ) : (
            <Button
              label="Confirm cash receipt"
              disabled={busy || !r.canConfirm}
              onPress={() => confirm(r.orderId)}
            />
          )}
        </Card>
      ))}
    </>
  );
}
export function Statement({ finance, day, change }) {
  const [date, setDate] = useState(day),
    [details, setDetails] = useState(false);
  const st = finance.statement || {};
  return (
    <>
      <Heading title="Daily statement" />
      <Hero name="grill" height={145} />
      <Field label="Statement date (YYYY-MM-DD)" value={date} set={setDate} />
      <Choice
        label="View statement"
        disabled={!/^\d{4}-\d{2}-\d{2}$/.test(date)}
        onPress={() => change(date)}
      />
      <Card>
        <Text style={s.sub}>{st.day || day}</Text>
        <Pair label="Sales" value={money(st.sales)} />
        <Pair label="Digital order proceeds" value={money(st.digital)} />
        <Pair label="Commission" value={money(st.commission)} />
        <Pair label="Net bank payout" value={money(st.payout)} />
      </Card>
      <Button
        label={details ? 'Close payout details' : 'Open payout details'}
        onPress={() => setDetails(!details)}
      />
      {details && (
        <Card>
          <Pair label="COD cash received" value={money(st.codReceived)} />
          <Text style={s.body}>
            COD is settled directly with the restaurant. The bank payout covers online proceeds after
            commission.
          </Text>
        </Card>
      )}
    </>
  );
}
