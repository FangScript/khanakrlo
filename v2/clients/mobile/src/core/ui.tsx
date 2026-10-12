import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

export const palette = { ink:"#163327",muted:"#53685C",green:"#12633D",paper:"#F6F8F3",white:"#FFFFFF",line:"#D7E2D8",error:"#9E2828" };
export function Action({ title,onPress,disabled=false,secondary=false }: { title:string;onPress:()=>void;disabled?:boolean;secondary?:boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action,secondary && styles.secondary,(disabled || pressed) && styles.dim]}><Text style={[styles.actionText,secondary && styles.secondaryText]}>{title}</Text></Pressable>;
}
export function Field({ label,...props }: TextInputProps & { label:string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={palette.muted} style={styles.input} {...props}/></View>;
}
export function Notice({ error }: { error:unknown }) {
  return error ? <Text accessibilityRole="alert" style={styles.error}>{error instanceof Error ? error.message : String(error)}</Text> : null;
}
export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }
export const styles = StyleSheet.create({
  page:{ flex:1,backgroundColor:palette.paper },content:{ padding:24,gap:20,flexGrow:1 },title:{ fontSize:30,fontWeight:"700",color:palette.ink },heading:{ fontSize:21,fontWeight:"600",color:palette.ink },copy:{ fontSize:16,lineHeight:24,color:palette.muted },card:{ padding:20,gap:14,backgroundColor:palette.white,borderRadius:18,borderWidth:1,borderColor:palette.line },field:{ gap:7 },label:{ color:palette.ink,fontSize:15,fontWeight:"600" },input:{ color:palette.ink,borderWidth:1,borderColor:palette.line,borderRadius:10,padding:12,fontSize:16,minHeight:48 },action:{ backgroundColor:palette.green,borderRadius:12,padding:14,minHeight:48,alignItems:"center",justifyContent:"center" },actionText:{ color:palette.white,fontSize:16,fontWeight:"600" },secondary:{ backgroundColor:palette.white,borderWidth:1,borderColor:palette.line },secondaryText:{ color:palette.green },dim:{ opacity:0.5 },error:{ color:palette.error,fontSize:15,lineHeight:22 },row:{ flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12 },stack:{ gap:16 },
});
