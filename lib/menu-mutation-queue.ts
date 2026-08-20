import AsyncStorage from "@react-native-async-storage/async-storage";

export type QueuedMenuMutation =
  | { id: string; kind: "item"; input: { itemId: number; name: string; description?: string; priceMinor: number; prepTimeMinutes: number; isAvailable: boolean }; queuedAt: number; attempts: number }
  | { id: string; kind: "modifier"; input: { modifierId: number; name: string; priceMinor: number; isRequired: boolean; isAvailable: boolean }; queuedAt: number; attempts: number };
export type MenuMutationPayload =
  | { kind: "item"; input: { itemId: number; name: string; description?: string; priceMinor: number; prepTimeMinutes: number; isAvailable: boolean } }
  | { kind: "modifier"; input: { modifierId: number; name: string; priceMinor: number; isRequired: boolean; isAvailable: boolean } };

const MENU_QUEUE_KEY = "khana-karlo/pending-menu-mutations-v1";

function mutationId(mutation: MenuMutationPayload) {
  return mutation.kind === "item" ? `item:${mutation.input.itemId}` : `modifier:${mutation.input.modifierId}`;
}

export function mergeQueuedMenuMutation(queue: QueuedMenuMutation[], mutation: MenuMutationPayload) {
  const id = mutationId(mutation);
  const entry: QueuedMenuMutation = { ...mutation, id, queuedAt: Date.now(), attempts: 0 } as QueuedMenuMutation;
  return [...queue.filter((candidate) => candidate.id !== id), entry];
}

export async function readMenuMutationQueue(): Promise<QueuedMenuMutation[]> {
  try { const raw = await AsyncStorage.getItem(MENU_QUEUE_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed as QueuedMenuMutation[] : []; } catch { return []; }
}

export async function enqueueMenuMutation(mutation: MenuMutationPayload) {
  const next = mergeQueuedMenuMutation(await readMenuMutationQueue(), mutation);
  try { await AsyncStorage.setItem(MENU_QUEUE_KEY, JSON.stringify(next)); } catch { /* A failed local write must not interrupt the current UI state. */ }
  return next;
}

export async function retryMenuMutationQueue(apply: (mutation: QueuedMenuMutation) => Promise<void>) {
  const queue = await readMenuMutationQueue();
  const retained: QueuedMenuMutation[] = [];
  let completed = 0;
  for (const mutation of queue) {
    try { await apply(mutation); completed += 1; } catch { retained.push({ ...mutation, attempts: mutation.attempts + 1 }); }
  }
  try { await AsyncStorage.setItem(MENU_QUEUE_KEY, JSON.stringify(retained)); } catch { /* Retain the in-memory outcome if storage is unavailable. */ }
  return { completed, remaining: retained.length };
}
