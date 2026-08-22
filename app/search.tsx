import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

type LiveBusiness = { id: number; businessType: "restaurant" | "cloud_kitchen"; displayName: string; city: string; cuisine: string; description: string | null; itemCount: number; isOpen: boolean; deliveryLabel: string };

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const discovery = trpc.discovery.liveBusinesses.useQuery(undefined, { staleTime: 30_000 });
  const matchingBusinesses = useMemo(() => ((discovery.data ?? []) as LiveBusiness[]).filter((business) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [business.displayName, business.cuisine, business.city, business.description ?? ""].some((value) => value.toLowerCase().includes(needle));
  }), [discovery.data, query]);

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
        {discovery.isLoading ? <View style={styles.loading}><ActivityIndicator color="#168A4A" /><Text style={styles.emptyText}>Finding live partners…</Text></View> : <FlatList
          data={matchingBusinesses}
          keyExtractor={(business) => String(business.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultList}
          ListHeaderComponent={<Text style={styles.resultTitle}>{query ? `${matchingBusinesses.length} live matches` : "Explore live partners"}</Text>}
          ListEmptyComponent={<View style={styles.empty}><MaterialIcons name="restaurant-menu" size={35} color="#168A4A" /><Text style={styles.emptyTitle}>No live matches yet</Text><Text style={styles.emptyText}>Try a Restaurant name, city, or cuisine.</Text></View>}
          renderItem={({ item }) => <SearchResult business={item} />}
        />}
      </View>
    </ScreenContainer>
  );
}

function SearchResult({ business }: { business: LiveBusiness }) {
  return (
    <Pressable onPress={() => router.push({ pathname: "/restaurant/[id]", params: { id: String(business.id) } } as never)} style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]}>
      <View style={styles.resultImage}><MaterialIcons name={business.businessType === "restaurant" ? "storefront" : "kitchen"} size={27} color="#064B2C" /></View>
      <View style={styles.resultDetails}>
        <Text style={styles.resultName}>{business.displayName}</Text>
        <Text style={styles.resultCuisine}>{business.cuisine} · {business.city}</Text>
        <View style={styles.resultMeta}><MaterialIcons name="restaurant-menu" size={13} color="#FFB73D" /><Text style={styles.resultMetaText}>{business.itemCount} dishes</Text><View style={styles.dot} /><Text style={styles.resultMetaText}>{business.deliveryLabel}</Text></View>
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
  resultImage: { width: 73, height: 73, borderRadius: 13, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  resultDetails: { flex: 1 },
  resultName: { color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900" },
  resultCuisine: { color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  resultMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  resultMetaText: { color: "#064B2C", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: "#FF6B00", marginHorizontal: 2 },
  empty: { alignItems: "center", paddingTop: 84 },
  emptyTitle: { marginTop: 11, color: "#17251D", fontSize: 18, lineHeight: 23, fontWeight: "900" },
  emptyText: { marginTop: 3, color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
