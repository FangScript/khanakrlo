import React, { useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from './Icons';
import { ui } from './CustomerUI';

const centres = {
  Islamabad: { latitude: 33.721, longitude: 73.062 },
  Rawalpindi: { latitude: 33.598, longitude: 73.049 },
};
const tile = 256;
export default function DeliveryMap({ pin, city, onPick, onLocate }) {
  const [width, setWidth] = useState(320),
    [zoom, setZoom] = useState(15),
    [failed, setFailed] = useState(false);
  const height = 216,
    scale = tile * 2 ** zoom;
  const point = pin || centres[city] || centres.Islamabad;
  const radians = (Math.max(-85, Math.min(85, point.latitude)) * Math.PI) / 180;
  const left = ((point.longitude + 180) / 360) * scale - width / 2;
  const top = ((1 - Math.asinh(Math.tan(radians)) / Math.PI) / 2) * scale - height / 2;
  const tiles = [];
  for (let col = Math.floor(left / tile); col <= Math.floor((left + width) / tile); col++) {
    for (let row = Math.floor(top / tile); row <= Math.floor((top + height) / tile); row++) {
      tiles.push(
        <Image
          key={[zoom, col, row].join('/')}
          onError={() => setFailed(true)}
          source={{
            uri: 'https://tile.openstreetmap.org/' + zoom + '/' + col + '/' + row + '.png',
            headers: { 'User-Agent': 'KhanaKrlo/0.1 delivery-address' },
          }}
          style={{
            position: 'absolute',
            width: tile,
            height: tile,
            left: col * tile - left,
            top: row * tile - top,
          }}
        />,
      );
    }
  }
  function pick(e) {
    let { locationX, locationY } = e.nativeEvent;
    if (Platform.OS === 'web') {
      const rect = e.currentTarget.getBoundingClientRect();
      locationX = e.nativeEvent.clientX - rect.left;
      locationY = e.nativeEvent.clientY - rect.top;
    }
    const longitude = ((left + locationX) / scale) * 360 - 180;
    const latitude =
      (Math.atan(Math.sinh(Math.PI * (1 - (2 * (top + locationY)) / scale))) * 180) / Math.PI;
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) onPick({ latitude, longitude });
  }
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height, borderRadius: 20, overflow: 'hidden', backgroundColor: '#e9e1c5' }}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {tiles}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Select delivery pin on map"
        onPress={pick}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        {pin && (
          <View pointerEvents="none" style={{ marginTop: -29 }}>
            <Icon name="pin" size={36} color="#d65c05" />
          </View>
        )}
      </Pressable>
      {failed && (
        <Text
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 8,
            top: 8,
            backgroundColor: '#fff9e9',
            maxWidth: '70%',
          }}
        >
          Map tiles unavailable. You can enter your street below.
        </Text>
      )}
      <View style={{ position: 'absolute', top: 8, right: 8, gap: 5 }}>
        {[
          ['+', () => setZoom(Math.min(19, zoom + 1)), 'Zoom in'],
          ['−', () => setZoom(Math.max(10, zoom - 1)), 'Zoom out'],
          ['◎', onLocate, 'Use current location'],
        ].map(([mark, action, label]) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={ui.icon}
            onPress={action}
          >
            <Text style={ui.label}>{mark}</Text>
          </Pressable>
        ))}
      </View>
      <Text
        accessibilityRole="link"
        onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          backgroundColor: '#fff8eb',
          fontSize: 11,
        }}
      >
        © OpenStreetMap contributors
      </Text>
    </View>
  );
}
