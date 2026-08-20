import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";

export function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(0.46)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => { if (active) setReduceMotion(enabled); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { opacity.setValue(0.62); return; }
    const animation = Animated.loop(Animated.sequence([Animated.timing(opacity, { toValue: 0.92, duration: 680, useNativeDriver: true }), Animated.timing(opacity, { toValue: 0.42, duration: 680, useNativeDriver: true })]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View accessible={false} pointerEvents="none" style={[styles.block, { opacity }, style]} />;
}

export function DiscoveryFeedSkeleton() {
  return <View accessibilityRole="progressbar" accessibilityLabel="Loading live kitchens" style={styles.discoveryList}><Text style={styles.loadingLabel}>Loading live kitchens near you</Text><DiscoveryCardSkeleton /><DiscoveryCardSkeleton kitchen /></View>;
}

export function DiscoveryCardSkeleton({ kitchen = false }: { kitchen?: boolean }) {
  return <View style={styles.discoveryCard}><View style={[styles.cardBand, kitchen && styles.cardBandKitchen]}><SkeletonBlock style={styles.icon} /><SkeletonBlock style={styles.label} /><SkeletonBlock style={styles.status} /></View><View style={styles.cardBody}><SkeletonBlock style={styles.title} /><SkeletonBlock style={styles.subtitle} /><SkeletonBlock style={styles.description} /><View style={styles.metaRow}><SkeletonBlock style={styles.meta} /><SkeletonBlock style={styles.meta} /></View></View></View>;
}

export function BusinessWorkspaceSkeleton({ label }: { label: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.workspace}><View style={styles.workspaceHeader}><SkeletonBlock style={styles.back} /><View><SkeletonBlock style={styles.kicker} /><SkeletonBlock style={styles.workspaceTitle} /></View></View><View style={styles.workspaceHero}><SkeletonBlock style={styles.heroIcon} /><SkeletonBlock style={styles.heroTitle} /><SkeletonBlock style={styles.heroCopy} /><SkeletonBlock style={styles.heroCopyShort} /><SkeletonBlock style={styles.heroAction} /></View><View style={styles.workspaceMetrics}><SkeletonBlock style={styles.metric} /><SkeletonBlock style={styles.metric} /><SkeletonBlock style={styles.metric} /></View><Text style={styles.loadingLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({ block: { backgroundColor: "#D7E5D9", borderRadius: 9 }, discoveryList: { gap: 13, paddingBottom: 24 }, loadingLabel: { color: "#6D7D71", fontSize: 11, fontWeight: "800", textAlign: "center", marginBottom: 3 }, discoveryCard: { borderRadius: 21, overflow: "hidden", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E0E7DF" }, cardBand: { minHeight: 74, paddingHorizontal: 14, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", gap: 9 }, cardBandKitchen: { backgroundColor: "#B85415" }, icon: { width: 45, height: 45, borderRadius: 15, backgroundColor: "#6A9A77" }, label: { width: 86, height: 19, backgroundColor: "#579069" }, status: { width: 46, height: 19, marginLeft: "auto", backgroundColor: "#C9E5D0" }, cardBody: { padding: 14, gap: 8 }, title: { width: "58%", height: 19, backgroundColor: "#C6DCCB" }, subtitle: { width: "41%", height: 12 }, description: { width: "86%", height: 13, backgroundColor: "#E2ECE2" }, metaRow: { flexDirection: "row", gap: 10, marginTop: 3 }, meta: { width: 94, height: 11, backgroundColor: "#D4E4D6" }, workspace: { flex: 1, padding: 16, backgroundColor: "#FFF8ED" }, workspaceHeader: { flexDirection: "row", alignItems: "center", gap: 11 }, back: { width: 40, height: 40, borderRadius: 13 }, kicker: { width: 112, height: 9 }, workspaceTitle: { width: 176, height: 23, marginTop: 6, backgroundColor: "#BFD7C3" }, workspaceHero: { marginTop: 21, padding: 21, borderRadius: 24, backgroundColor: "#064B2C" }, heroIcon: { width: 57, height: 57, borderRadius: 18, backgroundColor: "#4E8B61" }, heroTitle: { width: "55%", height: 21, marginTop: 16, backgroundColor: "#90C49C" }, heroCopy: { width: "90%", height: 12, marginTop: 12, backgroundColor: "#4E8B61" }, heroCopyShort: { width: "68%", height: 12, marginTop: 6, backgroundColor: "#4E8B61" }, heroAction: { width: "100%", height: 50, marginTop: 19, borderRadius: 15, backgroundColor: "#E8AD35" }, workspaceMetrics: { marginTop: 13, flexDirection: "row", gap: 8 }, metric: { flex: 1, height: 84, borderRadius: 16 }, });
