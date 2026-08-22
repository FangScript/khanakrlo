import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { PrimaryButton, ScreenBack } from "@/components/khana-ui";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const topics = ["food_quality", "delivery", "value", "packaging"] as const;
const labels = { food_quality: "Food quality", delivery: "Delivery", value: "Value", packaging: "Packaging" } as const;

export default function OrderReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId?: string }>();
  const parsedOrderId = Number(orderId);
  const validOrder = Number.isInteger(parsedOrderId) && parsedOrderId > 0;
  const existing = trpc.reviews.mineForOrder.useQuery({ orderId: validOrder ? parsedOrderId : 1 }, { enabled: validOrder, retry: false });
  const create = trpc.reviews.create.useMutation({ onSuccess: () => { void existing.refetch(); Alert.alert("Thank you", "Your verified review and feedback have been recorded."); } });
  const [rating, setRating] = useState(0);
  const [publicComment, setPublicComment] = useState("");
  const [privateFeedback, setPrivateFeedback] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<(typeof topics)[number][]>([]);
  const toggle = (topic: (typeof topics)[number]) => setSelectedTopics((current) => current.includes(topic) ? current.filter((item) => item !== topic) : [...current, topic]);
  const submit = async () => {
    if (!validOrder || !rating || create.isPending) return;
    try { await create.mutateAsync({ orderId: parsedOrderId, rating, publicComment: publicComment.trim() || undefined, privateFeedback: privateFeedback.trim() || undefined, feedbackTopics: selectedTopics }); }
    catch (error) { Alert.alert("Could not save review", error instanceof Error ? error.message : "Please try again."); }
  };

  if (!validOrder) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><Text style={styles.title}>Choose a delivered order</Text></View></ScreenContainer>;
  if (existing.isLoading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.center}><ActivityIndicator color="#168A4A" /></View></ScreenContainer>;
  if (existing.data) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><ScreenBack title="Your review" /><View style={styles.done}><MaterialIcons name="verified" size={43} color="#168A4A" /><Text style={styles.title}>Thank you for sharing</Text><Text style={styles.copy}>You rated this verified order {existing.data.rating} out of 5. Your public comment stays visible only while it remains published.</Text><PrimaryButton label="Back to order" onPress={() => router.back()} icon="arrow-back" /></View></View></ScreenContainer>;

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.screen}><ScreenBack title="Rate your order" /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><Text style={styles.kicker}>VERIFIED DELIVERY FEEDBACK</Text><Text style={styles.title}>How was your order?</Text><Text style={styles.copy}>Only a customer with this delivered order can submit one rating. The Business sees private feedback; you control the public comment.</Text><View style={styles.card}><Text style={styles.cardLabel}>Your rating</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityRole="button" accessibilityLabel={`${star} stars`} onPress={() => setRating(star)} style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}><MaterialIcons name={star <= rating ? "star" : "star-border"} size={39} color={star <= rating ? "#E5A10A" : "#B8C2B9"} /></Pressable>)}</View></View><FormInput label="Public review · optional" value={publicComment} onChangeText={setPublicComment} placeholder="What should other customers know?" /><FormInput label="Private feedback for this Business · optional" value={privateFeedback} onChangeText={setPrivateFeedback} placeholder="Share a delivery or packaging issue privately." /><Text style={styles.cardLabel}>Feedback topics</Text><View style={styles.topicList}>{topics.map((topic) => { const selected = selectedTopics.includes(topic); return <Pressable key={topic} onPress={() => toggle(topic)} style={[styles.topic, selected && styles.topicSelected]}><Text style={[styles.topicText, selected && styles.topicTextSelected]}>{labels[topic]}</Text></Pressable>; })}</View><Pressable disabled={!rating || create.isPending} onPress={() => void submit()} style={({ pressed }) => [styles.submit, (!rating || create.isPending) && styles.submitDisabled, pressed && Boolean(rating) && styles.pressed]}><Text style={styles.submitText}>{create.isPending ? "Saving feedback…" : "Submit verified review"}</Text><MaterialIcons name="check" size={18} color="#FFFFFF" /></Pressable></ScrollView></View></ScreenContainer>;
}

function FormInput({ label, value, onChangeText, placeholder }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string }) { return <View><Text style={styles.cardLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} maxLength={1000} multiline placeholder={placeholder} placeholderTextColor="#869187" style={styles.input} /></View>; }

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: "#FFF8ED", paddingHorizontal: 16, paddingTop: 6 }, content: { paddingBottom: 36 }, center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF8ED", padding: 24 }, kicker: { marginTop: 16, color: "#168A4A", fontSize: 9, letterSpacing: 1, fontWeight: "900" }, title: { marginTop: 5, color: "#17251D", fontSize: 23, lineHeight: 29, fontWeight: "900" }, copy: { marginTop: 6, color: "#66766B", fontSize: 11, lineHeight: 16, fontWeight: "600" }, card: { marginTop: 19, padding: 15, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E8DF" }, cardLabel: { marginTop: 18, color: "#17251D", fontSize: 12, fontWeight: "900" }, stars: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 }, starButton: { padding: 2 }, input: { minHeight: 92, marginTop: 8, padding: 12, borderRadius: 15, color: "#17251D", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E8DF", fontSize: 12, lineHeight: 17, textAlignVertical: "top" }, topicList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 9, marginBottom: 22 }, topic: { minHeight: 34, paddingHorizontal: 11, borderRadius: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DCE6DD", justifyContent: "center" }, topicSelected: { backgroundColor: "#E0F4E7", borderColor: "#168A4A" }, topicText: { color: "#58685D", fontSize: 10, fontWeight: "800" }, topicTextSelected: { color: "#064B2C" }, submit: { minHeight: 50, borderRadius: 15, backgroundColor: "#064B2C", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" }, submitDisabled: { opacity: 0.45 }, submitText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" }, done: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 10 }, pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] } });
