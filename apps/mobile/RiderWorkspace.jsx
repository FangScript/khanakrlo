import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Header, Hero, money, ui } from './CustomerUI';
import { Surface, Icon } from './MarketUI';
import DeliveryMap from './DeliveryMap';

const titles = {
  apply: 'Rider application',
  home: 'Rider availability',
  offers: 'Delivery offers',
  route: 'Pickup route',
  pickup: 'Collect order',
  destination: 'Deliver to customer',
  otp: 'Hand over order',
  cash: 'Rider cash receipt',
  handoff: 'Restaurant cash handoff',
  earnings: 'Earnings',
  payouts: 'Payout history',
};
const tripPages = ['route', 'pickup', 'destination', 'otp', 'cash', 'handoff'];
const artwork = {
  home: 'delivery',
  offers: 'orderRice',
  pickup: 'handover',
  otp: 'handover',
  cash: 'wallet',
  handoff: 'orderRice',
  earnings: 'delivery',
  payouts: 'wallet',
};
function Row({ label, value }) {
  return (
    <Surface style={[ui.card, ui.row]}>
      <Text style={[ui.body, { flex: 1 }]}>{label}</Text>
      <Text style={ui.label}>{value}</Text>
    </Surface>
  );
}
function Field({ label, ...props }) {
  return <TextInput accessibilityLabel={label} placeholder={label} style={ui.input} {...props} />;
}
function Directions({ pin, address, onError }) {
  if (!pin && !address) return null;
  const destination = pin ? pin.latitude + ',' + pin.longitude : address;
  return (
    <Button
      label="Open directions"
      icon="pin"
      onPress={() =>
        Linking.openURL(
          'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination),
        ).catch(() => onError('Directions could not be opened.'))
      }
    />
  );
}
export default function RiderWorkspace({ api, session, onExit, onAlerts }) {
  const [page, setPage] = useState('home'),
    [id, setId] = useState(null),
    [branch, setBranch] = useState(null);
  const [data, setData] = useState(null),
    [me, setMe] = useState(null),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [revision, refresh] = useState(0);
  const [name, setName] = useState(''),
    [city, setCity] = useState('Islamabad'),
    [code, setCode] = useState(''),
    [collected, setCollected] = useState(false);
  const locked = useRef(false),
    generation = useRef(0);
  const get = (path) => api('/rider/' + path, 'GET', null, session.token);
  const post = (path, body) => api('/rider/' + path, 'POST', body, session.token);
  function go(next, order = id) {
    generation.current++;
    setLoading(true);
    setId(order);
    setCode('');
    setCollected(false);
    setError('');
    setData(null);
    setPage(next);
    refresh((x) => x + 1);
  }
  useEffect(() => {
    const token = ++generation.current;
    let current = true;
    async function load() {
      const { rider } = await get('me');
      let value = null;
      const view = rider?.status === 'approved' ? page : 'apply';
      if (view === 'offers') value = await get('offers');
      if (['earnings', 'payouts'].includes(view)) value = await get('earnings');
      if (tripPages.includes(view)) value = await get('trips/' + id);
      if (current && generation.current === token) {
        setMe(rider);
        setData(value);
      }
    }
    load()
      .catch((e) => {
        if (current && generation.current === token) setError(e.message);
      })
      .finally(() => {
        if (current && generation.current === token) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [page, id, revision, session.token]);
  async function action(fn, next) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
      go(next);
    } catch (e) {
      setError(e.message);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const view = me?.status === 'approved' ? page : 'apply',
    trip = data?.order,
    stops = data?.stops || [],
    stop = stops.find((s) => !s.picked),
    cashStop = stops.find((s) => s.branchId === branch),
    cod = trip?.payment === 'cod';
  const btn = (label, onPress, primary = false, disabled = false) => (
    <Button key={label} label={label} onPress={onPress} primary={primary} disabled={busy || disabled} />
  );
  const change = (path, body, next) => action(() => post(path, body), next);
  function back() {
    if (['apply', 'home'].includes(view)) return onExit();
    go(
      {
        pickup: 'route',
        destination: 'offers',
        otp: 'destination',
        handoff: 'cash',
        payouts: 'earnings',
        cash: 'offers',
        route: 'offers',
      }[view] || 'home',
    );
  }
  return (
    <SafeAreaView style={ui.page}>
      <Header onBack={back} onAlerts={onAlerts} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={ui.scroll}>
        <Text style={ui.title}>{titles[view]}</Text>
        {error && (
          <Text accessibilityRole="alert" style={ui.body}>
            {error}
          </Text>
        )}
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            {artwork[view] && <Hero name={artwork[view]} height={170} />}
            {view === 'apply' && (
              <>
                {me && <Row label="Application status" value={me.status} />}
                {me?.reason && <Text style={ui.body}>{me.reason}</Text>}
                {(!me || me.status === 'rejected') && (
                  <>
                    <Field label="Your full name" value={name} onChangeText={setName} />
                    {['Rawalpindi', 'Islamabad'].map((c) => btn(c, () => setCity(c), city === c))}
                    {btn(
                      'Submit application',
                      () => change('apply', { name, city }, 'home'),
                      true,
                      name.trim().length < 2,
                    )}
                  </>
                )}
              </>
            )}
            {view === 'home' && (
              <>
                <Row label="Availability" value={me.online ? 'Online' : 'Offline'} />
                {btn(
                  me.online ? 'Go offline' : 'Go online',
                  () => change('availability', { online: !me.online }, me.online ? 'home' : 'offers'),
                  true,
                )}
                {btn('View assignments', () => go('offers'))}
              </>
            )}
            {view === 'offers' && data && (
              <>
                {data.active && btn('Open current delivery', () => go('route', data.active), true)}
                {data.offers.map((o) => (
                  <Surface key={o.id} style={ui.card}>
                    <Text style={ui.label}>{o.city}</Text>
                    <Text style={ui.body}>{o.restaurants.join(' · ')}</Text>
                    {btn(
                      'Accept ' + o.id,
                      async () => {
                        if (locked.current) return;
                        locked.current = true;
                        setBusy(true);
                        try {
                          await post('trips/' + o.id + '/claim', {});
                          go('route', o.id);
                        } catch (e) {
                          setError(e.message);
                        } finally {
                          setBusy(false);
                          locked.current = false;
                        }
                      },
                      true,
                    )}
                  </Surface>
                ))}
                {!data.active && !data.offers.length && (
                  <Text style={ui.body}>
                    {me.online
                      ? 'No deliveries are ready in your city.'
                      : 'Go online to receive delivery offers.'}
                  </Text>
                )}
                {data.recent.map((r) => btn('Cash receipt · ' + r.orderId, () => go('cash', r.orderId)))}
              </>
            )}
            {trip && (
              <>
                <Text style={ui.label}>{trip.id}</Text>
                {view === 'route' && (
                  <>
                    {stop?.pin && <DeliveryMap pin={stop.pin} city={trip.city} />}
                    {stops.map((s, i) => (
                      <Row
                        key={s.branchId}
                        label={i + 1 + '. ' + s.name}
                        value={s.picked ? 'Collected' : 'Pickup'}
                      />
                    ))}
                    {btn(
                      stop ? 'Start pickup' : 'Customer destination',
                      () => go(stop ? 'pickup' : 'destination'),
                      true,
                    )}
                  </>
                )}
                {view === 'pickup' &&
                  (stop ? (
                    <>
                      <Row label={stop.name} value="Pickup" />
                      <Text style={ui.body}>{stop.address}</Text>
                      <Directions {...stop} onError={setError} />
                      {btn(
                        'Confirm pickup',
                        () => change('trips/' + id + '/pickup', { branchId: stop.branchId }, 'route'),
                        true,
                      )}
                    </>
                  ) : (
                    btn('Customer destination', () => go('destination'), true)
                  ))}
                {view === 'destination' && (
                  <>
                    <Text style={ui.label}>{trip.address}</Text>
                    {trip.pin && <DeliveryMap pin={trip.pin} city={trip.city} />}
                    <Directions {...trip} onError={setError} />
                    {btn('Arrived', () => go('otp'), true, !!stop)}
                  </>
                )}
                {view === 'otp' && (
                  <>
                    <Text style={ui.body}>Ask the customer for the handover code at their door.</Text>
                    <Field
                      label="Four-digit delivery code"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={code}
                      onChangeText={(s) => setCode(s.replace(/\D/g, ''))}
                    />
                    {cod &&
                      btn(
                        (collected ? '✓ ' : '') + 'Cash collected · ' + money(trip.total),
                        () => setCollected(!collected),
                        collected,
                      )}
                    {btn(
                      'Verify code',
                      () =>
                        change(
                          'trips/' + id + '/deliver',
                          { code, cashCollected: cod ? trip.total : 0 },
                          'cash',
                        ),
                      true,
                      code.length !== 4 || (cod && !collected),
                    )}
                  </>
                )}
                {view === 'cash' && (
                  <>
                    <Row label={cod ? 'Cash collected' : 'Digital payment'} value={money(trip.total)} />
                    {stops.map((s) => (
                      <View key={s.branchId}>
                        <Row label={s.name} value={money(s.amount)} />
                        {cod &&
                          btn(
                            s.confirmed
                              ? 'Receipt confirmed'
                              : s.cashGiven
                                ? 'Awaiting restaurant confirmation'
                                : 'Record handoff · ' + s.name,
                            () => {
                              setBranch(s.branchId);
                              go('handoff');
                            },
                            false,
                            !!s.confirmed,
                          )}
                      </View>
                    ))}
                    {cod && (
                      <Row label="Fees and tax to reconcile" value={money(trip.total - trip.subtotal)} />
                    )}
                  </>
                )}
                {view === 'handoff' && cashStop && (
                  <>
                    <Row label={cashStop.name} value={money(cashStop.amount)} />
                    {cashStop.cashGiven ? (
                      <Text style={ui.body}>
                        {cashStop.confirmed
                          ? 'Restaurant confirmed receipt.'
                          : 'Recorded. Awaiting restaurant confirmation.'}
                      </Text>
                    ) : (
                      btn(
                        'Record cash given',
                        () => change('trips/' + id + '/cash', { branchId: branch }, 'cash'),
                        true,
                      )
                    )}
                  </>
                )}
              </>
            )}
            {view === 'earnings' && data && (
              <>
                <Row
                  label="Recorded delivery earnings"
                  value={money(data.deliveries.reduce((n, d) => n + (d.baseFee || 0), 0))}
                />
                {!data.deliveries.length && <Text style={ui.body}>No completed deliveries yet.</Text>}
                {data.deliveries.map((d) => (
                  <Row
                    key={d.orderId}
                    label={d.orderId}
                    value={d.baseFee == null ? 'Rate pending' : money(d.baseFee)}
                  />
                ))}
                {btn('View payouts', () => go('payouts'), true)}
              </>
            )}
            {view === 'payouts' && data && (
              <>
                {!data.payouts.length && <Text style={ui.body}>No confirmed transfers yet.</Text>}
                {data.payouts.map((p) => (
                  <Row key={p.reference} label={p.reference + ' · ' + p.createdAt} value={money(p.amount)} />
                ))}
              </>
            )}
            {(error || ['apply', 'offers', 'route', 'cash', 'payouts', 'earnings'].includes(view)) &&
              btn('Refresh', () => go(page))}
          </>
        )}
      </ScrollView>
      {me?.status === 'approved' && (
        <View style={ui.tabs}>
          {[
            ['home', 'Home', 'home'],
            ['offers', 'Orders', 'shop'],
            ['earnings', 'Earnings', 'cash'],
            ['payouts', 'Payouts', 'wallet'],
          ].map(([dest, label, icon]) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={label}
              key={dest}
              style={[ui.tab, dest === page && ui.primary]}
              onPress={() => go(dest)}
            >
              <Icon name={icon} />
              <Text style={ui.tabLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
