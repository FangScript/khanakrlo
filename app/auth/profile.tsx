import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthInput, OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";

export default function ProfileBasicsScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const [name, setName] = useState("");
  const isValidName = name.trim().length >= 2;

  return (
    <OnboardingFrame step={3} title="What should we call you?" subtitle="A first name is all we need to keep your deliveries personal." onBack={() => router.back()}>
      <AuthInput
        label="First name"
        value={name}
        onChangeText={setName}
        placeholder="Your first name"
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        helper="You can update this any time from your account."
      />

      <View style={onboardingStyles.callout}>
        <MaterialIcons name="favorite" size={21} color="#B66A00" />
        <Text style={onboardingStyles.calloutText}>We’ll use your name only for account and delivery updates.</Text>
      </View>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label="Continue" disabled={!isValidName} onPress={() => router.push(`/auth/location?phone=${params.phone ?? ""}&name=${encodeURIComponent(name.trim())}` as never)} />
      </View>
    </OnboardingFrame>
  );
}
