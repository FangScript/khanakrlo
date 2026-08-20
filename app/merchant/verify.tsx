import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { MerchantScreen, merchantStyles } from "@/components/merchant-ui";
import { useMerchantStore } from "@/lib/merchant-store";

export default function MerchantVerifyScreen() {
  const { phone = "" } = useLocalSearchParams<{ phone?: string }>();
  const [code, setCode] = useState("");
  const { completeMerchantSignIn } = useMerchantStore();
  const formattedPhone = useMemo(() => `+92 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`.trim(), [phone]);

  const verify = () => {
    if (code.length !== 6) return;
    completeMerchantSignIn(phone);
    router.replace("/merchant/orders" as never);
  };

  return (
    <MerchantScreen>
      <ScrollView contentContainerStyle={merchantStyles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={merchantStyles.authBrand}>
          <View style={merchantStyles.authBadge}><MaterialIcons name="verified-user" size={34} color="#FFFFFF" /></View>
          <Text style={merchantStyles.authEyebrow}>OUTLET VERIFICATION</Text>
          <Text style={merchantStyles.authTitle}>Confirm your access.</Text>
          <Text style={merchantStyles.authSubtitle}>Enter the six-digit code sent to {formattedPhone}.</Text>
        </View>

        <TextInput
          accessibilityLabel="Merchant verification code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
          placeholder="—  —  —  —  —  —"
          placeholderTextColor="#9DA8A0"
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={merchantStyles.codeInput}
        />
        <Text style={merchantStyles.verifyHint}>Preview mode: use any 6 digits</Text>

        <View style={merchantStyles.authFooter}>
          <Pressable
            accessibilityRole="button"
            disabled={code.length !== 6}
            onPress={verify}
            style={({ pressed }) => [merchantStyles.action, { alignSelf: "stretch", width: "100%" }, code.length !== 6 && merchantStyles.actionDisabled, pressed && code.length === 6 && merchantStyles.actionPressed]}
          >
            <Text style={merchantStyles.actionText}>Open Live Orders</Text>
            <MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ marginTop: 18, padding: 8 }}><Text style={merchantStyles.customerLink}>Use a different number</Text></Pressable>
        </View>
      </ScrollView>
    </MerchantScreen>
  );
}
