import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

export const colors = {
  ink: '#20341b',
  muted: '#50523d',
  cream: '#fbefdf',
  olive: '#dce5a4',
  orange: '#f47805',
};
export const art = {
  brand: require('./art/chef.png'),
  kitchen: require('./art/market/kitchen.jpg'),
  front: require('./art/market/kitchen.jpg'),
  secondFront: require('./art/market/second-front.jpg'),
  rice: require('./art/market/rice.jpg'),
  raita: require('./art/market/raita.png'),
  cash: require('./art/market/cash.png'),
  wallet: require('./art/market/wallet.png'),
};
export const categories = [
  { name: 'Biryani', photo: require('./art/market/biryani.png') },
  { name: 'BBQ', photo: require('./art/market/bbq.png') },
  { name: 'Karahi', photo: require('./art/market/karahi.png') },
  { name: 'Desi', photo: require('./art/market/desi.png') },
];
const photoMap = {
  biryani: art.rice,
  karahi: require('./art/market/karahi-hero.jpg'),
  wrap: require('./art/market/wrap.png'),
};
const paths = {
  home: 'M2 11 12 3l10 8v10h-7v-7H9v7H3V11z',
  search: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 7 7',
  cart: 'M2 4h3l3 12h11l3-9H6M10 20a1 1 0 1 0 0 .1M18 20a1 1 0 1 0 0 .1',
  account: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2z',
  bell: 'M4 17c3-2 2-6 3-9 2-5 8-5 10 0 1 3 0 7 3 9zM10 20h4',
  pin: 'M19 9c0 5-7 12-7 12S5 14 5 9a7 7 0 1 1 14 0zM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0z',
  back: 'm13 5-7 7 7 7M6 12h15',
  next: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  close: 'm6 6 12 12M18 6 6 18',
  plus: 'M5 12h14M12 5v14',
  minus: 'M5 12h14',
  clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 6v6l4 2',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1 2 9.3l6.9-1z',
  heart: 'M12 21 3.5 12.5C-2 6 7 0 12 7c5-7 14-1 8.5 5.5z',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM12 11v6M12 7h.01',
  check: 'm4 12 5 5L20 6',
  cash: 'M2 5h20v14H2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  card: 'M2 5h20v14H2zM3 10h18',
  wallet: 'M3 6h17v14H3zM15 10h7v6h-7z',
  shop: 'M3 9 6 3h12l3 6v2H3zM5 12v9h14v-9',
};
export function Icon({ name, size = 20, color = colors.ink, fill = false }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={paths[name]}
        fill={fill ? color : 'none'}
        stroke={color}
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
const tones = {
  cream: ['#fff8ec', '#f8ead2', '#edddbf'],
  green: ['#f1f2cd', '#e0e7a9', '#c7d685'],
  orange: ['#ffab42', '#ff8b12', '#ed7100'],
};
export function Surface({ children, style, tone = 'cream' }) {
  const gradient = tones[tone];
  const id = 'mf' + React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <View style={[ui.surface, style]}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: -1 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="15%" y2="100%">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset=".55" stopColor={gradient[1]} />
              <Stop offset="1" stopColor={gradient[2]} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      {children}
    </View>
  );
}
export function Tap({ children, label, onPress, style, disabled = false, selected }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && ui.pressed, disabled && ui.disabled]}
    >
      {children}
    </Pressable>
  );
}
export function Round({ name, label, onPress, tone = 'green', size = 39, filled = false }) {
  return (
    <Tap label={label} onPress={onPress}>
      <Surface
        tone={tone}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={name}
          size={size * 0.51}
          color={tone === 'orange' ? 'white' : colors.ink}
          fill={filled}
        />
      </Surface>
    </Tap>
  );
}
export function Button({ label, onPress, icon, disabled = false, tone = 'orange' }) {
  return (
    <Tap label={label} disabled={disabled} onPress={onPress}>
      <Surface tone={tone} style={ui.cta}>
        {icon && <Icon name={icon} color={tone === 'orange' ? 'white' : colors.ink} />}
        <Text style={[ui.ctaText, { color: tone === 'orange' ? 'white' : colors.ink }]}>{label}</Text>
      </Surface>
    </Tap>
  );
}
export function Food({ dish, style }) {
  const source = photoMap[dish?.photo];
  if (!source)
    return (
      <View style={[ui.fallback, style]}>
        <Icon name="shop" />
      </View>
    );
  return (
    <Image
      accessible={false}
      resizeMode={dish.photo === 'wrap' ? 'contain' : 'cover'}
      source={source}
      style={[ui.food, style]}
    />
  );
}
export function Brand({ address, onAddress, onAlerts, onBack }) {
  return (
    <View style={ui.brandRow}>
      {onBack && <Round name="back" label="Go back" onPress={onBack} />}
      <Image source={art.brand} accessible={false} style={address ? ui.bigLogo : ui.logo} />
      <View style={ui.fill}>
        <Text style={ui.brand}>Khana Krlo</Text>
        {!!address && (
          <Tap label={'Change address, ' + address} onPress={onAddress}>
            <Surface tone="green" style={ui.addressPill}>
              <Icon name="pin" size={14} color="#e67d0c" />
              <Text style={ui.strong} numberOfLines={1}>
                {address}
              </Text>
              <Icon name="down" size={14} />
            </Surface>
          </Tap>
        )}
      </View>
      <Round name="bell" label="Notifications" onPress={onAlerts} />
    </View>
  );
}
export function Stepper({ qty, onMinus, onPlus, large = false, label = 'Quantity' }) {
  const size = large ? 43 : 32;
  return (
    <View style={ui.stepper}>
      <Round name="minus" label={'Decrease ' + label} size={size} onPress={onMinus} />
      <Text style={[ui.strong, large && { fontSize: 21 }]}>{qty}</Text>
      <Round name="plus" label={'Increase ' + label} size={size} onPress={onPlus} />
    </View>
  );
}
export function Nav({ screen, itemCount, onNavigate }) {
  const current = screen === 'Menu' ? 'Home' : screen;
  return (
    <Surface tone="green" style={ui.nav}>
      {['Home', 'Search', 'Cart', 'Account'].map((name) => {
        const active = current === name;
        return (
          <Tap
            key={name}
            label={name === 'Cart' ? 'Cart, ' + itemCount + ' items' : name}
            selected={active}
            onPress={() => onNavigate(name)}
            style={ui.navCell}
          >
            {active ? (
              <Surface tone="orange" style={ui.navItem}>
                <Icon name={name.toLowerCase()} color="#fff9e9" fill={name === 'Home'} />
                <Text style={[ui.navLabel, { color: 'white' }]}>{name}</Text>
              </Surface>
            ) : (
              <View style={ui.navItem}>
                <Icon name={name.toLowerCase()} />
                <Text style={ui.navLabel}>
                  {name}
                  {name === 'Cart' && itemCount ? ' · ' + itemCount : ''}
                </Text>
              </View>
            )}
          </Tap>
        );
      })}
    </Surface>
  );
}
export const ui = StyleSheet.create({
  surface: {
    position: 'relative',
    zIndex: 0,
    overflow: 'hidden',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#fff9ec',
    backgroundColor: '#f9edda',
    boxShadow: 'inset 0 1px 2px #fffaef, 0 3px 5px #6b551738',
  },
  fill: { flex: 1, minWidth: 0 },
  strong: { fontWeight: '800', fontSize: 15, color: colors.ink, flexShrink: 1 },
  brand: { fontWeight: '900', fontSize: 28, color: colors.ink, letterSpacing: -0.8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60 },
  logo: { width: 53, height: 53 },
  bigLogo: { width: 65, height: 65 },
  addressPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 9,
    marginTop: 2,
    maxWidth: '100%',
  },
  cta: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 9,
    borderRadius: 22,
  },
  ctaText: { fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.55 },
  food: { backgroundColor: '#f2e5c9', borderRadius: 12 },
  fallback: { backgroundColor: '#e4e7be', alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  nav: { flexDirection: 'row', padding: 4, borderRadius: 27, marginTop: 3 },
  navCell: { flex: 1, minWidth: 0 },
  navItem: { minHeight: 50, justifyContent: 'center', alignItems: 'center', gap: 2, borderRadius: 19 },
  navLabel: { color: colors.ink, fontWeight: '700', fontSize: 12 },
});
