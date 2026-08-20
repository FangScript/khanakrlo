import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams } from "expo-router";
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { CartBar, PrimaryButton, ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { restaurants, type AddOn, type MenuItem } from "@/lib/khana-data";
import { useKhanaStore } from "@/lib/khana-store";

const fallbackRestaurant = restaurants[0];

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const restaurant = restaurants.find((item) => item.id === id) ?? fallbackRestaurant;
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
      <FlatList
        data={restaurant.menu}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<RestaurantHeader restaurant={restaurant} />}
        renderItem={({ item }) => <MenuItemCard item={item} onPress={() => setSelectedItem(item)} />}
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
      <CartBar />
      <CustomizeSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      </View>
    </ScreenContainer>
  );
}

function RestaurantHeader({ restaurant }: { restaurant: typeof fallbackRestaurant }) {
  return (
    <>
      <ScreenBack />
      <View style={styles.hero}>
        <Image source={restaurant.image} resizeMode="cover" style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <View style={styles.openPill}><View style={styles.openDot} /><Text style={styles.openText}>Open now</Text></View>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{restaurant.name}</Text>
          <Text style={styles.heroCuisine}>{restaurant.cuisine}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetric}><MaterialIcons name="star" size={14} color="#FFB73D" /><Text style={styles.heroMetricText}>{restaurant.rating} ({restaurant.reviewCount}+)</Text></View>
            <View style={styles.heroMetric}><MaterialIcons name="delivery-dining" size={15} color="#FFB73D" /><Text style={styles.heroMetricText}>{restaurant.eta}</Text></View>
          </View>
        </View>
      </View>
      <View style={styles.deliveryNote}>
        <View style={styles.deliveryNoteIcon}><MaterialIcons name="local-offer" size={18} color="#FF6B00" /></View>
        <Text style={styles.deliveryNoteText}>{restaurant.offer}</Text>
      </View>
      <View style={styles.menuHeading}>
        <Text style={styles.menuTitle}>Menu</Text>
        <Text style={styles.menuSub}>Made fresh when you order</Text>
      </View>
      <View style={styles.categoryPill}><Text style={styles.categoryPillText}>Popular picks</Text></View>
    </>
  );
}

