import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Storage from '@react-native-async-storage/async-storage';

const addressKey = 'v2.delivery-address';
const cities = ['Rawalpindi', 'Islamabad'];

function CustomerHome() {
  const [address, setAddress] = useState(null);
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState(cities[0]);
  const [street, setStreet] = useState('');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Storage.getItem(addressKey).then(raw => {
      const saved = raw && JSON.parse(raw);
      if (saved && cities.includes(saved.city) && typeof saved.street === 'string') setAddress(saved);
    }).catch(() => setMessage('Your saved address could not be loaded.')).finally(() => setLoaded(true));
  }, []);

  function editAddress() {
    setCity(address?.city ?? cities[0]);
    setStreet(address?.street ?? '');
    setMessage('');
    setEditing(true);
  }

  async function saveAddress() {
    const next = { city, street: street.trim() };
    if (!next.street) return;
    try {
      await Storage.setItem(addressKey, JSON.stringify(next));
      setAddress(next);
      setEditing(false);
      setMessage('');
    } catch {
      setMessage('Could not save your address. Try again.');
    }
  }

  return <SafeAreaView style={styles.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable accessibilityRole="button" disabled={!loaded} onPress={editAddress} style={styles.address}>
        <Text style={styles.label}>Deliver to</Text>
        <Text style={styles.title}>{address ? address.street + ', ' + address.city : 'Choose delivery address'}</Text>
      </Pressable>
      <TextInput style={styles.field} accessibilityLabel="Search restaurants or dishes" placeholder="Search restaurants or dishes" placeholderTextColor="#65645A" value={query} onChangeText={setQuery} returnKeyType="search" />
      <Text style={styles.title}>{query.trim() ? 'Search results' : 'Restaurants near you'}</Text>
      <Text style={styles.body}>{address ? 'Restaurant listings are currently unavailable.' : 'Choose an address to see who delivers to you.'}</Text>
      {!editing && !!message && <Text accessibilityRole="alert">{message}</Text>}
    </ScrollView>
    <Modal visible={editing} animationType="slide" onRequestClose={() => setEditing(false)}>
      <SafeAreaView style={styles.page}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Delivery address</Text>
          <View style={styles.row}>{cities.map(item => <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: city === item }} onPress={() => setCity(item)} style={[styles.chip, city === item && styles.selected]}>
            <Text style={styles.label}>{item}</Text></Pressable>)}</View>
          <TextInput accessibilityLabel="Street and area" placeholder="Street and area" value={street} onChangeText={setStreet} style={styles.field} />
          {!!message && <Text accessibilityRole="alert">{message}</Text>}
          <Pressable accessibilityRole="button" disabled={!street.trim()} onPress={saveAddress} style={[styles.action, !street.trim() && styles.disabled]}><Text style={styles.label}>Save address</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.chip}><Text style={styles.label}>Cancel</Text></Pressable>
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
  content: { padding: 24, gap: 18 },
  address: { padding: 20, gap: 6, borderRadius: 26, backgroundColor: '#DCEAAE', boxShadow: '0 5px 9px #48562928, inset 1px 2px 3px #F7FFDF, inset -2px -3px 5px #B7CB89' },
  title: { fontSize: 22, fontWeight: '700', color: '#263A2C' },
  label: { fontSize: 16, fontWeight: '600', color: '#233629' },
  body: { color: '#51594F', fontSize: 16, lineHeight: 23 },
  field: { backgroundColor: '#FFFCF6', borderColor: '#C6C4B2', borderWidth: 1, borderRadius: 18, paddingHorizontal: 16, minHeight: 52, fontSize: 16, color: '#263A2C' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#F1EBDF' },
  selected: { backgroundColor: '#DCEAAE' },
  action: { minHeight: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFA45C', borderRadius: 20, boxShadow: '0 4px 8px #AD652633, inset 1px 2px 3px #FFCF97' },
  disabled: { opacity: 0.45 },
});
