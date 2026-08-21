import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatPKR, getCartSubtotal } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

const deliveryFee = 89;
const serviceFee = 29;

export default function CartScreen() {
  const { cart, changeQuantity } = useKhanaStore();
  const [promo, setPromo] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const subtotal = useMemo(() => getCartSubtotal(cart), [cart]);
  const discount = promoApplied ? Math.min(150, subtotal) : 0;
  const total = Math.max(0, subtotal + deliveryFee + serviceFee - discount);

  if (cart.length === 0) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><ScreenBack title="Your cart" /><EmptyCart /></View></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <ScreenBack title="Your cart" />
        <FlatList
          data={cart}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<Text style={styles.restaurantHint}>From {cart[0]?.restaurantName ?? (cart[0]?.restaurantId === "biryani-house" ? "Biryani House" : cart[0]?.restaurantId === "smash-town" ? "Smash Town" : "Lahori Dera")}</Text>}
          renderItem={({ item }) => (
            <View style={styles.cartLine}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.lineImage} resizeMode="cover" /> : item.image ? <Image source={item.image} style={styles.lineImage} resizeMode="cover" /> : <View style={styles.lineImagePlaceholder}><MaterialIcons name="restaurant" size={24} color="#168A4A" /></View>}
              <View style={styles.lineDetails}>
                <Text style={styles.lineName}>{item.name}</Text>
                <Text style={styles.lineOptions}>{item.spice}{item.addOns.length ? ` · ${item.addOns.map((addOn) => addOn.name).join(", ")}` : ""}</Text>
                <Text style={styles.linePrice}>{formatPKR((item.unitPrice + item.addOns.reduce((sum, addOn) => sum + addOn.price, 0)) * item.quantity)}{item.serverMenuItemId ? " · confirmed at checkout" : ""}</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable onPress={() => changeQuantity(item.id, -1)} style={({ pressed }) => [styles.stepperButton, pressed && styles.iconPressed]}><MaterialIcons name="remove" size={16} color="#064B2C" /></Pressable>
                <Text style={styles.stepperCount}>{item.quantity}</Text>
                <Pressable onPress={() => changeQuantity(item.id, 1)} style={({ pressed }) => [styles.stepperButton, styles.stepperAdd, pressed && styles.iconPressed]}><MaterialIcons name="add" size={16} color="#FFF8ED" /></Pressable>
              </View>
            </View>
          )}
          ListFooterComponent={<>
            <View style={styles.promoCard}>
              <MaterialIcons name="local-offer" size={20} color="#FF6B00" />
              <TextInput value={promo} onChangeText={(value) => { setPromo(value); setPromoApplied(false); }} placeholder="Add a promo code" placeholderTextColor="#879187" style={styles.promoInput} autoCapitalize="characters" returnKeyType="done" />
              <Pressable onPress={() => { if (promo.trim().toUpperCase() === "KARLO25") setPromoApplied(true); else Alert.alert("Code not recognised", "Try KARLO25 to see the MVP promotion feedback."); }} style={({ pressed }) => [styles.applyButton, pressed && styles.iconPressed]}><Text style={styles.applyText}>Apply</Text></Pressable>
            </View>
            {promoApplied ? <View style={styles.promoSuccess}><MaterialIcons name="check-circle" size={16} color="#168A4A" /><Text style={styles.promoSuccessText}>KARLO25 applied — Rs. {discount} saved</Text></View> : null}
            <View style={styles.addressCard}><View style={styles.addressIcon}><MaterialIcons name="location-on" size={19} color="#064B2C" /></View><View style={styles.addressContent}><Text style={styles.addressLabel}>DELIVER TO</Text><Text style={styles.addressTitle}>F-10 Markaz, Islamabad</Text><Text style={styles.addressSub}>Office building · Ring when you arrive</Text></View><MaterialIcons name="chevron-right" size={21} color="#064B2C" /></View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Bill details</Text>
              <BillRow label="Estimated item subtotal" value={formatPKR(subtotal)} />
              <BillRow label="Estimated delivery fee" value={formatPKR(deliveryFee)} />
              <BillRow label="Estimated service fee" value={formatPKR(serviceFee)} />
              {discount > 0 ? <BillRow label="Promo discount" value={`− ${formatPKR(discount)}`} positive /> : null}
              <View style={styles.divider} />
              <BillRow label="Estimated total" value={formatPKR(total)} total />
            </View>
            <PrimaryButton label={`Continue · ${formatPKR(total)}`} onPress={() => router.push("/checkout" as never)} icon="arrow-forward" />
          </>}
        />
      </View>
    </ScreenContainer>
  );
}

