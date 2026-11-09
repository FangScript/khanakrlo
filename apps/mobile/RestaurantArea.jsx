import React, { useState } from 'react';
import { Image, Platform, Pressable, Text, View, Linking } from 'react-native';
import Svg, { Polygon, Circle, Line, Text as MapText } from 'react-native-svg';
import { Button, Choice, Field, Heading, Hero, s } from './RestaurantUI';
const centres = { Islamabad: [33.713, 73.054], Rawalpindi: [33.595, 73.05] };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function world(lat, lon, scale) {
  return [
    ((lon + 180) / 360) * scale,
    ((1 - Math.asinh(Math.tan((clamp(lat, -85, 85) * Math.PI) / 180)) / Math.PI) / 2) * scale,
  ];
}
export default function RestaurantArea({ branch, save, busy }) {
  const [points, pointsSet] = useState(branch.area || []),
    [zoom, setZoom] = useState(13),
    [width, setWidth] = useState(330),
    [failed, fail] = useState(false);
  const [centre, centreSet] = useState(() => {
    const area = branch.area || [];
    return area.length
      ? [
          area.reduce((a, p) => a + p.latitude, 0) / area.length,
          area.reduce((a, p) => a + p.longitude, 0) / area.length,
        ]
      : centres[branch.city] || centres.Islamabad;
  });
  const [lat, latitude] = useState(''),
    [lon, longitude] = useState('');
  const [pin, setPin] = useState(branch.pin);
  const h = 218,
    size = 256 * 2 ** zoom,
    [x, y] = world(...centre, size),
    left = x - width / 2,
    top = y - h / 2;
  const tiles = [];
  for (let col = Math.floor(left / 256); col <= Math.floor((left + width) / 256); col++) {
    for (let row = Math.floor(top / 256); row <= Math.floor((top + h) / 256); row++) {
      tiles.push(
        <Image
          key={zoom + '/' + col + '/' + row}
          source={{
            uri: 'https://tile.openstreetmap.org/' + [zoom, col, row].join('/') + '.png',
            headers: { 'User-Agent': 'KhanaKrlo/0.1 restaurant-boundary' },
          }}
          style={{
            position: 'absolute',
            left: col * 256 - left,
            top: row * 256 - top,
            width: 256,
            height: 256,
          }}
          onError={() => fail(true)}
        />,
      );
    }
  }
  const position = ({ latitude, longitude }) => {
    const [px, py] = world(latitude, longitude, size);
    return [px - left, py - top];
  };
  const xy = points.map(position),
    pickup = pin && position(pin);
  const grid = [];
  for (let i = 1; i <= 4; i++) {
    const px = (width * i) / 5,
      py = (h * i) / 5;
    const longitude = ((left + px) / size) * 360 - 180;
    const latitude = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (top + py)) / size))) * 180) / Math.PI;
    grid.push(
      <Line key={'x' + i} x1={px} x2={px} y1={0} y2={h} stroke="#c6c9ab" />,
      <Line key={'y' + i} x1={0} x2={width} y1={py} y2={py} stroke="#c6c9ab" />,
      <MapText key={'lat' + i} x={6} y={py - 4} fill="#61634a" fontSize={10}>
        {latitude.toFixed(3)}°
      </MapText>,
      <MapText key={'lon' + i} x={px + 3} y={14} fill="#61634a" fontSize={10}>
        {longitude.toFixed(3)}°
      </MapText>,
    );
  }
  function add(latitude, longitude) {
    pointsSet((old) => [
      ...old,
      { latitude: Number(latitude.toFixed(6)), longitude: Number(longitude.toFixed(6)) },
    ]);
  }
  function tap(e) {
    let { locationX, locationY } = e.nativeEvent;
    if (Platform.OS === 'web') {
      const bounds = e.currentTarget.getBoundingClientRect();
      locationX = e.nativeEvent.clientX - bounds.left;
      locationY = e.nativeEvent.clientY - bounds.top;
    }
    if (Number.isFinite(locationX) && Number.isFinite(locationY))
      add(
        (Math.atan(Math.sinh(Math.PI * (1 - (2 * (top + locationY)) / size))) * 180) / Math.PI,
        ((left + locationX) / size) * 360 - 180,
      );
  }
  const valid =
    !!lat.trim() &&
    !!lon.trim() &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon)) &&
    Math.abs(Number(lat)) <= 85 &&
    Math.abs(Number(lon)) <= 180;
  return (
    <>
      <Heading title="Service area" />
      <Hero name="orderKarahi" height={118} />
      <Text style={s.sub}>Service area boundary</Text>
      <Text style={s.body}>Tap at least three corners around the delivery area for {branch.name}.</Text>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: h, overflow: 'hidden', borderRadius: 16, backgroundColor: '#e4dfc8' }}
      >
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <Svg width="100%" height="100%" style={{ position: 'absolute' }}>
            {grid}
          </Svg>
          {tiles}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add boundary point on map"
          onPress={tap}
          style={{ flex: 1 }}
        >
          <View pointerEvents="none" style={{ flex: 1 }}>
            <Svg width="100%" height="100%">
              <Polygon
                points={xy.map((p) => p.join(',')).join(' ')}
                fill="#f5892933"
                stroke="#d56813"
                strokeWidth={3}
              />
              {xy.map(([cx, cy], i) => (
                <Circle key={i} cx={cx} cy={cy} r={4} fill="#fff" stroke="#ad5010" strokeWidth={2} />
              ))}
              {pickup && (
                <Circle
                  cx={pickup[0]}
                  cy={pickup[1]}
                  r={6}
                  fill="#4c772b"
                  stroke="#fff"
                  strokeWidth={2}
                />
              )}
            </Svg>
          </View>
        </Pressable>
        <Text
          accessibilityRole="link"
          onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
          style={{ position: 'absolute', bottom: 3, right: 4, fontSize: 10, backgroundColor: 'white' }}
        >
          © OpenStreetMap contributors
        </Text>
      </View>
      {failed && <Text style={s.small}>Map tiles unavailable. Coordinates can be entered below.</Text>}
      <View style={s.wrap}>
        <Choice label="Zoom in" onPress={() => setZoom(clamp(zoom + 1, 10, 18))} />
        <Choice label="Zoom out" onPress={() => setZoom(clamp(zoom - 1, 10, 18))} />
        <Choice
          label="Undo point"
          disabled={!points.length}
          onPress={() => pointsSet(points.slice(0, -1))}
        />
      </View>
      <Text style={s.small}>
        {points.length} boundary points{pin ? ' · Pickup pin saved in this form' : ''}
      </Text>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field label="Latitude" value={lat} set={latitude} keyboardType="decimal-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Longitude" value={lon} set={longitude} keyboardType="decimal-pad" />
        </View>
      </View>
      <Choice
        label="Add coordinates"
        disabled={!valid}
        onPress={() => {
          add(Number(lat), Number(lon));
          if (!points.length) centreSet([Number(lat), Number(lon)]);
          else
            centreSet([
              (points.reduce((a, p) => a + p.latitude, 0) + Number(lat)) / (points.length + 1),
              (points.reduce((a, p) => a + p.longitude, 0) + Number(lon)) / (points.length + 1),
            ]);
          latitude('');
          longitude('');
        }}
      />
      <Choice
        label="Set pickup pin from coordinates"
        disabled={!valid}
        onPress={() => {
          setPin({ latitude: Number(lat), longitude: Number(lon) });
          centreSet([Number(lat), Number(lon)]);
        }}
      />
      <Button
        label="Save area"
        disabled={busy || points.length < 3}
        onPress={() => save({ area: points, ...(pin && { pin }) })}
      />
    </>
  );
}
