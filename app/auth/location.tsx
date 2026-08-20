import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import * as Location from "expo-location";

import { AuthInput, OnboardingFrame, PrimaryButton, onboardingStyles } from "@/components/onboarding-ui";
import { formatDeliveryAddress } from "@/lib/customer-onboarding";
import { useAuth } from "@/hooks/use-auth";
import { useKhanaStore } from "@/lib/khana-store";

export default function DeliveryLocationScreen() {
  const params = useLocalSearchParams<{ phone?: string; name?: string }>();
  const [address, setAddress] = useState("");
  const [locationState, setLocationState] = useState<"idle" | "loading" | "denied" | "ready">("idle");
  const { user } = useAuth();
  const { completeCustomerOnboarding } = useKhanaStore();
  const isReady = address.trim().length >= 3;

  const saveAndContinue = () => {
    if (!isReady) return;
    completeCustomerOnboarding({
      name: user?.name ?? params.name ?? "Customer",
      phone: params.phone ?? "",
      deliveryAddress: formatDeliveryAddress(address),
    });
    router.replace("/(tabs)" as never);
  };

  const useCurrentLocation = async () => {
    setLocationState("loading");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationState("denied");
        return;
      }
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const placemarks = await Location.reverseGeocodeAsync({ latitude: current.coords.latitude, longitude: current.coords.longitude });
      const place = placemarks[0];
      const resolved = [place?.name, place?.street, place?.district, place?.city].filter(Boolean).join(", ");
      setAddress(resolved || `Pinned location ${current.coords.latitude.toFixed(4)}, ${current.coords.longitude.toFixed(4)}`);
      setLocationState("ready");
    } catch {
      setLocationState("denied");
    }
  };

  return (
    <OnboardingFrame step={4} title="Where should we deliver?" subtitle="Turn on location to see nearby restaurants and accurate delivery fees." onBack={() => router.back()}>
      <PrimaryButton label={locationState === "loading" ? "Finding your location…" : "Use my current location"} disabled={locationState === "loading"} onPress={useCurrentLocation} icon="my-location" />
      {locationState === "denied" ? <View style={[onboardingStyles.callout, { backgroundColor: "#FCE8E6" }]}><MaterialIcons name="location-off" size={21} color="#B04336" /><Text style={[onboardingStyles.calloutText, { color: "#8A352C" }]}>Location access was not enabled. Enter your delivery area manually below.</Text></View> : null}
      {locationState === "ready" ? <View style={[onboardingStyles.callout, { backgroundColor: "#E0F4E7" }]}><MaterialIcons name="my-location" size={21} color="#17683A" /><Text style={[onboardingStyles.calloutText, { color: "#17683A" }]}>Location added. You can adjust the delivery area before saving.</Text></View> : null}
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
