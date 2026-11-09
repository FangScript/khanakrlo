import React, {useEffect, useRef, useState} from 'react';
import {Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from './Icons';

const titles = {
  register:'Create account', login:'Sign in', forgot:'Reset your password',
  reset:'New password', verify:'Verify your email',
};
const footers = {
  login:require('./art/auth-karahi.jpg'), forgot:require('./art/auth-samosa.jpg'),
  reset:require('./art/grill.jpg'), verify:require('./art/auth-jamun.jpg'),
};
function Link({label,onPress,disabled}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
    onPress={onPress} style={({pressed})=>[s.link,pressed&&s.pressed]}>
    <Text style={s.linkText}>{label}</Text>
  </Pressable>;
}
function Field({label,secret,autoComplete,value,onChangeText,onSubmitEditing,disabled,showLabel}) {
  const [visible,setVisible]=useState(false);
  return <View style={s.fieldGroup}>
    {showLabel&&<Text style={s.fieldLabel}>{label}</Text>}
    <View style={s.field}>
      <Icon name={secret?'lock':'email'}/>
      <TextInput accessibilityLabel={label} placeholder={showLabel&&!secret?'name@example.com':label}
        placeholderTextColor="#706a59" value={value} onChangeText={onChangeText} editable={!disabled}
        autoComplete={autoComplete} autoCapitalize="none" autoCorrect={false}
        keyboardType={secret?'default':'email-address'} secureTextEntry={secret&&!visible}
        onSubmitEditing={onSubmitEditing} style={s.input}/>
      {secret&&<Pressable accessibilityRole="button" accessibilityLabel={(visible?'Hide ':'Show ')+label.toLowerCase()}
        onPress={()=>setVisible(v=>!v)} style={s.eye}><Icon name={visible?'eyeOff':'eye'}/></Pressable>}
    </View>
  </View>;
}
function CodeField({value,setValue,disabled,onSubmit}) {
  const [focused,setFocused]=useState(false);
  return <View style={s.codeRow}>
    {Array.from({length:6},(_,i)=><View key={i} accessible={false}
      style={[s.codeBox,focused&&Math.min(value.length,5)===i&&s.codeFocus]}>
      <Text style={s.codeDigit}>{value[i]||' '}</Text>
    </View>)}
    <TextInput accessibilityLabel="Six-digit email code" keyboardType="number-pad" autoComplete="one-time-code"
      value={value} onChangeText={text=>setValue(text.replace(/[^0-9]/g,'').slice(0,6))}
      maxLength={6} editable={!disabled} onSubmitEditing={onSubmit}
      onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} caretHidden
      style={[StyleSheet.absoluteFill,s.codeInput]}/>
  </View>;
}
export default function AccountScreens({page,open,api,session,onAuthenticated,onVerified,onBack,resetToken}) {
  const {height,width}=useWindowDimensions();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [confirmation,setConfirmation]=useState('');
  const [code,setCode]=useState('');
  const [note,setNote]=useState('');
  const [busy,setBusy]=useState(false);
  const [expiresAt,setExpiresAt]=useState(0);
  const [now,setNow]=useState(Date.now);
  const screen=useRef(page);
  const pending=useRef(false);
  const verifyRequest=useRef(null);
  screen.current=page;
  const register=page==='register';
  const login=page==='login';
  useEffect(()=>{
    setPassword('');setConfirmation('');setCode('');setNote('');setExpiresAt(0);
    if(page!=='verify') {verifyRequest.current=null;return;}
    let active=true;
    if(!session?.token) return;
    if(verifyRequest.current?.token!==session.token){
      verifyRequest.current={token:session.token,promise:api('/identity/verify/request','POST',{},session.token)};
    }
    setBusy(true);
    verifyRequest.current.promise.then(result=>{
      if(!active)return;
      if(result.emailVerified){onVerified({...session,emailVerified:true});return;}
      setExpiresAt(Date.parse(result.expiresAt));setNow(Date.now());
    }).catch(error=>{if(active)setNote(error.message || 'Could not send the code. Request a new code.');})
      .finally(()=>{if(active)setBusy(false);});
    return ()=>{active=false;};
  },[page,session?.token]);
  useEffect(()=>{
    if(page!=='verify'||!expiresAt)return;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[page,expiresAt]);
  async function run(action) {
    if(pending.current||busy)return;
    const current=page;
    pending.current=true;setBusy(true);setNote('');
    try{await action();} catch(e){if(screen.current===current)setNote(e.message||'Please try again.');}
    finally{pending.current=false;setBusy(false);}
  }
  function submit() {
    run(async()=>{
      if(login||register) {
        if(!email.trim()||!password)throw Error('Enter your email and password.');
        const account=await api('/identity/'+page,'POST',{email:email.trim(),password});
        await onAuthenticated(account);
      } else if(page==='forgot') {
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Enter your registered email address.');
        setNote((await api('/identity/reset/request','POST',{email:email.trim()})).message);
      } else if(page==='reset') {
        if(!resetToken)throw Error('Open the link in your reset email or request a new link.');
        if(password!==confirmation)throw Error('Both passwords must match.');
        await api('/identity/reset/confirm','POST',{token:resetToken,password});
        open('login');
      } else {
        if(code.length!==6)throw Error('Enter the six digits from your email.');
        const verified=await api('/identity/verify/confirm','POST',{code},session.token);
        await onVerified({...session,...verified});
      }
    });
  }
  function resend() {
    run(async()=>{
      const result=await api('/identity/verify/request','POST',{},session.token);
      if(result.emailVerified){await onVerified({...session,emailVerified:true});return;}
      setCode('');setExpiresAt(Date.parse(result.expiresAt));setNow(Date.now());
      setNote('A new code was sent to your email.');
    });
  }
  const compact=height<650;
  const brandSize=Math.min(width*.26,height*.15,116);
  const minutes=Math.max(0,Math.ceil((expiresAt-now)/60000));
  const action=login||register?titles[page]:page==='reset'?'Save password':page==='forgot'?'Send reset link':'Verify email';
  return <SafeAreaView style={s.root}>
    <KeyboardAvoidingView style={s.fill} behavior={Platform.OS==='ios'?'padding':undefined}>
      <View style={s.nav}><Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={busy} onPress={onBack} style={s.back}><Icon name="back"/></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.scroll} key={page}>
        <View style={[s.form,{gap:compact?10:15}]}>
          {!register&&<View style={s.brand}>
            <Image accessible={false} resizeMode="contain" source={require('./art/chef.png')} style={{width:brandSize,height:brandSize}}/>
            <Text style={s.wordmark}>Khana Krlo</Text>
          </View>}
          <Text accessibilityRole="header" style={[s.heading,register&&s.center]}>{titles[page]}</Text>
          {register&&<Image accessible={false} resizeMode="contain" source={require('./art/identity.png')}
            style={{width:'100%',height:Math.min(height*.25,210)}}/>}
          {(login||register||page==='forgot')&&<Field label={page==='forgot'?'Registered email address':'Email address'}
            autoComplete="email" value={email} onChangeText={setEmail} showLabel={register} disabled={busy}
            onSubmitEditing={page==='forgot'?submit:undefined}/>}
          {(login||register||page==='reset')&&<Field key={'password-'+page} label={page==='reset'?'New password':'Password'} secret
            autoComplete={login?'current-password':'new-password'} value={password} onChangeText={setPassword}
            disabled={busy} showLabel={register} onSubmitEditing={page==='reset'?undefined:submit}/>}
          {page==='reset'&&<Field label="Confirm password" secret autoComplete="new-password" value={confirmation}
            onChangeText={setConfirmation} disabled={busy} onSubmitEditing={submit}/>}
          {page==='verify'&&<>
            <CodeField value={code} setValue={setCode} disabled={busy} onSubmit={submit}/>
            {!!expiresAt&&<Text style={s.centerText}>{minutes?'Expires in '+minutes+(minutes===1?' minute':' minutes'):'Code expired'}</Text>}
            <Link label="Request a new code" onPress={resend} disabled={busy}/>
          </>}
          {!!note&&<Text accessibilityRole="alert" style={s.notice}>{note}</Text>}
          <Pressable accessibilityRole="button" disabled={busy} onPress={submit}
            style={({pressed})=>[s.action,(pressed||busy)&&s.pressed]}><Text style={s.actionText}>{busy?'Please wait…':action}</Text></Pressable>
          {(login||register||page==='reset')&&<View style={s.links}>
            {login&&<><Link label="Create account" onPress={()=>open('register')} disabled={busy}/><Link label="Forgot password?" onPress={()=>open('forgot')} disabled={busy}/></>}
            {register&&<Link label="Already registered? Sign in" onPress={()=>open('login')} disabled={busy}/>}
            {page==='reset'&&<Link label="Request a new link" onPress={()=>open('forgot')} disabled={busy}/>}
          </View>}
        </View>
        {!!footers[page]&&<Image accessible={false} resizeMode="cover" source={footers[page]}
          style={{width:'100%',height:Math.min(width*.61,height*.33,290),marginTop:'auto'}}/>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
const ink='#283a1c';
const clay='inset 0px 2px 3px #FFFCF4, inset 0px -2px 4px #D8C6A4, 0px 3px 4px #77572930';
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#FBF0DE'},fill:{flex:1},
  nav:{width:'100%',maxWidth:550,paddingHorizontal:16,alignSelf:'center',paddingTop:4},back:{width:44,height:42,alignItems:'center',justifyContent:'center',backgroundColor:'#DBE6A0',borderRadius:16,boxShadow:clay},
  scroll:{flexGrow:1,width:'100%',maxWidth:550,alignSelf:'center'},
  form:{paddingHorizontal:24,paddingTop:6,paddingBottom:12},brand:{alignItems:'center',gap:3},
  wordmark:{fontSize:35,fontWeight:'900',color:ink,letterSpacing:-1},heading:{fontSize:31,fontWeight:'900',color:ink},
  center:{textAlign:'center'},centerText:{textAlign:'center',color:ink,fontSize:16},
  fieldGroup:{gap:6},fieldLabel:{fontSize:17,fontWeight:'700',color:ink},field:{backgroundColor:'#FBF0DF',borderRadius:23,paddingLeft:18,flexDirection:'row',alignItems:'center',minHeight:53,boxShadow:clay},
  input:{flex:1,fontSize:17,color:ink,minHeight:52,paddingHorizontal:12},eye:{padding:12,minWidth:44,minHeight:44},
  action:{backgroundColor:'#F47A0D',borderRadius:26,minHeight:54,alignItems:'center',justifyContent:'center',boxShadow:'inset 0px 3px 4px #FFB662, inset 0px -3px 5px #BE5705, 0px 3px 5px #8251273D'},
  actionText:{fontSize:21,color:'#FFFDFA',fontWeight:'800'},pressed:{opacity:.72},
  links:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-evenly'},link:{minHeight:44,minWidth:44,paddingHorizontal:8,alignItems:'center',justifyContent:'center'},
  linkText:{fontSize:16,fontWeight:'700',textDecorationLine:'underline',color:'#40572E'},notice:{color:'#5E3924',fontSize:15},
  codeRow:{flexDirection:'row',gap:6},codeBox:{flex:1,alignItems:'center',justifyContent:'center',height:52,borderRadius:13,boxShadow:clay,backgroundColor:'#FFF4DF'},
  codeDigit:{fontSize:23,color:ink,fontWeight:'800'},codeFocus:{borderWidth:1,borderColor:'#8B9A47'},codeInput:{opacity:.01,color:'transparent'},
});
