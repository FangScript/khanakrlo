import React from 'react';
import { Text, TextInput, View, StyleSheet } from 'react-native';
import { CatalogueImage, Icon, Surface, Tap } from './MarketUI';
import { Hero, money } from './CustomerUI';
export { Hero, money };
export { Button, Food, Round } from './MarketUI';
export const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fbefdf' },
  head: {
    width: '100%',
    maxWidth: 590,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  scroll: {
    width: '100%',
    maxWidth: 590,
    alignSelf: 'center',
    gap: 13,
    padding: 17,
    paddingBottom: 27,
    flexGrow: 1,
  },
  title: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, color: '#283c22' },
  sub: { fontSize: 18, fontWeight: '800', color: '#283c22' },
  body: { fontSize: 15, lineHeight: 21, color: '#594f3b' },
  small: { fontSize: 13, color: '#5e573f' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  card: { borderRadius: 17, padding: 14, gap: 9 },
  pill: {
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inp: {
    color: '#26351d',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 13,
    backgroundColor: '#fff6e8',
    borderRadius: 13,
    borderColor: '#d8c7a9',
    borderWidth: 1,
  },
  tabbar: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: 590,
    alignSelf: 'center',
    borderRadius: 20,
    padding: 6,
    marginBottom: 5,
  },
  tab: { paddingVertical: 7, alignItems: 'center', gap: 3, borderRadius: 14 },
  brand: { fontSize: 24, fontWeight: '900', color: '#243719', letterSpacing: -0.6 },
  error: { color: '#882f25', backgroundColor: '#ffe4d4', padding: 11, borderRadius: 12 },
  notice: { color: '#334523', backgroundColor: '#e5ecc2', padding: 11, borderRadius: 12 },
  divider: { height: 1, backgroundColor: '#dfd2b9' },
});
export function Heading({ title, desc }) {
  return (
    <View style={{ gap: 4 }}>
      <Text accessibilityRole="header" style={s.title}>
        {title}
      </Text>
      {!!desc && <Text style={s.body}>{desc}</Text>}
    </View>
  );
}
export function Card({ children, tone = 'cream' }) {
  return (
    <Surface tone={tone} style={s.card}>
      {children}
    </Surface>
  );
}
export function Field({ label, value, set, keyboardType = 'default', ...props }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.small}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={set}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        placeholderTextColor="#746e5e"
        style={s.inp}
        {...props}
      />
    </View>
  );
}
export function Choice({ label, onPress, on = false, disabled = false, icon }) {
  return (
    <Tap label={label} onPress={onPress} disabled={disabled} selected={on}>
      <Surface tone={on ? 'orange' : 'green'} style={s.pill}>
        {!!icon && <Icon name={icon} color={on ? 'white' : '#31452b'} size={16} />}
        <Text style={{ fontSize: 14, fontWeight: '700', color: on ? 'white' : '#31452b' }}>{label}</Text>
      </Surface>
    </Tap>
  );
}
export function Row({
  title,
  detail,
  icon = 'shop',
  onPress,
  image,
  imageUrl,
  tail,
  active = false,
  disabled = false,
}) {
  let block = (
    <Surface tone={active ? 'green' : 'cream'} style={[s.card, s.row]}>
      {image || imageUrl ? (
        <CatalogueImage
          imageUrl={imageUrl}
          fallback={image}
          style={{ width: 62, height: 58, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <Icon name={icon} size={23} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.sub}>{title}</Text>
        {!!detail && <Text style={s.small}>{detail}</Text>}
      </View>
      {tail || (!!onPress && <Icon name="next" size={18} />)}
    </Surface>
  );
  return onPress ? (
    <Tap label={title} onPress={onPress} disabled={disabled}>
      {block}
    </Tap>
  ) : (
    block
  );
}
export function Pair({ label, value }) {
  return (
    <View style={[s.row, { justifyContent: 'space-between' }]}>
      <Text style={[s.body, { flex: 1 }]}>{label}</Text>
      <Text style={[s.sub, { fontSize: 16 }]}>{value}</Text>
    </View>
  );
}
export const documents = [
  ['license', 'Business license'],
  ['cnic', 'CNIC (owner)'],
  ['photo', 'Restaurant photo'],
];
export const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const blankHours = () =>
  days.map((_, day) => ({ day, open: '11:00', close: '22:00', enabled: true }));
export const photos = {
  biryani: require('./art/market/rice.jpg'),
  karahi: require('./art/market/karahi-hero.jpg'),
  wrap: require('./art/market/wrap.png'),
};
export const toPaisa = (value) =>
  /^\d+(\.\d{1,2})?$/.test(String(value).trim()) ? Math.round(Number(value) * 100) : NaN;
export function amountInPkr(value) {
  return String((value ?? 0) / 100);
}
export const dayInPakistan = () => new Date(Date.now() + 5 * 3600000).toISOString().slice(0, 10);
