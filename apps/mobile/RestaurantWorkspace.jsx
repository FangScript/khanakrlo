import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { art, Icon, Round, Surface, Tap } from './MarketUI';
import { Button, Card, Choice, dayInPakistan, Heading, s } from './RestaurantUI';
import { Details, Evidence, ApplicationStatus, pickRestaurantFile } from './RestaurantApplication';
import { Branches, Availability, Hours, Staff, Menu, EditDish } from './RestaurantBranch';
import RestaurantArea from './RestaurantArea';
import { Queue, OrderTask, Balance, Topup, Receipts, Statement } from './RestaurantOrders';

const applicationViews = ['apply', 'documents', 'status', 'branches', 'newBranch'];
const kitchenViews = ['queue', 'decision', 'prepare', 'pickup'];
const financeViews = ['balance', 'topup', 'receipts', 'statement'];
const orderStage = (status) =>
  ['accepted', 'preparing'].includes(status)
    ? 'prepare'
    : ['ready', 'picked_up'].includes(status)
      ? 'pickup'
      : 'decision';
const routeFor = (me) =>
  me.branches.length || me.application?.status === 'approved'
    ? 'branches'
    : !me.application
      ? 'apply'
      : me.application.status === 'draft'
        ? 'documents'
        : 'status';
function Nav({ items, page, go }) {
  return (
    <Surface tone="green" style={s.tabbar}>
      {items.map(([dest, label, icon]) => (
        <Tap
          key={dest}
          label={label}
          selected={dest === page}
          style={{ flex: 1 }}
          onPress={() => go(dest)}
        >
          <View style={[s.tab, { backgroundColor: dest === page ? '#fa8b17' : 'transparent' }]}>
            <Icon name={icon} size={20} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#304020' }}>{label}</Text>
          </View>
        </Tap>
      ))}
    </Surface>
  );
}
export default function RestaurantWorkspace({
  api,
  session,
  onExit,
  onAlerts,
  onAccount = onExit,
  onHome = onExit,
}) {
  const [me, setMe] = useState(null),
    [page, setPage] = useState(null),
    [branch, setBranch] = useState(null),
    [orders, setOrders] = useState([]),
    [finance, setFinance] = useState(null),
    [day, setDay] = useState(dayInPakistan),
    [dish, setDish] = useState(null),
    [orderId, setOrder] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [note, setNote] = useState('');
  const stack = useRef([]),
    lock = useRef(false),
    alive = useRef(true),
    scroll = useRef(null),
    topupKey = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const call = useCallback(
    (p, body) => api('/merchant' + p, body === undefined ? 'GET' : 'POST', body, session?.token),
    [api, session?.token],
  );
  const root = useCallback(async () => {
    const data = await call('/me');
    if (alive.current) setMe(data);
    return data;
  }, [call]);
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
    } catch (e) {
      if (alive.current) setError(e?.message || 'Could not complete this action. Try again.');
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    let keep = true;
    root()
      .then((d) => {
        if (keep) setPage(routeFor(d));
      })
      .catch((e) => {
        if (keep) setError(e.message);
      });
    return () => {
      keep = false;
    };
  }, [root]);
  const go = (dest, replace = false) => {
    if (dest === 'exit') {
      onHome();
      return;
    }
    if (dest === 'applyTab')
      dest = me.application?.status === 'draft' ? 'documents' : me.application ? 'status' : 'apply';
    if (dest === page) return;
    if (!replace && page) stack.current.push(page);
    setPage(dest);
    setNote('');
    setError('');
  };
  const back = () => {
    if (stack.current.length) {
      setPage(stack.current.pop());
      setNote('');
      setError('');
    } else onExit();
  };
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [page]);
  const bpath = (p = '') => '/branches/' + encodeURIComponent(branch.id) + p;
  const reloadBranch = async (id = branch.id) => {
    const { branch: b } = await call('/branches/' + encodeURIComponent(id));
    setBranch(b);
    return b;
  };
  const select = (b) =>
    run(async () => {
      await reloadBranch(b.id);
      setFinance(null);
      setOrders([]);
      setDay(dayInPakistan());
      const role = me.branches.find((x) => x.id === b.id)?.role;
      go(role === 'kitchen' ? 'queue' : role === 'menu' ? 'menu' : 'availability');
    });
  const role = me?.branches?.find((b) => b.id === branch?.id)?.role || branch?.role;
  const manage = ['owner', 'manager'].includes(role),
    canMenu = manage || role === 'menu',
    canKitchen = manage || role === 'kitchen',
    canFinance = role === 'owner' || role === 'manager';
  const refreshQueue = useCallback(async () => {
    const r = await call('/branches/' + encodeURIComponent(branch.id) + '/queue');
    if (alive.current) setOrders(r.orders);
    return r.orders;
  }, [branch?.id, call]);
  const refreshFinance = useCallback(
    async (date = day) => {
      const r = await call(
        '/branches/' + encodeURIComponent(branch.id) + '/finance?day=' + encodeURIComponent(date),
      );
      if (alive.current) setFinance(r);
      return r;
    },
    [branch?.id, call, day],
  );
  const wantQueue = kitchenViews.includes(page),
    wantFin = financeViews.includes(page) || (page === 'decision' && canFinance);
  useEffect(() => {
    if (!branch || !wantQueue) return;
    let active = true,
      version = 0;
    async function load() {
      const seq = ++version;
      try {
        const r = await call('/branches/' + encodeURIComponent(branch.id) + '/queue');
        if (active && version === seq) setOrders(r.orders);
      } catch (e) {
        if (active && version === seq) setError(e.message);
      }
    }
    load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [branch?.id, wantQueue, call]);
  useEffect(() => {
    if (!branch || !wantFin) return;
    let active = true;
    setFinance(null);
    call('/branches/' + encodeURIComponent(branch.id) + '/finance?day=' + encodeURIComponent(day))
      .then((r) => {
        if (active) setFinance(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [branch?.id, day, wantFin, call]);
  const picked = orders.find((o) => o.id === orderId);
  const publishPhoto = (kind, dishId) =>
    run(async () => {
      const file = await pickRestaurantFile(['image/jpeg', 'image/png'], 5);
      if (!file) return;
      const { branch: published } = await call(bpath('/image'), {
        kind,
        ...(dishId && { dishId }),
        mime: file.mime,
        base64: file.base64,
      });
      setBranch(published);
      if (dishId) setDish(published.menu.find((item) => item.id === dishId));
      await root();
      setNote('Photo published to the customer catalogue.');
    });
  const write = (suffix, data, message, next) =>
    run(async () => {
      await call(bpath(suffix), data);
      await reloadBranch();
      await root();
      if (next) go(next, true);
      setNote(message);
    });
  async function orderAction(action, reason) {
    await run(async () => {
      await call(bpath('/queue/' + encodeURIComponent(orderId)), { action, ...(reason && { reason }) });
      const result = await refreshQueue();
      const o = result.find((x) => x.id === orderId);
      go(o && action !== 'cancelled' ? orderStage(o.status) : 'queue', true);
      setNote(action === 'cancelled' ? 'Branch items cancelled.' : 'Order updated.');
    });
  }
  const mainTabs = applicationViews.includes(page) || !branch;
  const nav = mainTabs
    ? [
        ['exit', 'Home', 'home'],
        ['applyTab', 'Apply', 'orders'],
        ['branches', 'Branches', 'shop'],
        ['exitAccount', 'Account', 'account'],
      ]
    : [
        ['branches', 'Branches', 'shop'],
        ...(canMenu ? [['menu', 'Menu', 'orders']] : []),
        ...(canKitchen ? [['queue', 'Kitchen', 'clock']] : []),
        ...(canFinance ? [['balance', 'Finance', 'wallet']] : []),
      ];
  const tabActive = mainTabs
    ? page === 'branches' || page === 'newBranch'
      ? 'branches'
      : 'applyTab'
    : kitchenViews.includes(page)
      ? 'queue'
      : financeViews.includes(page)
        ? 'balance'
        : ['menu', 'dish'].includes(page)
          ? 'menu'
          : 'branches';
  function retry() {
    run(async () => {
      const m = await root();
      if (!page) setPage(routeFor(m));
      if (branch) {
        await reloadBranch();
        if (wantQueue) await refreshQueue();
        if (wantFin) await refreshFinance();
      }
    });
  }
  function content() {
    if (!me || !page) return error ? null : <ActivityIndicator />;
    switch (page) {
      case 'apply':
        return (
          <Details
            initial={me.application}
            email={session?.email}
            busy={busy}
            submit={(d) =>
              run(async () => {
                await call('/application', d);
                await root();
                go('documents');
              })
            }
          />
        );
      case 'documents':
        return (
          <Evidence
            application={me.application}
            terms={me.terms}
            busy={busy}
            run={run}
            upload={async (d) => {
              await call('/documents', d);
              await root();
              setNote('Document uploaded.');
            }}
            submit={(termsVersion) =>
              run(async () => {
                await call('/submit', { termsVersion });
                await root();
                go('status');
              })
            }
          />
        );
      case 'status':
        return me.application ? (
          <>
            <ApplicationStatus application={me.application} go={go} />
            <Choice label="Refresh status" onPress={() => run(root)} />
          </>
        ) : null;
      case 'branches':
        return <Branches branches={me.branches} application={me.application} select={select} go={go} />;
      case 'newBranch':
        return (
          <Details
            branch
            busy={busy}
            submit={(d) =>
              run(async () => {
                const r = await call('/branches', d);
                await root();
                await reloadBranch(r.branch.id);
                go('availability');
                setNote('Branch created.');
              })
            }
          />
        );
      case 'availability':
        return (
          <Availability
            branch={branch}
            go={go}
            busy={busy}
            canManage={manage}
            canStaff={role === 'owner'}
            publishPhoto={() => publishPhoto('branch')}
            save={(d) => write('/availability', d, 'Availability saved.')}
          />
        );
      case 'hours':
        return (
          <Hours branch={branch} busy={busy} save={(d) => write('/hours', d, 'Weekly hours saved.')} />
        );
      case 'area':
        return (
          <RestaurantArea
            branch={branch}
            busy={busy}
            save={(d) => write('/area', d, 'Delivery boundary saved.')}
          />
        );
      case 'staff':
        return (
          <Staff branch={branch} busy={busy} save={(d) => write('/staff', d, 'Staff access updated.')} />
        );
      case 'menu':
        return (
          <Menu
            branch={branch}
            canEdit={canMenu}
            edit={(d) => {
              setDish(d);
              go('dish');
            }}
          />
        );
      case 'dish':
        return (
          <EditDish
            dish={dish}
            publishPhoto={() => publishPhoto('dish', dish.id)}
            busy={busy}
            save={(d) => write('/dishes', d, 'Dish published.', 'menu')}
          />
        );
      case 'queue':
        return (
          <Queue
            orders={orders}
            select={(o) => {
              setOrder(o.id);
              go(orderStage(o.status));
            }}
            refresh={() => run(refreshQueue)}
          />
        );
      case 'decision':
      case 'prepare':
      case 'pickup':
        return picked ? (
          <OrderTask
            key={picked.id}
            stage={orderStage(picked.status)}
            order={picked}
            finance={finance}
            act={orderAction}
            showCancel={manage}
            busy={busy}
          />
        ) : (
          <Text style={s.body}>This order is no longer in the branch queue.</Text>
        );
      case 'balance':
        return finance ? <Balance finance={finance} go={go} /> : null;
      case 'topup':
        return (
          <Topup
            busy={busy}
            save={(amount, method) =>
              run(async () => {
                const signature = [branch.id, amount, method].join(':');
                if (topupKey.current?.signature !== signature)
                  topupKey.current = {
                    signature,
                    key: 'topup-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
                  };
                await call(bpath('/topups'), { amount, method, key: topupKey.current.key });
                topupKey.current = null;
                await refreshFinance();
                go('balance', true);
                setNote('Top-up requested. Credit will appear after reconciliation.');
              })
            }
          />
        );
      case 'receipts':
        return finance ? (
          <Receipts
            finance={finance}
            busy={busy}
            confirm={(id) =>
              run(async () => {
                await call(bpath('/receipts'), { orderId: id });
                await refreshFinance();
                setNote('Cash receipt confirmed.');
              })
            }
          />
        ) : null;
      case 'statement':
        return finance ? (
          <Statement
            finance={finance}
            day={day}
            change={(v) => {
              if (v === day) run(() => refreshFinance(v));
              else setDay(v);
            }}
          />
        ) : null;
      default:
        return null;
    }
  }
  return (
    <SafeAreaView style={s.page}>
      <View style={s.head}>
        <Round name="back" label="Go back" onPress={back} size={35} />
        <Image
          accessible={false}
          source={art.brand}
          resizeMode="contain"
          style={{ width: 43, height: 48 }}
        />
        <View style={{ flex: 1 }}>
          <Text style={s.brand}>Khana Krlo</Text>
          {branch && !mainTabs ? (
            <Tap label="Choose branch" onPress={() => go('branches')}>
              <Text style={s.small} numberOfLines={1}>
                ⌖ {branch.name} ▾
              </Text>
            </Tap>
          ) : (
            <Text style={s.small}>Restaurant workspace</Text>
          )}
        </View>
        {onAlerts && <Round name="bell" label="Notifications" onPress={onAlerts} />}
      </View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll}>
        {!!error && (
          <>
            <Text accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
            <Choice label="Retry" onPress={retry} />
          </>
        )}
        {!!note && (
          <Text accessibilityLiveRegion="polite" style={s.notice}>
            {note}
          </Text>
        )}
        {busy && <ActivityIndicator accessibilityLabel="Saving" color="#a45c14" />}
        {wantFin && !finance && !error && page !== 'decision' && <ActivityIndicator />}
        {content()}
      </ScrollView>
      {me && (
        <Nav
          items={nav}
          page={tabActive}
          go={(dest) => (dest === 'exitAccount' ? onAccount() : go(dest))}
        />
      )}
    </SafeAreaView>
  );
}
