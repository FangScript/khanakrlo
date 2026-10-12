import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { enterSandbox, googleSignIn, isSandbox, sessions } from "./src/core/runtime";
import { ApiError } from "./src/core/http";
import { Action, Card, Notice, styles } from "./src/core/ui";
import { authorizedWorkspaces, type WorkspaceRole } from "./src/core/workspaces";

const Customer = lazy(()=>import("./src/features/customer/CustomerWorkspace"));
const Merchant = lazy(()=>import("./src/features/merchant/MerchantWorkspace"));
const Rider = lazy(()=>import("./src/features/rider/RiderWorkspace"));
const cache = new QueryClient({ defaultOptions:{ queries:{ retry:(count,error)=>count<1 && (!(error instanceof ApiError) || error.status>=500),gcTime:5*60*1000 },mutations:{ retry:false } } });

function MobileApp() {
  const session = useSyncExternalStore(sessions.subscribe,sessions.snapshot);
  const [busy,setBusy] = useState(true), [error,setError] = useState<unknown>(null);
  const [active,setActive] = useState<WorkspaceRole|null>(null);
  const actionInFlight = useRef(false);
  useEffect(()=>{
    let mounted = true;
    void sessions.restore().catch((value:unknown)=>{ if (mounted) setError(value); }).finally(()=>{ if (mounted) setBusy(false); });
    const listener = AppState.addEventListener("change",(state)=>focusManager.setFocused(state==="active"));
    return ()=>{ mounted=false; listener.remove(); };
  },[]);
  useEffect(()=>{ if (!session) { cache.clear(); setActive(null); } },[session]);
  const run = async (action:()=>Promise<void>)=>{
    if (actionInFlight.current) return;
    actionInFlight.current=true; setBusy(true); setError(null);
    try { await action(); } catch (value) { setError(value); } finally { actionInFlight.current=false; setBusy(false); }
  };
  const allowed = authorizedWorkspaces(session?.user.roles ?? []);
  const selected = allowed.find((workspace)=>workspace.role===active) ?? (allowed.length===1 ? allowed[0] : undefined);
  return <SafeAreaView style={styles.page}>
    <StatusBar style="dark"/>
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS==="ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Khana KarLo</Text>
        {isSandbox ? <Text style={styles.copy}>Sandbox · Sample data only · Nothing is sent to live services</Text> : null}
        {!session ? <Card><Text style={styles.heading}>Good food. One app.</Text><Text style={styles.copy}>Order a meal, run your restaurant, or deliver with us.</Text><Action title={busy ? "Please wait…" : isSandbox ? "Enter sandbox" : "Continue with Google"} disabled={busy} onPress={()=>{ void run(isSandbox ? enterSandbox : googleSignIn); }}/></Card> : <>
          {!selected ? <View style={styles.stack}><Text style={styles.heading}>Choose your workspace</Text>{allowed.map((workspace)=><Card key={workspace.role}><Text style={styles.copy}>{workspace.description}</Text><Action title={workspace.title} onPress={()=>setActive(workspace.role)}/></Card>)}{allowed.length===0 ? <Text style={styles.copy}>No mobile workspace is assigned to this account yet.</Text> : null}</View> : <Suspense fallback={<ActivityIndicator accessibilityLabel="Loading workspace"/>}>
            {selected.role==="customer" ? <Customer key={session.user.id} userId={session.user.id} onRegisterRestaurant={()=>setActive("merchant")}/> : selected.role==="merchant" ? <Merchant key={session.user.id} userId={session.user.id} roles={session.user.roles}/> : <Rider key={session.user.id} userId={session.user.id}/>}
          </Suspense>}
          {selected && allowed.length>1 ? <Action title="Switch workspace" secondary onPress={()=>setActive(null)}/> : null}
          <Action title="Sign out" secondary disabled={busy} onPress={()=>{ void run(()=>sessions.logout()); }}/>
        </>}
        <Notice error={error}/>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><QueryClientProvider client={cache}><MobileApp/></QueryClientProvider></SafeAreaProvider>; }
