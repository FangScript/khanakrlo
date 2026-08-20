import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export function SuccessToast({ message }: { message: string | null }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: message ? 1 : 0, duration: message ? 180 : 130, useNativeDriver: true }).start();
  }, [message, progress]);

  return <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[styles.wrap, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}><View style={styles.toast}><View style={styles.icon}><MaterialIcons name="check" size={17} color="#FFFFFF" /></View><Text style={styles.text}>{message ?? ""}</Text></View></Animated.View>;
}

export function useSuccessToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSuccess = useCallback((nextMessage: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(nextMessage);
    timer.current = setTimeout(() => setMessage(null), 2_300);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { successMessage: message, showSuccess };
}

const styles = StyleSheet.create({ wrap: { position: "absolute", top: 14, left: 16, right: 16, zIndex: 50, alignItems: "center" }, toast: { maxWidth: 360, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#021D10", shadowOpacity: 0.22, shadowRadius: 12, elevation: 5 }, icon: { width: 23, height: 23, borderRadius: 8, backgroundColor: "#168A4A", alignItems: "center", justifyContent: "center" }, text: { flexShrink: 1, color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "800" }, });
