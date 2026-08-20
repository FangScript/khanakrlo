import { router } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getCustomerLaunchDestination } from "@/lib/launch-routing";
import { useKhanaStore } from "@/lib/khana-store";

const SPLASH_DURATION_MS = 1450;

export default function LaunchSplashScreen() {
  const { customer, hasHydratedCustomer, hydrateCustomerSession } = useKhanaStore();
  useEffect(() => {
    void hydrateCustomerSession();
  }, [hydrateCustomerSession]);

  useEffect(() => {
    if (!hasHydratedCustomer) return;
    const timeout = setTimeout(() => router.replace(getCustomerLaunchDestination(Boolean(customer)) as never), SPLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [customer, hasHydratedCustomer]);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <View style={styles.glowLarge} />
        <View style={styles.glowSmall} />
        <View style={styles.content}>
          <View style={styles.logoHalo}><Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" /></View>
          <Text style={styles.title}>Khana KarLo</Text>
          <View style={styles.taglineRow}><View style={styles.taglineLine} /><Text style={styles.tagline}>ORDER  •  TRACK  •  ENJOY</Text><View style={styles.taglineLine} /></View>
        </View>
        <View style={styles.footer}><View style={styles.loaderTrack}><View style={styles.loaderFill} /></View><Text style={styles.footerText}>Food, delivered your way.</Text></View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#064B2C", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  glowLarge: { position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: "#168A4A", opacity: 0.46, right: -180, top: -110 },
  glowSmall: { position: "absolute", width: 255, height: 255, borderRadius: 128, backgroundColor: "#FF6B00", opacity: 0.22, left: -122, bottom: -70 },
  content: { alignItems: "center", paddingHorizontal: 24 },
  logoHalo: { width: 142, height: 142, borderRadius: 50, backgroundColor: "rgba(255,248,237,0.14)", borderWidth: 1, borderColor: "rgba(255,248,237,0.22)", alignItems: "center", justifyContent: "center" },
  logo: { width: 114, height: 114 },
  title: { marginTop: 22, color: "#FFFFFF", fontSize: 35, lineHeight: 41, fontWeight: "900", letterSpacing: -0.9 },
  taglineRow: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  taglineLine: { width: 23, height: 1, backgroundColor: "#FFB73D" },
  tagline: { color: "#E5F4E8", fontSize: 10, lineHeight: 14, letterSpacing: 1.55, fontWeight: "900" },
  footer: { position: "absolute", left: 28, right: 28, bottom: 36, alignItems: "center" },
  loaderTrack: { width: 76, height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,248,237,0.26)" },
  loaderFill: { width: 49, height: 4, borderRadius: 4, backgroundColor: "#FFB73D" },
  footerText: { marginTop: 11, color: "#B9DEC3", fontSize: 11, lineHeight: 15, fontWeight: "700" },
});
