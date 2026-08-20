import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { KhanaKarLoMark } from "@/components/khana-karlo-mark";
import { ScreenContainer } from "@/components/screen-container";

const profileRows = [
  { icon: "location-on", title: "Saved addresses", subtitle: "Home, Work", message: "Address management is ready to connect to a customer account." },
  { icon: "notifications", title: "Notifications", subtitle: "Order updates and offers", message: "Notification preferences will be stored when customer settings are connected." },
  { icon: "help", title: "Help center", subtitle: "FAQs, support, and feedback", message: "The production help centre will link order-specific support and FAQs." },
] as const;

export default function ProfileScreen() {
  return <ScreenContainer><View style={styles.screen}><Text style={styles.title}>Profile</Text><View style={styles.profileCard}><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View><View style={styles.profileText}><Text style={styles.name}>Ayesha Khan</Text><Text style={styles.phone}>+92 300 123 4567</Text></View><Pressable onPress={() => Alert.alert("Profile", "Profile editing will be connected when phone-based sign-in is enabled.")} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}><MaterialIcons name="edit" size={18} color="#064B2C" /></Pressable></View><Text style={styles.sectionLabel}>YOUR ACCOUNT</Text>{profileRows.map((row) => <Pressable key={row.title} onPress={() => Alert.alert(row.title, row.message)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><View style={styles.rowIcon}><MaterialIcons name={row.icon} size={20} color="#064B2C" /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{row.title}</Text><Text style={styles.rowSub}>{row.subtitle}</Text></View><MaterialIcons name="chevron-right" size={23} color="#879187" /></Pressable>)}<View style={styles.brandFooter}><KhanaKarLoMark size={34} /><View><Text style={styles.footerTitle}>Khaana <Text style={styles.footerOrange}>KarLo</Text></Text><Text style={styles.footerSub}>Pakistan ka apna food app</Text></View></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 12, backgroundColor: "#FFF8ED" },
  title: { color: "#17251D", fontSize: 27, lineHeight: 33, fontWeight: "900", letterSpacing: -0.5, marginBottom: 18 },
  profileCard: { backgroundColor: "#064B2C", borderRadius: 21, padding: 15, flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 24 },
  avatar: { width: 53, height: 53, borderRadius: 27, backgroundColor: "#FFB73D", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#064B2C", fontSize: 20, lineHeight: 25, fontWeight: "900" },
  profileText: { flex: 1 },
  name: { color: "#FFFFFF", fontSize: 17, lineHeight: 21, fontWeight: "900" },
  phone: { color: "#D9E8DC", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 2 },
  editButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  sectionLabel: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 1, fontWeight: "900", marginBottom: 9 },
  row: { minHeight: 70, flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 17, paddingHorizontal: 12, gap: 10, marginBottom: 8 },
  rowIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  rowSub: { color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600", marginTop: 1 },
  brandFooter: { marginTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerTitle: { color: "#064B2C", fontSize: 17, lineHeight: 20, fontWeight: "900" },
  footerOrange: { color: "#FF6B00" },
  footerSub: { color: "#879187", fontSize: 10, lineHeight: 13, fontWeight: "700", marginTop: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
});

