import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import type { PlacedOrder } from "@/lib/khana-store";

const statusDetails: Record<PlacedOrder["status"], { title: string; message: string; icon: keyof typeof MaterialIcons.glyphMap; color: string; background: string }> = {
  confirmed: { title: "Order confirmed", message: "The kitchen has received your order and will begin shortly.", icon: "check-circle", color: "#17683A", background: "#E0F4E7" },
  preparing: { title: "Your food is being prepared", message: "The kitchen is working on your order. We will alert you when it is on the way.", icon: "restaurant", color: "#82510D", background: "#FFF0D5" },
  outForDelivery: { title: "Your rider is on the way", message: "Your order has left the kitchen. Keep your phone nearby for delivery updates.", icon: "delivery-dining", color: "#1D5A9E", background: "#E5F0FF" },
  delivered: { title: "Order delivered", message: "Your order was marked delivered. Enjoy your meal.", icon: "task-alt", color: "#17683A", background: "#E0F4E7" },
};

export function OrderStatusAlert({ order }: { order: PlacedOrder }) {
  const detail = statusDetails[order.status];
  return <View accessibilityLiveRegion="polite" style={[styles.alert, { backgroundColor: detail.background }]}><View style={[styles.icon, { backgroundColor: detail.color }]}><MaterialIcons name={detail.icon} size={18} color="#FFFFFF" /></View><View style={styles.copy}><Text style={[styles.title, { color: detail.color }]}>{detail.title}</Text><Text style={styles.message}>{detail.message}</Text></View></View>;
}

const styles = StyleSheet.create({ alert: { marginBottom: 13, padding: 12, borderRadius: 17, flexDirection: "row", gap: 9, alignItems: "flex-start" }, icon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, title: { fontSize: 11, lineHeight: 15, fontWeight: "900" }, message: { marginTop: 2, color: "#536158", fontSize: 10, lineHeight: 14, fontWeight: "600" }, });
