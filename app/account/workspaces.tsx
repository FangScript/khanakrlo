import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import type { BusinessType, WorkspaceApplicationType, WorkspaceAvailabilityStatus, WorkspaceType } from "@/shared/workspace";

type WorkspaceCard = {
  workspaceType: WorkspaceType;
  status: WorkspaceAvailabilityStatus;
  applicationId: number | null;
  displayName: string | null;
  businessType: BusinessType | null;
  reviewNote: string | null;
};

const labelForStatus: Record<WorkspaceAvailabilityStatus, string> = {
  active: "Active",
  suspended: "Unavailable",
  not_started: "Not started",
  draft: "Draft saved",
  submitted: "Under review",
  changes_required: "Action needed",
  approved: "Approved",
};

const statusColors: Record<WorkspaceAvailabilityStatus, { bg: string; text: string }> = {
  active: { bg: "#E0F4E7", text: "#17683A" },
  suspended: { bg: "#FCE3DF", text: "#B13F2D" },
  not_started: { bg: "#EDF0EC", text: "#647168" },
  draft: { bg: "#FFF1DA", text: "#9E5B00" },
  submitted: { bg: "#EAF1FF", text: "#2E5EA7" },
  changes_required: { bg: "#FFF1DA", text: "#9E5B00" },
  approved: { bg: "#E0F4E7", text: "#17683A" },
};

export default function WorkspacesScreen() {
  const workspaceQuery = trpc.workspace.mine.useQuery(undefined, { retry: false });
  const saveApplication = trpc.workspace.saveApplication.useMutation({ onSuccess: () => workspaceQuery.refetch() });
  const [applyingFor, setApplyingFor] = useState<WorkspaceApplicationType | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("restaurant");
  const [displayName, setDisplayName] = useState("");
  const [phoneE164, setPhoneE164] = useState("");
  const [city, setCity] = useState("");

  const cards = useMemo(() => (workspaceQuery.data ?? []) as WorkspaceCard[], [workspaceQuery.data]);
  const isUnauthenticated = workspaceQuery.error?.data?.code === "UNAUTHORIZED" || workspaceQuery.error?.message?.toLowerCase().includes("unauthorized");

  const startApplication = (workspaceType: WorkspaceApplicationType, card?: WorkspaceCard) => {
    setApplyingFor(workspaceType);
    setBusinessType(card?.businessType ?? "restaurant");
    setDisplayName(card?.displayName ?? "");
    setPhoneE164("");
    setCity("");
  };

  const submit = async (submitForReview: boolean) => {
    if (!applyingFor) return;
    try {
      await saveApplication.mutateAsync({ workspaceType: applyingFor, businessType: applyingFor === "business" ? businessType : undefined, displayName, phoneE164, city, submit: submitForReview });
      setApplyingFor(null);
      Alert.alert(submitForReview ? "Application submitted" : "Draft saved", submitForReview ? "Khana KarLo operations will review your workspace application." : "You can continue your application from Workspaces at any time.");
    } catch (error) {
      Alert.alert("Could not save application", error instanceof Error ? error.message : "Please try again.");
    }
  };

  if (workspaceQuery.isLoading) return <ScreenContainer><View style={styles.loading}><ActivityIndicator color="#168A4A" /><Text style={styles.loadingText}>Loading your workspaces…</Text></View></ScreenContainer>;

  if (isUnauthenticated) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.emptyScreen}><View style={styles.lockIcon}><MaterialIcons name="lock" size={27} color="#064B2C" /></View><Text style={styles.emptyTitle}>Sign in to manage workspaces</Text><Text style={styles.emptyCopy}>Use one Khana KarLo account for Customer, Business, and Rider access. Business and Rider workspaces become active after approval.</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/auth/login" as never)} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}><Text style={styles.primaryText}>Sign in to continue</Text><MaterialIcons name="arrow-forward" size={19} color="#FFFFFF" /></Pressable></View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.header}><Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><View><Text style={styles.kicker}>ONE ACCOUNT</Text><Text style={styles.title}>Your workspaces</Text></View></View><Text style={styles.intro}>Customer access is ready by default. Apply for Business or Rider access when you are ready to operate with Khana KarLo.</Text>{cards.map((card) => <WorkspaceCardView key={card.workspaceType} card={card} onApply={() => startApplication(card.workspaceType as WorkspaceApplicationType, card)} />)}{applyingFor ? <ApplicationForm workspaceType={applyingFor} businessType={businessType} onBusinessType={setBusinessType} displayName={displayName} onDisplayName={setDisplayName} phoneE164={phoneE164} onPhoneE164={setPhoneE164} city={city} onCity={setCity} submitting={saveApplication.isPending} onSave={() => submit(false)} onSubmit={() => submit(true)} onClose={() => setApplyingFor(null)} /> : null}</ScrollView></ScreenContainer>;
}

