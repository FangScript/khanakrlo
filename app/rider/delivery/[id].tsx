import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { SuccessToast, useSuccessToast } from "@/components/success-toast";
import { getNextRiderStatus } from "@/lib/rider-delivery-workflow";
import { type RiderDeliveryStatus, useRiderStore } from "@/lib/rider-store";

const formatRupees = (value: number) => `Rs. ${value.toLocaleString("en-PK")}`;

const statusCopy: Record<RiderDeliveryStatus, { label: string; detail: string; action?: string }> = {
  offered: { label: "New delivery request", detail: "Review the route and accept only when you can reach the pickup on time.", action: "Accept delivery" },
  accepted: { label: "Head to the restaurant", detail: "Start navigating to the pickup point and mark your arrival when you are there.", action: "I’m at pickup" },
  atPickup: { label: "Collect the order", detail: "Confirm the order number with the restaurant before collecting the packed food.", action: "Order collected" },
  pickedUp: { label: "Deliver to customer", detail: "Navigate to the customer and confirm delivery with proof before completing the trip.", action: "Complete delivery" },
  delivered: { label: "Delivery completed", detail: "This delivery is complete and earnings have been added to your weekly total." },
  declined: { label: "Delivery declined", detail: "This request is no longer active." },
};

export default function RiderDeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasHydrated, hydrateRiderSession, getDelivery, updateDeliveryStatus } = useRiderStore();
  const [proofConfirmed, setProofConfirmed] = useState(false);
  const { successMessage, showSuccess } = useSuccessToast();

  useEffect(() => { void hydrateRiderSession(); }, [hydrateRiderSession]);
  const delivery = getDelivery(id ?? "");

  useEffect(() => {
    if (hasHydrated && !delivery) router.replace("/rider" as never);
  }, [delivery, hasHydrated]);

  if (!hasHydrated || !delivery) return <ScreenContainer><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Loading delivery…</Text></View></ScreenContainer>;

  const copy = statusCopy[delivery.status];
  const isOffered = delivery.status === "offered";
  const isPickedUp = delivery.status === "pickedUp";
  const nextStatus = getNextRiderStatus(delivery.status);

  const openMaps = async (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) await Linking.openURL(url);
    else Alert.alert("Navigation unavailable", "No app is available to open this route.");
  };

  const advance = () => {
    if (!nextStatus) return;
    if (nextStatus === "delivered" && !proofConfirmed) {
      Alert.alert("Confirm delivery proof", "Confirm that you checked the customer handoff before completing delivery.");
      return;
    }
    updateDeliveryStatus(delivery.id, nextStatus);
    showSuccess(nextStatus === "delivered" ? "Delivery completed. Earnings have been recorded." : "Delivery status updated successfully");
    if (nextStatus === "delivered") setTimeout(() => router.replace("/rider" as never), 750);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}><SuccessToast message={successMessage} />
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><View style={styles.headerCopy}><Text style={styles.orderNumber}>{delivery.orderNumber}</Text><Text style={styles.headerTitle}>{copy.label}</Text></View><View style={styles.earning}><Text style={styles.earningText}>+{formatRupees(delivery.estimatedEarning)}</Text><Text style={styles.earningLabel}>EARNING</Text></View></View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusCard}><View style={styles.statusIcon}><MaterialIcons name={delivery.status === "delivered" ? "check" : "local-shipping"} size={23} color="#FFFFFF" /></View><View style={styles.statusCopy}><Text style={styles.statusTitle}>{copy.label}</Text><Text style={styles.statusDetail}>{copy.detail}</Text></View></View>
          <View style={styles.routeCard}><RouteStep label="PICK UP" icon="storefront" title={delivery.restaurant} address={delivery.pickupAddress} onNavigate={() => openMaps(delivery.pickupAddress)} /><View style={styles.routeDivider} /><RouteStep label="DROP OFF" icon="person-pin-circle" title={delivery.customerName} address={delivery.deliveryAddress} onNavigate={() => openMaps(delivery.deliveryAddress)} /></View>
          <View style={styles.infoCard}><View style={styles.infoRow}><MaterialIcons name="shopping-bag" size={19} color="#17683A" /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Order items</Text><Text style={styles.infoDetail}>{delivery.items.join(" · ")}</Text></View></View><View style={styles.infoBorder} /><View style={styles.infoRow}><MaterialIcons name={delivery.cashToCollect > 0 ? "payments" : "credit-card"} size={19} color="#B66A00" /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>{delivery.cashToCollect > 0 ? "Cash to collect" : "Payment received"}</Text><Text style={styles.infoDetail}>{delivery.cashToCollect > 0 ? formatRupees(delivery.cashToCollect) : "Paid online"}</Text></View></View>{delivery.note ? <><View style={styles.infoBorder} /><View style={styles.infoRow}><MaterialIcons name="sticky-note-2" size={19} color="#825E18" /><View style={{ flex: 1 }}><Text style={styles.infoTitle}>Customer note</Text><Text style={styles.infoDetail}>{delivery.note}</Text></View></View></> : null}</View>
          {isPickedUp ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: proofConfirmed }} onPress={() => setProofConfirmed((value) => !value)} style={[styles.proofCard, proofConfirmed && styles.proofCardChecked]}><View style={[styles.proofCheck, proofConfirmed && styles.proofCheckChecked]}>{proofConfirmed ? <MaterialIcons name="check" size={17} color="#FFFFFF" /> : null}</View><View style={{ flex: 1 }}><Text style={styles.proofTitle}>Proof of delivery confirmed</Text><Text style={styles.proofText}>I verified the customer handoff and collected cash, if required.</Text></View></Pressable> : null}
        </ScrollView>
        {isOffered ? <View style={styles.offerActions}><Pressable accessibilityRole="button" onPress={() => { updateDeliveryStatus(delivery.id, "declined"); showSuccess("Delivery request declined"); setTimeout(() => router.replace("/rider" as never), 500); }} style={({ pressed }) => [styles.declineButton, pressed && styles.pressed]}><Text style={styles.declineText}>Decline</Text></Pressable><Pressable accessibilityRole="button" onPress={advance} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>{copy.action}</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View> : nextStatus ? <View style={styles.footer}><Pressable accessibilityRole="button" onPress={advance} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>{copy.action}</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View> : <View style={styles.footer}><View style={styles.completePill}><MaterialIcons name="task-alt" size={19} color="#17683A" /><Text style={styles.completeText}>{copy.label}</Text></View></View>}
      </View>
    </ScreenContainer>
  );
}

