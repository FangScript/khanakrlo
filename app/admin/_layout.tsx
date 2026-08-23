import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Slot } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { startOAuthLogin } from "@/constants/oauth";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function AdminWebOnlyLayout() {
  if (Platform.OS !== "web") return <NativeBlocked />;
  return <AdminWebGate />;
}

function AdminWebGate() {
  const { user, loading } = useAuth();
  const status = trpc.adminSecurity.status.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const begin = trpc.adminSecurity.beginMfaEnrollment.useMutation();
  const confirm = trpc.adminSecurity.confirmMfaEnrollment.useMutation({ onSuccess: () => void status.refetch() });
  const verify = trpc.adminSecurity.verifyMfaChallenge.useMutation({ onSuccess: () => void status.refetch() });
  const [enrollment, setEnrollment] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  if (loading) return <Gate><ActivityIndicator color="#064B2C" /><Text style={styles.copy}>Checking staff sign-in…</Text></Gate>;
  if (!user) return <Gate><MaterialIcons name="lock" size={31} color="#064B2C" /><Text style={styles.title}>Staff sign-in required</Text><Text style={styles.copy}>Use your Khana KarLo staff account to continue to the protected web console.</Text><Button label="Sign in as staff" onPress={() => void startOAuthLogin()} /></Gate>;
  if (status.isLoading) return <Gate><ActivityIndicator color="#064B2C" /><Text style={styles.copy}>Validating Admin access…</Text></Gate>;
  if (status.error || !status.data) return <Gate><MaterialIcons name="admin-panel-settings" size={31} color="#B54231" /><Text style={styles.title}>Admin authorization required</Text><Text style={styles.copy}>This account is not an active internal Khana KarLo staff account.</Text></Gate>;
  const data = status.data as any;
  if (!data.request.hostAllowed) return <Gate><MaterialIcons name="language" size={31} color="#B54231" /><Text style={styles.title}>Use the dedicated Admin website</Text><Text style={styles.copy}>Open the Admin console from {data.canonicalHost.canonicalHost || "the configured Admin hostname"}.</Text></Gate>;
  if (!data.request.ipAllowed) return <Gate><MaterialIcons name="wifi-off" size={31} color="#B54231" /><Text style={styles.title}>Network not allowlisted</Text><Text style={styles.copy}>Your current address is not authorized for the Admin console. Contact a senior operator.</Text></Gate>;
  if (recoveryCodes) return <Gate><MaterialIcons name="key" size={31} color="#76500D" /><Text style={styles.title}>Save recovery codes</Text><Text style={styles.copy}>Store these one-time codes in your password manager. They are not shown again.</Text><View style={styles.codeGrid}>{recoveryCodes.map((value) => <Text key={value} style={styles.recoveryCode}>{value}</Text>)}</View><Button label="I stored these codes" onPress={() => setRecoveryCodes(null)} /></Gate>;
  if (data.mfa.state !== "active") return <Gate><MaterialIcons name="phonelink-lock" size={31} color="#064B2C" /><Text style={styles.title}>Set up multi-factor authentication</Text><Text style={styles.copy}>Connect an authenticator app before accessing the Admin console.</Text>{enrollment ? <><Text style={styles.secret}>{enrollment.secret}</Text><Text style={styles.copy}>Add this key to your authenticator app, then enter its six-digit code.</Text><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" placeholderTextColor="#95A299" style={styles.input} /><Button disabled={code.length !== 6 || confirm.isPending} label={confirm.isPending ? "Confirming…" : "Confirm MFA"} onPress={async () => { const result = await confirm.mutateAsync({ code }); setRecoveryCodes(result.recoveryCodes); setCode(""); }} /></> : <Button disabled={begin.isPending} label={begin.isPending ? "Preparing…" : "Start MFA setup"} onPress={async () => setEnrollment(await begin.mutateAsync())} />}</Gate>;
  if (!data.mfa.sessionActive) return <Gate><MaterialIcons name="security" size={31} color="#064B2C" /><Text style={styles.title}>Enter your MFA code</Text><Text style={styles.copy}>Use your authenticator app or an unused recovery code to unlock this browser for eight hours.</Text><TextInput value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" placeholder="123456 or ABCD1234" placeholderTextColor="#95A299" style={styles.input} /><Button disabled={!code || verify.isPending} label={verify.isPending ? "Verifying…" : "Verify and continue"} onPress={async () => { await verify.mutateAsync({ code }); setCode(""); }} /></Gate>;
  return <Slot />;
}

function NativeBlocked() { return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><View style={styles.icon}><MaterialIcons name="desktop-windows" size={30} color="#064B2C" /></View><Text style={styles.title}>Admin console is web-only</Text><Text style={styles.copy}>Customer, Business, and Rider workspaces do not include internal operations tools. Authorized Khana KarLo staff must use the protected Admin website.</Text></View></ScreenContainer>; }
function Gate({ children }: { children: React.ReactNode }) { return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><View style={styles.icon}><MaterialIcons name="shield" size={30} color="#064B2C" /></View><View style={styles.gate}>{children}</View></View></ScreenContainer>; }
function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>; }
const styles = StyleSheet.create({ page:{ flex:1, padding:28, alignItems:"center", justifyContent:"center", backgroundColor:"#F3F6F3" }, gate:{ width:"100%", maxWidth:360, alignItems:"center", gap:11 }, icon:{ width:62, height:62, borderRadius:20, alignItems:"center", justifyContent:"center", backgroundColor:"#E0F4E7" }, title:{ marginTop:7, color:"#17251D", fontSize:21, lineHeight:27, fontWeight:"900", textAlign:"center" }, copy:{ color:"#66746B", fontSize:12, lineHeight:18, fontWeight:"600", textAlign:"center" }, button:{ alignSelf:"stretch", minHeight:44, marginTop:6, borderRadius:12, backgroundColor:"#064B2C", alignItems:"center", justifyContent:"center" }, buttonText:{ color:"#FFFFFF", fontSize:11, fontWeight:"900" }, input:{ alignSelf:"stretch", minHeight:45, paddingHorizontal:12, borderRadius:12, borderWidth:1, borderColor:"#CFE0D4", backgroundColor:"#FFFFFF", color:"#17251D", textAlign:"center", fontSize:15, fontWeight:"900", letterSpacing:1 }, secret:{ alignSelf:"stretch", padding:12, borderRadius:12, backgroundColor:"#FFF4DD", color:"#4C3300", fontSize:16, letterSpacing:1.4, fontWeight:"900", textAlign:"center" }, codeGrid:{ alignSelf:"stretch", flexDirection:"row", flexWrap:"wrap", gap:7, justifyContent:"center" }, recoveryCode:{ minWidth:92, paddingVertical:7, paddingHorizontal:8, borderRadius:8, backgroundColor:"#FFF4DD", color:"#4C3300", fontSize:11, fontWeight:"900", textAlign:"center" }, pressed:{ opacity:0.78, transform:[{ scale:0.985 }] }, disabled:{ opacity:0.5 } });
