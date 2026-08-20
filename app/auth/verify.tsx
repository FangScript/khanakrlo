import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";

export default function VerifyPhoneScreen() {
  const params = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const phone = params.phone ?? "";
  const formattedPhone = useMemo(() => `+92 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`.trim(), [phone]);

  return (
    <OnboardingFrame step={2} title="Confirm it’s you." subtitle={`We sent a 6-digit code to ${formattedPhone}.`} onBack={() => router.back()}>
      <View style={onboardingStyles.callout}>
        <MaterialIcons name="sms" size={21} color="#B66A00" />
        <Text style={onboardingStyles.calloutText}>Keep this screen open while your verification message arrives.</Text>
      </View>

      <TextInput
        accessibilityLabel="Verification code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        placeholder="—  —  —  —  —  —"
        placeholderTextColor="#9DA8A0"
        style={onboardingStyles.codeInput}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <Pressable accessibilityRole="button" onPress={() => setCode("")} style={({ pressed }) => [onboardingStyles.resend, pressed && { opacity: 0.65 }]}>
        <Text style={onboardingStyles.resendText}>{code.length === 6 ? "Edit code" : "Resend code in 00:25"}</Text>
      </Pressable>
      <View style={onboardingStyles.demoBadge}><Text style={onboardingStyles.demoBadgeText}>Preview mode: use any 6 digits</Text></View>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label="Verify number" disabled={code.length !== 6} onPress={() => router.replace(`/auth/profile?phone=${phone}` as never)} icon="check" />
      </View>
    </OnboardingFrame>
  );
}
