import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  art,
  Brand,
  Button,
  categories,
  colors,
  Food,
  Icon,
  Nav,
  Round,
  Stepper,
  Surface,
  Tap,
  ui,
} from './MarketUI';

const money = (value) => 'PKR ' + (value / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 });
const validPages = ['Home', 'Search', 'Menu', 'Dish', 'Cart', 'Checkout', 'Payment'];
const retryKeys = new Map();
function branchPicture(b) {
  return b.name?.includes('Mehran') ? art.front : art.secondFront;
}
function tags(b) {
  return b.tags?.length ? b.tags : [b.cuisine].filter(Boolean);
}
function matches(d, name) {
  const text = [d.name, d.category, ...(d.tags || [])].join(' ').toLowerCase();
  if (name === 'All') return true;
  if (name === 'BBQ') return /bbq|barbecue|tikka|kebab|wrap/.test(text);
  if (name === 'Desi') return /desi|pakistani|biryani|karahi/.test(text);
  return text.includes(name.toLowerCase());
}
function ids(line) {
  const [branchId, dishId, flag] = line.key.split(':');
  return {
    branchId: line.branchId || branchId,
    dishId: line.dishId || dishId,
    qty: line.qty,
    addon: line.addon ?? flag === 'true',
  };
}
function meta(b) {
  return (
    <View style={s.row}>
      {b.rating != null && (
        <>
          <Icon name="star" size={15} fill color="#f0aa10" />
          <Text style={s.meta}>{b.rating}</Text>
        </>
      )}
      <Icon name={b.eta ? 'clock' : 'pin'} size={15} color="#688539" />
      <Text style={s.meta}>{b.eta || b.city}</Text>
    </View>
  );
}
function Pill({ label, selected, onPress }) {
  return (
    <Tap label={label} selected={!!selected} onPress={onPress}>
      <Surface tone={selected ? 'orange' : 'green'} style={s.pill}>
        <Text style={[s.pillText, selected && s.white]}>{label}</Text>
      </Surface>
    </Tap>
  );
}
function Amount({ label, value, total }) {
  return (
    <View style={[s.amount, total && s.totalRow]}>
      <Text style={[s.detail, total && s.bold]}>{label}</Text>
      <Text style={[ui.strong, total && s.bold]}>{value}</Text>
    </View>
  );
}
function Restaurant({ b, onPress }) {
  return (
    <Tap label={'Open menu for ' + b.name} onPress={onPress}>
      <Surface style={s.restaurant}>
        <Image source={branchPicture(b)} style={s.front} resizeMode="cover" />
        <View style={ui.fill}>
          <Text style={s.heading}>{b.name}</Text>
          {meta(b)}
          <View style={s.tags}>
            {tags(b).map((tag) => (
              <Text key={tag} style={s.tag}>
                {tag}
              </Text>
            ))}
          </View>
        </View>
        <Icon name="next" size={19} />
      </Surface>
    </Tap>
  );
}
function DishRow({ b, d, onPress, menu }) {
  return (
    <Tap label={d.name + ', ' + b.name + ', ' + money(d.price)} onPress={onPress}>
      <Surface style={s.dishRow}>
        <Food dish={d} style={s.thumb} />
        <View style={ui.fill}>
          <Text style={ui.strong}>{d.name}</Text>
          <Text style={s.detail}>{menu ? d.description || b.cuisine : b.name}</Text>
          {!menu && meta(b)}
        </View>
        <View style={s.priceCol}>
          <Text style={ui.strong}>{money(d.price)}</Text>
          <Surface tone="orange" style={s.addIcon}>
            <Icon name="plus" size={16} color="white" />
          </Surface>
        </View>
      </Surface>
    </Tap>
  );
}

