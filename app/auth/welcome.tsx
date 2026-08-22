import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

import { OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";
import { isValidPakistaniMobile, normalizePakistaniMobile } from "@/lib/customer-onboarding";
import { getPhoneVerificationDestination, parseAuthReturnDestination } from "@/lib/registration-routing";

export default function WelcomeScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const [phone, setPhone] = useState("");
  const isValidPhone = isValidPakistaniMobile(phone);
  const returnTo = parseAuthReturnDestination(params.returnTo);

  return (
    <OnboardingFrame step={1} title="Your next meal is close." subtitle="Enter your mobile number to find the restaurants that deliver to you.">
      <View style={onboardingStyles.phoneField}>
        <Text style={onboardingStyles.phoneLabel}>Mobile number</Text>
        <View style={onboardingStyles.phoneRow}>
          <View style={onboardingStyles.countryCode}><Text style={onboardingStyles.countryCodeText}>+92</Text></View>
          <TextInput
            value={phone}
            onChangeText={(value) => setPhone(normalizePakistaniMobile(value))}
            placeholder="3XX XXX XXXX"
            placeholderTextColor="#92A096"
            selectionColor="#168A4A"
            keyboardType="phone-pad"
            returnKeyType="done"
            autoFocus
            style={onboardingStyles.phoneInput}
          />
        </View>
        <Text style={onboardingStyles.phoneHelper}>We’ll send a one-time verification code.</Text>
      </View>

      <View style={onboardingStyles.callout}>
        <MaterialIcons name="verified-user" size={21} color="#B66A00" />
        <Text style={onboardingStyles.calloutText}>Your number helps us confirm delivery details and keep every order easy to find.</Text>
      </View>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label="Continue with phone" disabled={!isValidPhone} onPress={() => router.push(getPhoneVerificationDestination(phone, returnTo) as never)} />
        <Text style={onboardingStyles.legalText}>By continuing, you agree to Khana KarLo’s Terms of Service and Privacy Policy.</Text>
      </View>
    </OnboardingFrame>
  );
}
