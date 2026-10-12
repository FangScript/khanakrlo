import { ActivityIndicator, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { authenticated } from "../../core/runtime";
import { Action, Card, Notice, styles } from "../../core/ui";

export default function RiderWorkspace({ userId }: { userId:string }) {
  const balance = useQuery({ queryKey:["custody",userId],queryFn:({ signal })=>authenticated<{ outstandingPaisa:number;custodyLimitPaisa:number|null }>("/payment/cod/custody",{ signal }),staleTime:0 });
  const cash = balance.data?.outstandingPaisa;
  return <Card><Text style={styles.heading}>Cash held</Text>
    {balance.isPending ? <ActivityIndicator accessibilityLabel="Loading cash balance"/> : null}
    {cash !== undefined ? <Text style={styles.title}>Rs {Math.floor(cash/100)}.{String(cash%100).padStart(2,"0")}</Text> : null}
    <Text style={styles.copy}>Cash stays outstanding until your remittance is verified.</Text>
    <Notice error={balance.error}/>
    <Action title="Refresh balance" disabled={balance.isFetching} onPress={()=>{ void balance.refetch(); }}/>
  </Card>;
}
