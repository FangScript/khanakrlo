import Svg, { Circle, Path } from "react-native-svg";

type KhanaKarLoMarkProps = {
  size?: number;
  background?: string;
};

export function KhanaKarLoMark({ size = 48, background = "#064B2C" }: KhanaKarLoMarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="32" fill={background} />
      <Path d="M17 34.5h30" stroke="#FFF8ED" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M20.5 31.5c.9-9.3 6.2-14 11.5-14s10.6 4.7 11.5 14" stroke="#FFF8ED" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M32 17.5v-3.2" stroke="#FFF8ED" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M25 12.7c-1.8-2.1-1.5-4.6.4-6.4" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M32 11.2c-1.8-2.1-1.5-4.6.4-6.4" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M39 12.7c-1.8-2.1-1.5-4.6.4-6.4" stroke="#FF6B00" strokeWidth="2.8" strokeLinecap="round" />
      <Path d="M11.5 28.5h6M9 34.5h6M11.5 40.5h6" stroke="#FF6B00" strokeWidth="3.4" strokeLinecap="round" />
      <Path d="M42.7 42.5 32 54 21.3 42.5" stroke="#FFB73D" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

