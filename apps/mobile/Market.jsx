import React, { useEffect, useState } from 'react';
import { BackHandler, Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const photos = { biryani: require('./art/dishes/biryani.png'), karahi: require('./art/dishes/karahi.png'), wrap: require('./art/dishes/wrap.png') };
const money = value => 'PKR ' + (value / 100).toLocaleString('en-PK');

function Button({label,onPress,primary,selected}) {
  return <Pressable accessibilityRole="button" accessibilityState={{selected:!!selected}} onPress={onPress} style={({pressed})=>[s.button,primary && s.primary,selected && s.selected,pressed && s.pressed]}>
    <Text style={s.label}>{label}</Text>
  </Pressable>;
}
function Food({dish,large}) {
  return photos[dish.photo] ? <Image accessible={false} resizeMode="contain" source={photos[dish.photo]} style={large?s.hero:s.thumb}/> : null;
}

export default function Market({address,city,api,account,onAddress,onLogin,lines,setLines,firstPage}) {
  const [screen,setScreen]=useState(firstPage);
  const [history,setHistory]=useState([]);
  const [branches,setBranches]=useState([]);
  const [status,setStatus]=useState('Loading restaurants…');
  const [attempt,retry]=useState(0);
  const [query,search]=useState('');
  const [branch,selectBranch]=useState(null);
  const [dish,selectDish]=useState(null);
  const [qty,setQty]=useState(1);
  const [addon,setAddon]=useState(false);
  const [payment,setPayment]=useState('Cash on delivery');

  useEffect(()=>{
    let active=true;
    setStatus('Loading restaurants…');
    api('/catalogue/restaurants?city='+encodeURIComponent(city)).then(result=>{
      if(active){setBranches(result.restaurants);setStatus(result.restaurants.length?'':'No restaurants are available here.');}
    }).catch(()=>{if(active)setStatus('Restaurants could not be loaded.');});
    return ()=>{active=false;};
  },[city,attempt,api]);
  function visit(next){setHistory(h=>[...h,screen]);setScreen(next);}
  function home(){setHistory([]);setScreen('Home');search('');}
  function back(){if(history.length){setScreen(history[history.length-1]);setHistory(history.slice(0,-1));}else home();}
  useEffect(()=>{
    if(Platform.OS==='web')return;
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{if(screen==='Home')return false;back();return true;});
    return ()=>handler.remove();
  },[screen,history]);
  function menu(b){selectBranch(b);visit('Menu');}
  function details(b,d){selectBranch(b);selectDish(d);setQty(1);setAddon(false);visit('Dish');}
  const selected=lines.filter(line=>line.city===city);
  const subtotal=selected.reduce((sum,line)=>sum+line.unit*line.qty,0);
  const itemCount=selected.reduce((sum,line)=>sum+line.qty,0);
  const unit=dish?dish.price+(addon?dish.addon.price:0):0;
  function add(){
    const key=[branch.id,dish.id,addon].join(':');
    setLines(previous=>previous.some(l=>l.key===key)
      ? previous.map(l=>l.key===key?{...l,qty:l.qty+qty}:l)
      : [...previous,{key,city,branch:branch.name,name:dish.name,unit,qty,extra:addon?dish.addon.name:''}]);
    visit('Cart');
  }
  function changeQty(key,delta){setLines(list=>list.map(l=>l.key===key?{...l,qty:l.qty+delta}:l).filter(l=>l.qty>0));}
  const term=query.trim().toLowerCase();
  const restaurants=branches.filter(b=>b.name.toLowerCase().includes(term));
  const dishes=branches.flatMap(b=>b.menu.filter(d=>d.name.toLowerCase().includes(term)).map(d=>({b,d})));
  function dishRow(b,d){return <Pressable accessibilityRole="button" key={b.id+d.id} onPress={()=>details(b,d)} style={s.card}><Food dish={d}/><View style={s.flex}><Text style={s.label}>{d.name}</Text><Text>{b.name}</Text><Text style={s.price}>{money(d.price)}</Text></View></Pressable>;}
  return <SafeAreaView style={s.page}>
    <ScrollView key={screen} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      {screen!=='Home' && <Button label="‹ Back" onPress={back}/>}
      {screen==='Home' && <>
        <Text style={s.brand}>Khana Krlo</Text>
        <Button label={'Deliver to · '+address} onPress={onAddress}/>
        <Button label="Search dishes or restaurants" onPress={()=>visit('Search')}/>
        <Text style={s.title}>Near you</Text>
        {branches.map(b=><Pressable accessibilityRole="button" key={b.id} onPress={()=>menu(b)} style={s.feature}><Food dish={b.menu[0]} large/><Text style={s.title}>{b.name}</Text><Text>{b.cuisine} · {city}</Text></Pressable>)}
      </>}
      {screen==='Search' && <>
        <Text style={s.title}>Search</Text><TextInput accessibilityLabel="Search dishes or restaurants" autoFocus value={query} onChangeText={search} placeholder="Dish or restaurant name" style={s.input}/>
        {restaurants.map(b=><Button key={b.id} label={b.name} onPress={()=>menu(b)}/>)}
        {dishes.map(({b,d})=>dishRow(b,d))}
        {!status && !restaurants.length && !dishes.length && <Text>No matches for “{query}”.</Text>}
      </>}
      {['Search','Home'].includes(screen) && !!status && <Text accessibilityLiveRegion="polite">{status}</Text>}
      {['Search','Home'].includes(screen) && status.includes('could not') && <Button label="Try again" onPress={()=>retry(n=>n+1)}/>}
      {screen==='Menu' && branch && <>
        <Food dish={branch.menu[0]} large/><Text style={s.title}>{branch.name}</Text><Text>{branch.cuisine} · {city}</Text>
        <Text style={s.label}>Menu</Text>{branch.menu.map(d=>dishRow(branch,d))}
      </>}
      {screen==='Dish' && dish && <>
        <Food dish={dish} large/><Text style={s.title}>{dish.name}</Text><Text>{branch.name}</Text><Text style={s.price}>{money(dish.price)}</Text>
        {dish.addon && <><Text style={s.label}>Add-ons</Text><Button selected={addon} label={(addon?'✓ ':'')+dish.addon.name+' · '+money(dish.addon.price)} onPress={()=>setAddon(!addon)}/></>}
        <View style={s.row}><Button label="−" onPress={()=>setQty(Math.max(1,qty-1))}/><Text style={s.label}>{qty}</Text><Button label="+" onPress={()=>setQty(qty+1)}/></View>
        <Button primary label={'Add to cart · '+money(unit*qty)} onPress={add}/>
      </>}
      {screen==='Cart' && <>
        <Text style={s.title}>Your cart</Text>{!itemCount && <Text>Your cart is empty.</Text>}
        {Array.from(new Set(selected.map(l=>l.branch))).map(name=><View key={name} style={s.feature}><Text style={s.label}>{name}</Text>{selected.filter(l=>l.branch===name).map(l=><View key={l.key} style={s.line}><Text>{l.name}{l.extra?' + '+l.extra:''}</Text><Text style={s.price}>{money(l.unit*l.qty)}</Text><View style={s.row}><Button label="−" onPress={()=>changeQty(l.key,-1)}/><Text>{l.qty}</Text><Button label="+" onPress={()=>changeQty(l.key,1)}/></View></View>)}</View>)}
        {!!itemCount && <><Text style={s.label}>Food subtotal · {money(subtotal)}</Text><Button primary label={account?'Review checkout':'Sign in to checkout'} onPress={()=>account?visit('Checkout'):onLogin()}/></>}
        <Button label="Continue browsing" onPress={home}/>
      </>}
      {screen==='Checkout' && <>
        <Text style={s.title}>Checkout</Text><View style={s.feature}><Text style={s.label}>Deliver to</Text><Text>{address}</Text><Text>{city}</Text></View>
        <Text>Food subtotal · {money(subtotal)}</Text><Text>Platform fee · PKR 10</Text><Text>Delivery fee and tax awaiting quote</Text>
        <Button label={'Payment · '+payment} onPress={()=>visit('Payment')}/>
        <Text>Order placement will be available once delivery and tax are confirmed.</Text>
      </>}
      {screen==='Payment' && <><Text style={s.title}>Payment method</Text>{['Cash on delivery','Digital payment'].map(mode=><Button key={mode} selected={payment===mode} label={mode} onPress={()=>{setPayment(mode);back();}}/>)}</>}
    </ScrollView>
    {screen!=='Cart' && <View style={s.nav}><Button label="Home" onPress={home}/><Button label="Search" onPress={()=>screen!=='Search' && visit('Search')}/><Button label={'Cart ('+itemCount+')'} onPress={()=>visit('Cart')}/></View>}
  </SafeAreaView>;
}
const ink='#263b20';
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:'#fff6e8'},content:{width:'100%',alignSelf:'center',maxWidth:620,padding:18,gap:14,paddingBottom:30},
 brand:{fontWeight:'900',fontSize:32,color:ink},title:{fontSize:27,fontWeight:'800',color:ink},label:{fontSize:17,fontWeight:'700',color:ink},price:{fontWeight:'700',color:'#80420e'},
 feature:{backgroundColor:'#f5efcf',padding:16,borderRadius:25,gap:8,boxShadow:'inset 1px 2px 4px #fffddf, 1px 3px 5px #65521d30'},hero:{width:'100%',height:185},thumb:{width:88,height:76},
 button:{minHeight:46,paddingHorizontal:14,paddingVertical:10,justifyContent:'center',alignItems:'center',backgroundColor:'#e2e8b2',borderRadius:20,boxShadow:'inset 0px 2px 3px #ffffd9, 0px 2px 4px #65521d30'},
 primary:{backgroundColor:'#ffaa49'},pressed:{opacity:0.76},selected:{borderWidth:2,borderColor:'#798f4a'},
 input:{backgroundColor:'#fffdf6',padding:14,borderWidth:1,borderColor:'#c8c7a1',fontSize:17,borderRadius:18},
 card:{flexDirection:'row',alignItems:'center',gap:13,padding:12,backgroundColor:'#f6f1dc',borderRadius:20},flex:{flex:1,gap:3},line:{gap:6,paddingVertical:8},row:{flexDirection:'row',gap:14,alignItems:'center'},nav:{flexDirection:'row',justifyContent:'space-around',padding:9,backgroundColor:'#eff1ce'}
});