export default function Market({
  address,
  pin,
  city,
  api,
  account,
  onAddress,
  onLogin,
  onProfile,
  onAlerts,
  onOrder,
  onVerify,
  lines,
  setLines,
  firstPage = 'Home',
}) {
  const [screen, setScreen] = useState(validPages.includes(firstPage) ? firstPage : 'Home');
  const {width} = useWindowDimensions();
  const [history, setHistory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState('All');
  const [sort, setSort] = useState('');
  const [branch, setBranch] = useState(null);
  const [dish, setDish] = useState(null);
  const [category, setCategory] = useState('All');
  const [expand, setExpand] = useState(false);
  const [qty, setQty] = useState(1);
  const [addon, setAddon] = useState(false);
  const [payment, setPayment] = useState('cod');
  const [saved, setSaved] = useState({});
  const [quote, setQuote] = useState(null);
  const [quoteAttempt, requote] = useState(0);
  const [quoteError, setQuoteError] = useState(null);
  const [orderError, setOrderError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    let current = true;
    setBranches([]);
    setLoading(true);
    setLoadError(false);
    api('/catalogue/restaurants?city=' + encodeURIComponent(city))
      .then(({ restaurants }) => {
        if (current) setBranches(restaurants);
      })
      .catch(() => {
        if (current) setLoadError(true);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [city, attempt, api]);

  const selected = useMemo(() => lines.filter((l) => l.city === city), [lines, city]);
  const subtotal = selected.reduce((sum, l) => sum + l.unit * l.qty, 0);
  const count = selected.reduce((sum, l) => sum + l.qty, 0);
  const payload = useMemo(
    () => ({ city, address, ...(pin ? {pin} : {}), items: selected.map(ids), payment }),
    [city, address, pin, selected, payment],
  );
  const snapshot = JSON.stringify(payload);
  const quoteKey = account?.token + '|' + snapshot;
  const finalQuote = quote?.key === quoteKey ? quote.data : null;
  useEffect(() => {
    if (!['Checkout', 'Payment'].includes(screen) || !count || !account?.token || payment !== 'cod')
      return;
    let current = true;
    setQuote(null);
    setQuoteError(null);
    api('/orders/quote', 'POST', payload, account.token)
      .then((data) => {
        if (current) setQuote({ key: quoteKey, data });
      })
      .catch((e) => {
        if (current)
          setQuoteError({
            message: e.message || 'Could not load the current bill.',
            auth: e.status === 401,
          });
      });
    return () => {
      current = false;
    };
  }, [screen, api, payload, count, account?.token, quoteAttempt, quoteKey, payment]);
  function visit(next) {
    if (lock.current || next === screen) return;
    setHistory((previous) => [...previous, {screen,branch,dish,qty,addon,category,expand,term,scope,sort}]);
    setOrderError('');
    setScreen(next);
  }
  function home() {
    if (lock.current) return;
    setScreen('Home');
    setHistory([]);
    setTerm('');
    setOrderError('');
  }
  function back() {
    if (lock.current) return;
    if (!history.length) {
      home();
      return;
    }
    const previous = history[history.length - 1];
    setScreen(previous.screen);
    setBranch(previous.branch);
    setDish(previous.dish);
    setQty(previous.qty);
    setAddon(previous.addon);
    setCategory(previous.category);
    setExpand(previous.expand);
    setTerm(previous.term);
    setScope(previous.scope);
    setSort(previous.sort);
    setHistory(history.slice(0, -1));
    setOrderError('');
  }
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'Home') return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [screen, history]);
  function navigate(next) {
    if (lock.current) return;
    if (next === 'Home') home();
    else if (next === 'Account') onProfile?.();
    else visit(next);
  }
  function menu(b) {
    setBranch(b);
    setCategory('All');
    setExpand(false);
    visit('Menu');
  }
  function details(b, d) {
    setBranch(b);
    setDish(d);
    setQty(1);
    setAddon(false);
    visit('Dish');
  }
  function setFavourite(key) {
    setSaved((old) => ({ ...old, [key]: !old[key] }));
  }
  function openSearch(value = '') {
    setTerm(value);
    setScope('All');
    setSort('');
    visit('Search');
  }
  function add() {
    const key = [branch.id, dish.id, addon].join(':');
    const unit = dish.price + (addon ? dish.addon.price : 0);
    const entry = {
      key,
      city,
      branch: branch.name,
      branchId: branch.id,
      dishId: dish.id,
      photo: dish.photo,
      name: dish.name,
      unit,
      qty,
      addon,
      extra: addon ? dish.addon.name : '',
    };
    setLines((list) =>
      list.some((l) => l.city === city && l.key === key)
        ? list.map((l) =>
            l.city === city && l.key === key ? { ...entry, qty: Math.min(99, l.qty + qty) } : l,
          )
        : [...list, entry],
    );
    visit('Cart');
  }
  function change(key, delta) {
    setLines((list) =>
      list
        .map((l) => (l.key === key && l.city === city ? { ...l, qty: Math.min(99, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    );
  }
  function continueCheckout() {
    if (!account?.token) {
      onLogin();
      return;
    }
    visit('Checkout');
  }
  async function place() {
    if (lock.current) return;
    if (!account?.token) {
      onLogin();
      return;
    }
    if (account.emailVerified !== true) {
      onVerify?.();
      return;
    }
    if (!count || !finalQuote || payment !== 'cod') return;
    lock.current = true;
    setBusy(true);
    setOrderError('');
    let idempotencyKey = retryKeys.get(quoteKey);
    if (!idempotencyKey) {
      idempotencyKey = 'kk-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      retryKeys.set(quoteKey, idempotencyKey);
    }
    try {
      const { order } = await api(
        '/orders',
        'POST',
        { ...payload, idempotencyKey, expectedTotal: finalQuote.total },
        account.token,
      );
      if (!order?.id) throw new Error('Order confirmation could not be read. Retry to check it.');
      retryKeys.delete(quoteKey);
      setLines((list) => list.filter((l) => l.city !== city));
      onOrder(order);
    } catch (e) {
      setOrderError(e.message || 'Could not confirm the order. Your cart has been kept.');
      if (e.status === 409) requote((n) => n + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const clean = term.trim().toLowerCase();
  const searchRestaurants = branches.filter((b) =>
    [b.name, b.cuisine, ...tags(b)].some((v) => v?.toLowerCase().includes(clean)),
  );
  const searchDishes = branches.flatMap((b) =>
    b.menu
      .filter((d) => !clean || matches(d, term.trim()) || b.name.toLowerCase().includes(clean))
      .map((d) => ({ b, d })),
  );
  if (sort === 'Price') searchDishes.sort((a, b) => a.d.price - b.d.price);
  if (sort === 'Rating') {
    searchDishes.sort((a, b) => (b.b.rating || 0) - (a.b.rating || 0));
    searchRestaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }
  const dishPrice = dish ? (dish.price + (addon ? dish.addon?.price || 0 : 0)) * qty : 0;
  const favouriteKey = screen === 'Menu' ? branch?.id : branch?.id + ':' + dish?.id;
  const searchBar = (
    <View style={s.searchRow}>
      <Round name="back" label="Go back" onPress={back} />
      <Surface style={s.search}>
        <Icon name="search" />
        <TextInput
          accessibilityLabel="Search dishes or restaurants"
          value={term}
          onChangeText={setTerm}
          placeholder="Search dishes or restaurants"
          autoFocus
          returnKeyType="search"
          style={s.input}
        />
        {!!term && (
          <Tap label="Clear search" onPress={() => setTerm('')}>
            <Icon name="close" />
          </Tap>
        )}
      </Surface>
    </View>
  );
  const message = (text) => (
    <Text accessibilityLiveRegion="polite" style={s.message}>
      {text}
    </Text>
  );
  const menuCategories = branch
    ? [
        'All',
        ...categories.filter((c) => branch.menu.some((d) => matches(d, c.name))).map((c) => c.name),
      ]
    : [];
  const checkoutHero = selected.length
    ? branches
        .find((b) => b.id === ids(selected[0]).branchId)
        ?.menu.find((d) => d.id === ids(selected[0]).dishId)
    : null;
  return (
    <SafeAreaView style={s.page}>
      <View style={s.shell}>
        <ScrollView key={screen} keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
          {screen === 'Home' && (
            <>
              <Brand address={address || city} onAddress={() => onAddress('Home')} onAlerts={onAlerts} />
              <Tap label="Search dishes or restaurants" onPress={() => openSearch()}>
                <Surface style={s.search}>
                  <Icon name="search" />
                  <Text style={s.detail}>Search dishes or restaurants</Text>
                </Surface>
              </Tap>
              <View style={s.categoryRow}>
                {categories.map((c) => (
                  <Tap
                    label={'Search ' + c.name}
                    key={c.name}
                    onPress={() => openSearch(c.name)}
                    style={ui.fill}
                  >
                    <Surface tone="green" style={s.category}>
                      <Image source={c.photo} style={s.categoryImage} />
                      <Text style={s.pillText}>{c.name}</Text>
                    </Surface>
                  </Tap>
                ))}
              </View>
              <Text style={s.title}>Popular restaurants</Text>
              {branches.map((b) => (
                <Restaurant key={b.id} b={b} onPress={() => menu(b)} />
              ))}
            </>
          )}
          {screen === 'Search' && (
            <>
              {searchBar}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
              >
                {['All', 'Restaurants', 'Price', 'Rating'].map((f) => (
                  <Pill
                    key={f}
                    label={f}
                    selected={f === 'All' ? scope === 'All' && !sort : scope === f || sort === f}
                    onPress={() => {
                      if (f === 'All' || f === 'Restaurants') {
                        setScope(f);
                        setSort('');
                      } else {
                        setScope('All');
                        setSort(sort === f ? '' : f);
                      }
                    }}
                  />
                ))}
              </ScrollView>
              {scope !== 'Restaurants' &&
                searchDishes.map(({ b, d }) => (
                  <DishRow key={b.id + ':' + d.id} b={b} d={d} onPress={() => details(b, d)} />
                ))}
              {searchRestaurants.map((b) => (
                <Restaurant key={b.id} b={b} onPress={() => menu(b)} />
              ))}
              {!loading &&
                !loadError &&
                !searchRestaurants.length &&
                (scope === 'Restaurants' || !searchDishes.length) &&
                message('No matches for ' + term + '.')}
            </>
          )}
          {['Home', 'Search'].includes(screen) && loading && message('Loading restaurants…')}
          {['Home', 'Search'].includes(screen) && loadError && (
            <>
              <Text style={s.message}>Restaurants could not be loaded.</Text>
              <Button tone="green" label="Try again" onPress={() => setAttempt((x) => x + 1)} />
            </>
          )}
          {screen === 'Home' &&
            !loading &&
            !loadError &&
            !branches.length &&
            message('No restaurants are available for this address.')}
          {screen === 'Menu' && branch && (
            <>
              <View style={s.heroWrap}>
                <Image
                  source={branch.name.includes('Mehran') ? art.kitchen : branchPicture(branch)}
                  style={s.hero}
                  resizeMode="cover"
                />
                <View style={s.heroTools}>
                  <Round name="back" label="Go back" onPress={back} />
                  <Round
                    name="heart"
                    label={
                      saved[favouriteKey] ? 'Remove favourite restaurant' : 'Save favourite restaurant'
                    }
                    filled={saved[favouriteKey]}
                    onPress={() => setFavourite(favouriteKey)}
                  />
                </View>
              </View>
              <Surface style={s.menuHeading}>
                <Image source={art.brand} style={ui.logo} />
                <View style={ui.fill}>
                  <Text style={s.title}>{branch.name}</Text>
                  {meta(branch)}
                </View>
                <Round name="info" label="Restaurant information" onPress={() => setExpand(!expand)} />
              </Surface>
              {expand && (
                <Text style={s.detail}>
                  {branch.cuisine} · {branch.city} · {branch.menu.length} menu items
                </Text>
              )}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterRow}
              >
                {menuCategories.map((c) => (
                  <Pill key={c} selected={category === c} label={c} onPress={() => setCategory(c)} />
                ))}
              </ScrollView>
              {branch.menu
                .filter((d) => matches(d, category))
                .map((d) => (
                  <DishRow menu key={d.id} b={branch} d={d} onPress={() => details(branch, d)} />
                ))}
            </>
          )}
          {screen === 'Dish' && dish && branch && (
            <>
              <View style={s.heroWrap}>
                <Food dish={dish} style={[s.dishHero, {height: (Math.min(width,490)-32)/1.32}]} />
                <View style={s.heroTools}>
                  <Round name="back" label="Go back" onPress={back} />
                  <Round
                    name="heart"
                    label={saved[favouriteKey] ? 'Remove favourite dish' : 'Save favourite dish'}
                    filled={saved[favouriteKey]}
                    onPress={() => setFavourite(favouriteKey)}
                  />
                </View>
              </View>
              <Text style={s.title}>{dish.name}</Text>
              <Text style={s.detail}>{branch.name}</Text>
              {meta(branch)}
              {!!dish.description && <Text style={s.detail}>{dish.description}</Text>}
              {!!dish.addon && (
                <Tap
                  label={dish.addon.name + ', ' + money(dish.addon.price)}
                  selected={addon}
                  onPress={() => setAddon(!addon)}
                >
                  <Surface style={s.restaurant}>
                    <Image source={art.raita} style={s.sidePhoto} />
                    <View style={ui.fill}>
                      <Text style={s.heading}>{dish.addon.name}</Text>
                      <Text style={s.detail}>+ {money(dish.addon.price)}</Text>
                    </View>
                    <View style={[s.checkbox, addon && s.checked]}>
                      {addon && <Icon name="check" size={18} color="white" />}
                    </View>
                  </Surface>
                </Tap>
              )}
              <View style={s.amount}>
                <Stepper
                  large
                  qty={qty}
                  onMinus={() => setQty((n) => Math.max(1, n - 1))}
                  onPlus={() => setQty((n) => Math.min(99, n + 1))}
                />
                <Text style={s.heading}>{money(dishPrice)}</Text>
              </View>
            </>
          )}
          {screen === 'Cart' && (
            <>
              <Brand onAlerts={onAlerts} />
              <Text style={s.title}>Your cart</Text>
              {!count && (
                <>
                  {message('Your cart is empty.')}
                  <Button tone="green" label="Browse restaurants" onPress={home} />
                </>
              )}
              {selected.map((l) => {
                const d = branches
                  .find((b) => b.id === ids(l).branchId)
                  ?.menu.find((item) => item.id === ids(l).dishId);
                return (
                  <Surface key={l.key} style={s.cartCard}>
                    <Food dish={d || { photo: l.photo || ids(l).dishId }} style={s.cartPhoto} />
                    <View style={ui.fill}>
                      <Text style={s.detail}>{l.branch}</Text>
                      <Text style={s.heading}>{l.name}</Text>
                      {!!l.extra && <Text style={s.detail}>{l.extra}</Text>}
                      <Text style={ui.strong}>{money(l.unit * l.qty)}</Text>
                    </View>
                    <Stepper
                      qty={l.qty}
                      label={l.name}
                      onMinus={() => change(l.key, -1)}
                      onPlus={() => change(l.key, 1)}
                    />
                  </Surface>
                );
              })}
              {!!count && (
                <Surface tone="green" style={s.summary}>
                  <Amount label="Food subtotal" value={money(subtotal)} />
                </Surface>
              )}
            </>
          )}
          {screen === 'Checkout' && (
            <>
              <Brand onAlerts={onAlerts} />
              <Text style={s.title}>Checkout</Text>
              <Tap label="Change delivery address" onPress={() => onAddress('Checkout')}>
                <Surface style={s.summary}>
                  <View style={s.row}>
                    <Icon name="pin" />
                    <Text style={[s.detail, ui.fill]}>{address || city}</Text>
                    <Icon name="next" size={17} />
                  </View>
                </Surface>
              </Tap>
              {count ? (
                <Surface style={s.summary}>
                  <Amount label="Food subtotal" value={money(finalQuote?.subtotal ?? subtotal)} />
                  <Amount label="Delivery" value={finalQuote ? money(finalQuote.delivery) : '—'} />
                  <Amount label="Platform fee" value={finalQuote ? money(finalQuote.platform) : '—'} />
                  <Amount label="Applicable tax" value={finalQuote ? money(finalQuote.tax) : '—'} />
                  <Amount total label="Total" value={finalQuote ? money(finalQuote.total) : '—'} />
                </Surface>
              ) : (
                message('Your cart is empty.')
              )}
              {!!count && (
                <>
                  <View style={s.categoryRow}>
                    {[
                      ['Cash on delivery', 'cash'],
                      ['Card', 'card'],
                      ['Mobile wallet', 'wallet'],
                    ].map(([name, icon], i) => (
                      <Tap
                        key={icon}
                        label={name}
                        selected={i === 0 && payment === 'cod'}
                        style={ui.fill}
                        onPress={() => {
                          setPayment(i === 0 ? 'cod' : 'digital');
                          visit('Payment');
                        }}
                      >
                        <Surface style={[s.paymentMini, i === 0 && payment === 'cod' && s.chosen]}>
                          <Icon name={icon} />
                          <Text style={s.miniLabel}>{name}</Text>
                        </Surface>
                      </Tap>
                    ))}
                  </View>
                  {finalQuote?.pricingMode === 'preview' &&
                    message('Delivery and tax use the preview tariff.')}
                  {quoteError && (
                    <>
                      {message(quoteError.message)}
                      <Button
                        tone="green"
                        label={quoteError.auth ? 'Sign in again' : 'Retry quote'}
                        onPress={quoteError.auth ? onLogin : () => requote((n) => n + 1)}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}
          {screen === 'Payment' && (
            <>
              <Brand onBack={back} onAlerts={onAlerts} />
              <Food dish={checkoutHero || { photo: 'biryani' }} style={s.payHero} />
              <Text style={s.title}>Payment method</Text>
              {[
                ['cod', 'Cash on delivery', art.cash],
                ['digital', 'Digital payment', art.wallet],
              ].map(([value, label, photo]) => (
                <Tap
                  key={value}
                  label={label}
                  selected={payment === value}
                  disabled={busy}
                  onPress={() => {
                    setPayment(value);
                    setOrderError('');
                  }}
                >
                  <Surface
                    tone={payment === value ? 'green' : 'cream'}
                    style={[s.payOption, payment === value && s.chosen]}
                  >
                    <Image source={photo} resizeMode="contain" style={s.payPhoto} />
                    <Text style={[s.heading, ui.fill]}>{label}</Text>
                    <View style={[s.radio, payment === value && s.radioActive]} />
                  </Surface>
                </Tap>
              ))}
              {payment === 'digital' &&
                message(
                  'Digital payments are currently unavailable. Choose cash on delivery to place your order.',
                )}
              {payment === 'cod' && !!quoteError && (
                <>
                  {message(quoteError.message)}
                  <Button
                    tone="green"
                    label={quoteError.auth ? 'Sign in again' : 'Retry quote'}
                    onPress={quoteError.auth ? onLogin : () => requote((n) => n + 1)}
                  />
                </>
              )}
              {!!orderError && message(orderError)}
            </>
          )}
        </ScrollView>
        {screen === 'Dish' && dish ? (
          <Button icon="cart" label={'Add to cart   ' + money(dishPrice)} onPress={add} />
        ) : (
          <>
            {screen === 'Cart' && !!count && (
              <Button label="Continue to checkout" onPress={continueCheckout} />
            )}
            {screen === 'Checkout' && !!count && (
              <Button
                label="Choose payment"
                onPress={() => (account?.token ? visit('Payment') : onLogin())}
              />
            )}
            {screen === 'Payment' && (
              <Button
                label={
                  busy
                    ? 'Placing order…'
                    : !account?.token
                      ? 'Sign in'
                      : account.emailVerified !== true
                        ? 'Verify email'
                        : finalQuote
                          ? 'Place order · ' + money(finalQuote.total)
                          : 'Place order'
                }
                disabled={
                  busy || payment !== 'cod' || !count || (account?.emailVerified === true && !finalQuote)
                }
                onPress={place}
              />
            )}
            <Nav screen={screen} itemCount={count} onNavigate={navigate} />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#d9df9e' },
  shell: {
    width: '100%',
    maxWidth: 490,
    alignSelf: 'center',
    flex: 1,
    backgroundColor: colors.cream,
    borderColor: '#b5c486',
    borderWidth: 3,
    borderRadius: 26,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
  },
  body: { paddingVertical: 9, paddingHorizontal: 3, gap: 11, paddingBottom: 15 },
  title: { fontSize: 27, lineHeight: 32, fontWeight: '900', color: colors.ink, letterSpacing: -0.8 },
  heading: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: colors.ink },
  detail: { fontSize: 14, lineHeight: 19, color: colors.muted },
  meta: { fontSize: 13, color: colors.ink, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  search: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 14,
  },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 10, color: colors.ink },
  categoryRow: { flexDirection: 'row', gap: 6 },
  category: { alignItems: 'center', gap: 5, padding: 6 },
  categoryImage: { width: '100%', height: 49, borderRadius: 8 },
  pillText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  white: { color: 'white' },
  restaurant: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  front: { width: '32%', height: 73, borderRadius: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  tag: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: '#e1e8ad',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  filterRow: { flexDirection: 'row', gap: 7, paddingVertical: 3 },
  pill: { paddingHorizontal: 13, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  dishRow: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 5 },
  thumb: { width: '27%', height: 69 },
  priceCol: { paddingRight: 6, alignItems: 'flex-end', gap: 6 },
  addIcon: { height: 30, width: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  heroWrap: { position: 'relative', overflow: 'hidden', borderRadius: 23 },
  hero: { width: '100%', height: 177 },
  dishHero: { width: '100%' },
  heroTools: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuHeading: { marginTop: -24, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  sidePhoto: { width: 60, height: 55, borderRadius: 12 },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: '#938d57',
    borderWidth: 1.5,
    borderRadius: 6,
  },
  checked: { backgroundColor: '#f4830a' },
  amount: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  summary: { padding: 15, gap: 8 },
  totalRow: { borderTopWidth: 1, borderColor: '#d6c9a7', paddingTop: 9 },
  bold: { fontSize: 20, fontWeight: '800', color: colors.ink },
  cartCard: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 7 },
  cartPhoto: { width: '25%', height: 79 },
  paymentMini: { minHeight: 66, padding: 6, alignItems: 'center', justifyContent: 'center', gap: 3 },
  miniLabel: { fontSize: 13, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  payOption: { minHeight: 77, padding: 9, flexDirection: 'row', gap: 10, alignItems: 'center' },
  chosen: { borderWidth: 2, borderColor: '#eaa244' },
  payHero: { width: '100%', height: 175 },
  payPhoto: { width: 83, height: 58, borderRadius: 10 },
  radio: { width: 22, height: 22, borderRadius: 12, borderWidth: 2, borderColor: '#828553' },
  radioActive: { borderWidth: 7, borderColor: '#f58a1a', backgroundColor: '#fff7dc' },
  message: { color: '#604923', fontSize: 15, lineHeight: 20 },
});
