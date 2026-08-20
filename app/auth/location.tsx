import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthInput, OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";
import { formatDeliveryAddress } from "@/lib/customer-onboarding";
import { useKhanaStore } from "@/lib/khana-store";

export default function DeliveryLocationScreen() {
  const params = useLocalSearchParams<{ phone?: string; name?: string }>();
  const [address, setAddress] = useState("");
  const { completeCustomerOnboarding } = useKhanaStore();
  const isReady = address.trim().length >= 3;

  const saveAndContinue = () => {
    if (!isReady) return;
    completeCustomerOnboarding({
      name: params.name ?? "Customer",
      phone: params.phone ?? "",
      deliveryAddress: formatDeliveryAddress(address),
    });
    router.replace("/(tabs)" as never);
  };

  return (
    <OnboardingFrame step={4} title="Where should we deliver?" subtitle="Start with the place you order from most. You can add more addresses later." onBack={() => router.back()}>
      <View style={onboardingStyles.addressPanel}>
        <View style={onboardingStyles.addressPanelTop}>
          <View style={{ width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#E0F4E7" }}><MaterialIcons name="location-on" size={20} color="#064B2C" /></View>
          <View style={{ flex: 1 }}>
            <Text style={onboardingStyles.addressPanelTitle}>Delivery address</Text>
            <Text style={onboardingStyles.addressPanelSubtitle}>We currently deliver across Islamabad.</Text>
          </View>
        </View>
        <AuthInput
          label="Area, street, or landmark"
          value={address}
          onChangeText={setAddress}
          placeholder="e.g. F-10 Markaz"
          autoFocus
          autoCapitalize="words"
          returnKeyType="done"
          helper="You can add a house or apartment number at checkout."
        />
      </View>

      <View style={onboardingStyles.callout}>
        <MaterialIcons name="storefront" size={21} color="#B66A00" />
        <Text style={onboardingStyles.calloutText}>Your address lets us show delivery fees and restaurants that can reach you.</Text>
      </View>

      <View style={onboardingStyles.footer}>
        <PrimaryButton label="Save and find food" disabled={!isReady} onPress={saveAndContinue} icon="restaurant" />
      </View>
    </OnboardingFrame>
  );
}
