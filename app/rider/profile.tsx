import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useRiderStore } from "@/lib/rider-store";

const riderRows = [
  { icon: "directions-bike" as const, title: "Vehicle details", subtitle: "Honda CD 70 · LEB-7421" },
  { icon: "badge" as const, title: "Documents", subtitle: "CNIC and licence verified" },
  { icon: "account-balance-wallet" as const, title: "Earnings & payouts", subtitle: "Rs. 4,280 available this week" },
  { icon: "health-and-safety" as const, title: "Safety & support", subtitle: "Emergency help and rider support" },
];

export default function RiderProfileScreen() {
  const { profile, isAvailable, hasHydrated, hydrateRiderSession, setRiderAvailability } = useRiderStore();
  useEffect(() => { void hydrateRiderSession(); }, [hydrateRiderSession]);
  if (!hasHydrated) return <ScreenContainer><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Loading rider profile…</Text></View></ScreenContainer>;
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><Text style={styles.headerTitle}>Rider profile</Text><View style={{ width: 40 }} /></View>
        <View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>{profile.initials}</Text></View><View style={styles.verified}><MaterialIcons name="verified" size={14} color="#17683A" /><Text style={styles.verifiedText}>Active rider</Text></View><Text style={styles.name}>{profile.name}</Text><Text style={styles.city}>{profile.city} · Bike delivery partner</Text><Text style={styles.phone}>+92 {profile.phone.slice(0, 3)} {profile.phone.slice(3, 6)} {profile.phone.slice(6)}</Text></View>
        <View style={styles.availabilityCard}><View><Text style={styles.availabilityTitle}>{isAvailable ? "You’re online" : "You’re offline"}</Text><Text style={styles.availabilitySubtitle}>{isAvailable ? "Ready to receive delivery requests." : "Go online when you’re ready to deliver."}</Text></View><Switch value={isAvailable} onValueChange={setRiderAvailability} trackColor={{ false: "#D8DDD8", true: "#9EDAB0" }} thumbColor={isAvailable ? "#168A4A" : "#FFFFFF"} /></View>
        <Text style={styles.sectionTitle}>Rider account</Text><View style={styles.rowCard}>{riderRows.map((row, index) => <Pressable key={row.title} accessibilityRole="button" style={[styles.row, index < riderRows.length - 1 && styles.rowBorder]}><View style={styles.rowIcon}><MaterialIcons name={row.icon} size={20} color="#064B2C" /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSubtitle}>{row.subtitle}</Text></View><MaterialIcons name="chevron-right" size={21} color="#91A097" /></Pressable>)}</View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: "#F4F6F3", paddingBottom: 30 }, header: { height: 74, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, headerTitle: { color: "#17251D", fontSize: 17, lineHeight: 21, fontWeight: "900" }, profileCard: { margin: 16, padding: 20, borderRadius: 22, backgroundColor: "#064B2C", alignItems: "center" }, avatar: { width: 66, height: 66, borderRadius: 23, backgroundColor: "#FFB73D", alignItems: "center", justifyContent: "center" }, avatarText: { color: "#064B2C", fontSize: 19, lineHeight: 24, fontWeight: "900" }, verified: { marginTop: 13, flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "#E0F4E7", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }, verifiedText: { color: "#17683A", fontSize: 10, lineHeight: 13, fontWeight: "900" }, name: { marginTop: 13, color: "#FFFFFF", fontSize: 23, lineHeight: 28, fontWeight: "900" }, city: { marginTop: 4, color: "#C8E1CF", fontSize: 12, lineHeight: 17, fontWeight: "600" }, phone: { marginTop: 8, color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "800" }, availabilityCard: { marginHorizontal: 16, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E6E0", padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, availabilityTitle: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, availabilitySubtitle: { marginTop: 3, color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600", maxWidth: 240 }, sectionTitle: { marginTop: 23, marginHorizontal: 16, marginBottom: 9, color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, rowCard: { marginHorizontal: 16, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", paddingHorizontal: 14 }, row: { minHeight: 70, alignItems: "center", flexDirection: "row", gap: 11 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, rowIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, rowTitle: { color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" }, rowSubtitle: { marginTop: 2, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11, backgroundColor: "#F4F6F3" }, loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" },
});
