import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Slot } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

/** The Admin console is intentionally web-only. Server-side procedures retain staff-role checks on every request. */
export default function AdminWebOnlyLayout() {
  if (Platform.OS !== "web") {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><View style={styles.icon}><MaterialIcons name="desktop-windows" size={30} color="#064B2C" /></View><Text style={styles.title}>Admin console is web-only</Text><Text style={styles.copy}>Customer, Business, and Rider workspaces do not include internal operations tools. Authorized Khana KarLo staff must use the protected Admin website.</Text></View></ScreenContainer>;
  }
  return <Slot />;
}

const styles = StyleSheet.create({ page:{ flex:1, padding:28, alignItems:"center", justifyContent:"center", backgroundColor:"#F3F6F3" }, icon:{ width:62, height:62, borderRadius:20, alignItems:"center", justifyContent:"center", backgroundColor:"#E0F4E7" }, title:{ marginTop:17, color:"#17251D", fontSize:21, lineHeight:27, fontWeight:"900", textAlign:"center" }, copy:{ marginTop:8, maxWidth:320, color:"#66746B", fontSize:12, lineHeight:18, fontWeight:"600", textAlign:"center" } });
