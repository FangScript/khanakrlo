import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { getPostGoogleRegistrationDestination } from "@/lib/registration-routing";
import { consumeSupabaseCallback } from "@/lib/supabase-auth";

export default function SupabaseCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string }>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        const query = new URLSearchParams();
        if (params.code) query.set("code", params.code);
        if (params.error) query.set("error", params.error);
        if (params.error_description) query.set("error_description", params.error_description);
        await consumeSupabaseCallback(initialUrl ?? Linking.createURL(`auth/supabase-callback?${query.toString()}`));
        if (active) router.replace(getPostGoogleRegistrationDestination() as never);
      } catch (caught) { if (active) setError(caught instanceof Error ? caught.message : "Could not complete Google sign-in."); }
    })();
    return () => { active = false; };
  }, [params.code, params.error, params.error_description]);
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}>{error ? <><Text style={styles.title}>Sign-in could not finish</Text><Text style={styles.copy}>{error}</Text></> : <><ActivityIndicator color="#168A4A" size="large" /><Text style={styles.title}>Completing Google sign-in…</Text><Text style={styles.copy}>Please keep Khana KarLo open for a moment.</Text></>}</View></ScreenContainer>;
}
const styles = StyleSheet.create({ screen: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: "#FFF8ED" }, title: { marginTop: 18, color: "#17251D", fontSize: 20, lineHeight: 26, fontWeight: "900", textAlign: "center" }, copy: { marginTop: 8, color: "#66766B", fontSize: 13, lineHeight: 19, fontWeight: "600", textAlign: "center" } });
