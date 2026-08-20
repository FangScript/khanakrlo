import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { KhanaKarLoMark } from "@/components/khana-karlo-mark";
import { PrimaryButton } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatPKR } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

export default function OrdersScreen() {
  const { lastOrder } = useKhanaStore();
  return <ScreenContainer className="" containerClassName="bg-background"><View style={styles.screen}><View style={styles.heading}><Text style={styles.title}>Your orders</Text><Text style={styles.sub}>Track every delicious delivery</Text></View>{lastOrder ? <Pressable onPress={() => router.push("/order-tracking" as never)} style={({ pressed }) => [styles.activeOrder, pressed && styles.pressed]}><View style={styles.activeTop}><View style={styles.statusIcon}><MaterialIcons name="restaurant" size={22} color="#FFF8ED" /></View><View style={styles.activeInfo}><Text style={styles.statusLabel}>ACTIVE ORDER</Text><Text style={styles.restaurantName}>{lastOrder.restaurantName}</Text><Text style={styles.orderCode}>{lastOrder.id} · {lastOrder.createdAt}</Text></View><MaterialIcons name="chevron-right" size={24} color="#FFF8ED" /></View><View style={styles.statusStrip}><View style={styles.statusDot} /><Text style={styles.statusText}>Being prepared · {lastOrder.eta}</Text><Text style={styles.price}>{formatPKR(lastOrder.total)}</Text></View></Pressable> : <View style={styles.empty}><KhanaKarLoMark size={80} /><Text style={styles.emptyTitle}>No orders yet</Text><Text style={styles.emptyText}>Your future favourites will live here.</Text><PrimaryButton label="Find food" onPress={() => router.push("/" as never)} icon="restaurant-menu" /></View>}<Text style={styles.historyLabel}>ORDER HISTORY</Text><View style={styles.historyHint}><MaterialIcons name="receipt-long" size={20} color="#879187" /><Text style={styles.historyText}>Past orders and receipts will appear here after delivery.</Text></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#FFF8ED" },
  heading: { marginBottom: 19 },
  title: { color: "#17251D", fontSize: 27, lineHeight: 33, fontWeight: "900", letterSpacing: -0.5 },
  sub: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "600", marginTop: 2 },
  activeOrder: { borderRadius: 21, overflow: "hidden", backgroundColor: "#064B2C", marginBottom: 23 },
  activeTop: { flexDirection: "row", alignItems: "center", padding: 15, gap: 10 },
  statusIcon: { width: 45, height: 45, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#168A4A" },
  activeInfo: { flex: 1 },
  statusLabel: { color: "#FFB73D", fontSize: 9, lineHeight: 12, letterSpacing: 1, fontWeight: "900" },
  restaurantName: { color: "#FFFFFF", fontSize: 16, lineHeight: 20, fontWeight: "900", marginTop: 1 },
  orderCode: { color: "#D9E8DC", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 2 },
  statusStrip: { minHeight: 39, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "#0E623A" },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFB73D" },
  statusText: { color: "#E7F2E9", fontSize: 10, lineHeight: 14, fontWeight: "700", flex: 1 },
  price: { color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  historyLabel: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 1, fontWeight: "900", marginBottom: 9 },
  historyHint: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F2F3EF", borderRadius: 15, padding: 13 },
  historyText: { flex: 1, color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600" },
  empty: { alignItems: "center", paddingTop: 57, paddingHorizontal: 34, marginBottom: 38 },
  emptyTitle: { color: "#17251D", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 16 },
  emptyText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "600", textAlign: "center", marginTop: 4, marginBottom: 20 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});

