import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

const documents = [
  { icon: "badge" as const, title: "CNIC", detail: "****-****-4321", status: "Verified", color: "#E0F4E7", textColor: "#17683A" },
  { icon: "two-wheeler" as const, title: "Driving licence", detail: "Motorcycle · Valid until 28 Feb 2028", status: "Verified", color: "#E0F4E7", textColor: "#17683A" },
  { icon: "account-balance" as const, title: "Payout details", detail: "Verified by Khana KarLo operations", status: "Active", color: "#EAF1FF", textColor: "#2E5EA7" },
];

export default function RiderDocumentsScreen() {
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><Text style={styles.title}>Documents</Text><View style={{ width: 40 }} /></View>
      <View style={styles.banner}><View style={styles.bannerIcon}><MaterialIcons name="verified-user" size={22} color="#FFFFFF" /></View><View style={styles.copy}><Text style={styles.bannerTitle}>Your rider account is verified</Text><Text style={styles.bannerText}>Keep your documents current so you can continue receiving delivery assignments.</Text></View></View>
      <Text style={styles.sectionTitle}>Verification records</Text>
      <View style={styles.card}>{documents.map((document, index) => <View key={document.title} style={[styles.row, index < documents.length - 1 && styles.border]}><View style={styles.docIcon}><MaterialIcons name={document.icon} size={20} color="#064B2C" /></View><View style={styles.copy}><Text style={styles.docTitle}>{document.title}</Text><Text style={styles.docDetail}>{document.detail}</Text></View><View style={[styles.pill, { backgroundColor: document.color }]}><Text style={[styles.pillText, { color: document.textColor }]}>{document.status}</Text></View></View>)}</View>
      <View style={styles.note}><MaterialIcons name="lock-outline" size={18} color="#647168" /><Text style={styles.noteText}>Sensitive document numbers are masked in the app. Operations will contact you if re-verification is required.</Text></View>
      <Pressable accessibilityRole="button" onPress={() => Alert.alert("Request re-verification", "A document review request has been prepared. Operations will follow up with you in the Rider workspace.")} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><MaterialIcons name="upload-file" size={18} color="#FFFFFF" /><Text style={styles.actionText}>Request document update</Text></Pressable>
    </ScrollView>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34, backgroundColor: "#F4F6F3" }, header: { height: 74, paddingHorizontal: 16, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E1E6E0", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, title: { color: "#17251D", fontSize: 17, lineHeight: 21, fontWeight: "900" }, banner: { margin: 16, padding: 15, borderRadius: 19, backgroundColor: "#064B2C", flexDirection: "row", gap: 10 }, bannerIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center" }, copy: { flex: 1 }, bannerTitle: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "900" }, bannerText: { marginTop: 4, color: "#C8E1CF", fontSize: 10, lineHeight: 15, fontWeight: "600" }, sectionTitle: { marginHorizontal: 16, marginBottom: 9, color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, card: { marginHorizontal: 16, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FFFFFF" }, row: { minHeight: 76, flexDirection: "row", alignItems: "center", gap: 10 }, border: { borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, docIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, docTitle: { color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" }, docDetail: { marginTop: 3, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, pill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, pillText: { fontSize: 8, lineHeight: 11, letterSpacing: 0.45, fontWeight: "900" }, note: { margin: 16, padding: 13, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E6E0", flexDirection: "row", gap: 8 }, noteText: { flex: 1, color: "#647168", fontSize: 10, lineHeight: 15, fontWeight: "600" }, action: { marginHorizontal: 16, height: 50, borderRadius: 16, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, actionText: { color: "#FFFFFF", fontSize: 12, lineHeight: 16, fontWeight: "900" }, pressed: { transform: [{ scale: 0.985 }], opacity: 0.86 },
});
