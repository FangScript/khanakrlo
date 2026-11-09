import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Linking,
  NativeModules,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as NativeStorage from 'expo-secure-store';
import Splash from './Splash';
import Market from './Market';
import AccountScreens from './AccountScreens';
import CustomerDesk from './CustomerDesk';
import DeliveryMap from './DeliveryMap';
import { Button, Header, Hero, Tabs, ui } from './CustomerUI';

const SecureStore =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key) => sessionStorage.getItem(key),
        setItemAsync: async (key, value) => sessionStorage.setItem(key, value),
        deleteItemAsync: async (key) => sessionStorage.removeItem(key),
      }
    : NativeStorage;
import Icon from './Icons';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import * as Location from 'expo-location';

const art = {
  route: require('./art/route.png'),
  welcome: require('./art/welcome.png'),
  identity: require('./art/identity.png'),
};
const deliveryCities = ['Islamabad', 'Rawalpindi'];
function addressCity(address) {
  const parts = address.toLowerCase().split(/[^a-z]+/);
  const matches = deliveryCities.filter((name) => parts.includes(name.toLowerCase()));
  return matches.length === 1 ? matches[0] : '';
}
const sessionKey = 'kk.v2.session';
async function api(path, method = 'GET', data, token) {
  const devHost = __DEV__
    ? Platform.OS === 'web'
      ? window.location.hostname
      : new URL(NativeModules.SourceCode.scriptURL).hostname
    : null;
  const base = process.env.EXPO_PUBLIC_GATEWAY_URL || (devHost && 'http://' + devHost + ':18218');
  if (!base) throw new Error('Service is unavailable.');
  const res = await fetch(base + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: 'Bearer ' + token } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const value = await res.json().catch(() => {
    throw new Error('The service could not be reached. Please try again.');
  });
  if (!res.ok)
    throw Object.assign(new Error(value.error || 'Service is unavailable. Please try again.'), {
      status: res.status,
    });
  return value;
}
function Action({ label, onPress, orange, disabled, icon, clay }) {
  const trailing = icon === 'arrow';
  const symbol = icon && (
    <Icon name={icon} size={clay ? 27 : 24} color={orange ? '#FFFDF5' : ink} />
  );
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        orange && styles.orange,
        clay && styles.clayButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {clay && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pillColor]}>
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id={'fill-' + icon} x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0" stopColor={orange ? '#ffb155' : '#f0f2c5'} />
                <Stop offset="0.2" stopColor={orange ? '#ff911e' : '#e6eab0'} />
                <Stop offset="0.84" stopColor={orange ? '#f57b09' : '#d9df96'} />
                <Stop offset="1" stopColor={orange ? '#d56708' : '#acb56c'} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill={'url(#fill-' + icon + ')'} />
          </Svg>
        </View>
      )}
      {symbol && !trailing && <View style={clay && styles.leadingIcon}>{symbol}</View>}
      <Text style={[styles.buttonText, clay && styles.clayLabel, orange && styles.white]}>
        {label}
      </Text>
      {trailing && symbol}
    </Pressable>
  );
}
function IntroPhoto() {
  const { width, height } = useWindowDimensions();
  const w = Math.min(width - 2 * StyleSheet.hairlineWidth, 520);
  return (
    <View style={{ width: w, height: Math.min(w * 0.9, height * 0.43), alignSelf: 'center' }}>
      <Image
        source={require('./art/grill.jpg')}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 340 300" preserveAspectRatio="none">
          <Path
            fill={cream}
            d="M0 0H340C243 23 188 22 126 17C46 11 17 53 0 133Z M0 300V297C16 237 70 242 129 251C218 266 288 250 340 181V300Z"
          />
        </Svg>
      </View>
    </View>
  );
}
function Artwork({ name, style }) {
  const ratios = { grill: 1.6104, welcome: 1.2195, route: 3.038, identity: 1.1947 };
  const { width: viewport, height } = useWindowDimensions();
  const width =
    Math.min(viewport - (name === 'welcome' ? 36 : 42), height * 0.4 * ratios[name], 460) *
    (name === 'identity' ? 0.67 : 1);
  return (
    <Image
      accessible={false}
      source={art[name]}
      resizeMode="contain"
      style={[{ width, height: width / ratios[name], alignSelf: 'center' }, style]}
    />
  );
}
function Flow() {
  const { height } = useWindowDimensions();
  const [page, go] = useState('splash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [lines, setLines] = useState([]);
  const [marketPage, setMarketPage] = useState('Home');
  const [deskPage, setDeskPage] = useState('Account');
  const [currentOrder, setCurrentOrder] = useState(null);
  const [resetToken, setResetToken] = useState('');
  const destination = useRef('location');
  const addressOrigin = useRef('Home');

  useEffect(() => {
    let active = true;
    SecureStore.getItemAsync('kk.v2.address')
      .then((raw) => {
        if (!active || !raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.address === 'string') {
          setAddress(saved.address);
          setPin(saved.pin || null);
        }
        if (['Rawalpindi', 'Islamabad'].includes(saved.city)) setCity(saved.city);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [pin, setPin] = useState(null);
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(
      () => go((current) => (current === 'splash' ? 'intro' : current)),
      1300,
    );
    function handle(url) {
      if (!alive || !url) return;
      try {
        const token = new URL(url).searchParams.get('resetToken');
        if (!/^[a-f0-9]{64}$/i.test(token || '')) return;
        setResetToken(token);
        go('reset');
        if (Platform.OS === 'web') {
          const clean = new URL(window.location.href);
          clean.searchParams.delete('resetToken');
          window.history.replaceState(null, '', clean.toString());
        }
      } catch {}
    }
    if (Platform.OS === 'web') handle(window.location.href);
    else
      Linking.getInitialURL()
        .then(handle)
        .catch(() => {});
    const sub = Linking.addEventListener('url', (event) => handle(event.url));
    return () => {
      alive = false;
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  function open(next) {
    setNote('');
    go(next);
  }
  function market(screen = 'Home') {
    setMarketPage(screen);
    open('market');
  }
  function desk(screen, order = null) {
    setDeskPage(screen);
    setCurrentOrder(order);
    open('desk');
  }
  function editAddress(from = 'Home') {
    addressOrigin.current = from;
    open('guest');
  }
  function login(next, from) {
    destination.current = from;
    open(next);
  }
  function resume(account) {
    setSession(account);
    if (destination.current === 'Checkout') market('Checkout');
    else if (destination.current === 'Account') desk('Account');
    else if (address && city) market();
    else open('location');
  }
  function authBack() {
    if (page === 'forgot') open('login');
    else if (page === 'reset') {
      setResetToken('');
      open('login');
    } else if (destination.current === 'Checkout') market('Cart');
    else if (destination.current === 'Account') desk('Account');
    else open('welcome');
  }
  useEffect(() => {
    if (Platform.OS === 'web' || ['market', 'desk'].includes(page)) return;
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (['register', 'login', 'verify', 'forgot', 'reset'].includes(page)) {
        authBack();
        return true;
      }
      if (page === 'guest') {
        cancelLocation();
        if (addressOrigin.current === 'Account') desk('Account');
        else open('location');
        return true;
      }
      if (page === 'location') {
        open('welcome');
        return true;
      }
      if (page === 'welcome') {
        open('intro');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [page, busy]);
  async function run(action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setNote('');
    try {
      await action();
    } catch (e) {
      setNote(e.message || 'Please try again.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function signedOut(closed = false) {
    if (!closed && session) await api('/identity/session', 'DELETE', null, session.token);
    await SecureStore.deleteItemAsync(sessionKey);
    if (closed) {
      await SecureStore.deleteItemAsync('kk.v2.address');
      setAddress('');
      setCity('');
      setPin(null);
    }
    destination.current = 'location';
    setSession(null);
    setLines([]);
    setCurrentOrder(null);
    open('welcome');
  }
  function continueIntro() {
    run(async () => {
      const token = await SecureStore.getItemAsync(sessionKey);
      if (!token) {
        open('welcome');
        return;
      }
      try {
        const account = await api('/identity/session', 'GET', null, token);
        resume({ ...account, token });
      } catch (e) {
        if (e.status !== 401) throw e;
        await SecureStore.deleteItemAsync(sessionKey);
        open('welcome');
      }
    });
  }
  const locationRequest = useRef(0);
  const [locating, setLocating] = useState(false);
  function cancelLocation() {
    locationRequest.current++;
    setLocating(false);
  }
  async function locate() {
    open('guest');
    const id = ++locationRequest.current;
    setLocating(true);
    setNote('');
    try {
      if (!(await Location.requestForegroundPermissionsAsync()).granted)
        throw new Error('Enter your street and choose a delivery city.');
      if (id !== locationRequest.current) return;
      const { coords } = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (id !== locationRequest.current) return;
      const point = { latitude: coords.latitude, longitude: coords.longitude };
      setPin(point);
      if (Platform.OS === 'web') {
        setNote('Pin found. Check your street and choose your delivery city.');
        return;
      }
      const [place] = await Location.reverseGeocodeAsync(point);
      if (id !== locationRequest.current) return;
      const street =
        [place?.streetNumber, place?.street].filter(Boolean).join(' ') || place?.name || '';
      const foundCity = addressCity(
        [place?.city, place?.district, place?.subregion].filter(Boolean).join(' '),
      );
      setCity(foundCity);
      setAddress([street, place?.city].filter(Boolean).join(', '));
      if (!street || !foundCity) setNote('Check your street and select the delivery city below.');
    } catch {
      if (id === locationRequest.current)
        setNote('Enter your street and choose a delivery city below.');
    } finally {
      if (id === locationRequest.current) setLocating(false);
    }
  }
  function saveAddress() {
    run(async () => {
      cancelLocation();
      const street = address.trim();
      if (!street) throw new Error('Enter your delivery street.');
      const deliveryCity = city || addressCity(street);
      if (!deliveryCity) throw new Error('Choose Islamabad or Rawalpindi to continue.');
      await SecureStore.setItemAsync(
        'kk.v2.address',
        JSON.stringify({ address: street, city: deliveryCity, pin }),
      );
      setAddress(street);
      setCity(deliveryCity);
      if (addressOrigin.current === 'Account') desk('Account');
      else market(addressOrigin.current);
    });
  }
  if (page === 'splash') return <Splash />;
  function locationTab(tab) {
    cancelLocation();
    if (tab === 'Account') {
      desk(tab);
      return;
    }
    if (address.trim() && city) {
      market(tab);
      return;
    }
    addressOrigin.current = tab;
    open('guest');
  }
  const auth = ['register', 'login', 'forgot', 'reset', 'verify'].includes(page);
  if (auth)
    return (
      <AccountScreens
        page={page}
        open={open}
        api={api}
        session={session}
        resetToken={resetToken}
        onBack={authBack}
        onAuthenticated={async (account) => {
          await SecureStore.setItemAsync(sessionKey, account.token);
          resume(account);
        }}
        onVerified={(account) => resume({ ...session, ...account })}
      />
    );
  if (page === 'desk')
    return (
      <CustomerDesk
        initialPage={deskPage}
        initialOrder={currentOrder}
        session={session}
        api={api}
        onMarket={market}
        onAddress={() => editAddress('Account')}
        onLogin={(next) => login(next, 'Account')}
        onVerify={() => login('verify', 'Account')}
        onSignOut={() => signedOut()}
        onClosed={() => signedOut(true)}
      />
    );
  if (page === 'market')
    return (
      <Market
        address={address}
        pin={pin}
        city={city}
        api={api}
        account={session}
        firstPage={marketPage}
        lines={lines}
        setLines={setLines}
        onProfile={() => desk('Account')}
        onAlerts={() => desk('Alerts')}
        onOrders={() => desk('Orders')}
        onOrder={(order) => desk('PaymentStatus', order)}
        onVerify={() => login('verify', 'Checkout')}
        onAddress={editAddress}
        onLogin={() => login('login', 'Checkout')}
      />
    );
  if (page === 'location')
    return (
      <SafeAreaView style={ui.page}>
        <Header onBack={() => open('welcome')} onAlerts={() => desk('Alerts')} />
        <ScrollView contentContainerStyle={[ui.scroll, { justifyContent: 'center' }]}>
          <Hero name="location" height={Math.min(300, height * 0.34)} />
          <Text style={[ui.title, { textAlign: 'center' }]}>Delivery location</Text>
          <Text style={[ui.body, { textAlign: 'center' }]}>
            Let us know where to deliver your food.
          </Text>
          <Button primary icon="pin" label="Use my current location" onPress={locate} />
          <Button label="Enter address manually" onPress={() => editAddress('Home')} />
        </ScrollView>
        <Tabs current="Home" discovery go={locationTab} />
      </SafeAreaView>
    );
  return (
    <View style={[styles.frame, (page === 'intro' || page === 'welcome') && styles.clayFrame]}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            key={page}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.page,
              page === 'intro' && styles.introPage,
              page === 'welcome' && [
                styles.welcomePage,
                { paddingTop: Math.min(62, Math.max(12, height * 0.07)) },
              ],
              page === 'guest' && styles.authPage,
            ]}
          >
            {page === 'intro' && (
              <>
                <IntroPhoto />
                <Text style={styles.brand}>Khana Krlo</Text>
                <Text style={styles.summary}>
                  Order from restaurants across Rawalpindi and Islamabad, and follow your meal to
                  your door.
                </Text>
                <Artwork name="route" />
                <Action
                  clay
                  orange
                  icon="arrow"
                  label="Continue"
                  disabled={busy}
                  onPress={continueIntro}
                />
              </>
            )}
            {page === 'welcome' && (
              <>
                <Text accessibilityRole="header" style={[styles.brand, styles.welcomeTitle]}>
                  Welcome
                </Text>
                <Artwork name="welcome" />
                <View style={styles.actions}>
                  <Action
                    clay
                    orange
                    icon="register"
                    label="Create account"
                    onPress={() => login('register', 'location')}
                  />
                  <Action
                    clay
                    icon="user"
                    label="Sign in"
                    onPress={() => login('login', 'location')}
                  />
                  <Action
                    clay
                    icon="compass"
                    label="Browse as guest"
                    onPress={() => {
                      addressOrigin.current = 'Home';
                      if (address && city) market();
                      else open('location');
                    }}
                  />
                </View>
              </>
            )}
            {page === 'guest' && (
              <>
                <Header
                  onBack={() => {
                    cancelLocation();
                    if (addressOrigin.current === 'Account') desk('Account');
                    else open('location');
                  }}
                />
                <Text style={styles.heading}>Confirm your delivery pin</Text>
                <DeliveryMap
                  pin={pin}
                  city={city}
                  onLocate={locate}
                  onPick={(point) => {
                    cancelLocation();
                    setPin(point);
                    setNote('Check your street before saving this pin.');
                  }}
                />
                {session && <Text>{session.email}</Text>}
                <Action
                  icon="pin"
                  label={locating ? 'Finding your location…' : 'Use my current location'}
                  disabled={busy || locating}
                  onPress={locate}
                />
                {pin && (
                  <Text>
                    Delivery pin · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                  </Text>
                )}
                <Text style={styles.label}>Delivery city</Text>
                {deliveryCities.map((c) => (
                  <Action
                    key={c}
                    label={(city === c ? '✓ ' : '') + c}
                    onPress={() => {
                      cancelLocation();
                      if (city !== c) setPin(null);
                      setCity(c);
                      setNote('');
                    }}
                  />
                ))}
                <Text style={styles.label}>Street and city</Text>
                <TextInput
                  style={styles.input}
                  accessibilityLabel="Street and city"
                  value={address}
                  onChangeText={(text) => {
                    cancelLocation();
                    setAddress(text);
                    setNote('');
                  }}
                />
                {!!note && (
                  <Text accessibilityRole="alert" style={styles.note}>
                    {note}
                  </Text>
                )}
                <Action orange label="Save address" disabled={busy} onPress={saveAddress} />
              </>
            )}
            {page !== 'guest' && !!note && (
              <Text accessibilityRole="alert" style={styles.note}>
                {note}
              </Text>
            )}
          </ScrollView>
          {page === 'guest' && <Tabs current="Home" discovery go={locationTab} />}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Flow />
    </SafeAreaProvider>
  );
}
const ink = '#293D19',
  cream = '#FBF0DE';
const styles = StyleSheet.create({
  frame: {
    flex: 1,
    backgroundColor: cream,
    borderColor: '#B9CE79',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  safe: { flex: 1 },
  keyboard: { flex: 1 },
  page: { flexGrow: 1, padding: 20, gap: 12, justifyContent: 'center' },
  center: { alignItems: 'center' },
  corner: {
    position: 'absolute',
    top: -80,
    left: -85,
    width: 230,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#D9E69D',
  },
  brand: { textAlign: 'center', color: ink, fontSize: 42, fontWeight: '900' },
  heading: { color: ink, fontSize: 34, fontWeight: '900' },
  hero: { borderRadius: 26 },
  summary: {
    fontSize: 19,
    lineHeight: 26,
    textAlign: 'center',
    color: '#5C5D4F',
    paddingHorizontal: 12,
  },
  clayFrame: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 0, borderColor: '#bdce8a' },
  introPage: { paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'space-evenly', gap: 8 },
  welcomePage: { paddingHorizontal: 16, paddingBottom: 26, justifyContent: 'flex-start', gap: 16 },
  authPage: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  backBar: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  welcomeTitle: { fontSize: 46, fontWeight: '800' },
  clayButton: { minHeight: 66, borderRadius: 34 },
  clayLabel: { fontSize: 24, fontWeight: '700' },
  leadingIcon: { position: 'absolute', left: 22 },
  pillColor: { overflow: 'hidden', borderRadius: 34 },
  actions: { gap: 16 },
  button: {
    minHeight: 55,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: '#DDE99A',
    boxShadow: 'inset 0px 3px 5px #F8FFD4, inset 0px -3px 4px #AFBD70, 0px 3px 5px #785A312B',
  },
  orange: {
    backgroundColor: '#F77B10',
    boxShadow: 'inset 0px 3px 5px #FFBD68, inset 0px -3px 4px #BD560B, 0px 3px 6px #784D3238',
  },
  buttonText: { fontSize: 20, fontWeight: '800', color: ink },
  white: { color: '#FFFDF5' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  label: { color: ink, fontWeight: '700', fontSize: 17 },
  input: {
    paddingHorizontal: 16,
    minHeight: 50,
    borderRadius: 23,
    backgroundColor: '#FFF6E8',
    borderWidth: 1,
    borderColor: '#DDCBB1',
    fontSize: 17,
    color: ink,
  },
  password: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    minHeight: 50,
    borderRadius: 23,
    backgroundColor: '#FFF6E8',
    borderWidth: 1,
    borderColor: '#DDCBB1',
  },
  passwordInput: { flex: 1, minHeight: 50, paddingHorizontal: 10, fontSize: 17, color: ink },
  back: {
    alignSelf: 'flex-start',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#DDE99A',
  },
  note: { fontSize: 15, color: '#493D28' },
});
