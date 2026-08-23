import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

type Point = { latitudeE6: number; longitudeE6: number };

export function DeliveryTrackingMap({ rider, destination, etaMinutes, routeAvailable }: { rider: Point | null; destination: Point | null; freshnessSeconds: number | null; etaMinutes?: number | null; routeAvailable?: boolean }) {
  if (!destination) return <View style={styles.unavailable}><MaterialIcons name="map" size={23} color="#52705B" /><Text style={styles.title}>Map unavailable for this address</Text><Text style={styles.text}>The saved delivery address does not yet include a map coordinate.</Text></View>;
  return <View style={styles.shell}><MaterialIcons name={rider ? "my-location" : "map"} size={27} color="#168A4A" /><Text style={styles.title}>{rider ? "Rider position is live in the mobile app" : "Waiting for Rider location"}</Text><Text style={styles.text}>{rider ? etaMinutes ? `Estimated route time: ${etaMinutes} min.` : routeAvailable === false ? "Route ETA is temporarily unavailable." : "Open this order on iOS or Android to view the embedded delivery map." : "Open this order on iOS or Android to view the embedded delivery map when the Rider starts sharing."}</Text></View>;
}

const styles = StyleSheet.create({ shell: { minHeight: 164, borderRadius: 18, backgroundColor: "#EAF3EC", borderWidth: 1, borderColor: "#B6E2C4", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }, unavailable: { minHeight: 124, borderRadius: 18, borderWidth: 1, borderColor: "#E1E6E0", backgroundColor: "#FAFCFA", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }, title: { marginTop: 8, color: "#064B2C", textAlign: "center", fontSize: 12, fontWeight: "900" }, text: { marginTop: 4, color: "#54705C", textAlign: "center", fontSize: 10, lineHeight: 14, fontWeight: "600" } });
