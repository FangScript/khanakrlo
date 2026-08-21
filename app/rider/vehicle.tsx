import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function RiderVehicleScreen() {
  const [inspectionReady, setInspectionReady] = useState(true);
  const [helmetReady, setHelmetReady] = useState(true);
  const checklist = [
    { title: "Daily vehicle inspection", text: "Brakes, tyres, lights and fuel checked", value: inspectionReady, setValue: setInspectionReady },
    { title: "Helmet and safety gear", text: "Helmet and reflective gear available", value: helmetReady, setValue: setHelmetReady },
  ];
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><Text style={styles.title}>Vehicle details</Text><View style={{ width: 40 }} /></View>
      <View style={styles.vehicleCard}><View style={styles.vehicleIcon}><MaterialIcons name="two-wheeler" size={30} color="#FFFFFF" /></View><Text style={styles.vehicleName}>Honda CD 70</Text><Text style={styles.vehicleMeta}>LEB-7421 · Motorcycle · Islamabad</Text><View style={styles.verified}><MaterialIcons name="verified" size={14} color="#17683A" /><Text style={styles.verifiedText}>Approved for deliveries</Text></View></View>
      <Text style={styles.sectionTitle}>Delivery readiness</Text>
      <View style={styles.card}>{checklist.map((item, index) => <View key={item.title} style={[styles.checkRow, index < checklist.length - 1 && styles.border]}><View style={[styles.checkIcon, item.value && styles.checkIconDone]}><MaterialIcons name={item.value ? "check" : "priority-high"} size={17} color={item.value ? "#FFFFFF" : "#9E5B00"} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemText}>{item.text}</Text></View><Switch value={item.value} onValueChange={item.setValue} trackColor={{ false: "#D8DDD8", true: "#9EDAB0" }} thumbColor={item.value ? "#168A4A" : "#FFFFFF"} /></View>)}</View>
      <Text style={styles.sectionTitle}>Registration</Text>
      <View style={styles.card}><InfoRow icon="confirmation-number" label="Registration number" value="LEB-7421" /><InfoRow icon="event" label="Last verification" value="12 Aug 2026" /><InfoRow icon="build" label="Next maintenance check" value="Due in 18 days" /></View>
      <Pressable accessibilityRole="button" onPress={() => Alert.alert("Vehicle update", "Vehicle changes are reviewed by Khana KarLo operations before they become active.")} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><MaterialIcons name="edit" size={18} color="#FFFFFF" /><Text style={styles.actionText}>Request a vehicle update</Text></Pressable>
    </ScrollView>
  </ScreenContainer>;
}

function InfoRow({ icon, label, value }: { icon: "confirmation-number" | "event" | "build"; label: string; value: string }) { return <View style={styles.infoRow}><MaterialIcons name={icon} size={19} color="#17683A" /><View style={styles.copy}><Text style={styles.itemTitle}>{label}</Text><Text style={styles.itemText}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  content: { paddingBottom: 34, backgroundColor: "#F4F6F3" }, header: { height: 74, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, title: { color: "#17251D", fontSize: 17, lineHeight: 21, fontWeight: "900" }, vehicleCard: { margin: 16, padding: 19, borderRadius: 22, backgroundColor: "#064B2C", alignItems: "center" }, vehicleIcon: { width: 62, height: 62, borderRadius: 21, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center" }, vehicleName: { marginTop: 13, color: "#FFFFFF", fontSize: 21, lineHeight: 27, fontWeight: "900" }, vehicleMeta: { marginTop: 4, color: "#C8E1CF", fontSize: 11, lineHeight: 15, fontWeight: "700" }, verified: { marginTop: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: "#E0F4E7", flexDirection: "row", alignItems: "center", gap: 5 }, verifiedText: { color: "#17683A", fontSize: 10, lineHeight: 13, fontWeight: "900" }, sectionTitle: { marginHorizontal: 16, marginTop: 7, marginBottom: 9, color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, card: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FFFFFF", paddingHorizontal: 14 }, checkRow: { minHeight: 75, flexDirection: "row", alignItems: "center", gap: 10 }, border: { borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, checkIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: "#FFF1DA", alignItems: "center", justifyContent: "center" }, checkIconDone: { backgroundColor: "#168A4A" }, copy: { flex: 1 }, itemTitle: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" }, itemText: { marginTop: 3, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, infoRow: { minHeight: 63, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, action: { margin: 16, height: 50, borderRadius: 16, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, actionText: { color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "900" }, pressed: { transform: [{ scale: 0.985 }], opacity: 0.86 },
});
