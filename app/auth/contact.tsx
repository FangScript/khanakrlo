import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { isValidPakistaniMobile, normalizePakistaniMobile } from "@/lib/customer-onboarding";
import { parseAuthReturnDestination } from "@/lib/registration-routing";
import { trpc } from "@/lib/trpc";

import { supabase } from "@/lib/supabase";

export default function ContactRegistrationScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const { user, loading } = useAuth();
  const [phone, setPhone] = useState("");
  const [contactConsent, setContactConsent] = useState(true);
  const returnTo = parseAuthReturnDestination(params.returnTo);
  const saveContact = trpc.account.saveContact.useMutation();
  useEffect(() => { if (!loading && !user) router.replace("/auth/login" as never); }, [loading, user]);
  if (loading) return <ScreenContainer><View style={styles.loading}><ActivityIndicator color="#168A4A" /><Text style={styles.loadingText}>Confirming your Google sign-in…</Text></View></ScreenContainer>;
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const cleanPhone = normalizePakistaniMobile(phone);
  const canContinue = !phone || isValidPakistaniMobile(cleanPhone);
  const continueToLocation = async () => {
    if (cleanPhone && !contactConsent) return Alert.alert("Consent required", "Confirm that Khana KarLo may use this number for active-order contact and delivery updates.");
    try {
      if (cleanPhone) {
        const phoneE164 = `+92${cleanPhone}`;
        console.log("[Contact] Saving phoneE164:", phoneE164);
        await saveContact.mutateAsync({ phoneE164, contactConsent: true });
        try {
          if (supabase) {
            await supabase.auth.updateUser({ data: { phone: phoneE164 } });
          }
        } catch (e) {
          console.warn("[Contact] Optional Supabase metadata update note:", e);
        }
      }
      const suffix = returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : "";
      router.push(`/auth/location?phone=${encodeURIComponent(cleanPhone)}${suffix}` as never);
    } catch (error) {
      console.error("[Contact] Failed to save contact:", error);
      Alert.alert("Could not save contact number", error instanceof Error ? error.message : "Please try again.");
    }
  };
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><View style={styles.top}><View style={styles.step}><View style={styles.stepActive} /><View style={styles.stepActive} /><View style={styles.stepInactive} /></View><Text style={styles.stepText}>STEP 2 OF 3</Text></View><View style={styles.content}><View style={styles.icon}><MaterialIcons name="phone-iphone" size={28} color="#064B2C" /></View><Text style={styles.title}>Contact for active orders, {firstName}.</Text><Text style={styles.subtitle}>Your Google account signs you in. Add a mobile number only if you want delivery updates and protected contact during an active order.</Text><Text style={styles.label}>Pakistan mobile number <Text style={styles.optional}>(optional)</Text></Text><View style={styles.phoneRow}><View style={styles.country}><Text style={styles.countryText}>+92</Text></View><TextInput value={phone} onChangeText={(value) => setPhone(normalizePakistaniMobile(value))} placeholder="3XX XXX XXXX" placeholderTextColor="#98A49A" keyboardType="phone-pad" returnKeyType="done" autoFocus style={styles.phoneInput} /></View><Text style={styles.helper}>{phone ? "This number is not used for sign-in or account recovery." : "You can add or update a mobile number later from your profile."}</Text>{phone ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: contactConsent }} onPress={() => setContactConsent((current) => !current)} style={({ pressed }) => [styles.consent, pressed && styles.pressed]}><MaterialIcons name={contactConsent ? "check-box" : "check-box-outline-blank"} size={22} color="#064B2C" /><Text style={styles.consentText}>I consent to Khana KarLo using this number for my delivery updates and order-scoped contact. It will not be shown publicly.</Text></Pressable> : null}</View><View style={styles.footer}><Pressable accessibilityRole="button" disabled={!canContinue || saveContact.isPending} onPress={() => void continueToLocation()} style={({ pressed }) => [styles.action, (!canContinue || saveContact.isPending) && styles.actionDisabled, pressed && canContinue && !saveContact.isPending && styles.pressed]}>{saveContact.isPending ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.actionText}>{phone ? "Continue" : "Skip for now"}</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></>}</Pressable></View></View></ScreenContainer>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 20 }, top: { paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 14 }, step: { flex: 1, flexDirection: "row", gap: 5 }, stepActive: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#168A4A" }, stepInactive: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#E1E7E0" }, stepText: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 0.7, fontWeight: "900" }, content: { flex: 1, paddingTop: 50 }, icon: { width: 62, height: 62, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F4E7" }, title: { marginTop: 23, color: "#17251D", fontSize: 28, lineHeight: 34, fontWeight: "900", letterSpacing: -0.7 }, subtitle: { marginTop: 10, color: "#6C7A70", fontSize: 14, lineHeight: 21, fontWeight: "600", maxWidth: 340 }, label: { marginTop: 28, color: "#17251D", fontSize: 12, lineHeight: 16, fontWeight: "900" }, optional: { color: "#748077", fontWeight: "700" }, phoneRow: { marginTop: 8, flexDirection: "row", gap: 10 }, country: { width: 74, height: 54, borderRadius: 16, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6E2C4" }, countryText: { color: "#064B2C", fontSize: 16, lineHeight: 20, fontWeight: "900" }, phoneInput: { flex: 1, height: 54, borderRadius: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE3DA", paddingHorizontal: 14, color: "#17251D", fontSize: 16, lineHeight: 20, fontWeight: "800" }, helper: { marginTop: 9, color: "#748077", fontSize: 11, lineHeight: 16, fontWeight: "600" }, consent: { marginTop: 18, padding: 13, borderRadius: 15, backgroundColor: "#EEF7F0", flexDirection: "row", gap: 10, alignItems: "flex-start" }, consentText: { flex: 1, color: "#365C41", fontSize: 11, lineHeight: 16, fontWeight: "700" }, footer: { paddingBottom: 20 }, action: { height: 56, borderRadius: 17, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, actionDisabled: { backgroundColor: "#A9B7AB" }, actionText: { color: "#FFFFFF", fontSize: 14, lineHeight: 18, fontWeight: "900" }, pressed: { transform: [{ scale: 0.98 }], opacity: 0.94 }, loading: { flex: 1, backgroundColor: "#FFF8ED", alignItems: "center", justifyContent: "center", gap: 12 }, loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" } });
