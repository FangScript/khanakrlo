import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Network from "expo-network";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { BusinessWorkspaceSkeleton } from "@/components/loading-skeleton";
import { ScreenContainer } from "@/components/screen-container";
import { SuccessToast, useSuccessToast } from "@/components/success-toast";
import { enqueueMenuMutation, readMenuMutationQueue, retryMenuMutationQueue } from "@/lib/menu-mutation-queue";
import { menuImageUrl } from "@/lib/menu-image";
import { createTRPCClient, trpc } from "@/lib/trpc";
import { fromMinorUnits, toMinorUnits } from "@/shared/catalog";

type Category = { id: number; name: string; sortOrder: number; isActive: boolean };
type Item = { id: number; categoryId: number; name: string; description: string | null; priceMinor: number; prepTimeMinutes: number; isAvailable: boolean; imageKey: string | null };
type Modifier = { id: number; menuItemId: number; name: string; priceMinor: number; isRequired: boolean; isAvailable: boolean };

export default function BusinessCatalogueScreen() {
  const catalogue = trpc.businessOperations.catalogue.useQuery(undefined, { retry: false });
  const trpcUtils = trpc.useUtils();
  const retryClient = useMemo(() => createTRPCClient(), []);
  const networkState = Network.useNetworkState();
  const { successMessage, showSuccess } = useSuccessToast();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const createCategory = trpc.businessOperations.createCategory.useMutation({ onSuccess: () => catalogue.refetch() });
  const updateCategory = trpc.businessOperations.updateCategory.useMutation({ onSuccess: () => catalogue.refetch() });
  const archiveCategory = trpc.businessOperations.archiveCategory.useMutation({ onSuccess: () => catalogue.refetch() });
  const createItem = trpc.businessOperations.createItem.useMutation({ onSuccess: () => catalogue.refetch() });
  const updateItem = trpc.businessOperations.updateItem.useMutation({
    onMutate: async (input) => {
      await trpcUtils.businessOperations.catalogue.cancel();
      const previous = trpcUtils.businessOperations.catalogue.getData();
      trpcUtils.businessOperations.catalogue.setData(undefined, (current) => current ? { ...current, items: current.items.map((item) => item.id === input.itemId ? { ...item, ...input, description: input.description ?? null } : item) } : current);
      return { previous };
    },
    onError: async (_error, input, context) => {
      if (context?.previous) trpcUtils.businessOperations.catalogue.setData(undefined, context.previous);
      const queue = await enqueueMenuMutation({ kind: "item", input });
      setPendingSyncCount(queue.length);
      showSuccess("Saved for retry when Internet returns");
    },
    onSuccess: (_result, input) => showSuccess(input.isAvailable ? "Dish is visible to customers" : "Dish is hidden from customers"),
    onSettled: () => trpcUtils.businessOperations.catalogue.invalidate(),
  });
  const archiveItem = trpc.businessOperations.archiveItem.useMutation({ onSuccess: () => { setSelectedItemId(null); resetItemForm(); void catalogue.refetch(); showSuccess("Dish archived from your live menu"); } });
  const uploadItemImage = trpc.businessOperations.uploadItemImage.useMutation({ onSuccess: () => { void catalogue.refetch(); showSuccess("Dish photo uploaded securely"); } });
  const createModifier = trpc.businessOperations.createModifier.useMutation({ onSuccess: () => catalogue.refetch() });
  const updateModifier = trpc.businessOperations.updateModifier.useMutation({
    onMutate: async (input) => {
      await trpcUtils.businessOperations.catalogue.cancel();
      const previous = trpcUtils.businessOperations.catalogue.getData();
      trpcUtils.businessOperations.catalogue.setData(undefined, (current) => current ? { ...current, modifiers: current.modifiers.map((modifier) => modifier.id === input.modifierId ? { ...modifier, ...input } : modifier) } : current);
      return { previous };
    },
    onError: async (_error, input, context) => {
      if (context?.previous) trpcUtils.businessOperations.catalogue.setData(undefined, context.previous);
      const queue = await enqueueMenuMutation({ kind: "modifier", input });
      setPendingSyncCount(queue.length);
      showSuccess("Saved for retry when Internet returns");
    },
    onSuccess: (_result, input) => showSuccess(input.isAvailable ? "Modifier is available" : "Modifier is hidden"),
    onSettled: () => trpcUtils.businessOperations.catalogue.invalidate(),
  });
  const archiveModifier = trpc.businessOperations.archiveModifier.useMutation({ onSuccess: () => { resetModifierForm(); void catalogue.refetch(); showSuccess("Modifier archived from this dish"); } });

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState("0");
  const [categoryActive, setCategoryActive] = useState(true);

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemPrep, setItemPrep] = useState("25");
  const [itemAvailable, setItemAvailable] = useState(true);

  const [selectedModifierId, setSelectedModifierId] = useState<number | null>(null);
  const [modifierName, setModifierName] = useState("");
  const [modifierPrice, setModifierPrice] = useState("0");
  const [modifierRequired, setModifierRequired] = useState(false);

  const data = catalogue.data;
  const categories = useMemo(() => (data?.categories ?? []) as Category[], [data?.categories]);
  const items = useMemo(() => (data?.items ?? []) as Item[], [data?.items]);
  const modifiers = useMemo(() => (data?.modifiers ?? []) as Modifier[], [data?.modifiers]);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) ?? null;
  const selectedItems = useMemo(() => items.filter((item) => item.categoryId === selectedCategoryId), [items, selectedCategoryId]);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const selectedModifiers = useMemo(() => modifiers.filter((modifier) => modifier.menuItemId === selectedItemId), [modifiers, selectedItemId]);
  const selectedModifier = modifiers.find((modifier) => modifier.id === selectedModifierId) ?? null;
  const busy = createCategory.isPending || updateCategory.isPending || archiveCategory.isPending || createItem.isPending || updateItem.isPending || archiveItem.isPending || uploadItemImage.isPending || createModifier.isPending || updateModifier.isPending || archiveModifier.isPending;

  useEffect(() => { if (!selectedCategoryId && categories[0]) setSelectedCategoryId(categories[0].id); }, [categories, selectedCategoryId]);
  useEffect(() => { if (selectedItem) { setItemName(selectedItem.name); setItemDescription(selectedItem.description ?? ""); setItemPrice(fromMinorUnits(selectedItem.priceMinor)); setItemPrep(String(selectedItem.prepTimeMinutes)); setItemAvailable(selectedItem.isAvailable); } }, [selectedItem]);
  useEffect(() => { if (selectedModifier) { setModifierName(selectedModifier.name); setModifierPrice(fromMinorUnits(selectedModifier.priceMinor)); setModifierRequired(selectedModifier.isRequired); } }, [selectedModifier]);

  const retryQueuedMutations = useCallback(async () => {
    const outcome = await retryMenuMutationQueue(async (mutation) => {
      if (mutation.kind === "item") await retryClient.businessOperations.updateItem.mutate(mutation.input);
      else await retryClient.businessOperations.updateModifier.mutate(mutation.input);
    });
    setPendingSyncCount(outcome.remaining);
    if (outcome.completed) {
      await trpcUtils.businessOperations.catalogue.invalidate();
      showSuccess(`${outcome.completed} saved menu change${outcome.completed === 1 ? "" : "s"} synced`);
    }
  }, [retryClient, showSuccess, trpcUtils.businessOperations.catalogue]);

  useEffect(() => { void readMenuMutationQueue().then((queue) => setPendingSyncCount(queue.length)); }, []);
  useEffect(() => { if (networkState.isInternetReachable) void retryQueuedMutations(); }, [networkState.isInternetReachable, retryQueuedMutations]);

  function resetCategoryForm() { setCategoryFormOpen(false); setEditingCategoryId(null); setCategoryName(""); setCategorySortOrder(String(categories.length)); setCategoryActive(true); }
  function openCategoryForm(category?: Category) { setCategoryFormOpen(true); setEditingCategoryId(category?.id ?? null); setCategoryName(category?.name ?? ""); setCategorySortOrder(String(category?.sortOrder ?? categories.length)); setCategoryActive(category?.isActive ?? true); }
  function resetItemForm() { setSelectedItemId(null); setItemName(""); setItemDescription(""); setItemPrice(""); setItemPrep("25"); setItemAvailable(true); resetModifierForm(); }
  function resetModifierForm() { setSelectedModifierId(null); setModifierName(""); setModifierPrice("0"); setModifierRequired(false); }

  async function saveCategory() {
    try {
      if (!categoryName.trim()) throw new Error("Enter a category name.");
      const sortOrder = Number(categorySortOrder);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) throw new Error("Category order must be a whole number of zero or more.");
      if (editingCategoryId) {
        await updateCategory.mutateAsync({ categoryId: editingCategoryId, name: categoryName, sortOrder, isActive: categoryActive });
        showSuccess("Category saved");
      } else {
        await createCategory.mutateAsync({ name: categoryName, sortOrder });
        showSuccess("Category created");
      }
      resetCategoryForm();
    } catch (error) {
      Alert.alert("Could not save category", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function saveItem() {
    try {
      if (!selectedCategoryId) throw new Error("Create or select a category first.");
      if (!selectedCategory?.isActive) throw new Error("Make this category active before adding a dish.");
      if (!itemName.trim()) throw new Error("Enter a dish name.");
      if (!itemPrice.trim()) throw new Error("Enter a price in PKR.");
      const input = { name: itemName, description: itemDescription || undefined, priceMinor: toMinorUnits(itemPrice), prepTimeMinutes: Number(itemPrep) || 0, isAvailable: itemAvailable };
      if (selectedItemId) {
        await updateItem.mutateAsync({ itemId: selectedItemId, ...input });
        showSuccess("Dish and price saved");
      } else {
        const created = await createItem.mutateAsync({ categoryId: selectedCategoryId, ...input });
        setSelectedItemId(created.id);
        showSuccess("Dish added to your menu");
      }
    } catch (error) {
      Alert.alert("Could not save dish", error instanceof Error ? error.message : "Please check the dish details.");
    }
  }

  async function saveModifier() {
    try {
      if (!selectedItemId) throw new Error("Save and select a dish before adding modifiers.");
      if (!modifierName.trim()) throw new Error("Enter a modifier name.");
      if (selectedModifierId) {
        await updateModifier.mutateAsync({ modifierId: selectedModifierId, name: modifierName, priceMinor: toMinorUnits(modifierPrice), isRequired: modifierRequired, isAvailable: selectedModifier?.isAvailable ?? true });
        showSuccess("Modifier saved");
      } else {
        await createModifier.mutateAsync({ menuItemId: selectedItemId, name: modifierName, priceMinor: toMinorUnits(modifierPrice), isRequired: modifierRequired });
        showSuccess("Modifier added");
      }
      resetModifierForm();
    } catch (error) {
      Alert.alert("Could not save modifier", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function pickDishImage() {
    try {
      if (!selectedItemId) throw new Error("Save the dish before uploading its photo.");
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const mimeType = asset.mimeType === "image/png" ? "image/png" : asset.mimeType === "image/webp" ? "image/webp" : "image/jpeg";
      const dataBase64 = asset.base64 ?? await new File(asset.uri).base64();
      await uploadItemImage.mutateAsync({ menuItemId: selectedItemId, mimeType, dataBase64 });
    } catch (error) {
      Alert.alert("Could not upload dish photo", error instanceof Error ? error.message : "Choose a JPEG, PNG, or WebP image smaller than 5 MB and try again.");
    }
  }

  function confirmArchive(kind: "category" | "dish" | "modifier", id: number) {
    const configuration = kind === "category"
      ? { title: "Archive category?", message: "Archive every dish in this category first. Archived categories are retained for audit and no longer appear to customers.", action: () => archiveCategory.mutateAsync({ categoryId: id }) }
      : kind === "dish"
        ? { title: "Archive dish?", message: "This removes the dish and its modifiers from customer menus. Historical records remain preserved.", action: () => archiveItem.mutateAsync({ itemId: id }) }
        : { title: "Archive modifier?", message: "This removes this choice from the live dish. Historical records remain preserved.", action: () => archiveModifier.mutateAsync({ modifierId: id }) };
    Alert.alert(configuration.title, configuration.message, [
      { text: "Cancel", style: "cancel" },
      { text: "Archive", style: "destructive", onPress: () => { void configuration.action().catch((error) => Alert.alert("Could not archive", error instanceof Error ? error.message : "Please try again.")); } },
    ]);
  }

  if (catalogue.isLoading) return <ScreenContainer edges={["top", "bottom", "left", "right"]}><BusinessWorkspaceSkeleton label="Loading your live catalogue" /></ScreenContainer>;

  if (catalogue.error || !data) {
    return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.accessBlock}><MaterialIcons name="verified-user" size={32} color="#064B2C" /><Text style={styles.title}>Approved Business access required</Text><Text style={styles.accessCopy}>Restaurant menu management is a production workspace. Complete Business onboarding and wait for Khana KarLo approval before adding dishes, setting prices, or publishing customer menus.</Text><Pressable onPress={() => router.push("/business/onboarding" as never)} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}><Text style={styles.actionText}>Open Business onboarding</Text></Pressable><Pressable onPress={() => router.replace("/business/home" as never)} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionLabel}>Back to Business</Text></Pressable></View></ScreenContainer>;
  }

  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><View style={styles.page}><SuccessToast message={successMessage} />
    <View style={styles.header}><Pressable onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><MaterialIcons name="arrow-back" size={21} color="#064B2C" /></Pressable><View style={styles.headerCopy}><Text style={styles.kicker}>PRODUCTION CATALOGUE</Text><Text style={styles.title}>Restaurant menu</Text><Text style={styles.headerMeta}>{data.organisation.displayName} · {items.filter((item) => item.isAvailable).length} available dishes</Text></View></View>
    {pendingSyncCount ? <View style={styles.syncNotice}><MaterialIcons name="sync" size={15} color="#82510D" /><Text style={styles.syncText}>{pendingSyncCount} safe availability change{pendingSyncCount === 1 ? "" : "s"} waiting for Internet</Text></View> : null}

    <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Categories</Text><Text style={styles.sectionCopy}>Organize your published menu and control category visibility.</Text></View><Pressable disabled={busy} onPress={() => openCategoryForm()} style={({ pressed }) => [styles.smallAction, pressed && styles.pressed]}><MaterialIcons name="add" size={17} color="#FFFFFF" /><Text style={styles.smallActionText}>Category</Text></Pressable></View>
    <FlatList data={categories} keyExtractor={(category) => String(category.id)} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList} renderItem={({ item: category }) => <Pressable onPress={() => { setSelectedCategoryId(category.id); resetItemForm(); }} style={({ pressed }) => [styles.categoryChip, selectedCategoryId === category.id && styles.categoryChipActive, !category.isActive && styles.categoryChipMuted, pressed && styles.pressed]}><Text style={[styles.categoryChipText, selectedCategoryId === category.id && styles.categoryChipTextActive]}>{category.name}</Text><Text style={[styles.categoryCount, selectedCategoryId === category.id && styles.categoryChipTextActive]}>{items.filter((item) => item.categoryId === category.id).length}</Text></Pressable>} />

    {categoryFormOpen ? <View style={styles.card}><View style={styles.cardHeading}><Text style={styles.cardTitle}>{editingCategoryId ? "Edit category" : "New category"}</Text><Pressable onPress={resetCategoryForm} style={styles.iconButton}><MaterialIcons name="close" size={18} color="#5D7062" /></Pressable></View><Field label="Category name" value={categoryName} onChangeText={setCategoryName} placeholder="e.g. Karahi, Burgers, Drinks" /><View style={styles.dual}><View style={styles.half}><Field label="Display order" value={categorySortOrder} onChangeText={setCategorySortOrder} placeholder="0" keyboardType="numeric" /></View><View style={styles.half}><Toggle label="Category active" value={categoryActive} onValueChange={setCategoryActive} compact /></View></View><Pressable disabled={busy} onPress={() => void saveCategory()} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>{busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><MaterialIcons name="save" size={17} color="#FFFFFF" /><Text style={styles.actionText}>Save category</Text></>}</Pressable></View> : null}

    {selectedCategory ? <View style={styles.card}><View style={styles.cardHeading}><View><Text style={styles.cardTitle}>{selectedItemId ? "Edit dish" : `Add dish to ${selectedCategory.name}`}</Text><Text style={styles.cardSubtitle}>{selectedCategory.isActive ? "Changes publish when your Business is live." : "This category is inactive; reactivate it before adding a dish."}</Text></View><View style={styles.headingActions}><Pressable onPress={() => openCategoryForm(selectedCategory)} style={styles.iconButton}><MaterialIcons name="edit" size={18} color="#064B2C" /></Pressable><Pressable onPress={() => confirmArchive("category", selectedCategory.id)} style={styles.iconButton}><MaterialIcons name="archive" size={18} color="#B73B28" /></Pressable></View></View>
      <Field label="Dish name" value={itemName} onChangeText={setItemName} placeholder="e.g. Chicken Karahi" /><Field label="Customer description" value={itemDescription} onChangeText={setItemDescription} placeholder="Short customer-facing description" multiline /><View style={styles.dual}><View style={styles.half}><Field label="Price (PKR)" value={itemPrice} onChangeText={setItemPrice} placeholder="950" keyboardType="numeric" /></View><View style={styles.half}><Field label="Prep minutes" value={itemPrep} onChangeText={setItemPrep} placeholder="25" keyboardType="numeric" /></View></View><Toggle label="Available to customers" value={itemAvailable} onValueChange={setItemAvailable} /><Pressable disabled={busy} onPress={() => void saveItem()} style={({ pressed }) => [styles.primaryAction, pressed && styles.pressed]}>{busy ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><MaterialIcons name="save" size={17} color="#FFFFFF" /><Text style={styles.actionText}>{selectedItemId ? "Save dish & price" : "Add dish to menu"}</Text></>}</Pressable>{selectedItemId ? <View style={styles.imageUploadCard}>{selectedItem?.imageKey ? <Image source={{ uri: menuImageUrl(selectedItem.imageKey) ?? undefined }} style={styles.uploadPreview} resizeMode="cover" /> : <View style={styles.uploadPlaceholder}><MaterialIcons name="image" size={22} color="#168A4A" /></View>}<View style={styles.uploadCopy}><Text style={styles.uploadTitle}>Dish photo</Text><Text style={styles.uploadDescription}>JPEG, PNG, or WebP. Stored only after your Business ownership is checked.</Text></View><Pressable disabled={uploadItemImage.isPending} onPress={() => void pickDishImage()} style={({ pressed }) => [styles.uploadButton, pressed && styles.pressed]}>{uploadItemImage.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.uploadButtonText}>{selectedItem?.imageKey ? "Replace" : "Upload"}</Text>}</Pressable></View> : null}
      {selectedItemId ? <><View style={styles.itemToolbar}><Text style={styles.subsectionTitle}>Modifiers & extras</Text><Pressable onPress={() => confirmArchive("dish", selectedItemId)} style={({ pressed }) => [styles.archiveAction, pressed && styles.pressed]}><MaterialIcons name="archive" size={15} color="#B73B28" /><Text style={styles.archiveActionText}>Archive dish</Text></Pressable></View>{selectedModifiers.map((modifier) => <View key={modifier.id} style={[styles.modifierRow, selectedModifierId === modifier.id && styles.itemRowActive]}><Pressable onPress={() => setSelectedModifierId(modifier.id)} style={styles.modifierCopy}><Text style={styles.modifierName}>{modifier.name}</Text><Text style={styles.modifierMeta}>+ PKR {fromMinorUnits(modifier.priceMinor)} · {modifier.isRequired ? "Required" : "Optional"}</Text></Pressable><Switch value={modifier.isAvailable} onValueChange={(isAvailable) => updateModifier.mutate({ modifierId: modifier.id, name: modifier.name, priceMinor: modifier.priceMinor, isRequired: modifier.isRequired, isAvailable })} trackColor={{ false: "#D9DFD8", true: "#A7D8B8" }} thumbColor={modifier.isAvailable ? "#168A4A" : "#FFFFFF"} /><Pressable onPress={() => confirmArchive("modifier", modifier.id)} style={styles.rowArchive}><MaterialIcons name="archive" size={17} color="#B73B28" /></Pressable></View>)}<Field label={selectedModifierId ? "Edit modifier" : "New modifier"} value={modifierName} onChangeText={setModifierName} placeholder="e.g. Extra cheese" /><View style={styles.dual}><View style={styles.half}><Field label="Extra price (PKR)" value={modifierPrice} onChangeText={setModifierPrice} placeholder="100" keyboardType="numeric" /></View><View style={styles.half}><Toggle label="Required choice" value={modifierRequired} onValueChange={setModifierRequired} compact /></View></View><Pressable disabled={busy} onPress={() => void saveModifier()} style={({ pressed }) => [styles.outlineAction, pressed && styles.pressed]}><MaterialIcons name={selectedModifierId ? "save" : "add-circle-outline"} size={17} color="#064B2C" /><Text style={styles.outlineActionText}>{selectedModifierId ? "Save modifier" : "Add modifier"}</Text></Pressable></> : null}
    </View> : <View style={styles.empty}><MaterialIcons name="restaurant-menu" size={30} color="#6A7B6D" /><Text style={styles.emptyText}>Create your first category, then add dishes and PKR prices.</Text></View>}

    <FlatList data={selectedItems} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.itemList} ListHeaderComponent={selectedCategory ? <View style={styles.listHeader}><Text style={styles.sectionTitle}>{selectedCategory.name} dishes</Text><Pressable onPress={resetItemForm} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionLabel}>New dish</Text></Pressable></View> : null} ListEmptyComponent={selectedCategory ? <Text style={styles.emptyList}>No dishes in this category yet.</Text> : null} renderItem={({ item }) => <View style={[styles.itemRow, selectedItemId === item.id && styles.itemRowActive]}><Pressable onPress={() => setSelectedItemId(item.id)} style={styles.itemCopy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.itemMeta}>PKR {fromMinorUnits(item.priceMinor)} · {item.prepTimeMinutes} min</Text></Pressable><Switch value={item.isAvailable} onValueChange={(isAvailable) => updateItem.mutate({ itemId: item.id, name: item.name, description: item.description ?? undefined, priceMinor: item.priceMinor, prepTimeMinutes: item.prepTimeMinutes, isAvailable })} trackColor={{ false: "#D9DFD8", true: "#A7D8B8" }} thumbColor={item.isAvailable ? "#168A4A" : "#FFFFFF"} /></View>} />
  </View></ScreenContainer>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: "default" | "numeric"; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9AA69E" keyboardType={keyboardType} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} style={[styles.input, multiline && styles.textarea]} /></View>;
}

