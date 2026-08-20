import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatPKR, getCartSubtotal, restaurants } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

const deliveryFee = 89;
const serviceFee = 29;

export default function CheckoutScreen() {
  const { cart, placeOrder } = useKhanaStore();
  const [payment, setPayment] = useState<"cash" | "jazzcash">("cash");
  const subtotal = useMemo(() => getCartSubtotal(cart), [cart]);
  const total = subtotal + deliveryFee + serviceFee;
  const restaurant = restaurants.find((item) => item.id === cart[0]?.restaurantId);

  if (cart.length === 0 || !restaurant) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><ScreenBack title="Checkout" /><View style={styles.empty}><Text style={styles.emptyTitle}>Nothing to check out yet</Text><PrimaryButton label="Browse restaurants" onPress={() => router.replace("/" as never)} /></View></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <ScreenBack title="Checkout" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <Text style={styles.step}>STEP 1 OF 1</Text>
          <Text style={styles.title}>Confirm your order</Text>
          <Text style={styles.sub}>Almost there. Check delivery and payment.</Text>
          <View style={styles.section}><Text style={styles.sectionTitle}>Delivery address</Text><View style={styles.detailCard}><View style={styles.detailIcon}><MaterialIcons name="location-on" size={19} color="#064B2C" /></View><View style={styles.detailText}><Text style={styles.detailTitle}>F-10 Markaz, Islamabad</Text><Text style={styles.detailSub}>Office building · Ring when you arrive</Text></View><MaterialIcons name="edit" size={18} color="#064B2C" /></View></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Payment method</Text><PaymentChoice active={payment === "cash"} title="Cash on delivery" subtitle="Pay securely when your order arrives" icon="payments" onPress={() => setPayment("cash")} /><PaymentChoice active={payment === "jazzcash"} title="JazzCash" subtitle="Wallet checkout for a faster handoff" icon="account-balance-wallet" onPress={() => setPayment("jazzcash")} /></View>
          <View style={styles.section}><Text style={styles.sectionTitle}>Order from {restaurant.name}</Text><View style={styles.receiptCard}><ReceiptRow label="Item subtotal" value={formatPKR(subtotal)} /><ReceiptRow label="Delivery fee" value={formatPKR(deliveryFee)} /><ReceiptRow label="Service fee" value={formatPKR(serviceFee)} /><View style={styles.divider} /><ReceiptRow label="Total to pay" value={formatPKR(total)} total /></View></View>
          <PrimaryButton label={`Place order · ${formatPKR(total)}`} onPress={() => { placeOrder(restaurant.name, total); router.replace("/order-tracking" as never); }} icon="check-circle" />
          <Text style={styles.terms}>By placing your order, you agree to the restaurant’s preparation time and delivery terms.</Text>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function PaymentChoice({ active, title, subtitle, icon, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.payment, active && styles.paymentActive, pressed && styles.pressed]}><View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View><View style={styles.paymentIcon}><MaterialIcons name={icon} size={20} color="#064B2C" /></View><View style={styles.paymentText}><Text style={styles.paymentTitle}>{title}</Text><Text style={styles.paymentSub}>{subtitle}</Text></View></Pressable>;
}

function ReceiptRow({ label, value, total = false }: { label: string; value: string; total?: boolean }) {
  return <View style={styles.receiptRow}><Text style={[styles.receiptLabel, total && styles.receiptTotal]}>{label}</Text><Text style={[styles.receiptValue, total && styles.receiptValueTotal]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 },
  content: { paddingBottom: 25 },
  step: { color: "#FF6B00", fontSize: 10, lineHeight: 13, letterSpacing: 1.1, fontWeight: "900" },
  title: { marginTop: 4, color: "#17251D", fontSize: 25, lineHeight: 31, fontWeight: "900", letterSpacing: -0.5 },
  sub: { marginTop: 3, color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  section: { marginTop: 22 },
  sectionTitle: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900", marginBottom: 9 },
  detailCard: { minHeight: 70, borderRadius: 17, paddingHorizontal: 12, backgroundColor: "#E0F4E7", flexDirection: "row", alignItems: "center", gap: 10 },
  detailIcon: { width: 35, height: 35, borderRadius: 11, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  detailText: { flex: 1 },
  detailTitle: { color: "#064B2C", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  detailSub: { color: "#4E6956", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 1 },
  payment: { minHeight: 72, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 16, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 8 },
  paymentActive: { borderColor: "#168A4A", backgroundColor: "#F6FCF7" },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "#ABB7AE", alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: "#168A4A" },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#168A4A" },
  paymentIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#FFF0E6", alignItems: "center", justifyContent: "center" },
  paymentText: { flex: 1 },
  paymentTitle: { color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  paymentSub: { color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 1 },
  receiptCard: { backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#E7E8E2", padding: 14 },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  receiptLabel: { color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  receiptValue: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  receiptTotal: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  receiptValueTotal: { color: "#064B2C", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  divider: { height: 1, backgroundColor: "#E7E8E2", marginTop: 11, marginBottom: 1 },
  terms: { color: "#879187", fontSize: 10, lineHeight: 14, fontWeight: "600", textAlign: "center", marginTop: 12, paddingHorizontal: 14 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 18 },
  emptyTitle: { color: "#17251D", fontSize: 19, lineHeight: 24, fontWeight: "900" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
});