function MenuItemCard({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  return (
    <View style={styles.menuCard}>
      <View style={styles.menuDetails}>
        {item.isPopular ? <View style={styles.popularPill}><Text style={styles.popularPillText}>POPULAR</Text></View> : null}
        <Text style={styles.menuItemName}>{item.name}</Text>
        <Text numberOfLines={2} style={styles.menuItemDescription}>{item.description}</Text>
        <Text style={styles.menuItemPrice}>Rs. {item.price.toLocaleString("en-PK")}</Text>
      </View>
      <View style={styles.menuVisual}>
        <Image source={item.image} style={styles.menuImage} resizeMode="cover" />
        <Pressable onPress={onPress} style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
          <MaterialIcons name="add" size={19} color="#FFF8ED" />
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CustomizeSheet({ item, onClose }: { item: MenuItem | null; onClose: () => void }) {
  const { addItem } = useKhanaStore();
  const [spice, setSpice] = useState("Regular");
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  if (!item) return null;

  const toggleAddOn = (addOn: AddOn) => {
    setAddOns((current) => current.some((selected) => selected.id === addOn.id) ? current.filter((selected) => selected.id !== addOn.id) : [...current, addOn]);
  };
  const total = item.price + addOns.reduce((sum, addOn) => sum + addOn.price, 0);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismissArea} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeading}>
            <View style={styles.sheetHeadingText}><Text style={styles.sheetTitle}>{item.name}</Text><Text style={styles.sheetSub}>Make it exactly how you like it</Text></View>
            <Pressable onPress={onClose} style={({ pressed }) => [styles.closeButton, pressed && styles.iconPressed]}><MaterialIcons name="close" size={20} color="#064B2C" /></Pressable>
          </View>
          {item.spiceOptions ? <>
            <Text style={styles.optionLabel}>SPICE LEVEL</Text>
            <View style={styles.optionRow}>
              {item.spiceOptions.map((option) => <Pressable key={option} onPress={() => setSpice(option)} style={({ pressed }) => [styles.option, spice === option && styles.optionSelected, pressed && styles.iconPressed]}><Text style={[styles.optionText, spice === option && styles.optionTextSelected]}>{option}</Text></Pressable>)}
            </View>
          </> : null}
          {item.addOns?.length ? <>
            <Text style={styles.optionLabel}>MAKE IT A MEAL</Text>
            <View style={styles.addOnStack}>
              {item.addOns.map((addOn) => {
                const selected = addOns.some((active) => active.id === addOn.id);
                return <Pressable key={addOn.id} onPress={() => toggleAddOn(addOn)} style={({ pressed }) => [styles.addOn, selected && styles.addOnSelected, pressed && styles.iconPressed]}><View style={[styles.checkbox, selected && styles.checkboxSelected]}>{selected ? <MaterialIcons name="check" size={14} color="#FFF8ED" /> : null}</View><Text style={styles.addOnName}>{addOn.name}</Text><Text style={styles.addOnPrice}>+ Rs. {addOn.price}</Text></Pressable>;
              })}
            </View>
          </> : null}
          <PrimaryButton label={`Add to cart · Rs. ${total.toLocaleString("en-PK")}`} onPress={() => { addItem(item, spice, addOns); onClose(); }} icon="add-shopping-cart" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED" },
  listContent: { paddingHorizontal: 16, paddingTop: 14 },
  hero: { height: 230, borderRadius: 24, overflow: "hidden", backgroundColor: "#064B2C", marginBottom: 12 },
  heroImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,75,44,0.58)" },
  openPill: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.94)", borderRadius: 99, paddingVertical: 6, paddingHorizontal: 9 },
  openDot: { width: 7, height: 7, backgroundColor: "#168A4A", borderRadius: 4 },
  openText: { color: "#064B2C", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  heroContent: { position: "absolute", left: 16, right: 16, bottom: 15 },
  heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 31, fontWeight: "900", letterSpacing: -0.5 },
  heroCuisine: { color: "#DFECE3", fontSize: 13, lineHeight: 17, fontWeight: "600", marginTop: 2 },
  heroMeta: { flexDirection: "row", gap: 10, marginTop: 10 },
  heroMetric: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: "rgba(0,0,0,0.2)" },
  heroMetricText: { color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  deliveryNote: { minHeight: 50, borderRadius: 14, backgroundColor: "#FFF0E6", paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 23 },
  deliveryNoteIcon: { width: 29, height: 29, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  deliveryNoteText: { flex: 1, color: "#A63F00", fontSize: 12, lineHeight: 16, fontWeight: "800" },
  menuHeading: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 12 },
  menuTitle: { color: "#17251D", fontSize: 21, lineHeight: 26, fontWeight: "900" },
  menuSub: { color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  categoryPill: { alignSelf: "flex-start", backgroundColor: "#064B2C", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 12 },
  categoryPillText: { color: "#FFF8ED", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  menuCard: { minHeight: 142, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", padding: 12, flexDirection: "row", gap: 10, marginBottom: 10 },
  menuDetails: { flex: 1, paddingTop: 1 },
  popularPill: { alignSelf: "flex-start", backgroundColor: "#E0F4E7", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, marginBottom: 5 },
  popularPillText: { color: "#168A4A", fontSize: 8, lineHeight: 10, letterSpacing: 0.6, fontWeight: "900" },
  menuItemName: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  menuItemDescription: { marginTop: 4, color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600" },
  menuItemPrice: { color: "#064B2C", fontSize: 13, lineHeight: 17, fontWeight: "900", marginTop: 8 },
  menuVisual: { width: 108, height: 118, position: "relative" },
  menuImage: { width: "100%", height: "100%", borderRadius: 15, backgroundColor: "#E0F4E7" },
  addButton: { position: "absolute", bottom: -4, left: 9, right: 9, height: 32, borderRadius: 10, backgroundColor: "#FF6B00", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  addButtonText: { color: "#FFF8ED", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  footerSpace: { height: 78 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(8,24,14,0.42)", justifyContent: "flex-end" },
  modalDismissArea: { flex: 1 },
  sheet: { backgroundColor: "#FFF8ED", paddingHorizontal: 20, paddingBottom: 31, paddingTop: 10, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  sheetHandle: { width: 38, height: 4, backgroundColor: "#CCD7CF", borderRadius: 99, alignSelf: "center", marginBottom: 16 },
  sheetHeading: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 },
  sheetHeadingText: { flex: 1, paddingRight: 16 },
  sheetTitle: { color: "#17251D", fontSize: 21, lineHeight: 26, fontWeight: "900" },
  sheetSub: { marginTop: 2, color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  closeButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E7E8E2" },
  optionLabel: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 1, fontWeight: "900", marginBottom: 9 },
  optionRow: { flexDirection: "row", gap: 7, marginBottom: 18 },
  option: { flex: 1, minHeight: 38, borderRadius: 11, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  optionSelected: { backgroundColor: "#E0F4E7", borderColor: "#168A4A" },
  optionText: { color: "#6C7A70", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  optionTextSelected: { color: "#064B2C" },
  addOnStack: { gap: 7, marginBottom: 21 },
  addOn: { minHeight: 48, backgroundColor: "#FFFFFF", borderRadius: 13, borderWidth: 1, borderColor: "#E7E8E2", flexDirection: "row", alignItems: "center", paddingHorizontal: 11, gap: 9 },
  addOnSelected: { borderColor: "#168A4A", backgroundColor: "#F2FBF5" },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: "#B6C4BB", alignItems: "center", justifyContent: "center" },
  checkboxSelected: { borderColor: "#168A4A", backgroundColor: "#168A4A" },
  addOnName: { flex: 1, color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "800" },
  addOnPrice: { color: "#064B2C", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  iconPressed: { opacity: 0.65 },
});
