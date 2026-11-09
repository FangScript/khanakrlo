import React, { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import Shopping from './Shopping';
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Storage from '@react-native-async-storage/async-storage';

const addressKey = 'v2.delivery-address';
const cities = ['Rawalpindi', 'Islamabad'];

function CustomerHome() {
  const [address, setAddress] = useState(null);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState('');
  const [welcome, setWelcome] = useState(true);
  const [launch, setLaunch] = useState('logo');
  const [pin, setPin] = useState(null);
  const [locating, setLocating] = useState(false);
  const request = useRef(0);
  const [street, setStreet] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLaunch('intro'), 1400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Storage.getItem(addressKey).then(raw => {
      const saved = raw && JSON.parse(raw);
      if (saved && cities.includes(saved.city) && typeof saved.street === 'string') {
        setAddress(saved);
        setWelcome(false);
      }
    }).catch(() => setMessage('Your saved address could not be loaded.')).finally(() => setLoaded(true));
  }, []);

  function editAddress() {
    setCity(address?.city ?? '');
    setPin(address?.pin ?? null);
    setStreet(address?.street ?? '');
    setMessage('');
    setEditing(true);
  }

  function closeEditor() {
    request.current++;
    setLocating(false);
    setEditing(false);
  }

  async function locate() {
    const ticket = ++request.current;
    setLocating(true);
    setMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (ticket !== request.current) return;
      if (!permission.granted) {
        setMessage('Enter your address manually, or allow location in Settings.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (ticket !== request.current) return;
      const point = { latitude: coords.latitude, longitude: coords.longitude };
      setPin(point);
      setCity('');
      setStreet('');
      const [place] = await Location.reverseGeocodeAsync(point);
      if (ticket !== request.current) return;
      setCity(cities.find(item => item.toLowerCase() === place?.city?.toLowerCase()) ?? '');
      setStreet([place?.streetNumber, place?.street].filter(Boolean).join(' ') || place?.district || '');
      setMessage('Check your city and street before saving this pin.');
    } catch {
      if (ticket === request.current) setMessage('Could not read the full address. Check the city and street or enter them manually.');
    } finally {
      if (ticket === request.current) setLocating(false);
    }
  }

  async function saveAddress() {
    const next = { city, street: street.trim(), pin };
    if (!next.street || !cities.includes(city) || locating) return;
    try {
      await Storage.setItem(addressKey, JSON.stringify(next));
      setAddress(next);
      closeEditor();
      setWelcome(false);
      setMessage('');
    } catch {
      setMessage('Could not save your address. Try again.');
    }
  }

  if (launch === 'logo') return <SafeAreaView style={styles.logoPage}>
    <Image accessibilityLabel="Khana Krlo" source={require('./brand.png')} style={styles.brand} />
  </SafeAreaView>;
  if (launch === 'intro') return <SafeAreaView style={styles.page}>
    <ScrollView contentContainerStyle={styles.intro}>
      <Text accessibilityRole="header" style={styles.introTitle}>Welcome to Khana Krlo</Text>
      <Text style={styles.body}>Order from restaurants across Rawalpindi and Islamabad and follow your delivery to your door.</Text>
      <Pressable accessibilityRole="button" onPress={() => setLaunch('app')} style={styles.action}><Text style={styles.label}>Continue</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    {welcome ? <View style={[styles.content, { flex: 1, justifyContent: 'center' }]}>
      <Text accessibilityRole="header" style={styles.title}>Get started</Text>
      <Text style={styles.body}>Sign in and account creation will be available when accounts open.</Text>
      <Pressable accessibilityRole="button" disabled={!loaded} onPress={editAddress} style={styles.action}><Text style={styles.label}>Choose delivery location</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => setWelcome(false)} style={styles.chip}><Text style={styles.label}>Browse as guest</Text></Pressable>
    </View> : <Shopping address={address} editAddress={editAddress} />}
    <Modal visible={editing} animationType="slide" onRequestClose={closeEditor}>
      <SafeAreaView style={styles.page}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Delivery address</Text>
          <Pressable accessibilityRole="button" disabled={locating} onPress={locate} style={styles.selectedButton}><Text style={styles.label}>{locating ? 'Finding your location…' : 'Use my current location'}</Text></Pressable>
          {pin && <Text style={styles.body}>Delivery pin · {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}</Text>}
          <View style={styles.row}>{cities.map(item => <Pressable key={item} disabled={locating} accessibilityRole="radio" accessibilityState={{ checked: city === item }} onPress={() => { if (city && city !== item) setPin(null); setCity(item); }} style={[styles.chip, city === item && styles.selected]}>
            <Text style={styles.label}>{item}</Text></Pressable>)}</View>
          <TextInput editable={!locating} accessibilityLabel="Street and area" placeholder="Street and area" value={street} onChangeText={setStreet} style={styles.field} />
          {!!message && <Text accessibilityRole="alert">{message}</Text>}
          <Pressable accessibilityRole="button" disabled={!street.trim() || !city || locating} onPress={saveAddress} style={[styles.action, (!street.trim() || !city || locating) && styles.disabled]}><Text style={styles.label}>Save address</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={closeEditor} style={styles.chip}><Text style={styles.label}>Cancel</Text></Pressable>
        </ScrollView>
      </KeyboardAvoidingView></SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

export default function Home() {
  return <SafeAreaProvider><CustomerHome /></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFF9EE' },
  logoPage: { flex: 1, backgroundColor: '#FCF7EC', alignItems: 'center', justifyContent: 'center' },
  brand: { width: 144, height: 144, borderRadius: 32 },
  intro: { flexGrow: 1, justifyContent: 'center', padding: 32, gap: 20 },
  introTitle: { fontSize: 36, fontWeight: '800', color: '#263A2C' },
  content: { padding: 24, gap: 18 },
  address: { padding: 20, gap: 6, borderRadius: 26, backgroundColor: '#DCEAAE', boxShadow: '0 5px 9px #48562928, inset 1px 2px 3px #F7FFDF, inset -2px -3px 5px #B7CB89' },
  title: { fontSize: 22, fontWeight: '700', color: '#263A2C' },
  label: { fontSize: 16, fontWeight: '600', color: '#233629' },
  body: { color: '#51594F', fontSize: 16, lineHeight: 23 },
  field: { backgroundColor: '#FFFCF6', borderColor: '#C6C4B2', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, minHeight: 52, fontSize: 16, color: '#263A2C' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#F1EBDF' },
  selected: { backgroundColor: '#DCEAAE' },
  selectedButton: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#DCEAAE' },
  action: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFA45C', borderRadius: 20, boxShadow: '0 4px 8px #AD652633, inset 1px 2px 3px #FFCF97' },
  disabled: { opacity: 0.45 },
});
