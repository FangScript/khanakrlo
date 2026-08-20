import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MerchantScreen, QueueStatusPill } from "@/components/merchant-ui";
import { getMerchantPrimaryAction } from "@/lib/merchant-order-workflow";
import { useMerchantStore } from "@/lib/merchant-store";

const progressOrder = ["new", "preparing", "ready", "outForDelivery"] as const;

export default function MerchantOrderDetailScreen() {
  const { id = "" } = useLocalSearchParams<{ id?: string }>();
  const { profile, hasHydrated, hydrateMerchantSession, getOrder, updateOrderStatus } = useMerchantStore();
  const order = getOrder(id);

  useEffect(() => {
    void hydrateMerchantSession();
  }, [hydrateMerchantSession]);

  useEffect(() => {
    if (hasHydrated && !profile) router.replace("/merchant/welcome" as never);
  }, [hasHydrated, profile]);

  if (!hasHydrated || !profile) {
    return <MerchantScreen><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Loading order details…</Text></View></MerchantScreen>;
  }

  if (!order) {
    return <MerchantScreen><View style={styles.loading}><Text style={styles.notFoundTitle}>Order unavailable</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/merchant/orders" as never)}><Text style={styles.backLink}>Return to Live Orders</Text></Pressable></View></MerchantScreen>;
  }

  const primaryAction = getMerchantPrimaryAction(order.status);
  const currentStage = progressOrder.indexOf(order.status as (typeof progressOrder)[number]);

  const applyTransition = (nextStatus: typeof order.status) => {
    updateOrderStatus(order.id, nextStatus);
    if (nextStatus === "rejected") router.replace("/merchant/orders" as never);
  };

  return (
    <MerchantScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable>
          <View style={{ alignItems: "center" }}><Text style={styles.headerEyebrow}>LIVE ORDER</Text><Text style={styles.headerTitle}>{order.id}</Text></View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTop}><View><Text style={styles.customer}>{order.customerName}</Text><Text style={styles.received}>Received {order.receivedAt}</Text></View><QueueStatusPill status={order.status} /></View>
          <View style={styles.progressRow}>{progressOrder.map((stage, index) => <View key={stage} style={styles.progressItem}><View style={[styles.progressDot, index <= currentStage && styles.progressDotActive]}>{index < currentStage ? <MaterialIcons name="check" size={11} color="#FFFFFF" /> : null}</View>{index < progressOrder.length - 1 ? <View style={[styles.progressLine, index < currentStage && styles.progressLineActive]} /> : null}</View>)}</View>
          <View style={styles.stageLabels}><Text style={styles.stageLabel}>New</Text><Text style={styles.stageLabel}>Cooking</Text><Text style={styles.stageLabel}>Ready</Text><Text style={styles.stageLabel}>Rider</Text></View>
        </View>

        <Section title="Items">
          {order.items.map((item) => <View key={item} style={styles.itemRow}><View style={styles.itemDot} /><Text style={styles.itemText}>{item}</Text></View>)}
        </Section>

        {order.notes ? <Section title="Customer note"><View style={styles.note}><MaterialIcons name="chat-bubble-outline" size={17} color="#9A5700" /><Text style={styles.noteText}>{order.notes}</Text></View></Section> : null}

        <Section title="Order details">
          <View style={styles.detailGrid}><Detail label="Payment" value={order.payment} /><Detail label="Order total" value={`Rs. ${order.total}`} /><Detail label="Prep target" value={order.prepTime} /><Detail label="Source" value="Khana KarLo app" /></View>
        </Section>

        <View style={styles.actions}>
          {order.status === "new" ? <Pressable accessibilityRole="button" onPress={() => applyTransition("rejected")} style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}><Text style={styles.rejectText}>Reject order</Text></Pressable> : null}
          {primaryAction ? <Pressable accessibilityRole="button" onPress={() => applyTransition(primaryAction.nextStatus)} style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}><Text style={styles.primaryText}>{primaryAction.label}</Text><MaterialIcons name={primaryAction.icon} size={19} color="#FFFFFF" /></Pressable> : <View style={styles.completeCard}><MaterialIcons name={order.status === "rejected" ? "cancel" : "two-wheeler"} size={20} color={order.status === "rejected" ? "#B04336" : "#6A3AAB"} /><Text style={styles.completeText}>{order.status === "rejected" ? "This order was rejected." : "The rider has been notified for handoff."}</Text></View>}
        </View>
      </ScrollView>
    </MerchantScreen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionCard}>{children}</View></View>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#5E6D63", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  notFoundTitle: { color: "#17251D", fontSize: 19, lineHeight: 24, fontWeight: "900" },
  backLink: { color: "#17683A", fontSize: 13, lineHeight: 18, fontWeight: "900" },
  content: { paddingBottom: 28 },
  header: { height: 78, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" },
  headerSpacer: { width: 40 },
  headerEyebrow: { color: "#6C7A70", fontSize: 9, lineHeight: 12, letterSpacing: 1, fontWeight: "900" },
  headerTitle: { marginTop: 2, color: "#17251D", fontSize: 17, lineHeight: 21, fontWeight: "900" },
  heroCard: { margin: 16, marginBottom: 4, backgroundColor: "#064B2C", borderRadius: 22, padding: 17 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" },
  customer: { color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontWeight: "900" },
  received: { color: "#C8E1CF", fontSize: 11, lineHeight: 15, fontWeight: "700", marginTop: 3 },
  progressRow: { flexDirection: "row", marginTop: 26 },
  progressItem: { flex: 1, flexDirection: "row", alignItems: "center" },
  progressDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#4A7659", alignItems: "center", justifyContent: "center" },
  progressDotActive: { backgroundColor: "#8DE7A8" },
  progressLine: { height: 2, flex: 1, backgroundColor: "#4A7659" },
  progressLineActive: { backgroundColor: "#8DE7A8" },
  stageLabels: { marginTop: 7, flexDirection: "row", justifyContent: "space-between" },
  stageLabel: { color: "#C8E1CF", fontSize: 9, lineHeight: 12, fontWeight: "800" },
  section: { marginHorizontal: 16, marginTop: 18 },
  sectionTitle: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900", marginBottom: 8 },
  sectionCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E1E6E0", padding: 14 },
  itemRow: { flexDirection: "row", gap: 9, alignItems: "center", paddingVertical: 5 },
  itemDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#168A4A" },
  itemText: { flex: 1, color: "#344239", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  note: { flexDirection: "row", gap: 9, backgroundColor: "#FFF6E7", borderRadius: 12, padding: 11, alignItems: "flex-start" },
  noteText: { flex: 1, color: "#6B4B12", fontSize: 12, lineHeight: 17, fontWeight: "700" },
  detailGrid: { flexDirection: "row", flexWrap: "wrap" },
  detail: { width: "50%", paddingVertical: 8 },
  detailLabel: { color: "#75827A", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  detailValue: { marginTop: 3, color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  actions: { marginHorizontal: 16, marginTop: 24, gap: 10 },
  primaryButton: { height: 56, borderRadius: 17, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  rejectButton: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: "#E8C5C0", alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  rejectText: { color: "#B04336", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  completeCard: { minHeight: 56, padding: 14, borderRadius: 17, backgroundColor: "#F1E8FF", flexDirection: "row", alignItems: "center", gap: 9 },
  completeText: { flex: 1, color: "#6A3AAB", fontSize: 12, lineHeight: 17, fontWeight: "800" },
  pressed: { opacity: 0.7 },
  primaryPressed: { transform: [{ scale: 0.98 }], opacity: 0.93 },
});
