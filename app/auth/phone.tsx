import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { isValidPakistaniMobile, normalizePakistaniMobile } from "@/lib/customer-onboarding";
import { useAuth } from "@/hooks/use-auth";

export default function PhoneRegistrationScreen() {
  const { user, loading } = useAuth();
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/auth/login" as never);
  }, [loading, user]);

  if (loading) {
    return <ScreenContainer><View style={styles.loading}><ActivityIndicator size="small" color="#168A4A" /><Text style={styles.loadingText}>Confirming your Google sign-in…</Text></View></ScreenContainer>;
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const isValid = isValidPakistaniMobile(phone);

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.screen}>
        <View style={styles.top}><View style={styles.step}><View style={styles.stepActive} /><View style={styles.stepActive} /><View style={styles.stepInactive} /><View style={styles.stepInactive} /></View><Text style={styles.stepText}>STEP 2 OF 4</Text></View>
        <View style={styles.content}>
          <View style={styles.icon}><MaterialIcons name="phone-iphone" size={28} color="#064B2C" /></View>
          <Text style={styles.title}>One more detail, {firstName}.</Text>
          <Text style={styles.subtitle}>We’ll use your number for delivery updates and to keep your account secure.</Text>
          <Text style={styles.label}>Mobile number</Text>
          <View style={styles.phoneRow}><View style={styles.country}><Text style={styles.countryText}>+92</Text></View><TextInput value={phone} onChangeText={(value) => setPhone(normalizePakistaniMobile(value))} placeholder="3XX XXX XXXX" placeholderTextColor="#98A49A" keyboardType="phone-pad" returnKeyType="done" autoFocus style={styles.phoneInput} /></View>
          <Text style={styles.helper}>We’ll send a one-time verification code to this number.</Text>
        </View>
        <View style={styles.footer}><Pressable accessibilityRole="button" disabled={!isValid} onPress={() => router.push(`/auth/verify?phone=${phone}` as never)} style={({ pressed }) => [styles.action, !isValid && styles.actionDisabled, pressed && isValid && styles.pressed]}><Text style={styles.actionText}>Send verification code</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 20 },
  top: { paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 14 },
  step: { flex: 1, flexDirection: "row", gap: 5 },
  stepActive: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#168A4A" },
  stepInactive: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#E1E7E0" },
  stepText: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 0.7, fontWeight: "900" },
  content: { flex: 1, paddingTop: 62 },
  icon: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F4E7" },
  title: { marginTop: 23, color: "#17251D", fontSize: 29, lineHeight: 35, fontWeight: "900", letterSpacing: -0.7 },
  subtitle: { marginTop: 10, color: "#6C7A70", fontSize: 15, lineHeight: 21, fontWeight: "600", maxWidth: 335 },
  label: { marginTop: 32, color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" },
  phoneRow: { marginTop: 8, flexDirection: "row", gap: 10 },
  country: { width: 74, height: 54, borderRadius: 16, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6E2C4" },
  countryText: { color: "#064B2C", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  phoneInput: { flex: 1, height: 54, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE3DA", paddingHorizontal: 14, color: "#17251D", fontSize: 16, lineHeight: 20, fontWeight: "800" },
  helper: { marginTop: 9, color: "#748077", fontSize: 11, lineHeight: 16, fontWeight: "600" },
  footer: { paddingBottom: 20 },
  action: { height: 56, borderRadius: 17, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  actionDisabled: { backgroundColor: "#A9B7AB" },
  actionText: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  loading: { flex: 1, backgroundColor: "#FFF8ED", alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" },
});
