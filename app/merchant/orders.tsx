import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { MerchantScreen, MerchantTopBar, QueueStatusPill, merchantStatus } from "@/components/merchant-ui";
import { type MerchantOrder, type MerchantOrderStatus, useMerchantStore } from "@/lib/merchant-store";

const queueOrder: MerchantOrderStatus[] = ["new", "preparing", "ready", "outForDelivery"];

export default function LiveOrdersScreen() {
  const { profile, hasHydrated, orders, hydrateMerchantSession, updateOrderStatus } = useMerchantStore();

  useEffect(() => {
    void hydrateMerchantSession();
  }, [hydrateMerchantSession]);

  useEffect(() => {
    if (hasHydrated && !profile) router.replace("/merchant/welcome" as never);
  }, [hasHydrated, profile]);

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== "rejected"), [orders]);
  const orderedOrders = useMemo(() => [...activeOrders].sort((a, b) => queueOrder.indexOf(a.status) - queueOrder.indexOf(b.status)), [activeOrders]);
  const counts = useMemo(() => Object.fromEntries(queueOrder.map((status) => [status, activeOrders.filter((order) => order.status === status).length])) as Record<MerchantOrderStatus, number>, [activeOrders]);

  if (!hasHydrated || !profile) {
    return <MerchantScreen><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Opening your outlet…</Text></View></MerchantScreen>;
  }

  return (
    <MerchantScreen>
      <FlatList
        data={orderedOrders}
        keyExtractor={(order) => order.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <MerchantTopBar outletName={profile.outletName} onPressAvatar={() => router.push("/merchant/profile" as never)} />
            <View style={styles.summaryRow}>
              <SummaryTile label="New" count={counts.new} color="#F3A93B" icon="notifications-active" />
              <SummaryTile label="Cooking" count={counts.preparing} color="#4B81CE" icon="soup-kitchen" />
              <SummaryTile label="Ready" count={counts.ready} color="#168A4A" icon="check-circle" />
            </View>
            <View style={styles.sectionHeader}>
              <View><Text style={styles.sectionTitle}>Order queue</Text><Text style={styles.sectionSubtitle}>{activeOrders.length} active orders across your kitchen</Text></View>
              <View style={styles.liveChip}><View style={styles.liveDot} /><Text style={styles.liveText}>Live</Text></View>
            </View>
          </>
        }
        renderItem={({ item }) => <OrderCard order={item} onAccept={() => updateOrderStatus(item.id, "preparing")} />}
        ListFooterComponent={<View style={{ height: 30 }} />}
      />
    </MerchantScreen>
  );
}

function SummaryTile({ label, count, color, icon }: { label: string; count: number; color: string; icon: keyof typeof MaterialIcons.glyphMap }) {
  return <View style={styles.summaryTile}><View style={[styles.summaryIcon, { backgroundColor: `${color}1C` }]}><MaterialIcons name={icon} size={17} color={color} /></View><Text style={styles.summaryCount}>{count}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

function OrderCard({ order, onAccept }: { order: MerchantOrder; onAccept: () => void }) {
  const statusLabel = merchantStatus[order.status].label;
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(`/merchant/order/${order.id}` as never)} style={({ pressed }) => [styles.orderCard, pressed && styles.cardPressed]}>
      <View style={styles.orderTop}><View><Text style={styles.orderId}>{order.id}</Text><Text style={styles.customer}>{order.customerName}</Text></View><QueueStatusPill status={order.status} /></View>
      <Text style={styles.items} numberOfLines={2}>{order.items.join(" · ")}</Text>
      <View style={styles.metaRow}><View style={styles.meta}><MaterialIcons name="schedule" size={14} color="#647268" /><Text style={styles.metaText}>{order.receivedAt}</Text></View><View style={styles.meta}><MaterialIcons name="payments" size={14} color="#647268" /><Text style={styles.metaText}>{order.payment} · Rs. {order.total}</Text></View></View>
      <View style={styles.orderBottom}><Text style={styles.prepTime}>{order.prepTime}</Text>{order.status === "new" ? <Pressable accessibilityRole="button" onPress={(event) => { event.stopPropagation(); onAccept(); }} style={({ pressed }) => [styles.acceptButton, pressed && styles.acceptPressed]}><Text style={styles.acceptText}>Accept order</Text><MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" /></Pressable> : <Text style={styles.openText}>View {statusLabel.toLowerCase()} order</Text>}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11 },
  loadingText: { color: "#5E6D63", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  listContent: { paddingBottom: 22 },
  summaryRow: { padding: 14, flexDirection: "row", gap: 10, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E5E9E4" },
  summaryTile: { flex: 1, minHeight: 83, borderRadius: 16, backgroundColor: "#F4F6F3", padding: 11, justifyContent: "space-between" },
  summaryIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  summaryCount: { color: "#17251D", fontSize: 20, lineHeight: 24, fontWeight: "900" },
  summaryLabel: { color: "#6C7A70", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 21, paddingBottom: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: "#17251D", fontSize: 19, lineHeight: 24, letterSpacing: -0.3, fontWeight: "900" },
  sectionSubtitle: { marginTop: 2, color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600" },
  liveChip: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 9, backgroundColor: "#E0F4E7", flexDirection: "row", gap: 5, alignItems: "center" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#168A4A" },
  liveText: { color: "#17683A", fontSize: 10, lineHeight: 13, fontWeight: "900" },
  orderCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 20, padding: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E6E0" },
  orderTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  orderId: { color: "#17683A", fontSize: 11, lineHeight: 14, letterSpacing: 0.5, fontWeight: "900" },
  customer: { marginTop: 3, color: "#17251D", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  items: { marginTop: 12, color: "#5E6D63", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  metaRow: { marginTop: 13, flexDirection: "row", gap: 13, flexWrap: "wrap" },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { color: "#647268", fontSize: 10, lineHeight: 14, fontWeight: "800" },
  orderBottom: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#EDF0EC", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  prepTime: { color: "#9A5700", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  acceptButton: { backgroundColor: "#064B2C", borderRadius: 11, paddingVertical: 9, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 5 },
  acceptText: { color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  acceptPressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  openText: { color: "#17683A", fontSize: 11, lineHeight: 15, fontWeight: "900" },
  cardPressed: { transform: [{ scale: 0.99 }], opacity: 0.92 },
});
