import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { KhanaKarLoMark } from "@/components/khana-karlo-mark";
import { PrimaryButton, ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatPKR } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

const timeline = [
  { title: "Order confirmed", detail: "Your restaurant has received the order", icon: "check" as const },
  { title: "Being prepared", detail: "The kitchen is making your food fresh", icon: "restaurant" as const },
  { title: "Picked up by rider", detail: "Your rider will be on the way soon", icon: "delivery-dining" as const },
  { title: "Delivered", detail: "Enjoy every bite", icon: "home" as const },
];

export default function OrderTrackingScreen() {
  const { lastOrder } = useKhanaStore();

  if (!lastOrder) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><ScreenBack title="Track order" /><View style={styles.empty}><KhanaKarLoMark size={74} /><Text style={styles.emptyTitle}>No active order</Text><Text style={styles.emptyText}>When you place an order, its delivery journey will appear here.</Text><PrimaryButton label="Start exploring" onPress={() => router.replace("/" as never)} /></View></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <ScreenBack title="Track order" />
        <View style={styles.statusHero}><View style={styles.statusBubble}><MaterialIcons name="restaurant" size={31} color="#FFF8ED" /></View><Text style={styles.statusTitle}>Your food is being prepared</Text><Text style={styles.statusSub}>Estimated arrival in <Text style={styles.statusStrong}>{lastOrder.eta}</Text></Text><View style={styles.orderIdPill}><Text style={styles.orderIdText}>{lastOrder.id} · {lastOrder.restaurantName}</Text></View></View>
        <View style={styles.arrivalCard}><View style={styles.arrivalIcon}><MaterialIcons name="schedule" size={22} color="#FF6B00" /></View><View style={styles.arrivalText}><Text style={styles.arrivalLabel}>EXPECTED ARRIVAL</Text><Text style={styles.arrivalTime}>Today, in {lastOrder.eta}</Text></View><Text style={styles.arrivalPrice}>{formatPKR(lastOrder.total)}</Text></View>
        <View style={styles.timelineCard}>{timeline.map((step, index) => { const complete = index === 0; const active = index === 1; return <View key={step.title} style={styles.timelineItem}><View style={styles.trackColumn}><View style={[styles.trackIcon, (complete || active) && styles.trackIconActive]}><MaterialIcons name={step.icon} size={17} color={complete || active ? "#FFF8ED" : "#879187"} /></View>{index < timeline.length - 1 ? <View style={[styles.trackLine, complete && styles.trackLineActive]} /> : null}</View><View style={styles.timelineText}><Text style={[styles.timelineTitle, (complete || active) && styles.timelineTitleActive]}>{step.title}</Text><Text style={styles.timelineDetail}>{step.detail}</Text></View>{active ? <View style={styles.livePill}><Text style={styles.liveText}>LIVE</Text></View> : null}</View>; })}</View>
        <Pressable onPress={() => Alert.alert("Support", "Support chat will be connected in the production service. Your order context is ready to be shared.")} style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}><View style={styles.supportIcon}><MaterialIcons name="headset-mic" size={21} color="#064B2C" /></View><View style={styles.supportText}><Text style={styles.supportTitle}>Need help with this order?</Text><Text style={styles.supportSub}>Our support team is here for you</Text></View><MaterialIcons name="chevron-right" size={23} color="#064B2C" /></Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 },
  statusHero: { alignItems: "center", backgroundColor: "#064B2C", borderRadius: 24, paddingHorizontal: 18, paddingTop: 19, paddingBottom: 17 },
  statusBubble: { width: 63, height: 63, borderRadius: 32, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center", borderWidth: 5, borderColor: "#0E623A" },
  statusTitle: { marginTop: 10, color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontWeight: "900", textAlign: "center" },
  statusSub: { marginTop: 3, color: "#D9E8DC", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  statusStrong: { color: "#FFB73D", fontWeight: "900" },
  orderIdPill: { marginTop: 12, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, paddingVertical: 6, paddingHorizontal: 10 },
  orderIdText: { color: "#E7F2E9", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  arrivalCard: { marginTop: 14, minHeight: 69, borderRadius: 17, backgroundColor: "#FFF0E6", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  arrivalIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  arrivalText: { flex: 1 },
  arrivalLabel: { color: "#A63F00", fontSize: 9, lineHeight: 12, letterSpacing: 0.9, fontWeight: "900" },
  arrivalTime: { color: "#6D2C03", fontSize: 13, lineHeight: 17, fontWeight: "900", marginTop: 1 },
  arrivalPrice: { color: "#A63F00", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  timelineCard: { marginTop: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 20, paddingVertical: 16, paddingHorizontal: 15 },
  timelineItem: { flexDirection: "row", minHeight: 64 },
  trackColumn: { width: 34, alignItems: "center" },
  trackIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F2F3EF", alignItems: "center", justifyContent: "center" },
  trackIconActive: { backgroundColor: "#168A4A" },
  trackLine: { width: 2, flex: 1, backgroundColor: "#E0E5E0", marginVertical: 3 },
  trackLineActive: { backgroundColor: "#168A4A" },
  timelineText: { flex: 1, paddingLeft: 8, paddingTop: 3 },
  timelineTitle: { color: "#879187", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  timelineTitleActive: { color: "#17251D" },
  timelineDetail: { color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 2 },
  livePill: { alignSelf: "flex-start", backgroundColor: "#FFF0E6", borderRadius: 99, paddingHorizontal: 7, paddingVertical: 4, marginTop: 3 },
  liveText: { color: "#FF6B00", fontSize: 8, lineHeight: 10, letterSpacing: 0.8, fontWeight: "900" },
  supportRow: { marginTop: 15, minHeight: 65, flexDirection: "row", alignItems: "center", backgroundColor: "#E0F4E7", borderRadius: 17, paddingHorizontal: 12, gap: 10 },
  supportIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  supportText: { flex: 1 },
  supportTitle: { color: "#064B2C", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  supportSub: { color: "#4E6956", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingBottom: 55 },
  emptyTitle: { color: "#17251D", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 16 },
  emptyText: { color: "#6C7A70", fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center", marginTop: 5, marginBottom: 22 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});

