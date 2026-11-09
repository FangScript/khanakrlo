import React from 'react';
import { Image, StatusBar, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export default function Splash() {
  const {width, height} = useWindowDimensions();
  const size = Math.min(width * 0.53, height * 0.33, 218);
  return <View style={styles.screen}>
    <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 380 780" preserveAspectRatio="none">
        <Defs><LinearGradient id="pista" x1="0" x2="1" y1="0" y2="1">
          <Stop offset="0" stopColor="#e7edb1"/><Stop offset="1" stopColor="#b4c974"/>
        </LinearGradient></Defs>
        <Path d="M0 0H267C207 27 160 32 127 69S80 145 0 159Z" fill="url(#pista)"/>
        <Path d="M380 780H93C113 742 174 737 212 715S270 615 380 599Z" fill="url(#pista)"/>
      </Svg>
    </View>
    <Image source={require('./art/chef.png')} accessible={false} resizeMode="contain" style={{width:size,height:size*1.07}} />
    <Text accessibilityRole="header" style={[styles.name,{fontSize:Math.min(width*0.12,50)}]}>Khana Krlo</Text>
  </View>;
}
const styles=StyleSheet.create({
  screen:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:'#FBF0DE',overflow:'hidden'},
  name:{fontWeight:'900',color:'#2B401F',marginTop:12,letterSpacing:-1.2,textAlign:'center'}
});