function RouteStep({ label, icon, title, address, onNavigate }: { label: string; icon: "storefront" | "person-pin-circle"; title: string; address: string; onNavigate: () => void }) {
  return <View style={styles.routeStep}><View style={styles.routeIcon}><MaterialIcons name={icon} size={20} color="#064B2C" /></View><View style={styles.routeCopy}><Text style={styles.routeLabel}>{label}</Text><Text style={styles.routeTitle}>{title}</Text><Text style={styles.routeAddress}>{address}</Text></View><Pressable accessibilityRole="button" onPress={onNavigate} style={({ pressed }) => [styles.mapButton, pressed && styles.pressed]}><MaterialIcons name="near-me" size={19} color="#17683A" /></Pressable></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F4F6F3" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, backgroundColor: "#F4F6F3" }, loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" }, header: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, headerCopy: { flex: 1, marginLeft: 10 }, orderNumber: { color: "#168A4A", fontSize: 9, lineHeight: 12, letterSpacing: 0.7, fontWeight: "900" }, headerTitle: { marginTop: 2, color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, earning: { alignItems: "flex-end" }, earningText: { color: "#168A4A", fontSize: 13, lineHeight: 17, fontWeight: "900" }, earningLabel: { marginTop: 1, color: "#8B978F", fontSize: 8, lineHeight: 10, letterSpacing: 0.5, fontWeight: "900" }, content: { padding: 16, paddingBottom: 28 }, statusCard: { padding: 15, borderRadius: 19, backgroundColor: "#064B2C", flexDirection: "row", gap: 11, alignItems: "flex-start" }, statusIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#168A4A" }, statusCopy: { flex: 1 }, statusTitle: { color: "#FFFFFF", fontSize: 15, lineHeight: 19, fontWeight: "900" }, statusDetail: { marginTop: 4, color: "#C8E1CF", fontSize: 11, lineHeight: 16, fontWeight: "600" }, routeCard: { marginTop: 13, padding: 14, borderRadius: 19, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FFFFFF" }, routeStep: { flexDirection: "row", alignItems: "center" }, routeIcon: { width: 39, height: 39, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#EAF3EC" }, routeCopy: { flex: 1, marginLeft: 10 }, routeLabel: { color: "#97A39A", fontSize: 8, lineHeight: 11, letterSpacing: 0.6, fontWeight: "900" }, routeTitle: { marginTop: 2, color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" }, routeAddress: { marginTop: 2, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, mapButton: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F4E7" }, routeDivider: { marginLeft: 19, height: 18, width: 1, backgroundColor: "#B9DCC2" }, infoCard: { marginTop: 13, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FFFFFF" }, infoRow: { minHeight: 67, flexDirection: "row", gap: 11, alignItems: "center" }, infoBorder: { height: 1, backgroundColor: "#EDF0EC" }, infoTitle: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" }, infoDetail: { marginTop: 3, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, proofCard: { marginTop: 13, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FFFFFF", flexDirection: "row", gap: 10, alignItems: "center" }, proofCardChecked: { borderColor: "#B6E2C4", backgroundColor: "#F4FFF6" }, proofCheck: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: "#B2BDB4", alignItems: "center", justifyContent: "center" }, proofCheckChecked: { backgroundColor: "#168A4A", borderColor: "#168A4A" }, proofTitle: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" }, proofText: { marginTop: 2, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, footer: { paddingHorizontal: 16, paddingBottom: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E1E6E0" }, offerActions: { padding: 14, gap: 10, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E1E6E0", flexDirection: "row" }, declineButton: { height: 55, paddingHorizontal: 21, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F6F3", borderWidth: 1, borderColor: "#DDE4DD" }, declineText: { color: "#65736A", fontSize: 13, lineHeight: 17, fontWeight: "900" }, primaryButton: { flex: 1, height: 55, borderRadius: 17, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, backgroundColor: "#064B2C" }, primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "900" }, completePill: { marginTop: 12, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: "#E0F4E7" }, completeText: { color: "#17683A", fontSize: 13, lineHeight: 17, fontWeight: "900" }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
});
