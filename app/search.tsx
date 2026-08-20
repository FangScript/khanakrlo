import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { restaurants, type Restaurant } from "@/lib/khana-data";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const matchingRestaurants = useMemo(() => restaurants.filter((restaurant) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return restaurant.name.toLowerCase().includes(needle) || restaurant.cuisine.toLowerCase().includes(needle) || restaurant.menu.some((item) => item.name.toLowerCase().includes(needle));
  }), [query]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <ScreenBack title="Search" />
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={21} color="#6C7A70" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search biryani, karahi, burgers..."
            placeholderTextColor="#879187"
            style={styles.searchInput}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>
        <FlatList
          data={matchingRestaurants}
          keyExtractor={(restaurant) => restaurant.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultList}
          ListHeaderComponent={<Text style={styles.resultTitle}>{query ? `${matchingRestaurants.length} matches` : "Explore nearby"}</Text>}
          ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="restaurant-menu" size={35} color="#168A4A" /><Text style={styles.emptyTitle}>No matches yet</Text><Text style={styles.emptyText}>Try a restaurant or dish name.</Text></View>}
          renderItem={({ item }) => <SearchResult restaurant={item} />}
        />
      </View>
    </ScreenContainer>
  );
}

function SearchResult({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Pressable onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: restaurant.id } } as never)} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
      <Image source={restaurant.image} style={styles.resultImage} resizeMode="cover" />
      <View style={styles.resultDetails}>
        <Text style={styles.resultName}>{restaurant.name}</Text>
        <Text style={styles.resultCuisine}>{restaurant.cuisine}</Text>
        <View style={styles.resultMeta}><MaterialIcons name="star" size={13} color="#FFB73D" /><Text style={styles.resultMetaText}>{restaurant.rating}</Text><View style={styles.dot} /><Text style={styles.resultMetaText}>{restaurant.eta}</Text></View>
      </View>
      <MaterialIcons name="chevron-right" size={23} color="#064B2C" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 },
  searchBox: { minHeight: 53, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 16, paddingHorizontal: 14, marginBottom: 18 },
  searchInput: { flex: 1, color: "#17251D", fontSize: 14, lineHeight: 19, fontWeight: "600", paddingVertical: 0 },
  resultList: { paddingBottom: 26 },
  resultTitle: { color: "#17251D", fontSize: 17, lineHeight: 22, fontWeight: "900", marginBottom: 11 },
  resultCard: { minHeight: 94, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E7E8E2", padding: 9, marginBottom: 9, flexDirection: "row", alignItems: "center", gap: 11 },
  resultImage: { width: 73, height: 73, borderRadius: 13, backgroundColor: "#E0F4E7" },
  resultDetails: { flex: 1 },
  resultName: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  resultCuisine: { color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  resultMetaText: { color: "#064B2C", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: "#FF6B00", marginHorizontal: 2 },
  empty: { alignItems: "center", paddingTop: 84 },
  emptyTitle: { marginTop: 11, color: "#17251D", fontSize: 18, lineHeight: 23, fontWeight: "900" },
  emptyText: { marginTop: 3, color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});

