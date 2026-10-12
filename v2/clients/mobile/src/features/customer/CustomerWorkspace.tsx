import { useState } from "react";
import { ActivityIndicator, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customer } from "../../core/runtime";
import { Action, Card, Field, Notice, styles } from "../../core/ui";

export default function CustomerWorkspace({ userId,onRegisterRestaurant }: { userId:string;onRegisterRestaurant:()=>void }) {
  const [phone,setPhone] = useState("");
  const [consent,setConsent] = useState(false);
  const cache = useQueryClient();
  const profile = useQuery({ queryKey:["profile",userId],queryFn:({ signal })=>customer.getProfile(signal),staleTime:60000 });
  const save = useMutation({
    mutationFn:()=>customer.capturePhoneConsent({ phone,consent:true }),
    onSuccess:async ()=>{ setPhone(""); setConsent(false); await cache.invalidateQueries({ queryKey:["profile",userId] }); },
  });
  return <View style={styles.stack}>
    <Text style={styles.heading}>Your account</Text>
    <Card><Text style={styles.heading}>Own a restaurant?</Text><Text style={styles.copy}>Set up your restaurant workspace and manage your own menu and orders.</Text><Action title="Register your restaurant" secondary onPress={onRegisterRestaurant}/></Card>
    <Card>
      {profile.isPending ? <ActivityIndicator accessibilityLabel="Loading your profile"/> : null}
      <Text style={styles.copy}>{profile.data?.phone ? `Order contact: ${profile.data.phone}` : "Add your phone before placing an order."}</Text>
      <Notice error={profile.error}/>
      <Field label="Phone with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" maxLength={16} editable={!save.isPending}/>
      <Text style={styles.copy}>I agree to use this number for my orders. Other customers, restaurants and riders will not see it.</Text>
      <Switch accessibilityLabel="Consent to phone use for orders" value={consent} onValueChange={setConsent} disabled={save.isPending}/>
      <Action title={save.isPending ? "Saving…" : "Save phone"} disabled={save.isPending || !consent || !/^\+[1-9]\d{7,14}$/.test(phone)} onPress={()=>save.mutate()}/>
      <Notice error={save.error}/>
      {save.isSuccess ? <Text accessibilityLiveRegion="polite" style={styles.copy}>Your contact details are saved.</Text> : null}
    </Card>
  </View>;
}