function WorkspaceCardView({ card, onApply }: { card: WorkspaceCard; onApply: () => void }) {
  const palette = statusColors[card.status];
  const isBusiness = card.workspaceType === "business";
  const title = card.workspaceType === "customer" ? "Customer" : isBusiness ? "Khana KarLo Business" : "Become a Rider";
  const description = card.workspaceType === "customer" ? "Order, track deliveries, and manage your account." : isBusiness ? "Run a Restaurant or Cloud Kitchen after verification." : "Deliver orders after your rider application is approved.";
  const icon = card.workspaceType === "customer" ? "restaurant" : isBusiness ? "storefront" : "directions-bike";
  const isActive = card.status === "active";
  const canApply = card.workspaceType !== "customer" && ["not_started", "draft", "changes_required"].includes(card.status);
  const openWorkspace = () => {
    if (card.workspaceType === "customer") router.replace("/(tabs)" as never);
    else if (card.workspaceType === "business") router.push("/merchant/orders" as never);
    else router.push("/rider" as never);
  };
  return <View style={[styles.workspaceCard, isActive && styles.workspaceCardActive]}><View style={styles.workspaceTop}><View style={[styles.workspaceIcon, isActive && styles.workspaceIconActive]}><MaterialIcons name={icon} size={23} color={isActive ? "#FFFFFF" : "#064B2C"} /></View><View style={styles.workspaceCopy}><Text style={styles.workspaceTitle}>{title}</Text><Text style={styles.workspaceDescription}>{description}</Text></View></View><View style={styles.cardFooter}><View style={[styles.statusPill, { backgroundColor: palette.bg }]}><Text style={[styles.statusText, { color: palette.text }]}>{labelForStatus[card.status].toUpperCase()}</Text></View>{isActive ? <Pressable accessibilityRole="button" onPress={openWorkspace} style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}><Text style={styles.openText}>Open</Text><MaterialIcons name="arrow-forward" size={16} color="#FFFFFF" /></Pressable> : canApply ? <Pressable accessibilityRole="button" onPress={onApply} style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}><Text style={styles.applyText}>{card.status === "not_started" ? "Apply" : "Continue"}</Text><MaterialIcons name="arrow-forward" size={16} color="#064B2C" /></Pressable> : <Text style={styles.waitText}>{card.reviewNote || "Khana KarLo operations will update this application."}</Text>}</View></View>;
}

