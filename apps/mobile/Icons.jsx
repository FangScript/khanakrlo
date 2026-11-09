import React from 'react';
import Svg, { Path } from 'react-native-svg';

const paths = {
  user: 'M15.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2Z',
  register: 'M13 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2 20v-2a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v2ZM19 5v6m-3-3h6',
  compass: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16.5 7.5l-3 6-6 3 3-6Z',
  email: 'M2 5h20v14H2ZM3 6l9 7 9-7',
  lock: 'M5 10h14v11H5ZM8 10V7a4 4 0 0 1 8 0v3m-4 5v2',
  eye: 'M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  eyeOff: 'M3 3l18 18M2 12c1-2 3-4 5-5m4-2c6-1 10 4 12 7-1 2-2 3-4 5m-4 2C9 21 4 17 2 12',
  back: 'M15 4l-8 8 8 8', arrow: 'M4 12h16m-7-7 7 7-7 7',
  pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
};
export default function Icon({name, color='#293D19', size=24}) {
  return <Svg accessible={false} width={size} height={size} viewBox="0 0 24 24">
    <Path d={paths[name]} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </Svg>;
}
