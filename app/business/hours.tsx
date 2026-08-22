import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import type { BusinessHoursWindow } from "@/shared/business-hours";
import { trpc } from "@/lib/trpc";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_HOURS: BusinessHoursWindow[] = DAYS.map((_, weekday) => ({ weekday, opensAt: "09:00", closesAt: "23:00", isClosed: false }));

export default function BusinessHoursScreen() {
  const hoursQuery = trpc.businessOperations.businessHours.useQuery(undefined, { retry: false });
  const updateHours = trpc.businessOperations.updateBusinessHours.useMutation({ onSuccess: () => void hoursQuery.refetch() });
  const [hours, setHours] = useState<BusinessHoursWindow[]>(DEFAULT_HOURS);

  useEffect(() => {
    if (hoursQuery.data) setHours(hoursQuery.data as BusinessHoursWindow[]);
  }, [hoursQuery.data]);

  function updateDay(weekday: number, patch: Partial<BusinessHoursWindow>) {
    setHours((current) => current.map((day) => day.weekday === weekday ? { ...day, ...patch } : day));
  }

  async function save() {
    try {
      await updateHours.mutateAsync({ hours });
      Alert.alert("Operating hours saved", "Customer discovery and checkout now use this Pakistan time schedule.");
    } catch (error) {
      Alert.alert("Could not save operating hours", error instanceof Error ? error.message : "Check the time entries and try again.");
    }
  }

  if (hoursQuery.isLoading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><ActivityIndicator color="#168A4A" /><Text style={styles.muted}>Loading your operating hours…</Text></View></ScreenContainer>;
  if (hoursQuery.error) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><MaterialIcons name="storefront" size={28} color="#064B2C" /><Text style={styles.errorTitle}>Business setup required</Text><Text style={styles.muted}>Complete your direct Business setup to update the customer ordering schedule.</Text></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><ScreenBack title="Operating hours" /><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><Text style={styles.title}>Weekly customer schedule</Text><Text style={styles.subtitle}>Set the times customers can discover your menu and place orders. Times use Pakistan Standard Time (PKT). A closing time earlier than opening time runs past midnight.</Text><View style={styles.card}>{hours.map((day) => <View key={day.weekday} style={styles.day}><View style={styles.dayHeader}><View><Text style={styles.dayName}>{DAYS[day.weekday]}</Text><Text style={styles.dayState}>{day.isClosed ? "Closed" : "Accepting orders"}</Text></View><Switch value={!day.isClosed} onValueChange={(isOpen) => updateDay(day.weekday, { isClosed: !isOpen, opensAt: isOpen ? day.opensAt ?? "09:00" : null, closesAt: isOpen ? day.closesAt ?? "23:00" : null })} trackColor={{ false: "#D8DDD8", true: "#9EDAB0" }} thumbColor={!day.isClosed ? "#168A4A" : "#FFFFFF"} /></View>{!day.isClosed ? <View style={styles.timeRow}><TimeField label="Opens" value={day.opensAt ?? ""} onChangeText={(opensAt) => updateDay(day.weekday, { opensAt })} /><MaterialIcons name="arrow-forward" size={18} color="#829086" style={styles.arrow} /><TimeField label="Closes" value={day.closesAt ?? ""} onChangeText={(closesAt) => updateDay(day.weekday, { closesAt })} /></View> : null}</View>)}</View><View style={styles.note}><MaterialIcons name="info-outline" size={18} color="#934403" /><Text style={styles.noteText}>Changes are stored against your approved Business scope, recorded in the audit trail, and published for discovery and ordering checks.</Text></View><Pressable disabled={updateHours.isPending} onPress={() => void save()} style={({ pressed }) => [styles.save, pressed && styles.pressed, updateHours.isPending && styles.disabled]}>{updateHours.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><MaterialIcons name="save" size={18} color="#FFFFFF" /><Text style={styles.saveText}>Save operating hours</Text></>}</Pressable></ScrollView></View></ScreenContainer>;
}

function TimeField({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.timeField}><Text style={styles.timeLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder="09:00" placeholderTextColor="#9AA69E" keyboardType="numbers-and-punctuation" returnKeyType="done" maxLength={5} style={styles.timeInput} /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 }, content: { paddingBottom: 28 }, center: { flex: 1, paddingHorizontal: 30, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF8ED", gap: 10 }, title: { marginTop: 14, color: "#17251D", fontSize: 24, fontWeight: "900" }, subtitle: { marginTop: 5, color: "#66766B", fontSize: 11, lineHeight: 17, fontWeight: "600" }, card: { marginTop: 19, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E9E0", overflow: "hidden" }, day: { paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#EDF0EC" }, dayHeader: { minHeight: 36, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, dayName: { color: "#17251D", fontSize: 13, fontWeight: "900" }, dayState: { marginTop: 2, color: "#6C7A70", fontSize: 10, fontWeight: "700" }, timeRow: { marginTop: 11, flexDirection: "row", alignItems: "flex-end", gap: 9 }, timeField: { flex: 1 }, timeLabel: { marginBottom: 5, color: "#526158", fontSize: 9, fontWeight: "900" }, timeInput: { height: 42, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#FBFCFA", borderWidth: 1, borderColor: "#DDE5DC", color: "#17251D", fontSize: 12, fontWeight: "800" }, arrow: { marginBottom: 12 }, note: { marginTop: 14, padding: 11, borderRadius: 13, backgroundColor: "#FFF0E6", flexDirection: "row", gap: 8, alignItems: "flex-start" }, noteText: { flex: 1, color: "#934403", fontSize: 9, lineHeight: 13, fontWeight: "700" }, save: { marginTop: 14, minHeight: 46, borderRadius: 14, backgroundColor: "#064B2C", flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" }, saveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" }, muted: { color: "#66766B", fontSize: 11, lineHeight: 16, textAlign: "center", fontWeight: "600" }, errorTitle: { color: "#17251D", fontSize: 17, fontWeight: "900" }, pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] }, disabled: { opacity: 0.6 },
});
