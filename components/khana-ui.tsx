import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { KhanaKarLoMark } from "@/components/khana-karlo-mark";
import { formatPKR, getCartItemCount, getCartSubtotal } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

export function PrimaryButton({
  label,
  onPress,
  icon,
  fullWidth = true,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialIcons.glyphMap;
  fullWidth?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, fullWidth && styles.fullWidth, pressed && styles.pressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {icon ? <MaterialIcons name={icon} size={19} color="#FFF8ED" /> : null}
    </Pressable>
  );
}

export function ScreenBack({ title }: { title?: string }) {
  return (
    <View style={styles.backRow}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed && styles.iconPressed]}>
        <MaterialIcons name="arrow-back" size={22} color="#064B2C" />
      </Pressable>
      {title ? <Text style={styles.backTitle}>{title}</Text> : <View />}
      <View style={styles.backButtonPlaceholder} />
    </View>
  );
}

export function CartBar() {
  const { cart } = useKhanaStore();
  const count = getCartItemCount(cart);

  if (count === 0) return null;

  return (
    <View style={styles.cartWrap}>
      <Pressable onPress={() => router.push("/cart")} style={({ pressed }) => [styles.cartBar, pressed && styles.pressed]}>
        <View style={styles.cartIconCircle}>
          <MaterialIcons name="shopping-bag" size={20} color="#064B2C" />
        </View>
        <View style={styles.cartTextBlock}>
          <Text style={styles.cartCount}>{count} {count === 1 ? "item" : "items"}</Text>
          <Text style={styles.cartView}>View your cart</Text>
        </View>
        <Text style={styles.cartTotal}>{formatPKR(getCartSubtotal(cart))}</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#FFF8ED" />
      </Pressable>
    </View>
  );
}

export function BrandTitle({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandTitle}>
      <KhanaKarLoMark size={compact ? 34 : 42} />
      <View>
        <Text style={[styles.brandName, compact && styles.brandNameCompact]}>Khaana <Text style={styles.brandNameOrange}>KarLo</Text></Text>
        {!compact ? <Text style={styles.brandTagline}>ORDER · TRACK · ENJOY</Text> : null}
      </View>
    </View>
  );
}

export function Pill({ children, selected = false }: { children: ReactNode; selected?: boolean }) {
  return <View style={[styles.pill, selected && styles.pillSelected]}>{children}</View>;
}

const styles = StyleSheet.create({
  primaryButton: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#FF6B00",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  fullWidth: { width: "100%" },
  primaryButtonText: { color: "#FFF8ED", fontSize: 16, lineHeight: 21, fontWeight: "800" },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  iconPressed: { opacity: 0.64 },
  backRow: { height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  backButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E7E8E2" },
  backButtonPlaceholder: { width: 42 },
  backTitle: { color: "#17251D", fontSize: 17, lineHeight: 22, fontWeight: "800" },
  cartWrap: { position: "absolute", left: 16, right: 16, bottom: 16, zIndex: 10 },
  cartBar: { minHeight: 64, borderRadius: 20, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", paddingHorizontal: 12, gap: 10, shadowColor: "#064B2C", shadowOpacity: 0.28, shadowOffset: { width: 0, height: 9 }, shadowRadius: 15, elevation: 8 },
  cartIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#FFB73D", alignItems: "center", justifyContent: "center" },
  cartTextBlock: { flex: 1 },
  cartCount: { color: "#FFF8ED", fontSize: 14, lineHeight: 18, fontWeight: "800" },
  cartView: { color: "#D8E6DB", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  cartTotal: { color: "#FFF8ED", fontSize: 14, lineHeight: 18, fontWeight: "800" },
  brandTitle: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandName: { color: "#064B2C", fontSize: 22, lineHeight: 24, fontWeight: "900", letterSpacing: -0.8 },
  brandNameCompact: { fontSize: 18, lineHeight: 21 },
  brandNameOrange: { color: "#FF6B00" },
  brandTagline: { marginTop: 2, color: "#6C7A70", fontSize: 8, lineHeight: 10, fontWeight: "800", letterSpacing: 1.4 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2" },
  pillSelected: { backgroundColor: "#E0F4E7", borderColor: "#168A4A" },
});

