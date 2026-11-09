import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Image, KeyboardAvoidingView, NativeModules, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import Icon from './Icons';
import * as Location from 'expo-location';

const art = {
  chef: require('./art/chef.png'), grill: require('./art/grill.jpg'),
  route: require('./art/route.png'), welcome: require('./art/welcome.png'),
  identity: require('./art/identity.png'),
};
const sessionKey = 'kk.v2.session';
async function api(path, method = 'GET', data, token) {
  const base = process.env.EXPO_PUBLIC_GATEWAY_URL || (__DEV__ && 'http://' + new URL(NativeModules.SourceCode.scriptURL).hostname + ':18218');
  if (!base) throw new Error('Service is unavailable.');
  const res = await fetch(base + path, { method, headers: { 'content-type':'application/json', ...(token ? { authorization:'Bearer '+token } : {}) }, body:data ? JSON.stringify(data) : undefined });
  const value = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(value.error || 'Service is unavailable. Please try again.'), {status:res.status});
  return value;
}
function Action({label, onPress, orange, disabled, icon}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[styles.button,orange && styles.orange,pressed && styles.pressed,disabled && styles.disabled]}>
    {icon && <Icon name={icon} color={orange ? '#FFFDF5' : ink}/>}
    <Text style={[styles.buttonText,orange && styles.white]}>{label}</Text>
  </Pressable>;
}
function Artwork({name, style}) {
  const {width, height} = Image.resolveAssetSource(art[name]);
  return <Image accessible={false} source={art[name]} resizeMode="contain" style={[{width:'100%',aspectRatio:width / height},style]}/>;
}
function Flow() {
  const [page, go] = useState('splash');
  const [email, setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [visible,showPassword] = useState(false);
  const [note,setNote] = useState('');
  const [busy,setBusy] = useState(false);
  const [session,setSession] = useState(null);
  const [address,setAddress] = useState('');
  const [pin,setPin] = useState(null);
  const lock = useRef(false);
  useEffect(()=>{
    const timer=setTimeout(()=>go('intro'),1300);
    return ()=>clearTimeout(timer);
  },[]);
  function open(next) { setNote('');setPassword('');showPassword(false);go(next); }
  useEffect(()=>{
    const handler=BackHandler.addEventListener('hardwareBackPress',()=>{
      if (busy) return true;
      if (['register','login','guest'].includes(page) && !session) {open('welcome');return true;}
      if(page==='welcome') {open('intro');return true;}
      return false;
    });
    return ()=>handler.remove();
  },[page,busy,session]);
  async function run(action) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setNote('');
    try { await action(); } catch(e){setNote(e.message || 'Please try again.');}
    finally {lock.current=false;setBusy(false);}
  }
  function submit() {
    run(async()=>{
      if(!email.trim()||!password) throw new Error('Enter your email and password.');
      const value=await api('/identity/'+page,'POST',{email:email.trim(),password});
      await SecureStore.setItemAsync(sessionKey,value.token);
      setSession(value);open('guest');
    });
  }
  function continueIntro() {
    run(async()=>{
      const token=await SecureStore.getItemAsync(sessionKey);
      if(!token){open('welcome');return;}
      try {const account=await api('/identity/session','GET',null,token);setSession({...account,token});open('guest');}
      catch(e){if(e.status!==401)throw e;await SecureStore.deleteItemAsync(sessionKey);open('welcome');}
    });
  }
  function locate() {
    run(async()=>{
      if(!(await Location.requestForegroundPermissionsAsync()).granted) throw new Error('Enter your street and city below.');
      const {coords}=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});
      const point={latitude:coords.latitude,longitude:coords.longitude};setPin(point);
      const [place]=await Location.reverseGeocodeAsync(point);
      setAddress([place?.streetNumber,place?.street,place?.city].filter(Boolean).join(' '));
    });
  }
  const auth=page==='register'||page==='login';
  return <View style={styles.frame}><StatusBar barStyle="dark-content"/>
    <SafeAreaView style={styles.safe}><KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView key={page} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page,page==='splash' && styles.center]}>
      {page==='splash' && <><View style={styles.corner}/><Artwork name="chef" style={{width:170}}/><Text accessibilityRole="header" style={styles.brand}>Khana Krlo</Text></>}
      {page==='intro' && <><Artwork name="grill" style={styles.hero}/><Text style={styles.brand}>Khana Krlo</Text><Text style={styles.summary}>Order from restaurants across Rawalpindi and Islamabad, and follow your meal to your door.</Text><Artwork name="route"/><Action orange icon="arrow" label="Continue" disabled={busy} onPress={continueIntro}/></>}
      {page==='welcome' && <><Text accessibilityRole="header" style={styles.brand}>Welcome</Text><Artwork name="welcome"/><View style={styles.actions}><Action orange icon="register" label="Create account" onPress={()=>open('register')}/><Action icon="user" label="Sign in" onPress={()=>open('login')}/><Action icon="compass" label="Browse as guest" onPress={()=>open('guest')}/></View></>}
      {auth && <><Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={()=>open('welcome')} style={styles.back}><Icon name="back"/></Pressable>
        <Text accessibilityRole="header" style={styles.heading}>{page==='register'?'Create account':'Sign in'}</Text>
        <Artwork name="identity" style={{width:'67%',alignSelf:'center'}}/>
        <Text style={styles.label}>Email address</Text><View style={styles.password}><Icon name="email"/><TextInput accessibilityLabel="Email address" style={styles.passwordInput} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="name@example.com"/></View>
        <Text style={styles.label}>Password</Text><View style={styles.password}><Icon name="lock"/><TextInput accessibilityLabel="Password" secureTextEntry={!visible} value={password} onChangeText={setPassword} editable={!busy} onSubmitEditing={submit} autoCapitalize="none" autoComplete={page==='register'?'new-password':'current-password'} style={styles.passwordInput}/><Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} onPress={()=>showPassword(!visible)} style={{padding:12}}><Icon name={visible ? "eyeOff" : "eye"}/></Pressable></View>
        <Action orange label={busy?'Please wait…':page==='register'?'Create account':'Sign in'} disabled={busy} onPress={submit}/></>}
      {page==='guest' && <><Text style={styles.heading}>Delivery address</Text>{session && <Text>{session.email}</Text>}<Action icon="pin" label="Use my current location" disabled={busy} onPress={locate}/>{pin && <Text>Delivery pin · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</Text>}<Text style={styles.label}>Street and city</Text><TextInput style={styles.input} accessibilityLabel="Street and city" value={address} onChangeText={setAddress}/><Action orange label="Save address" disabled={!address.trim()||busy} onPress={()=>run(async()=>{await SecureStore.setItemAsync('kk.v2.address',JSON.stringify({address:address.trim(),pin}));setNote('Delivery address saved.');})}/><Action label={session?'Sign out':'Back'} disabled={busy} onPress={()=>run(async()=>{if(session){await api('/identity/session','DELETE',null,session.token);await SecureStore.deleteItemAsync(sessionKey);setSession(null);}open('welcome');})}/></>}
      {!!note && <Text accessibilityRole="alert" style={styles.note}>{note}</Text>}
      </ScrollView>
    </KeyboardAvoidingView></SafeAreaView></View>;
}
export default function App(){return <SafeAreaProvider><Flow/></SafeAreaProvider>;}
const ink='#293D19',cream='#FBF0DE';
const styles=StyleSheet.create({
 frame:{flex:1,backgroundColor:cream,borderColor:'#B9CE79',borderWidth:1,borderRadius:14,overflow:'hidden'},
 safe:{flex:1},keyboard:{flex:1},
 page:{flexGrow:1,padding:20,gap:12,justifyContent:'center'},center:{alignItems:'center'},
 corner:{position:'absolute',top:-80,left:-85,width:230,height:200,borderRadius:100,backgroundColor:'#D9E69D'},
 brand:{textAlign:'center',color:ink,fontSize:42,fontWeight:'900'},heading:{color:ink,fontSize:34,fontWeight:'900'},
 hero:{borderRadius:26},summary:{fontSize:19,lineHeight:26,textAlign:'center',color:'#5C5D4F',paddingHorizontal:12},
 actions:{gap:14},button:{minHeight:55,flexDirection:'row',gap:10,paddingHorizontal:14,justifyContent:'center',alignItems:'center',borderRadius:28,backgroundColor:'#DDE99A',boxShadow:'inset 0px 3px 5px #F8FFD4, inset 0px -3px 4px #AFBD70, 0px 3px 5px #785A312B'},
 orange:{backgroundColor:'#F77B10',boxShadow:'inset 0px 3px 5px #FFBD68, inset 0px -3px 4px #BD560B, 0px 3px 6px #784D3238'},
 buttonText:{fontSize:20,fontWeight:'800',color:ink},white:{color:'#FFFDF5'},pressed:{opacity:.8},disabled:{opacity:.55},
 label:{color:ink,fontWeight:'700',fontSize:17},input:{paddingHorizontal:16,minHeight:50,borderRadius:23,backgroundColor:'#FFF6E8',borderWidth:1,borderColor:'#DDCBB1',fontSize:17,color:ink},
 password:{flexDirection:'row',alignItems:'center',paddingLeft:16,minHeight:50,borderRadius:23,backgroundColor:'#FFF6E8',borderWidth:1,borderColor:'#DDCBB1'},passwordInput:{flex:1,minHeight:50,paddingHorizontal:10,fontSize:17,color:ink},
 back:{alignSelf:'flex-start',minWidth:44,minHeight:44,alignItems:'center',justifyContent:'center',borderRadius:14,backgroundColor:'#DDE99A'},note:{fontSize:15,color:'#493D28'}
});
