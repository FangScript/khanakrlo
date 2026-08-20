import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { MerchantScreen, merchantStyles } from "@/components/merchant-ui";
import { isValidPakistaniMobile, normalizePakistaniMobile } from "@/lib/customer-onboarding";

export default function MerchantWelcomeScreen() {
  const [phone, setPhone] = useState("");
  const valid = isValidPakistaniMobile(phone);

  return (
    <MerchantScreen>
      <ScrollView contentContainerStyle={merchantStyles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={merchantStyles.authBrand}>
          <View style={merchantStyles.authBadge}><MaterialIcons name="storefront" size={34} color="#FFFFFF" /></View>
          <Text style={merchantStyles.authEyebrow}>KHANA KARLO FOR RESTAURANTS</Text>
          <Text style={merchantStyles.authTitle}>Run every order with confidence.</Text>
          <Text style={merchantStyles.authSubtitle}>Sign in to your outlet and keep the kitchen moving from one operational queue.</Text>
        </View>

        <View style={merchantStyles.authCard}>
          <Text style={merchantStyles.fieldLabel}>Outlet phone number</Text>
          <View style={merchantStyles.phoneRow}>
            <View style={merchantStyles.country}><Text style={merchantStyles.countryText}>+92</Text></View>
            <TextInput
              value={phone}
              onChangeText={(value) => setPhone(normalizePakistaniMobile(value))}
              placeholder="3XX XXX XXXX"
              placeholderTextColor="#98A49A"
              keyboardType="phone-pad"
              returnKeyType="done"
              autoFocus
              style={merchantStyles.phoneInput}
            />
          </View>
          <Text style={merchantStyles.helper}>Use the number registered for your restaurant or cloud kitchen.</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!valid}
            onPress={() => router.push(`/merchant/verify?phone=${phone}` as never)}
            style={({ pressed }) => [merchantStyles.action, !valid && merchantStyles.actionDisabled, pressed && valid && merchantStyles.actionPressed]}
          >
            <Text style={merchantStyles.actionText}>Continue to verification</Text>
            <MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={merchantStyles.authFooter}>
          <Pressable accessibilityRole="button" onPress={() => router.replace("/(tabs)" as never)}><Text style={merchantStyles.customerLink}>Looking for the customer app?</Text></Pressable>
          <Text style={merchantStyles.legal}>Merchant access is protected by one-time verification and outlet-level permissions.</Text>
        </View>
      </ScrollView>
    </MerchantScreen>
  );
}
