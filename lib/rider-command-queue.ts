import AsyncStorage from "@react-native-async-storage/async-storage";

export type RiderCommandPayload =
  | { type: "offer_decision"; orderId: number; decision: "accept" | "decline"; note?: string }
  | { type: "transition"; orderId: number; toStatus: "picked_up" | "delivered"; note?: string }
  | { type: "cod_collection"; orderId: number; collectedMinor: number; varianceReason?: string }
  | { type: "location_update"; orderId: number; latitudeE6: number; longitudeE6: number; accuracyMeters?: number }
  | { type: "availability"; status: "online" | "offline" };

export type QueuedRiderCommand = RiderCommandPayload & { idempotencyKey: string; queuedAt: number; attempts: number };

const RIDER_COMMAND_QUEUE_KEY = "khana-karlo/rider-command-outbox-v1";

function keyPart(command: RiderCommandPayload) {
  if (command.type === "availability") return "availability";
  if (command.type === "location_update") return `location:${command.orderId}`;
  return null;
}

function idempotencyKey(command: RiderCommandPayload) {
  const scope = "orderId" in command ? command.orderId : command.status;
  return `rider:${command.type}:${scope}:${Date.now()}:${Math.random().toString(36).slice(2, 12)}`;
}

export async function readRiderCommandQueue(): Promise<QueuedRiderCommand[]> {
  try {
    const raw = await AsyncStorage.getItem(RIDER_COMMAND_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as QueuedRiderCommand[] : [];
  } catch {
    return [];
  }
}

export function mergeQueuedRiderCommand(queue: QueuedRiderCommand[], command: RiderCommandPayload) {
  const replacementKey = keyPart(command);
  const entry: QueuedRiderCommand = { ...command, idempotencyKey: idempotencyKey(command), queuedAt: Date.now(), attempts: 0 };
  if (!replacementKey) return [...queue, entry];
  return [...queue.filter((candidate) => keyPart(candidate) !== replacementKey), entry];
}

export async function enqueueRiderCommand(command: RiderCommandPayload) {
  const next = mergeQueuedRiderCommand(await readRiderCommandQueue(), command);
  try { await AsyncStorage.setItem(RIDER_COMMAND_QUEUE_KEY, JSON.stringify(next)); } catch { /* Keep the immediate UI action usable even if device storage is temporarily unavailable. */ }
  return next;
}

export function isTerminalRiderCommandError(error: unknown) {
  const code = typeof error === "object" && error !== null && "data" in error && typeof (error as { data?: unknown }).data === "object" ? (error as { data?: { code?: string } }).data?.code : undefined;
  return ["BAD_REQUEST", "FORBIDDEN", "NOT_FOUND", "CONFLICT"].includes(code ?? "");
}

export async function flushRiderCommandQueue(send: (command: QueuedRiderCommand) => Promise<void>) {
  const queue = await readRiderCommandQueue();
  const retained: QueuedRiderCommand[] = [];
  let completed = 0;
  let rejected = 0;
  for (const command of queue) {
    try {
      await send(command);
      completed += 1;
    } catch (error) {
      if (isTerminalRiderCommandError(error)) rejected += 1;
      else retained.push({ ...command, attempts: command.attempts + 1 });
    }
  }
  try { await AsyncStorage.setItem(RIDER_COMMAND_QUEUE_KEY, JSON.stringify(retained)); } catch { /* The next explicit command or connectivity change retries the in-memory retained set. */ }
  return { completed, rejected, remaining: retained.length };
}
