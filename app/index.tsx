import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getCustomerLaunchDestination } from "@/lib/launch-routing";
import { useKhanaStore } from "@/lib/khana-store";
import { useAuth } from "@/hooks/use-auth";

const SPLASH_DURATION_MS = 2200;

export default function LaunchSplashScreen() {
  const { customer, hasHydratedCustomer, hydrateCustomerSession } = useKhanaStore();
  const { user, loading } = useAuth();
  const logoProgress = useRef(new Animated.Value(0)).current;
  const contentProgress = useRef(new Animated.Value(0)).current;
  const ambientProgress = useRef(new Animated.Value(0)).current;
  const loaderProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) void hydrateCustomerSession(user?.openId);
  }, [hydrateCustomerSession, loading, user?.openId]);

  useEffect(() => {
    const ambientLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientProgress, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ambientProgress, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    ambientLoop.start();
    Animated.parallel([
      Animated.timing(logoProgress, {
        toValue: 1,
        duration: 1050,
        delay: 90,
        easing: Easing.out(Easing.back(1.35)),
        useNativeDriver: true,
      }),
      Animated.timing(contentProgress, {
        toValue: 1,
        duration: 900,
        delay: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(loaderProgress, {
        toValue: 1,
        duration: SPLASH_DURATION_MS - 250,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();

    return () => ambientLoop.stop();
  }, [ambientProgress, contentProgress, loaderProgress, logoProgress]);

  useEffect(() => {
    if (loading || !hasHydratedCustomer) return;
    const destination = !user ? "/auth/login" : !customer ? "/auth/contact" : getCustomerLaunchDestination(true);
    const timeout = setTimeout(() => router.replace(destination as never), SPLASH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [customer, hasHydratedCustomer, loading, user]);

  const largeGlowStyle = {
    transform: [
      { translateX: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -34] }) },
      { translateY: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 26] }) },
      { scale: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) },
    ],
  };
  const smallGlowStyle = {
    transform: [
      { translateX: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) },
      { translateY: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [0, -20] }) },
      { scale: ambientProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) },
    ],
  };
  const logoRevealStyle = {
    opacity: logoProgress,
    transform: [
      { scale: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }) },
      { translateY: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
    ],
  };
  const contentRevealStyle = {
    opacity: contentProgress,
    transform: [{ translateY: contentProgress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
  };
  const loaderStyle = {
    width: loaderProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 76] }),
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <Animated.View style={[styles.glowLarge, largeGlowStyle]} />
        <Animated.View style={[styles.glowSmall, smallGlowStyle]} />
        <Animated.View style={[styles.orbit, styles.orbitOne, { transform: [{ rotate: "-22deg" }, { scale: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }] }]} />
        <Animated.View style={[styles.orbit, styles.orbitTwo, { transform: [{ rotate: "34deg" }, { scale: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.48, 1] }) }] }]} />

        <View style={styles.content}>
          <Animated.View style={[styles.logoStage, logoRevealStyle]}>
            <View style={styles.logoHalo}>
              <View style={styles.logoBacking} />
              <View style={styles.logoFrame}>
                <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="cover" />
              </View>
            </View>
            <View style={styles.logoShadow} />
          </Animated.View>
          <Animated.View style={contentRevealStyle}>
            <Text style={styles.title}>Khana KarLo</Text>
            <View style={styles.taglineRow}>
              <View style={styles.taglineLine} />
              <Text style={styles.tagline}>ORDER  •  TRACK  •  ENJOY</Text>
              <View style={styles.taglineLine} />
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, contentRevealStyle]}>
          <View style={styles.loaderTrack}>
            <Animated.View style={[styles.loaderFill, loaderStyle]} />
          </View>
          <Text style={styles.footerText}>Food, delivered your way.</Text>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#064B2C", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  glowLarge: { position: "absolute", width: 420, height: 420, borderRadius: 210, backgroundColor: "#168A4A", opacity: 0.46, right: -180, top: -110 },
  glowSmall: { position: "absolute", width: 255, height: 255, borderRadius: 128, backgroundColor: "#FF6B00", opacity: 0.22, left: -122, bottom: -70 },
  orbit: { position: "absolute", width: 310, height: 118, borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,183,61,0.30)" },
  orbitOne: { top: "37%" },
  orbitTwo: { top: "43%", borderColor: "rgba(229,244,232,0.18)" },
  content: { alignItems: "center", paddingHorizontal: 24 },
  logoStage: { alignItems: "center", justifyContent: "center" },
  logoHalo: { width: 142, height: 142, borderRadius: 71, backgroundColor: "rgba(255,248,237,0.10)", borderWidth: 1, borderColor: "rgba(255,248,237,0.28)", alignItems: "center", justifyContent: "center", shadowColor: "#FFB73D", shadowOpacity: 0.26, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  logoBacking: { position: "absolute", width: 124, height: 124, borderRadius: 38, backgroundColor: "rgba(255,183,61,0.20)", borderWidth: 1, borderColor: "rgba(255,183,61,0.46)", transform: [{ rotate: "90deg" }] },
  logoFrame: { width: 112, height: 112, borderRadius: 34, overflow: "hidden", backgroundColor: "#FFF8ED", alignItems: "center", justifyContent: "center" },
  logo: { width: 112, height: 112 },
  logoShadow: { position: "absolute", width: 92, height: 15, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.18)", bottom: -18, transform: [{ scaleX: 1.15 }] },
  title: { marginTop: 28, color: "#FFFFFF", fontSize: 35, lineHeight: 41, fontWeight: "900", letterSpacing: -0.9 },
  taglineRow: { marginTop: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  taglineLine: { width: 23, height: 1, backgroundColor: "#FFB73D" },
  tagline: { color: "#E5F4E8", fontSize: 10, lineHeight: 14, letterSpacing: 1.55, fontWeight: "900" },
  footer: { position: "absolute", left: 28, right: 28, bottom: 36, alignItems: "center" },
  loaderTrack: { width: 76, height: 4, borderRadius: 4, overflow: "hidden", backgroundColor: "rgba(255,248,237,0.26)" },
  loaderFill: { height: 4, borderRadius: 4, backgroundColor: "#FFB73D" },
  footerText: { marginTop: 11, color: "#B9DEC3", fontSize: 11, lineHeight: 15, fontWeight: "700" },
});
