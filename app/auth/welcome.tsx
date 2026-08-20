import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthInput, OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";
import { isValidPakistaniMobile, normalizePakistaniMobile } from "@/lib/customer-onboarding";

export default function WelcomeScreen() {
  const [phone, setPhone] = useState("");
  const isValidPhone = isValidPakistaniMobile(phone);

  return (
    <OnboardingFrame step={1} title="Your next meal is close." subtitle="Enter your mobile number to find the restaurants that deliver to you.">
      <View style={onboardingStyles.phoneRow}>
        <View style={onboardingStyles.countryCode}><Text style={onboardingStyles.countryCodeText}>+92</Text></View>
        <View style={onboardingStyles.flexField}>
          <AuthInput
            label="Mobile number"
            value={phone}
            onChangeText={(value) => setPhone(normalizePakistaniMobile(value))}
            placeholder="3XX XXX XXXX"
            keyboardType="phone-pad"
            returnKeyType="done"
            autoFocus
            helper="We’ll send a one-time verification code."
          />
        </View>
      </View>

      <View style={onboardingStyles.callout}>
        <MaterialIcons name="verified-user" size={21} color="#B66A00" />
        <Text style={onboardingStyles.calloutText}>Your number helps us confirm delivery details and keep every order easy to find.</Text>
      </View>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label="Continue with phone" disabled={!isValidPhone} onPress={() => router.push(`/auth/verify?phone=${phone}` as never)} />
        <Text style={onboardingStyles.legalText}>By continuing, you agree to Khana KarLo’s Terms of Service and Privacy Policy.</Text>
      </View>
    </OnboardingFrame>
  );
}