function BillRow({ label, value, total = false, positive = false }: { label: string; value: string; total?: boolean; positive?: boolean }) {
  return <View style={styles.billRow}><Text style={[styles.billLabel, total && styles.billLabelTotal, positive && styles.positive]}>{label}</Text><Text style={[styles.billValue, total && styles.billValueTotal, positive && styles.positive]}>{value}</Text></View>;
}

function EmptyCart() {
  return <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name="shopping-bag" size={38} color="#064B2C" /></View><Text style={styles.emptyTitle}>Your cart is waiting</Text><Text style={styles.emptyText}>Find something comforting, spicy, or seriously delicious.</Text><PrimaryButton label="Explore restaurants" onPress={() => router.replace("/" as never)} icon="restaurant-menu" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 },
  listContent: { paddingBottom: 25 },
  restaurantHint: { color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "700", marginBottom: 10 },
  cartLine: { minHeight: 100, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 18, padding: 10, flexDirection: "row", gap: 10, marginBottom: 9 },
  lineImage: { width: 78, height: 78, borderRadius: 13, backgroundColor: "#E0F4E7" },
  lineImagePlaceholder: { width: 78, height: 78, borderRadius: 13, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  lineDetails: { flex: 1, paddingTop: 2 },
  lineName: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  lineOptions: { color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 3 },
  linePrice: { color: "#064B2C", fontSize: 12, lineHeight: 16, fontWeight: "900", marginTop: 7 },
  stepper: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DDE6DE", backgroundColor: "#F7FBF7", borderRadius: 11, overflow: "hidden" },
  stepperButton: { width: 28, height: 29, alignItems: "center", justifyContent: "center" },
  stepperAdd: { backgroundColor: "#064B2C" },
  stepperCount: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900", minWidth: 22, textAlign: "center" },
  promoCard: { minHeight: 55, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 15, paddingLeft: 13, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 9, marginTop: 12 },
  promoInput: { flex: 1, color: "#17251D", fontSize: 13, lineHeight: 18, fontWeight: "600", paddingVertical: 0 },
  applyButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, backgroundColor: "#FFF0E6" },
  applyText: { color: "#FF6B00", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  promoSuccess: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, paddingHorizontal: 9 },
  promoSuccessText: { color: "#168A4A", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  addressCard: { minHeight: 76, marginTop: 16, backgroundColor: "#E0F4E7", borderRadius: 17, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  addressIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  addressContent: { flex: 1 },
  addressLabel: { color: "#168A4A", fontSize: 9, lineHeight: 11, letterSpacing: 0.9, fontWeight: "900" },
  addressTitle: { color: "#064B2C", fontSize: 13, lineHeight: 17, fontWeight: "900", marginTop: 1 },
  addressSub: { color: "#4E6956", fontSize: 10, lineHeight: 13, fontWeight: "600", marginTop: 1 },
  summaryCard: { marginTop: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 18, padding: 15, marginBottom: 16 },
  summaryTitle: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900", marginBottom: 11 },
  billRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 7 },
  billLabel: { color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  billValue: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  billLabelTotal: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  billValueTotal: { color: "#064B2C", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  positive: { color: "#168A4A" },
  divider: { height: 1, backgroundColor: "#E7E8E2", marginTop: 12, marginBottom: 3 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 27, paddingBottom: 62 },
  emptyIcon: { width: 84, height: 84, borderRadius: 42, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 18, color: "#17251D", fontSize: 21, lineHeight: 27, fontWeight: "900" },
  emptyText: { textAlign: "center", color: "#6C7A70", fontSize: 13, lineHeight: 19, fontWeight: "600", marginTop: 5, marginBottom: 23 },
  iconPressed: { opacity: 0.62 },
});
