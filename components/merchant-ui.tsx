import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export const merchantStatus = {
  new: { label: "New", background: "#FFF1DA", text: "#9A5700", icon: "notifications-active" as const },
  preparing: { label: "Preparing", background: "#E8F0FF", text: "#245AA9", icon: "soup-kitchen" as const },
  ready: { label: "Ready", background: "#E0F4E7", text: "#17683A", icon: "check-circle" as const },
  outForDelivery: { label: "With rider", background: "#F1E8FF", text: "#6A3AAB", icon: "two-wheeler" as const },
  rejected: { label: "Rejected", background: "#FCE8E6", text: "#B04336", icon: "cancel" as const },
};

export function MerchantScreen({ children }: { children: ReactNode }) {
  return <ScreenContainer><View style={styles.screen}>{children}</View></ScreenContainer>;
}

export function MerchantTopBar({ outletName, onPressAvatar }: { outletName: string; onPressAvatar?: () => void }) {
  return (
    <View style={styles.topBar}>
      <View>
        <View style={styles.liveLabel}><View style={styles.liveDot} /><Text style={styles.liveLabelText}>LIVE ORDERS</Text></View>
        <Text style={styles.outletName}>{outletName}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onPressAvatar} style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
        <MaterialIcons name="storefront" size={20} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export function QueueStatusPill({ status }: { status: keyof typeof merchantStatus }) {
  const config = merchantStatus[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: config.background }]}>
      <MaterialIcons name={config.icon} size={13} color={config.text} />
      <Text style={[styles.statusPillText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

export const merchantStyles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#5E6D63", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  authContent: { flexGrow: 1, padding: 20, backgroundColor: "#F4F6F3" },
  authBrand: { alignItems: "center", marginTop: 24 },
  authBadge: { width: 68, height: 68, backgroundColor: "#064B2C", borderRadius: 22, alignItems: "center", justifyContent: "center" },
  authEyebrow: { marginTop: 16, color: "#17683A", fontSize: 11, lineHeight: 14, letterSpacing: 1.2, fontWeight: "900" },
  authTitle: { marginTop: 7, textAlign: "center", color: "#17251D", fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontWeight: "900" },
  authSubtitle: { marginTop: 9, textAlign: "center", color: "#5E6D63", fontSize: 14, lineHeight: 20, fontWeight: "600", maxWidth: 310 },
  authCard: { marginTop: 30, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 18, borderWidth: 1, borderColor: "#E1E6E0" },
  fieldLabel: { color: "#17251D", fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: "900" },
  phoneRow: { marginTop: 8, flexDirection: "row", gap: 10 },
  country: { width: 74, height: 54, borderRadius: 15, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6E2C4" },
  countryText: { color: "#064B2C", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  phoneInput: { flex: 1, height: 54, borderRadius: 15, borderWidth: 1, borderColor: "#CED8D0", paddingHorizontal: 14, color: "#17251D", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  helper: { marginTop: 9, color: "#718076", fontSize: 11, lineHeight: 16, fontWeight: "600" },
  action: { marginTop: 20, height: 54, borderRadius: 16, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionDisabled: { backgroundColor: "#A8B4AA" },
  actionPressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  actionText: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  authFooter: { marginTop: "auto", paddingTop: 28, alignItems: "center" },
  customerLink: { color: "#17683A", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  legal: { marginTop: 10, textAlign: "center", color: "#718076", fontSize: 10, lineHeight: 14, fontWeight: "600" },
  codeInput: { marginTop: 22, height: 68, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1.5, borderColor: "#9FC8AA", textAlign: "center", color: "#17251D", fontSize: 28, lineHeight: 32, letterSpacing: 10, fontWeight: "900", paddingLeft: 10 },
  verifyHint: { marginTop: 14, alignSelf: "center", backgroundColor: "#E0F4E7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, color: "#17683A", fontSize: 11, lineHeight: 14, fontWeight: "800" },
});

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6F3" },
  topBar: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 17, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  liveLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#8DE7A8" },
  liveLabelText: { color: "#B9E4C5", fontSize: 10, lineHeight: 13, letterSpacing: 1, fontWeight: "900" },
  outletName: { marginTop: 3, color: "#FFFFFF", fontSize: 21, lineHeight: 26, letterSpacing: -0.3, fontWeight: "900" },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#48A970" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, flexDirection: "row", alignItems: "center", gap: 4 },
  statusPillText: { fontSize: 10, lineHeight: 13, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