function Toggle({ label, value, onValueChange, compact = false }: { label: string; value: boolean; onValueChange: (value: boolean) => void; compact?: boolean }) {
  return <View style={[styles.toggle, compact && styles.toggleCompact]}><Text style={styles.toggleText}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#D9DFD8", true: "#A7D8B8" }} thumbColor={value ? "#168A4A" : "#FFFFFF"} /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FFF8ED", padding: 16 },
  accessBlock: { flex: 1, padding: 28, alignItems: "center", justifyContent: "center", gap: 13, backgroundColor: "#FFF8ED" },
  header: { flexDirection: "row", gap: 11, alignItems: "center" },
  back: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#EAF3EC", justifyContent: "center", alignItems: "center" },
  headerCopy: { flex: 1 },
  kicker: { color: "#168A4A", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: "#17251D", fontSize: 21, lineHeight: 26, fontWeight: "900", textAlign: "center" },
  headerMeta: { marginTop: 2, color: "#6B7B70", fontSize: 10, fontWeight: "700" },
  accessCopy: { color: "#647267", fontSize: 12, lineHeight: 18, textAlign: "center", fontWeight: "600" },
  syncNotice: { marginTop: 12, padding: 9, borderRadius: 12, backgroundColor: "#FFF0D5", borderWidth: 1, borderColor: "#F3D59B", flexDirection: "row", alignItems: "center", gap: 6 },
  syncText: { flex: 1, color: "#82510D", fontSize: 9, fontWeight: "900" },
  sectionHeader: { marginTop: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  sectionTitle: { color: "#17251D", fontSize: 14, fontWeight: "900" },
  sectionCopy: { marginTop: 3, color: "#6B7B70", fontSize: 9, lineHeight: 13, fontWeight: "700" },
  smallAction: { minHeight: 35, borderRadius: 11, paddingHorizontal: 10, backgroundColor: "#064B2C", flexDirection: "row", alignItems: "center", gap: 4 },
  smallActionText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  categoryList: { paddingTop: 11, paddingBottom: 13, gap: 8 },
  categoryChip: { minHeight: 35, paddingHorizontal: 11, borderRadius: 11, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE4DD" },
  categoryChipActive: { backgroundColor: "#064B2C", borderColor: "#064B2C" },
  categoryChipMuted: { opacity: 0.5 },
  categoryChipText: { color: "#064B2C", fontSize: 10, fontWeight: "900" },
  categoryChipTextActive: { color: "#FFFFFF" },
  categoryCount: { color: "#6E7F73", fontSize: 9, fontWeight: "800" },
  card: { marginTop: 2, padding: 15, borderRadius: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DDE6DC" },
  cardHeading: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  cardTitle: { color: "#17251D", fontSize: 15, fontWeight: "900" },
  cardSubtitle: { marginTop: 4, maxWidth: 235, color: "#6A7A6E", fontSize: 9, lineHeight: 13, fontWeight: "700" },
  headingActions: { flexDirection: "row", gap: 6 },
  iconButton: { width: 33, height: 33, borderRadius: 10, backgroundColor: "#EAF3EC", alignItems: "center", justifyContent: "center" },
  field: { marginTop: 12 },
  fieldLabel: { marginBottom: 5, color: "#526158", fontSize: 9, fontWeight: "900" },
  input: { height: 44, paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: "#DDE5DC", backgroundColor: "#FBFCFA", color: "#17251D", fontSize: 12, fontWeight: "700" },
  textarea: { height: 69, paddingTop: 10 },
  dual: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  toggle: { marginTop: 13, minHeight: 42, paddingHorizontal: 11, borderRadius: 12, backgroundColor: "#F1F6F0", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  toggleCompact: { marginTop: 29, minHeight: 44 },
  toggleText: { color: "#46604C", fontSize: 10, fontWeight: "900" },
  primaryAction: { marginTop: 14, minHeight: 47, borderRadius: 14, backgroundColor: "#064B2C", flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  actionText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
  textAction: { minHeight: 34, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" },
  textActionLabel: { color: "#064B2C", fontSize: 10, fontWeight: "900" },
  itemToolbar: { marginTop: 18, paddingTop: 13, borderTopWidth: 1, borderTopColor: "#E7ECE6", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subsectionTitle: { color: "#17251D", fontSize: 13, fontWeight: "900" },
  archiveAction: { minHeight: 32, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "#FFF0ED", flexDirection: "row", alignItems: "center", gap: 4 },
  archiveActionText: { color: "#B73B28", fontSize: 9, fontWeight: "900" },
  modifierRow: { marginTop: 9, padding: 10, borderRadius: 12, backgroundColor: "#F7F9F6", flexDirection: "row", alignItems: "center", gap: 9 },
  modifierCopy: { flex: 1 },
  modifierName: { color: "#29382E", fontSize: 11, fontWeight: "900" },
  modifierMeta: { marginTop: 2, color: "#6D7D71", fontSize: 9, fontWeight: "700" },
  rowArchive: { width: 29, height: 29, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0ED" },
  imageUploadCard: { marginTop: 12, minHeight: 76, padding: 9, borderRadius: 14, backgroundColor: "#F4F8F3", borderWidth: 1, borderColor: "#D7E4D7", flexDirection: "row", alignItems: "center", gap: 9 },
  uploadPreview: { width: 58, height: 58, borderRadius: 11, backgroundColor: "#E0F4E7" },
  uploadPlaceholder: { width: 58, height: 58, borderRadius: 11, backgroundColor: "#E0F4E7", justifyContent: "center", alignItems: "center" },
  uploadCopy: { flex: 1 },
  uploadTitle: { color: "#1D3524", fontSize: 11, fontWeight: "900" },
  uploadDescription: { marginTop: 3, color: "#66786B", fontSize: 8, lineHeight: 12, fontWeight: "700" },
  uploadButton: { minHeight: 34, paddingHorizontal: 9, borderRadius: 10, backgroundColor: "#064B2C", justifyContent: "center", alignItems: "center" },
  uploadButtonText: { color: "#FFFFFF", fontSize: 9, fontWeight: "900" },
  outlineAction: { marginTop: 12, minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: "#BFD7C1", backgroundColor: "#F2F8F1", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 },
  outlineActionText: { color: "#064B2C", fontSize: 10, fontWeight: "900" },
  listHeader: { marginTop: 18, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  itemList: { paddingBottom: 26 },
  itemRow: { marginBottom: 7, padding: 11, borderRadius: 15, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E0E7DF", flexDirection: "row", alignItems: "center", gap: 10 },
  itemRowActive: { borderColor: "#168A4A", backgroundColor: "#FBFFFA" },
  itemCopy: { flex: 1 },
  itemName: { color: "#17251D", fontSize: 12, fontWeight: "900" },
  itemMeta: { marginTop: 3, color: "#718175", fontSize: 9, fontWeight: "700" },
  empty: { padding: 25, alignItems: "center", gap: 8 },
  emptyText: { color: "#6B7B70", fontSize: 11, textAlign: "center", fontWeight: "700" },
  emptyList: { color: "#6B7B70", fontSize: 11, textAlign: "center", marginTop: 8, fontWeight: "700" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