function ApplicationForm({ workspaceType, businessType, onBusinessType, displayName, onDisplayName, phoneE164, onPhoneE164, city, onCity, submitting, onSave, onSubmit, onClose }: { workspaceType: WorkspaceApplicationType; businessType: BusinessType; onBusinessType: (type: BusinessType) => void; displayName: string; onDisplayName: (value: string) => void; phoneE164: string; onPhoneE164: (value: string) => void; city: string; onCity: (value: string) => void; submitting: boolean; onSave: () => void; onSubmit: () => void; onClose: () => void }) {
  const isBusiness = workspaceType === "business";
  return <View style={styles.form}><View style={styles.formHeader}><View><Text style={styles.formKicker}>{isBusiness ? "KHANA KARLO BUSINESS" : "RIDER APPLICATION"}</Text><Text style={styles.formTitle}>{isBusiness ? "Start your business application" : "Start your rider application"}</Text></View><Pressable accessibilityRole="button" onPress={onClose} style={styles.close}><MaterialIcons name="close" size={20} color="#064B2C" /></Pressable></View><Text style={styles.formCopy}>Save a draft any time. Submitted applications are reviewed before this workspace becomes active.</Text>{isBusiness ? <View style={styles.typeRow}>{(["restaurant", "cloud_kitchen"] as BusinessType[]).map((type) => <Pressable key={type} accessibilityRole="radio" accessibilityState={{ checked: businessType === type }} onPress={() => onBusinessType(type)} style={[styles.typeOption, businessType === type && styles.typeOptionActive]}><MaterialIcons name={type === "restaurant" ? "storefront" : "kitchen"} size={18} color={businessType === type ? "#FFFFFF" : "#064B2C"} /><Text style={[styles.typeText, businessType === type && styles.typeTextActive]}>{type === "restaurant" ? "Restaurant" : "Cloud Kitchen"}</Text></Pressable>)}</View> : null}<Field label={isBusiness ? "Business name" : "Your legal name"} value={displayName} onChangeText={onDisplayName} placeholder={isBusiness ? "e.g. Lahori Dera" : "e.g. Saad Ahmed"} /><Field label="Verified phone" value={phoneE164} onChangeText={onPhoneE164} placeholder="+923001234567" keyboardType="phone-pad" /><Field label="Primary city" value={city} onChangeText={onCity} placeholder="e.g. Islamabad" /><View style={styles.formActions}><Pressable accessibilityRole="button" disabled={submitting} onPress={onSave} style={({ pressed }) => [styles.draftButton, pressed && styles.pressed]}><Text style={styles.draftText}>Save draft</Text></Pressable><Pressable accessibilityRole="button" disabled={submitting} onPress={onSubmit} style={({ pressed }) => [styles.submitButton, pressed && styles.pressed]}>{submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><Text style={styles.submitText}>Submit for review</Text><MaterialIcons name="arrow-forward" size={17} color="#FFFFFF" /></>}</Pressable></View></View>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "phone-pad" }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA59E" keyboardType={keyboardType} autoCapitalize={keyboardType === "default" ? "words" : "none"} style={styles.input} /></View>;
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 42, backgroundColor: "#FFF8ED" }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#FFF8ED" }, loadingText: { color: "#6C7A70", fontSize: 13, lineHeight: 18, fontWeight: "700" }, emptyScreen: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF8ED" }, lockIcon: { width: 57, height: 57, borderRadius: 19, backgroundColor: "#E0F4E7", alignItems: "center", justifyContent: "center" }, emptyTitle: { marginTop: 17, color: "#17251D", fontSize: 21, lineHeight: 26, fontWeight: "900", textAlign: "center" }, emptyCopy: { marginTop: 8, maxWidth: 300, color: "#66746B", fontSize: 13, lineHeight: 19, textAlign: "center", fontWeight: "600" }, primaryButton: { marginTop: 22, height: 52, paddingHorizontal: 18, borderRadius: 16, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryText: { color: "#FFFFFF", fontSize: 13, lineHeight: 17, fontWeight: "900" }, header: { flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, kicker: { color: "#168A4A", fontSize: 9, lineHeight: 12, letterSpacing: 0.8, fontWeight: "900" }, title: { marginTop: 2, color: "#17251D", fontSize: 22, lineHeight: 27, fontWeight: "900" }, intro: { marginTop: 18, marginBottom: 15, color: "#607067", fontSize: 13, lineHeight: 19, fontWeight: "600" }, workspaceCard: { marginBottom: 11, padding: 14, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E7E8E2" }, workspaceCardActive: { borderColor: "#B6E2C4", backgroundColor: "#FCFFFC" }, workspaceTop: { flexDirection: "row", gap: 10 }, workspaceIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, workspaceIconActive: { backgroundColor: "#168A4A" }, workspaceCopy: { flex: 1 }, workspaceTitle: { color: "#17251D", fontSize: 14, lineHeight: 18, fontWeight: "900" }, workspaceDescription: { marginTop: 3, color: "#6C7A70", fontSize: 10, lineHeight: 14, fontWeight: "600" }, cardFooter: { marginTop: 13, paddingTop: 11, borderTopWidth: 1, borderTopColor: "#EDF0EC", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }, statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }, statusText: { fontSize: 8, lineHeight: 10, letterSpacing: 0.55, fontWeight: "900" }, openButton: { height: 33, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", gap: 4 }, openText: { color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "900" }, applyButton: { height: 33, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#E0F4E7", flexDirection: "row", alignItems: "center", gap: 4 }, applyText: { color: "#064B2C", fontSize: 11, lineHeight: 14, fontWeight: "900" }, waitText: { flex: 1, color: "#7B877E", fontSize: 9, lineHeight: 13, fontWeight: "700", textAlign: "right" }, form: { marginTop: 7, padding: 15, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#B6E2C4" }, formHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, formKicker: { color: "#168A4A", fontSize: 9, lineHeight: 12, letterSpacing: 0.7, fontWeight: "900" }, formTitle: { marginTop: 3, color: "#17251D", fontSize: 15, lineHeight: 19, fontWeight: "900" }, close: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" }, formCopy: { marginTop: 8, color: "#6C7A70", fontSize: 11, lineHeight: 16, fontWeight: "600" }, typeRow: { marginTop: 14, flexDirection: "row", gap: 8 }, typeOption: { flex: 1, minHeight: 46, borderRadius: 13, backgroundColor: "#F1F5F0", alignItems: "center", justifyContent: "center", gap: 4, flexDirection: "row" }, typeOptionActive: { backgroundColor: "#064B2C" }, typeText: { color: "#064B2C", fontSize: 10, lineHeight: 13, fontWeight: "900" }, typeTextActive: { color: "#FFFFFF" }, field: { marginTop: 13 }, fieldLabel: { marginBottom: 6, color: "#4B5A50", fontSize: 10, lineHeight: 13, letterSpacing: 0.25, fontWeight: "900" }, input: { height: 46, paddingHorizontal: 12, borderRadius: 13, borderWidth: 1, borderColor: "#DDE4DD", backgroundColor: "#FBFCFA", color: "#17251D", fontSize: 13, lineHeight: 17, fontWeight: "700" }, formActions: { marginTop: 17, flexDirection: "row", gap: 9 }, draftButton: { height: 48, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: "#DDE4DD", alignItems: "center", justifyContent: "center" }, draftText: { color: "#526158", fontSize: 11, lineHeight: 14, fontWeight: "900" }, submitButton: { flex: 1, height: 48, borderRadius: 14, backgroundColor: "#064B2C", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, submitText: { color: "#FFFFFF", fontSize: 11, lineHeight: 14, fontWeight: "900" }, pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
