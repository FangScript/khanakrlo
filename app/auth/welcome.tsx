import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";
import { getPostGoogleRegistrationDestination, parseAuthReturnDestination } from "@/lib/registration-routing";
import { getRedirectUri, signInWithGoogle } from "@/lib/supabase-auth";

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [signingIn, setSigningIn] = useState(false);
  const returnTo = parseAuthReturnDestination(params.returnTo);
  const activeRedirectUri = getRedirectUri();

  const signIn = async () => {
    try {
      setSigningIn(true);
      const result = await signInWithGoogle();
      if (result === "authenticated") router.replace(getPostGoogleRegistrationDestination(returnTo) as never);
    } catch (error) {
      Alert.alert("Google sign-in unavailable", error instanceof Error ? error.message : "Please check your connection and try again.");
    } finally {
      setSigningIn(false);
    }
  };
  return (
    <OnboardingFrame step={1} title="Your next meal is close." subtitle="Sign in with Google to save your orders, addresses, and workspace access in one Khana KarLo account.">
      <View style={onboardingStyles.callout}>
        <Text style={onboardingStyles.calloutText}>Mobile numbers are optional post-sign-in contact details. They are not used to authenticate your account.</Text>
      </View>
      <View style={onboardingStyles.footer}>
        <PrimaryButton label={signingIn ? "Opening Google…" : "Continue with Google"} disabled={signingIn} onPress={() => void signIn()} icon={signingIn ? undefined : "arrow-forward"} />
        {signingIn ? <View style={{ marginTop: 12, alignItems: "center" }}><ActivityIndicator color="#168A4A" /></View> : null}
        {__DEV__ ? (
          <View style={{ marginTop: 10, padding: 8, backgroundColor: "rgba(0,0,0,0.06)", borderRadius: 8 }}>
            <Text style={{ fontSize: 10, color: "#667", textAlign: "center", fontWeight: "600" }}>
              Must match Supabase Redirect URLs:
            </Text>
            <Text selectable style={{ fontSize: 10, color: "#168A4A", fontWeight: "800", textAlign: "center", marginTop: 2 }}>
              {activeRedirectUri}
            </Text>
          </View>
        ) : null}
        <Text style={onboardingStyles.legalText}>By continuing, you agree to Khana KarLo’s Terms of Service and Privacy Policy.</Text>
      </View>
    </OnboardingFrame>
  );
}
