import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from './Icons';
import { Surface } from './MarketUI';
import { Button, Header, Hero, Tabs, art, money, ui } from './CustomerUI';

const titles = {
  PaymentStatus: 'Payment status',
  Live: 'Your order',
  OTP: 'Your delivery code',
  Orders: 'Your orders',
  Receipt: 'Order receipt',
  Adjustment: 'Order adjustment',
  Account: 'Your account',
  AccountDetails: 'Account details',
  Alerts: 'Notifications',
  Help: 'Help and support',
  Chat: 'Order support',
  Workspaces: 'Your workspaces',
  Workspace: 'Workspace access',
  Close: 'Close account',
};
const orderPages = ['PaymentStatus', 'Live', 'OTP', 'Receipt', 'Adjustment', 'Chat'];
const words = (s) =>
  String(s || 'Pending')
    .replace(/_/g, ' ')
    .replace(/^./, (l) => l.toUpperCase());
const short = (id) => String(id || '').replace(/^KK-(.+)(.{8})$/, 'KK-$2');
const date = (s) => new Date(s).toLocaleString();
function Line({ label, value }) {
  return (
    <View style={ui.row}>
      <Text style={[ui.body, { flex: 1 }]}>{label}</Text>
      <Text style={ui.label}>{value}</Text>
    </View>
  );
}
function Card({ children }) {
  return <Surface style={ui.card}>{children}</Surface>;
}
function OrderLine({ item }) {
  return (
    <View style={ui.row}>
      {art[item.photo] && (
        <Image source={art[item.photo]} resizeMode="contain" style={{ width: 66, height: 59 }} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={ui.label}>{item.name}</Text>
        <Text style={ui.body}>
          {item.restaurant} · ×{item.qty}
        </Text>
      </View>
      <Text style={ui.label}>{money(item.total)}</Text>
    </View>
  );
}
function LinkRow({ label, onPress, icon = 'orders' }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      <Surface style={[ui.card, ui.row]}>
        <Icon name={icon} />
        <Text style={[ui.label, { flex: 1 }]}>{label}</Text>
        <Text style={ui.label}>›</Text>
      </Surface>
    </Pressable>
  );
}

export default function CustomerDesk({
  initialPage,
  initialOrder,
  session,
  api,
  onMarket,
  onWorkspace,
  onAddress,
  onLogin,
  onVerify,
  onSignOut,
  onClosed,
}) {
  const [stack, setStack] = useState([{ page: initialPage, orderId: initialOrder?.id }]);
  const { page, orderId } = stack[stack.length - 1];
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [pending, setPending] = useState(false),
    [revision, reload] = useState(0);
  const [text, setText] = useState(''),
    [password, setPassword] = useState(''),
    [helpId, setHelpId] = useState(initialOrder?.id || ''),
    [topic, setTopic] = useState('');
  const task = useRef(false);
  function visit(next, id) {
    setError('');
    setData(null);
    setStack((s) => [...s, { page: next, orderId: id }]);
  }
  function back() {
    if (stack.length === 1) {
      onMarket('Home');
      return;
    }
    setError('');
    setData(null);
    setStack((s) => s.slice(0, -1));
  }
  function tab(name) {
    if (['Home', 'Cart'].includes(name)) onMarket(name);
    else if (name !== page) {
      setError('');
      setData(null);
      setStack([{ page: name }]);
    }
  }
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!pending) back();
      return true;
    });
    return () => h.remove();
  }, [stack, pending]);
  useEffect(() => {
    let active = true;
    if (!session) return;
    async function load() {
      const get = (path) => api(path, 'GET', null, session.token);
      const base = '/orders/' + encodeURIComponent(orderId);
      let value = {};
      if (page === 'Orders' || page === 'Help') value = await get('/orders');
      if (page === 'Alerts') value = await get('/notifications');
      if (page === 'Workspace' || page === 'Workspaces') value = await get('/workspaces');
      if (orderPages.includes(page)) {
        const detail = await get(base);
        value = { order: detail.order };
        if (page === 'OTP') Object.assign(value, await get(base + '/otp'));
        if (page === 'Chat') Object.assign(value, await get(base + '/support'));
      }
      if (active) {
        setData(value);
        setError('');
      }
    }
    const fetchData = () =>
      load().catch((e) => {
        if (active) setError(e.message);
      });
    fetchData();
    const timer = ['Live', 'Chat', 'PaymentStatus', 'Alerts'].includes(page)
      ? setInterval(fetchData, 10000)
      : null;
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [page, orderId, revision, session, api]);
  async function action(fn) {
    if (task.current) return;
    task.current = true;
    setPending(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e.message || 'Please try again.');
    } finally {
      task.current = false;
      setPending(false);
    }
  }
  const o = data?.order;
  const orders = data?.orders || [];
  const chosen = orders.find((it) => it.id === helpId) || orders[0];
  const receipt = () => visit('Receipt', orderId);
  return (
    <SafeAreaView style={ui.page}>
      <Header onBack={back} onAlerts={page === 'Alerts' ? undefined : () => visit('Alerts')} />
      <ScrollView
        key={page + String(orderId || '')}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.scroll}
      >
        {['PaymentStatus', 'Live', 'OTP'].includes(page) && (
          <Hero name={{ PaymentStatus: 'wallet', Live: 'delivery', OTP: 'handover' }[page]} />
        )}
        <Text accessibilityRole="header" style={ui.title}>
          {titles[page]}
        </Text>
        {!!error && (
          <Card>
            <Text accessibilityRole="alert" style={ui.body}>
              {error}
            </Text>
            <Button label="Try again" onPress={() => reload((n) => n + 1)} />
          </Card>
        )}
        {page === 'Account' && (
          <>
            <Card>
              <View style={ui.row}>
                <View style={ui.icon}>
                  <Icon name="user" />
                </View>
                <Text style={[ui.label, { flex: 1 }]}>{session?.email || 'Guest account'}</Text>
              </View>
              {session ? (
                <Text style={ui.body}>
                  {session.emailVerified ? 'Email verified' : 'Email awaiting verification'}
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  <Button primary label="Sign in" onPress={() => onLogin('login')} />
                  <Button label="Create account" onPress={() => onLogin('register')} />
                </View>
              )}
              {session && !session.emailVerified && (
                <Button label="Verify your email" onPress={onVerify} />
              )}
            </Card>
            <LinkRow icon="user" label="Account details" onPress={() => visit('AccountDetails')} />
            <LinkRow icon="pin" label="Saved address" onPress={onAddress} />
            <LinkRow label="Your orders" onPress={() => visit('Orders')} />
            <LinkRow icon="user" label="Workspace access" onPress={() => visit('Workspaces')} />
            <LinkRow icon="email" label="Help and support" onPress={() => visit('Help')} />
            {session && (
              <>
                <LinkRow icon="lock" label="Close account" onPress={() => visit('Close')} />
                <Button label="Sign out" disabled={pending} onPress={() => action(onSignOut)} />
              </>
            )}
          </>
        )}
        {page !== 'Account' &&
          (!session ? (
            <>
              <Text style={ui.body}>Sign in to see your account and orders.</Text>
              <Button primary label="Sign in" onPress={() => onLogin('login')} />
              <Button label="Create account" onPress={() => onLogin('register')} />
            </>
          ) : (
            <>
              {!data && !error && (
                <Text accessibilityLiveRegion="polite" style={ui.body}>
                  Loading…
                </Text>
              )}
              {o && (
                <Text style={ui.body}>
                  Order {short(o.id)} · {date(o.createdAt)}
                </Text>
              )}
              {page === 'PaymentStatus' && o && (
                <>
                  <Card>
                    <Text style={ui.label}>
                      {o.paymentStatus === 'paid' ? 'Payment confirmed' : 'Cash on delivery'}
                    </Text>
                    <Line
                      label={o.paymentStatus === 'paid' ? 'Paid' : 'Due on delivery'}
                      value={money(o.total)}
                    />
                  </Card>
                  <Button primary label="View order" onPress={() => visit('Live', o.id)} />
                </>
              )}
              {page === 'Live' && o && (
                <>
                  {o.branches.map((b) => (
                    <Card key={b.id}>
                      <Line label={b.name} value={words(b.status)} />
                    </Card>
                  ))}
                  <Card>
                    <Line label="Combined delivery" value={words(o.status)} />
                  </Card>
                  {!['delivered', 'cancelled'].includes(o.status) && (
                    <Button primary label="View delivery code" onPress={() => visit('OTP', o.id)} />
                  )}
                  <Button label="View receipt" onPress={receipt} />
                </>
              )}
              {page === 'OTP' && data?.code && (
                <>
                  <View style={[ui.row, { justifyContent: 'center' }]}>
                    {String(data.code)
                      .split('')
                      .map((c, i) => (
                        <View key={i} style={ui.card}>
                          <Text style={ui.title}>{c}</Text>
                        </View>
                      ))}
                  </View>
                  <Text style={ui.body}>Share your handover code when your rider arrives.</Text>
                  <Button
                    primary
                    label="Share code"
                    onPress={() =>
                      action(() =>
                        Share.share({ message: 'Khana Krlo delivery code: ' + data.code }),
                      )
                    }
                  />
                </>
              )}
              {page === 'Orders' && data && (
                <>
                  {!orders.length && (
                    <Card>
                      <Text style={ui.label}>No orders yet</Text>
                      <Button label="Browse restaurants" onPress={() => onMarket('Home')} />
                    </Card>
                  )}
                  {orders.map((ord) => (
                    <Card key={ord.id}>
                      <Line label={short(ord.id)} value={words(ord.status)} />
                      <Text style={ui.body}>{ord.items.map((i) => i.name).join(', ')}</Text>
                      <Hero
                        name={ord.items[0]?.photo === 'karahi' ? 'orderKarahi' : 'orderRice'}
                        height={100}
                      />
                      <Button label="View order details" onPress={() => visit('Live', ord.id)} />
                      <Button label="View receipt" onPress={() => visit('Receipt', ord.id)} />
                    </Card>
                  ))}
                </>
              )}
              {page === 'Receipt' && o && (
                <>
                  <Card>
                    {o.items.map((item, i) => (
                      <OrderLine key={i} item={item} />
                    ))}
                    {[
                      ['Food subtotal', o.subtotal],
                      ['Delivery', o.delivery],
                      ['Platform fee', o.platform],
                      ['Tax', o.tax],
                      [o.paymentStatus === 'paid' ? 'Total paid' : 'Total due', o.total],
                    ].map(([k, v]) => (
                      <Line key={k} label={k} value={money(v)} />
                    ))}
                  </Card>
                  <LinkRow label="Order adjustment" onPress={() => visit('Adjustment', o.id)} />
                  <Button
                    primary
                    label="Get order help"
                    onPress={() => {
                      setHelpId(o.id);
                      visit('Help');
                    }}
                  />
                </>
              )}
              {page === 'Adjustment' && o && (
                <>
                  <Card>
                    {o.adjustments.length ? (
                      o.adjustments.map((a, i) => (
                        <Line
                          key={i}
                          label={(a.name || a.restaurant) + ' · ' + words(a.status)}
                          value={money(a.amount)}
                        />
                      ))
                    ) : (
                      <Text style={ui.body}>No cancellations or refunds for this order.</Text>
                    )}
                    <Line label="Food subtotal" value={money(o.subtotal)} />
                  </Card>
                  <Button primary label="Track order" onPress={() => visit('Live', o.id)} />
                </>
              )}
              {page === 'AccountDetails' && (
                <Card>
                  <Text style={ui.body}>Email address</Text>
                  <Text selectable style={ui.label}>
                    {session.email}
                  </Text>
                  <Text style={ui.body}>
                    {session.emailVerified ? 'Email verified' : 'Email awaiting verification'}
                  </Text>
                  {!session.emailVerified && (
                    <Button label="Verify your email" onPress={onVerify} />
                  )}
                </Card>
              )}
              {page === 'Alerts' && data && (
                <>
                  {!data.notifications.length && (
                    <Text style={ui.body}>Your order updates will appear here.</Text>
                  )}
                  {data.notifications.map((n) => (
                    <Card key={n.id}>
                      <LinkRow label={n.title} onPress={() => visit('Live', n.orderId)} />
                      <Text style={ui.body}>
                        {short(n.orderId)} · {date(n.createdAt)}
                      </Text>
                    </Card>
                  ))}
                  <Hero name="orderRice" />
                </>
              )}
              {page === 'Help' && data && (
                <>
                  <Hero name="support" />
                  <Text style={ui.label}>Select an order</Text>
                  {orders.map((ord) => (
                    <Button
                      key={ord.id}
                      label={(ord.id === chosen?.id ? '✓ ' : '') + short(ord.id)}
                      onPress={() => setHelpId(ord.id)}
                    />
                  ))}
                  {chosen ? (
                    <>
                      {['Missing or incorrect item', 'Payment and refund'].map((t) => (
                        <Button
                          key={t}
                          label={(topic === t ? '✓ ' : '') + t}
                          onPress={() => setTopic(t)}
                        />
                      ))}
                      <Button
                        primary
                        label="Open support chat"
                        onPress={() => {
                          setText(topic);
                          visit('Chat', chosen.id);
                        }}
                      />
                    </>
                  ) : (
                    <Text style={ui.body}>Place an order to open order support.</Text>
                  )}
                </>
              )}
              {page === 'Chat' && o && (
                <>
                  {!data.messages.length && (
                    <Text style={ui.body}>Send a message about this order.</Text>
                  )}
                  {data.messages.map((m) => (
                    <View
                      style={[
                        ui.card,
                        {
                          alignSelf: m.role === 'customer' ? 'flex-end' : 'flex-start',
                          maxWidth: '90%',
                          backgroundColor: m.role === 'customer' ? '#e4eab5' : '#fff6e8',
                        },
                      ]}
                      key={m.id}
                    >
                      <Text style={ui.body}>{m.text}</Text>
                      <Text>{date(m.createdAt)}</Text>
                    </View>
                  ))}
                  <TextInput
                    accessibilityLabel="Message"
                    placeholder="Send message"
                    multiline
                    maxLength={1000}
                    style={ui.input}
                    value={text}
                    onChangeText={setText}
                  />
                  <Button
                    primary
                    label="Send message"
                    disabled={!text.trim() || pending}
                    onPress={() =>
                      action(async () => {
                        await api(
                          '/orders/' + o.id + '/support',
                          'POST',
                          { text: text.trim() },
                          session.token,
                        );
                        setText('');
                        reload((n) => n + 1);
                      })
                    }
                  />
                </>
              )}
              {page === 'Workspaces' && data && (
                <>
                  {data.workspaces.map((w) => (
                    <Button
                      key={w.id}
                      label={w.name}
                      onPress={() => {
                        if (w.id === 'customer') onMarket('Home');
                        else if (['restaurant', 'rider'].includes(w.id)) onWorkspace(w.id);
                        else visit('Workspace', w.id);
                      }}
                    />
                  ))}
                  {['restaurant', 'rider'].filter(role => !data.workspaces.some(w => w.id === role)).map(role =>
                    <Button key={role} label={role === 'restaurant' ? 'Restaurant application' : 'Rider application'} onPress={() => onWorkspace(role)} />
                  )}
                  <Hero name="workspace" />
                </>
              )}
              {page === 'Workspace' && data && (
                <Card>
                  <Text style={ui.label}>
                    {data.workspaces.find((w) => w.id === orderId)?.name || 'Access unavailable'}
                  </Text>
                  <Text style={ui.body}>
                    {data.workspaces.some((w) => w.id === orderId)
                      ? 'Approved workspace'
                      : 'This workspace is no longer assigned to your account.'}
                  </Text>
                  <Button label="Switch workspace" onPress={back} />
                </Card>
              )}
              {page === 'Close' && (
                <>
                  <Text style={ui.body}>
                    Your profile will be removed. Required order, payment and receipt records are
                    retained.
                  </Text>
                  <Hero name="closure" />
                  <Card>
                    <Text style={ui.label}>Retained records</Text>
                    <Text style={ui.body}>Transactions · Orders · Receipts</Text>
                  </Card>
                  <TextInput
                    accessibilityLabel="Confirm password"
                    placeholder="Confirm your password"
                    value={password}
                    secureTextEntry
                    onChangeText={setPassword}
                    style={ui.input}
                  />
                  <Button
                    danger
                    label="Confirm closure"
                    disabled={pending || !password}
                    onPress={() =>
                      action(async () => {
                        await api('/identity/close', 'POST', { password }, session.token);
                        await onClosed();
                      })
                    }
                  />
                </>
              )}
            </>
          ))}
      </ScrollView>
      <Tabs
        current={
          page === 'Account'
            ? 'Account'
            : orderPages.includes(page) || page === 'Orders'
              ? 'Orders'
              : ''
        }
        go={tab}
      />
    </SafeAreaView>
  );
}
