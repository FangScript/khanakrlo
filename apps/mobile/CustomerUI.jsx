import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icons';
import { Surface } from './MarketUI';

export const ink = '#283c22',
  cream = '#fbefdc',
  pista = '#e2e8ad';
export const art = {
  location: require('./art/location.webp'),
  wallet: require('./art/wallet.webp'),
  delivery: require('./art/delivery.webp'),
  handover: require('./art/handover-photo.jpg'),
  orderRice: require('./art/order-biryani.jpg'),
  orderKarahi: require('./art/order-karahi.jpg'),
  workspace: require('./art/workspace-chargha.jpg'),
  support: require('./art/support-nihari.jpg'),
  closure: require('./art/closure-kebab.jpg'),
  grill: require('./art/grill.jpg'),
  chef: require('./art/chef.png'),
  biryani: require('./art/dishes/biryani.png'),
  karahi: require('./art/dishes/karahi.png'),
  wrap: require('./art/dishes/wrap.png'),
};
export function Hero({ name, height = 165 }) {
  return (
    <Image
      accessible={false}
      source={art[name]}
      resizeMode={
        [
          'grill',
          'handover',
          'orderRice',
          'orderKarahi',
          'workspace',
          'support',
          'closure',
        ].includes(name)
          ? 'cover'
          : 'contain'
      }
      style={{ width: '100%', height, borderRadius: 22 }}
    />
  );
}
export function Button({
  label,
  onPress,
  icon,
  primary = false,
  disabled = false,
  danger = false,
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [(pressed || disabled) && { opacity: 0.65 }]}
    >
      <Surface
        tone={primary ? 'orange' : danger ? 'cream' : 'green'}
        style={[ui.button, danger && ui.danger]}
      >
        {icon && <Icon name={icon} color={primary ? '#fff' : ink} />}
        <Text style={[ui.buttonText, primary && { color: '#fff' }]}>{label}</Text>
      </Surface>
    </Pressable>
  );
}
export function Header({ onBack, onAlerts }) {
  return (
    <View style={ui.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={ui.icon}
          onPress={onBack}
        >
          <Icon name="back" />
        </Pressable>
      )}
      <Image
        accessible={false}
        source={art.chef}
        style={{ width: 46, height: 50 }}
        resizeMode="contain"
      />
      <Text style={[ui.title, { flex: 1, fontSize: 26 }]}>Khana Krlo</Text>
      {onAlerts && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          style={ui.icon}
          onPress={onAlerts}
        >
          <Icon name="bell" />
        </Pressable>
      )}
    </View>
  );
}
export function Tabs({ current, go, discovery = false }) {
  return (
    <View style={ui.tabs}>
      {[
        ['Home', 'home'],
        discovery ? ['Search', 'search'] : ['Orders', 'orders'],
        ['Cart', 'cart'],
        ['Account', 'user'],
      ].map(([label, icon]) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          accessibilityState={{ selected: current === label }}
          style={[ui.tab, current === label && ui.primary]}
          onPress={() => go(label)}
        >
          <Icon name={icon} />
          <Text style={ui.tabLabel}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
export const money = (value) => 'PKR ' + ((value ?? 0) / 100).toLocaleString('en-PK');
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: cream },
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    padding: 18,
    gap: 14,
    paddingBottom: 28,
  },
  title: { fontSize: 30, fontWeight: '900', color: ink, letterSpacing: -0.7 },
  label: { fontSize: 18, fontWeight: '700', color: ink },
  body: { fontSize: 16, lineHeight: 23, color: '#554e3c' },
  header: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: 600,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  icon: {
    height: 44,
    width: 44,
    backgroundColor: pista,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  card: {
    backgroundColor: '#fff4df',
    padding: 16,
    borderRadius: 21,
    gap: 9,
    boxShadow: 'inset 1px 2px 3px #fffdf7, 0px 3px 5px #82653840',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  button: {
    paddingHorizontal: 16,
    minHeight: 48,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: pista,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexDirection: 'row',
    boxShadow: 'inset 0px 2px 3px #ffffff80, 0px 3px 5px #79672c35',
  },
  primary: { backgroundColor: '#db6105' },
  danger: { backgroundColor: '#f6d3c1' },
  buttonText: { fontSize: 17, fontWeight: '700', color: ink },
  input: {
    backgroundColor: '#fff8e9',
    borderWidth: 1,
    borderColor: '#cabea4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 50,
    borderRadius: 16,
    fontSize: 17,
    color: ink,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    maxWidth: 600,
    width: '100%',
    backgroundColor: pista,
    borderRadius: 21,
    padding: 5,
    gap: 3,
  },
  tab: { minHeight: 47, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  tabLabel: { color: ink, fontWeight: '700', fontSize: 12 },
});
