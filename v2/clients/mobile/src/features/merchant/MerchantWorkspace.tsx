import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticated, sessions } from "../../core/runtime";
import { Action, Card, Field, Notice, styles } from "../../core/ui";

type Outlet = { organisationId:string;businessName:string;cuisine:string;outletId:string;outletName:string;city:string;addressLine:string;acceptingOrders:boolean };
type Onboarding = { businessName:string;cuisine:string;outletName:string;city:string;addressLine:string };
function idempotencyKey() { return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }

export default function MerchantWorkspace({ userId,roles }: { userId:string;roles:string[] }) {
  const [form,setForm] = useState<Onboarding>({ businessName:"",cuisine:"",outletName:"",city:"",addressLine:"" });
  const [categoryName,setCategoryName] = useState("");
  const [itemName,setItemName] = useState("");
  const [itemPrice,setItemPrice] = useState("");
  const cache = useQueryClient();
  const isMerchant = roles.includes("merchant");
  const restaurants = useQuery({ queryKey:["restaurants",userId],queryFn:({signal})=>authenticated<{items:Outlet[]}>("/restaurant/mine",{signal}),enabled:isMerchant,staleTime:30000 });
  const onboard = useMutation({ mutationFn:()=>authenticated<{organisationId:string;outletId:string;status:string;acceptingOrders:boolean}>("/restaurant/onboarding",{method:"POST",body:form,idempotencyKey:idempotencyKey()}),onSuccess:async()=>{ await sessions.restore(); await cache.invalidateQueries(); } });
  const outlet = restaurants.data?.items[0];
  const menu = useQuery({ queryKey:["menu",outlet?.outletId],queryFn:({signal})=>authenticated<{outletId:string;items:Array<{id:string;name:string;sortOrder:number;items:Array<{id:string;name:string;pricePaisa:number;available:boolean}>}>}>(`/menu/outlets/${encodeURIComponent(outlet!.outletId)}/menu`,{signal}),enabled:Boolean(outlet),staleTime:20000 });
  const firstCategoryId = menu.data?.items[0]?.id;
  const createCategory = useMutation({ mutationFn:()=>authenticated<{id:string;name:string}>(`/menu/outlets/${encodeURIComponent(outlet!.outletId)}/categories`,{method:"POST",body:{name:categoryName,sortOrder:menu.data?.items.length??0}}),onSuccess:async()=>{setCategoryName("");await cache.invalidateQueries({queryKey:["menu",outlet?.outletId]});} });
  const createItem = useMutation({ mutationFn:()=>authenticated<{id:string}>(`/menu/outlets/${encodeURIComponent(outlet!.outletId)}/items`,{method:"POST",body:{categoryId:firstCategoryId,name:itemName,pricePaisa:Math.round(Number(itemPrice)*100)}}),onSuccess:async()=>{setItemName("");setItemPrice("");await cache.invalidateQueries({queryKey:["menu",outlet?.outletId]});} });
  const availability = useMutation({ mutationFn:(acceptingOrders:boolean)=>authenticated(`/restaurant/outlets/${encodeURIComponent(outlet!.outletId)}/availability`,{method:"PATCH",body:{acceptingOrders}}),onSuccess:()=>cache.invalidateQueries({queryKey:["restaurants",userId]}) });

  if (!isMerchant) return <View style={styles.stack}><Text style={styles.heading}>Register your restaurant</Text><Card><Text style={styles.copy}>Self-service setup is open. Your restaurant is created right away; accepting orders stays off until you are ready.</Text>
    {([ ["businessName","Business name"],["cuisine","Cuisine"],["outletName","Outlet name"],["city","City"],["addressLine","Street address"] ] as const).map(([key,label])=><Field key={key} label={label} value={form[key]} onChangeText={(value)=>setForm((current)=>({...current,[key]:value}))} maxLength={key==="addressLine"?500:120}/>)}
    <Action title={onboard.isPending?"Creating…":"Create restaurant"} disabled={onboard.isPending||Object.values(form).some((value)=>value.trim().length<2)} onPress={()=>onboard.mutate()}/><Notice error={onboard.error}/>
  </Card></View>;

  return <View style={styles.stack}><Text style={styles.heading}>Restaurant workspace</Text>
    {restaurants.isPending?<ActivityIndicator accessibilityLabel="Loading restaurants"/>:null}<Notice error={restaurants.error}/>
    {outlet?<>
      <Card><Text style={styles.heading}>{outlet.businessName}</Text><Text style={styles.copy}>{outlet.outletName} · {outlet.city} · {outlet.cuisine}</Text><Text style={styles.copy}>{outlet.acceptingOrders?"Currently accepting orders":"Not accepting orders"}</Text><Action title={outlet.acceptingOrders?"Pause orders":"Start accepting orders"} secondary disabled={availability.isPending} onPress={()=>availability.mutate(!outlet.acceptingOrders)}/><Notice error={availability.error}/></Card>
      <Card><Text style={styles.heading}>Menu</Text>{menu.isPending?<ActivityIndicator accessibilityLabel="Loading menu"/>:null}<Notice error={menu.error}/>
        {menu.data?.items.map((category)=><View key={category.id} style={styles.stack}><Text style={styles.copy}>{category.name}</Text>{category.items.map((item)=><Text key={item.id} style={styles.copy}>{item.name} · Rs {Math.floor(item.pricePaisa/100)}.{String(item.pricePaisa%100).padStart(2,"0")}</Text>)}</View>)}
        <Field label="New category" value={categoryName} onChangeText={setCategoryName}/><Action title={createCategory.isPending?"Saving…":"Add category"} secondary disabled={!categoryName.trim()||createCategory.isPending} onPress={()=>createCategory.mutate()}/><Notice error={createCategory.error}/>
        {firstCategoryId?<><Field label="New item" value={itemName} onChangeText={setItemName}/><Field label="Price in rupees" value={itemPrice} onChangeText={setItemPrice} keyboardType="decimal-pad"/><Action title={createItem.isPending?"Saving…":"Add item to first category"} secondary disabled={!itemName.trim()||!Number.isFinite(Number(itemPrice))||Number(itemPrice)<=0||createItem.isPending} onPress={()=>createItem.mutate()}/><Notice error={createItem.error}/></>:null}
      </Card>
    </>:<Card><Text style={styles.copy}>No restaurant is registered yet.</Text></Card>}
  </View>;
}
