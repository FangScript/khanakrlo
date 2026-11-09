import React, { useEffect, useState } from 'react';
import { BackHandler, Image, NativeModules, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const photos = { biryani: require('./food/biryani.jpg'), karahi: require('./food/karahi.webp'), wrap: require('./food/wrap.jpg') };
const money = paisa => 'PKR ' + (paisa / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 });
function Button({ title, onPress, secondary }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={[s.button, secondary && s.soft]}><Text style={s.bold}>{title}</Text></Pressable>;
}
function Photo({ type }) {
  return photos[type] ? <Image source={photos[type]} style={s.photo} resizeMode="cover" /> : null;
}

export default function Shopping({ address, editAddress }) {
  const [branches, setBranches] = useState([]);
  const [status, setStatus] = useState('');
  const [retry, setRetry] = useState(0);
  const [q, search] = useState('');
  const [route, go] = useState('home');
  const [branch, chooseBranch] = useState(null);
  const [dish, chooseDish] = useState(null);
  const [count, quantity] = useState(1);
  const [extra, setExtra] = useState(false);
  const [cart, setCart] = useState([]);
  const city = address?.city;

  useEffect(() => {
    setCart([]); search(''); go('home');
  }, [city]);

  useEffect(() => {
    const abort = new AbortController();
    setBranches([]);
    if (!city) return;
    setStatus('Loading restaurants…');
    async function load() {
      let base = process.env.EXPO_PUBLIC_GATEWAY_URL;
      if (!base && __DEV__) base = 'http://' + new URL(NativeModules.SourceCode.scriptURL).hostname + ':8180';
      const response = await fetch(base + '/catalogue/restaurants?city=' + encodeURIComponent(city), { signal: abort.signal });
      if (!response.ok) throw new Error('unavailable');
      const result = await response.json();
      if (!abort.signal.aborted) {
        setBranches(result.restaurants);
        setStatus(result.restaurants.length ? '' : 'No restaurants are available at this address.');
      }
    }
    load().catch(() => { if (!abort.signal.aborted) setStatus('Could not load restaurants.'); });
    return () => abort.abort();
  }, [city, retry]);

  function back() { go(route === 'dish' ? 'menu' : 'home'); }
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route === 'home') return false;
      back(); return true;
    });
    return () => listener.remove();
  }, [route]);

  function openDish(place, item) {
    chooseBranch(place); chooseDish(item); quantity(1); setExtra(false); go('dish');
  }
  const unit = dish ? dish.price + (extra ? dish.addon.price : 0) : 0;
  function add() {
    const key = branch.id + '/' + dish.id + '/' + extra;
    setCart(lines => lines.some(line => line.key === key)
      ? lines.map(line => line.key === key ? { ...line, count: line.count + count } : line)
      : [...lines, { key, branch: branch.name, name: dish.name, addon: extra ? dish.addon.name : '', unit, count }]);
    go('cart');
  }
  const total = cart.reduce((sum, line) => sum + line.unit * line.count, 0);
  const term = q.trim().toLowerCase();
  const matches = value => value.toLowerCase().includes(term);
  return <ScrollView key={route} keyboardShouldPersistTaps="handled" contentContainerStyle={s.page}>
    {route !== 'home' && <Button secondary title="‹ Back" onPress={back} />}
    {route === 'home' && <>
      <Pressable accessibilityRole="button" onPress={editAddress} style={s.card}><Text style={s.label}>Deliver to</Text><Text style={s.title}>{address ? address.street + ', ' + city : 'Choose your address'}</Text></Pressable>
      <TextInput accessibilityLabel="Search restaurants or dishes" value={q} onChangeText={search} style={s.input} placeholder="Search restaurants or dishes" />
      <Text style={s.title}>{term ? 'Search results' : 'Near you'}</Text>
      {!city && <Text>Choose your delivery address to see nearby restaurants.</Text>}
      {!!status && city && <Text>{status}</Text>}
      {status.startsWith('Could not') && <Button title="Try again" onPress={() => setRetry(n => n+1)} />}
      {branches.filter(b => matches(b.name)).map(b => <Pressable key={b.id} accessibilityRole="button" onPress={() => { chooseBranch(b); go('menu'); }} style={s.card}>
        <Photo type={b.menu[0].photo} /><Text style={s.title}>{b.name}</Text><Text>{b.city}  ·  {b.cuisine}</Text>
      </Pressable>)}
      {!!term && branches.flatMap(b => b.menu.filter(d => matches(d.name)).map(d => <Pressable accessibilityRole="button" key={b.id+d.id} onPress={() => openDish(b,d)} style={s.card}><Text style={s.bold}>{d.name}  ·  {money(d.price)}</Text><Text>{b.name}</Text></Pressable>))}
      {!!term && branches.length > 0 && !branches.some(b => matches(b.name) || b.menu.some(d => matches(d.name))) && <Text>No matches for “{q}”.</Text>}
    </>}
    {route === 'menu' && branch && <><Text style={s.title}>{branch.name}</Text><Text>{branch.cuisine}  ·  {branch.city}</Text>{branch.menu.map(d => <Pressable accessibilityRole="button" key={d.id} onPress={() => openDish(branch,d)} style={s.card}><Photo type={d.photo} /><Text style={s.bold}>{d.name}</Text><Text>{money(d.price)}</Text></Pressable>)}</>}
    {route === 'dish' && dish && <><Photo type={dish.photo} /><Text style={s.title}>{dish.name}</Text><Text>{branch.name}  ·  {money(dish.price)}</Text>
      {dish.addon && <Button secondary title={(extra ? '✓  ' : '+  ') + dish.addon.name + '  ·  ' + money(dish.addon.price)} onPress={() => setExtra(!extra)} />}
      <View style={s.row}><Button secondary title="−" onPress={() => quantity(Math.max(1,count-1))} /><Text style={s.bold}>{count}</Text><Button secondary title="+" onPress={() => quantity(count+1)} /></View>
      <Button title={'Add to cart · ' + money(unit*count)} onPress={add} /></>}
    {route === 'cart' && <><Text style={s.title}>Your cart</Text>{Array.from(new Set(cart.map(line => line.branch))).map(name => <View style={s.card} key={name}><Text style={s.bold}>{name}</Text>{cart.filter(line => line.branch === name).map(line => <View key={line.key} style={s.line}><Text>{line.count} × {line.name}{line.addon ? ' + '+line.addon : ''}</Text><Text>{money(line.unit * line.count)}</Text><Button secondary title="Remove" onPress={() => setCart(cart.filter(l => l.key !== line.key))} /></View>)}</View>)}
      <Text style={s.title}>Subtotal · {money(total)}</Text><Button title="Continue browsing" onPress={() => go('home')} /></>}
    {['home','menu'].includes(route) && cart.length > 0 && <Button title={'View cart · ' + money(total)} onPress={() => go('cart')} />}
  </ScrollView>;
}
const s = StyleSheet.create({
  page:{padding:20,gap:17,paddingBottom:45},title:{fontWeight:'800',fontSize:24,color:'#20382A'},bold:{fontWeight:'700',fontSize:17,color:'#20382A'},label:{color:'#49603E',fontWeight:'600'},
  card:{padding:15,gap:8,backgroundColor:'#F4F1D7',borderRadius:24,boxShadow:'inset 2px 2px 4px #FFFDF4, inset -2px -3px 5px #D0DCA9, 0 4px 7px #504A221F'},
  photo:{height:172,width:'100%',borderRadius:18},input:{padding:16,backgroundColor:'#FFFDF6',borderRadius:22,borderWidth:1,borderColor:'#CCCEAF',fontSize:16},
  button:{paddingHorizontal:18,paddingVertical:14,alignItems:'center',backgroundColor:'#FFA45C',borderRadius:20,boxShadow:'inset 1px 2px 3px #FFE2B7, 0 3px 5px #675A3930'},
  soft:{backgroundColor:'#DCEAAE'},row:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},line:{gap:7,paddingVertical:6}
});
