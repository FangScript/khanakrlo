import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";

type OnboardingFrameProps = {
  step: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  onBack?: () => void;
};

export function OnboardingFrame({ step, title, subtitle, children, onBack }: OnboardingFrameProps) {
  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={onBack ? "Go back" : "Khana KarLo"}
              disabled={!onBack}
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, !onBack && styles.backButtonHidden, pressed && styles.pressed]}
            >
              <MaterialIcons name="arrow-back" size={21} color="#064B2C" />
            </Pressable>
            <Image source={require("@/assets/images/icon.png")} style={styles.logo} resizeMode="contain" />
            <Text style={styles.stepText}>STEP {step} OF 4</Text>
          </View>

          <View style={styles.progressTrack}>
            {[1, 2, 3, 4].map((item) => <View key={item} style={[styles.progressSegment, item <= step && styles.progressSegmentActive]} />)}
          </View>

          <View style={styles.copyBlock}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>

          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export function AuthInput({ label, helper, ...props }: TextInputProps & { label: string; helper?: string }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor="#92A096"
        selectionColor="#168A4A"
        style={styles.textInput}
        {...props}
      />
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled = false, icon = "arrow-forward" }: { label: string; onPress: () => void; disabled?: boolean; icon?: keyof typeof MaterialIcons.glyphMap }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, disabled && styles.primaryButtonDisabled, pressed && !disabled && styles.primaryPressed]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      <MaterialIcons name={icon} size={20} color="#FFF8ED" />
    </Pressable>
  );
}

export const onboardingStyles = StyleSheet.create({
  phoneRow: { flexDirection: "row", gap: 10, alignItems: "flex-end" },
  countryCode: { height: 54, minWidth: 78, paddingHorizontal: 14, borderRadius: 16, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#B6E2C4" },
  countryCodeText: { color: "#064B2C", fontSize: 16, lineHeight: 20, fontWeight: "900" },
  flexField: { flex: 1 },
  callout: { marginTop: 18, backgroundColor: "#FFF1DA", borderRadius: 16, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  calloutText: { flex: 1, color: "#6B4B12", fontSize: 12, lineHeight: 17, fontWeight: "600" },
  footer: { marginTop: "auto", paddingTop: 28 },
  legalText: { marginTop: 14, textAlign: "center", color: "#748077", fontSize: 11, lineHeight: 16, fontWeight: "600", paddingHorizontal: 16 },
  codeInput: { marginTop: 16, height: 68, borderWidth: 1.5, borderColor: "#B6E2C4", borderRadius: 18, backgroundColor: "#FFFFFF", color: "#17251D", fontSize: 28, lineHeight: 32, fontWeight: "900", letterSpacing: 10, textAlign: "center", paddingLeft: 10 },
  resend: { alignSelf: "center", marginTop: 20, padding: 8 },
  resendText: { color: "#168A4A", fontSize: 13, lineHeight: 17, fontWeight: "900" },
  demoBadge: { alignSelf: "center", marginTop: 15, backgroundColor: "#E0F4E7", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  demoBadgeText: { color: "#064B2C", fontSize: 11, lineHeight: 14, fontWeight: "800" },
  addressPanel: { marginTop: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2", borderRadius: 20, padding: 16 },
  addressPanelTop: { flexDirection: "row", gap: 10, alignItems: "center", marginBottom: 12 },
  addressPanelTitle: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" },
  addressPanelSubtitle: { color: "#6C7A70", fontSize: 12, lineHeight: 16, fontWeight: "600", marginTop: 2 },
});

const styles = StyleSheet.create({
  keyboardView: { flex: 1, backgroundColor: "#FFF8ED" },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 22 },
  topBar: { height: 50, alignItems: "center", justifyContent: "space-between", flexDirection: "row" },
  backButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E7E8E2" },
  backButtonHidden: { opacity: 0, pointerEvents: "none" },
  logo: { width: 42, height: 42 },
  stepText: { color: "#6C7A70", fontSize: 10, lineHeight: 13, letterSpacing: 0.8, fontWeight: "900" },
  progressTrack: { flexDirection: "row", gap: 6, marginTop: 10 },
  progressSegment: { height: 4, flex: 1, borderRadius: 4, backgroundColor: "#E6E9E2" },
  progressSegmentActive: { backgroundColor: "#168A4A" },
  copyBlock: { marginTop: 42, marginBottom: 27 },
  title: { color: "#17251D", fontSize: 31, lineHeight: 37, letterSpacing: -0.8, fontWeight: "900" },
  subtitle: { color: "#6C7A70", fontSize: 15, lineHeight: 21, fontWeight: "600", marginTop: 10, maxWidth: 330 },
  fieldBlock: { gap: 8 },
  fieldLabel: { color: "#17251D", fontSize: 12, lineHeight: 16, letterSpacing: 0.3, fontWeight: "900" },
  textInput: { height: 54, borderWidth: 1, borderColor: "#DCE3DA", borderRadius: 16, backgroundColor: "#FFFFFF", paddingHorizontal: 15, color: "#17251D", fontSize: 16, lineHeight: 20, fontWeight: "700" },
  helper: { color: "#748077", fontSize: 11, lineHeight: 16, fontWeight: "600" },
  primaryButton: { height: 56, borderRadius: 17, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, shadowColor: "#064B2C", shadowOpacity: 0.18, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  primaryButtonDisabled: { backgroundColor: "#A9B7AB", shadowOpacity: 0 },
  primaryPressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  primaryButtonText: { color: "#FFF8ED", fontSize: 15, lineHeight: 20, fontWeight: "900" },
  pressed: { opacity: 0.7 },
});
