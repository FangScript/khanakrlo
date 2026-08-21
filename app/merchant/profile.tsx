import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { MerchantScreen } from "@/components/merchant-ui";
import { useMerchantStore } from "@/lib/merchant-store";

const rows = [
  { icon: "restaurant-menu" as const, title: "Menu, prices & availability", subtitle: "Open the approved production catalogue", href: "/business/catalogue" },
  { icon: "schedule" as const, title: "Business hours", subtitle: "Open today until 11:30 PM" },
  { icon: "group" as const, title: "Staff access", subtitle: "4 team members" },
  { icon: "support-agent" as const, title: "Partner support", subtitle: "Get help with orders and payouts" },
];

export default function MerchantProfileScreen() {
  const { profile, hasHydrated, hydrateMerchantSession } = useMerchantStore();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => { void hydrateMerchantSession(); }, [hydrateMerchantSession]);
  useEffect(() => { if (hasHydrated && !profile) router.replace("/merchant/welcome" as never); }, [hasHydrated, profile]);

  if (!hasHydrated || !profile) return <MerchantScreen><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Loading outlet profile…</Text></View></MerchantScreen>;

  return (
    <MerchantScreen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><Text style={styles.headerTitle}>Outlet profile</Text><View style={{ width: 40 }} /></View>
        <View style={styles.profileCard}><View style={styles.storeIcon}><MaterialIcons name="storefront" size={30} color="#FFFFFF" /></View><View style={styles.verified}><MaterialIcons name="verified" size={14} color="#17683A" /><Text style={styles.verifiedText}>Verified partner</Text></View><Text style={styles.outletName}>{profile.outletName}</Text><Text style={styles.owner}>{profile.name} · Restaurant manager</Text><Text style={styles.phone}>+92 {profile.phone.slice(0, 3)} {profile.phone.slice(3, 6)} {profile.phone.slice(6)}</Text></View>
        <View style={styles.openCard}><View><Text style={styles.openTitle}>{isOpen ? "Outlet is accepting orders" : "Outlet is paused"}</Text><Text style={styles.openSubtitle}>{isOpen ? "Customers can place orders now." : "Customers cannot place new orders."}</Text></View><Switch value={isOpen} onValueChange={setIsOpen} trackColor={{ false: "#D8DDD8", true: "#9EDAB0" }} thumbColor={isOpen ? "#168A4A" : "#FFFFFF" } /></View>
        <Text style={styles.sectionTitle}>Manage outlet</Text>
        <View style={styles.rowCard}>{rows.map((row, index) => <Pressable key={row.title} accessibilityRole="button" onPress={row.href ? () => router.push(row.href as never) : undefined} style={[styles.row, index < rows.length - 1 && styles.rowBorder]}><View style={styles.rowIcon}><MaterialIcons name={row.icon} size={20} color="#064B2C" /></View><View style={{ flex: 1 }}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSubtitle}>{row.subtitle}</Text></View><MaterialIcons name="chevron-right" size={21} color="#91A097" /></Pressable>)}</View>
      </ScrollView>
    </MerchantScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 }, header: { height: 74, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, headerTitle: { color: "#17251D", fontSize: 17, lineHeight: 21, fontWeight: "900" }, profileCard: { margin: 16, padding: 20, borderRadius: 22, backgroundColor: "#064B2C", alignItems: "center" }, storeIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center" }, verified: { marginTop: 13, flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: "#E0F4E7", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 }, verifiedText: { color: "#17683A", fontSize: 10, lineHeight: 13, fontWeight: "900" }, outletName: { marginTop: 13, color: "#FFFFFF", fontSize: 23, lineHeight: 28, fontWeight: "900" }, owner: { marginTop: 4, color: "#C8E1CF", fontSize: 12, lineHeight: 17, fontWeight: "600" }, phone: { marginTop: 8, color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "800" }, openCard: { marginHorizontal: 16, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E6E0", padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, openTitle: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, openSubtitle: { marginTop: 3, color: "#6C7A70", fontSize: 11, lineHeight: 15, fontWeight: "600" }, sectionTitle: { marginTop: 23, marginHorizontal: 16, marginBottom: 9, color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, rowCard: { marginHorizontal: 16, backgroundColor: "#FFFFFF", borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", paddingHorizontal: 14 }, row: { minHeight: 70, alignItems: "center", flexDirection: "row", gap: 11 }, rowBorder: { borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, rowIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, rowTitle: { color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" }, rowSubtitle: { marginTop: 2, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 11 }, loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" },
});
