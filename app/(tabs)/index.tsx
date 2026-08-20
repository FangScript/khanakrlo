import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { BrandTitle, CartBar, Pill } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { cuisineFilters, restaurants, type Restaurant } from "@/lib/khana-data";
import { CustomerProfile, useKhanaStore } from "@/lib/khana-store";

export default function HomeScreen() {
  const { customer, hasHydratedCustomer, hydrateCustomerSession } = useKhanaStore();

  useEffect(() => {
    void hydrateCustomerSession();
  }, [hydrateCustomerSession]);

  useEffect(() => {
    if (hasHydratedCustomer && !customer) router.replace("/auth/login" as never);
  }, [customer, hasHydratedCustomer]);

  if (!hasHydratedCustomer || !customer) {
    return (
      <ScreenContainer>
        <View style={styles.loadingScreen}><ActivityIndicator color="#168A4A" size="small" /><Text style={styles.loadingText}>Preparing your Khana KarLo experience…</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.screen}>
      <FlatList
        data={restaurants}
        keyExtractor={(restaurant) => restaurant.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={<HomeHeader customer={customer} />}
        renderItem={({ item }) => <RestaurantCard restaurant={item} />}
        ListFooterComponent={<View style={styles.bottomSpace} />}
      />
      <CartBar />
      </View>
    </ScreenContainer>
  );
}

function HomeHeader({ customer }: { customer: CustomerProfile }) {
  return (
    <>
      <View style={styles.header}>
        <BrandTitle />
        <Pressable accessibilityRole="button" onPress={() => router.push("/profile" as never)} style={({ pressed }) => [styles.avatar, pressed && styles.iconPressed]}>
          <Text style={styles.avatarText}>{customer.name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => router.push("/search" as never)} style={({ pressed }) => [styles.locationRow, pressed && styles.iconPressed]}>
        <View style={styles.locationIcon}><MaterialIcons name="location-on" size={18} color="#064B2C" /></View>
        <View style={styles.locationTextBlock}>
          <Text style={styles.deliverTo}>DELIVER TO</Text>
          <Text style={styles.locationText} numberOfLines={1}>{customer.deliveryAddress}</Text>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={22} color="#064B2C" />
      </Pressable>

      <Pressable onPress={() => router.push("/search" as never)} style={({ pressed }) => [styles.searchBox, pressed && styles.iconPressed]}>
        <MaterialIcons name="search" size={21} color="#6C7A70" />
        <Text style={styles.searchPlaceholder}>Search restaurants or dishes</Text>
        <View style={styles.searchFilter}><MaterialIcons name="tune" size={18} color="#064B2C" /></View>
      </Pressable>

      <View style={styles.offerCard}>
        <View style={styles.offerContent}>
          <View style={styles.offerPill}><Text style={styles.offerPillText}>FIRST ORDER</Text></View>
          <Text style={styles.offerTitle}>Save 25% today</Text>
          <Text style={styles.offerSub}>on your first delicious delivery</Text>
          <Pressable onPress={() => router.push("/restaurant/biryani-house")} style={({ pressed }) => [styles.offerAction, pressed && styles.iconPressed]}>
            <Text style={styles.offerActionText}>Order now</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#064B2C" />
          </Pressable>
        </View>
        <View style={styles.offerArt}>
          <View style={styles.offerCircleLarge} />
          <View style={styles.offerCircleSmall} />
          <Text style={styles.offerEmoji}>🍛</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>What are you craving?</Text>
          <Text style={styles.sectionSub}>Freshly picked for your area</Text>
        </View>
        <Pressable onPress={() => router.push("/search" as never)} style={({ pressed }) => [styles.seeAll, pressed && styles.iconPressed]}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      </View>

      <FlatList
        data={cuisineFilters}
        horizontal
        keyExtractor={(filter) => filter.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.cuisineList}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => router.push("/search" as never)} style={({ pressed }) => [styles.cuisineItem, pressed && styles.iconPressed]}>
            <View style={[styles.cuisineIcon, index === 0 && styles.cuisineIconActive]}>
              <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={22} color={index === 0 ? "#FFF8ED" : "#064B2C"} />
            </View>
            <Text style={styles.cuisineLabel}>{item.label}</Text>
          </Pressable>
        )}
      />

      <View style={styles.nearbyHeading}>
        <Text style={styles.sectionTitle}>Popular near you</Text>
        <Pill><Text style={styles.pillText}>Open now</Text></Pill>
      </View>
    </>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } } as never)}
      style={({ pressed }) => [styles.restaurantCard, pressed && styles.cardPressed]}
    >
      <Image source={restaurant.image} style={styles.restaurantImage} resizeMode="cover" />
      <View style={styles.restaurantOverlay} />
      <View style={styles.restaurantOffer}><Text style={styles.restaurantOfferText}>{restaurant.offer}</Text></View>
      <View style={styles.restaurantInfo}>
        <View style={styles.restaurantNameRow}>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <View style={styles.rating}><MaterialIcons name="star" size={13} color="#FFB73D" /><Text style={styles.ratingText}>{restaurant.rating}</Text></View>
        </View>
        <Text style={styles.restaurantCuisine}>{restaurant.cuisine}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{restaurant.eta}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.metaText}>Delivery from Rs. {restaurant.deliveryFee}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED" },
  loadingScreen: { flex: 1, backgroundColor: "#FFF8ED", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" },
  listContent: { paddingTop: 14, paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6E2C4" },
  avatarText: { fontSize: 15, lineHeight: 20, fontWeight: "900", color: "#064B2C" },
  locationRow: { minHeight: 54, backgroundColor: "#FFFFFF", borderRadius: 17, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, borderWidth: 1, borderColor: "#E7E8E2" },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  locationTextBlock: { flex: 1 },
  deliverTo: { fontSize: 9, lineHeight: 12, letterSpacing: 1.2, color: "#6C7A70", fontWeight: "900" },
  locationText: { marginTop: 1, fontSize: 14, lineHeight: 19, color: "#17251D", fontWeight: "800" },
  searchBox: { minHeight: 52, borderRadius: 17, backgroundColor: "#F2F3EF", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  searchPlaceholder: { flex: 1, fontSize: 14, lineHeight: 20, color: "#6C7A70", fontWeight: "600" },
  searchFilter: { width: 31, height: 31, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderRadius: 10 },
  offerCard: { height: 178, borderRadius: 24, backgroundColor: "#064B2C", overflow: "hidden", flexDirection: "row", marginBottom: 25 },
  offerContent: { paddingLeft: 19, paddingTop: 17, zIndex: 2, width: "62%" },
  offerPill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#168A4A" },
  offerPillText: { fontSize: 9, lineHeight: 11, letterSpacing: 0.9, color: "#FFF8ED", fontWeight: "900" },
  offerTitle: { marginTop: 10, color: "#FFF8ED", fontSize: 25, lineHeight: 29, fontWeight: "900", letterSpacing: -0.6 },
  offerSub: { marginTop: 2, color: "#CEE4D3", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  offerAction: { marginTop: 12, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#FFB73D", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  offerActionText: { color: "#064B2C", fontSize: 12, lineHeight: 15, fontWeight: "900" },
  offerArt: { flex: 1, justifyContent: "center", alignItems: "center" },
  offerCircleLarge: { position: "absolute", width: 148, height: 148, borderRadius: 74, backgroundColor: "#168A4A", right: -39, top: 18 },
  offerCircleSmall: { position: "absolute", width: 92, height: 92, borderRadius: 46, backgroundColor: "#FF6B00", right: 10, bottom: -24 },
  offerEmoji: { fontSize: 67, zIndex: 2, transform: [{ rotate: "-8deg" }] },
  sectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { color: "#17251D", fontSize: 19, lineHeight: 24, fontWeight: "900", letterSpacing: -0.3 },
  sectionSub: { marginTop: 2, color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600" },
  seeAll: { padding: 6 },
  seeAllText: { color: "#FF6B00", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  cuisineList: { gap: 13, paddingBottom: 26 },
  cuisineItem: { width: 65, alignItems: "center", gap: 7 },
  cuisineIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2" },
  cuisineIconActive: { backgroundColor: "#064B2C", borderColor: "#064B2C" },
  cuisineLabel: { textAlign: "center", color: "#17251D", fontSize: 10, lineHeight: 13, fontWeight: "800" },
  nearbyHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 13 },
  pillText: { color: "#168A4A", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  restaurantCard: { height: 184, borderRadius: 23, overflow: "hidden", backgroundColor: "#064B2C", marginBottom: 14 },
  restaurantImage: { width: "100%", height: "100%", position: "absolute" },
  restaurantOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(6,75,44,0.55)" },
  restaurantOffer: { position: "absolute", top: 12, left: 12, paddingHorizontal: 9, paddingVertical: 6, backgroundColor: "#FFF8ED", borderRadius: 9 },
  restaurantOfferText: { color: "#064B2C", fontSize: 10, lineHeight: 12, fontWeight: "900" },
  restaurantInfo: { position: "absolute", left: 14, right: 14, bottom: 13 },
  restaurantNameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  restaurantName: { flex: 1, color: "#FFFFFF", fontSize: 20, lineHeight: 24, fontWeight: "900", letterSpacing: -0.4 },
  rating: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(6,75,44,0.77)", paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8 },
  ratingText: { color: "#FFF8ED", fontSize: 11, lineHeight: 14, fontWeight: "900" },
  restaurantCuisine: { color: "#E6F1E8", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 7 },
  metaText: { color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#FFB73D" },
  bottomSpace: { height: 76 },
  iconPressed: { opacity: 0.66 },
  cardPressed: { transform: [{ scale: 0.985 }], opacity: 0.93 },
});
