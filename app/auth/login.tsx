import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import * as Auth from "@/lib/_core/auth";
import { createMockGoogleUser } from "@/lib/mock-auth";

export default function GoogleLoginScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const continueWithMockGoogle = async () => {
    setIsSigningIn(true);
    try {
      await Auth.setUserInfo(createMockGoogleUser());
      router.replace("/auth/phone" as never);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <View style={styles.topGlow} />
        <View style={styles.content}>
          <View style={styles.logoHalo}><Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" /></View>
          <Text style={styles.title}>Good food, made easy.</Text>
          <Text style={styles.subtitle}>Sign in to discover local favourites, track your delivery, and keep every order in one place.</Text>

          <Pressable accessibilityRole="button" disabled={isSigningIn} onPress={continueWithMockGoogle} style={({ pressed }) => [styles.googleButton, isSigningIn && styles.googleButtonDisabled, pressed && !isSigningIn && styles.pressed]}>
            <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
            <Text style={styles.googleButtonText}>{isSigningIn ? "Signing in…" : "Continue with mock Google"}</Text>
            {isSigningIn ? <ActivityIndicator size="small" color="#17683A" /> : <MaterialIcons name="arrow-forward" size={19} color="#17683A" />}
          </Pressable>

          <View style={styles.notice}><MaterialIcons name="science" size={19} color="#B66A00" /><Text style={styles.noticeText}>Preview mode: this mock Google sign-in opens phone verification and location setup without contacting Google.</Text></View>
        </View>
        <View style={styles.footer}><Text style={styles.footerText}>By continuing, you agree to Khana KarLo’s Terms of Service and Privacy Policy.</Text></View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 24, overflow: "hidden" },
  topGlow: { position: "absolute", width: 365, height: 365, borderRadius: 183, right: -152, top: -110, backgroundColor: "#E0F4E7" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 28 },
  logoHalo: { width: 132, height: 132, borderRadius: 36, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", shadowColor: "#064B2C", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 4 },
  logo: { width: 108, height: 108 },
  title: { marginTop: 29, color: "#17251D", fontSize: 31, lineHeight: 37, fontWeight: "900", letterSpacing: -0.8, textAlign: "center" },
  subtitle: { marginTop: 11, color: "#68776D", fontSize: 15, lineHeight: 21, fontWeight: "600", textAlign: "center", maxWidth: 336 },
  googleButton: { width: "100%", marginTop: 38, minHeight: 58, backgroundColor: "#FFFFFF", borderRadius: 17, borderWidth: 1, borderColor: "#DCE3DA", paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between", shadowColor: "#17251D", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  googleButtonDisabled: { opacity: 0.76 },
  googleMark: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#F1F4F1", alignItems: "center", justifyContent: "center" },
  googleMarkText: { color: "#4285F4", fontSize: 18, lineHeight: 22, fontWeight: "900" },
  googleButtonText: { flex: 1, marginLeft: 11, color: "#17251D", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  notice: { width: "100%", marginTop: 16, padding: 13, borderRadius: 15, backgroundColor: "#FFF1DA", flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noticeText: { flex: 1, color: "#6B4B12", fontSize: 11, lineHeight: 16, fontWeight: "700" },
  footer: { paddingBottom: 18 },
  footerText: { color: "#7B877F", textAlign: "center", fontSize: 10, lineHeight: 15, fontWeight: "600" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
});
