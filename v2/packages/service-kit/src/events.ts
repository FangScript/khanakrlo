import { randomUUID } from "node:crypto";
import amqp, { type ChannelModel, type ConfirmChannel } from "amqplib";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { transaction } from "./http.js";

export const domainEventSchema = z.object({
  eventId: z.string().uuid(),
  type: z.string().regex(/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/),
  version: z.number().int().positive(),
  occurredAt: z.string().datetime(),
  correlationId: z.string().uuid().optional(),
  producer: z.string().min(1),
  aggregateId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()),
}).strict();
export type DomainEvent = z.infer<typeof domainEventSchema>;

export function newDomainEvent(input: Omit<DomainEvent, "eventId" | "occurredAt"> & { eventId?: string; occurredAt?: string }): DomainEvent {
  return domainEventSchema.parse({ ...input, eventId: input.eventId ?? randomUUID(), occurredAt: input.occurredAt ?? new Date().toISOString() });
}

/** Insert into the caller's transaction so business state and event intent commit together. */
export async function enqueueDomainEvent(client: PoolClient, event: DomainEvent) {
  await client.query(
    "INSERT INTO outbox_events (event_id, event_type, event_version, occurred_at, correlation_id, producer, aggregate_id, payload) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
    [event.eventId, event.type, event.version, event.occurredAt, event.correlationId ?? null, event.producer, event.aggregateId, JSON.stringify(event.payload)],
  );
}

async function publishConfirmed(channel: ConfirmChannel, event: DomainEvent) {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => { void channel.close().catch(() => undefined); reject(new Error("Broker confirmation timed out.")); }, 2000);
    const returned = () => { clearTimeout(timer); reject(new Error("No durable consumer queue accepted the event.")); };
    channel.once("return", returned);
    try {
      channel.publish("khana.domain", event.type, Buffer.from(JSON.stringify(event)), { mandatory: true, persistent: true, contentType: "application/json", messageId: event.eventId, timestamp: Math.floor(Date.parse(event.occurredAt) / 1000), headers: { event_version: event.version, producer: event.producer, correlation_id: event.correlationId } }, (error) => {
        clearTimeout(timer); channel.removeListener("return", returned);
        if (error) reject(error); else resolve();
      });
    } catch (error) { clearTimeout(timer); channel.removeListener("return", returned); reject(error); }
  });
}

async function processOutboxBatch(pool: Pool, channel: ConfirmChannel) {
  const client = await pool.connect();
  let published = 0;
  try {
    await client.query("BEGIN");
    const result = await client.query<{ event_id: string; event_type: string; event_version: number; occurred_at: Date; correlation_id: string | null; producer: string; aggregate_id: string; payload: Record<string, unknown>; attempts: number }>(
      "SELECT event_id, event_type, event_version, occurred_at, correlation_id, producer, aggregate_id, payload, attempts FROM outbox_events WHERE published_at IS NULL AND (next_attempt_at IS NULL OR next_attempt_at <= now()) ORDER BY occurred_at LIMIT 50 FOR UPDATE SKIP LOCKED",
    );
    for (const row of result.rows) {
      const event = domainEventSchema.parse({ eventId: row.event_id, type: row.event_type, version: row.event_version, occurredAt: row.occurred_at.toISOString(), ...(row.correlation_id ? { correlationId: row.correlation_id } : {}), producer: row.producer, aggregateId: row.aggregate_id, payload: row.payload });
      try {
        await publishConfirmed(channel, event);
        await client.query("UPDATE outbox_events SET published_at = now(), attempts = attempts + 1, next_attempt_at = NULL, last_error = NULL WHERE event_id = $1", [row.event_id]);
        published += 1;
      } catch (error) {
        const attempts = row.attempts + 1;
        const retrySeconds = Math.min(1800, 30 * (2 ** Math.min(attempts - 1, 6)));
        const message = error instanceof Error ? error.message.slice(0, 1000) : "Broker publish failed.";
        await client.query("UPDATE outbox_events SET attempts = $2, next_attempt_at = now() + ($3 * interval '1 second'), last_error = $4 WHERE event_id = $1", [row.event_id, attempts, retrySeconds, message]);
      }
    }
    await client.query("COMMIT");
    return published;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function startOutboxRelay(pool: Pool, brokerUrl: string, serviceName: string) {
  let stopped = false;
  let connection: ChannelModel | undefined;
  let channel: ConfirmChannel | undefined;
  const run = async () => {
    while (!stopped) {
      try {
        connection = await amqp.connect(brokerUrl);
        connection.on("error", () => process.stderr.write(`[${serviceName}] broker connection failed.\n`));
        channel = await connection.createConfirmChannel();
        channel.on("error", () => process.stderr.write(`[${serviceName}] broker channel failed.\n`));
        channel.once("close", () => { channel = undefined; });
        await channel.assertExchange("khana.domain", "topic", { durable: true });
        while (!stopped && channel) {
          await processOutboxBatch(pool, channel);
          await pause(1000);
        }
      } catch (error) {
        if (!stopped) {
          const message = error instanceof Error ? error.message : "Unknown broker failure.";
          process.stderr.write(`[${serviceName}] outbox relay unavailable: ${message}\n`);
          await pause(5000);
        }
      } finally {
        channel = undefined;
        if (connection) await connection.close().catch(() => undefined);
        connection = undefined;
      }
    }
  };
  void run();
  const stop = async () => {
    stopped = true;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  };
  registerShutdown(stop);
  return stop;
}

/** Call inside the same SQL transaction as consumer side effects. */
export async function beginEventConsumption(client: PoolClient, consumerName: string, event: DomainEvent) {
  const result = await client.query("INSERT INTO processed_events (consumer_name, event_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING event_id", [consumerName, event.eventId]);
  return result.rowCount === 1;
}

export type DomainEventHandler = (client: PoolClient, event: DomainEvent) => Promise<void>;
const shutdownHandlers = new Set<() => Promise<void>>();
export function registerShutdown(handler: () => Promise<void>) { shutdownHandlers.add(handler); return () => shutdownHandlers.delete(handler); }
export async function stopBackgroundWork() {
  await Promise.allSettled([...shutdownHandlers].map((stop) => stop()));
  shutdownHandlers.clear();
}

/** Durable, at-least-once consumer. Deduplication and its business effect share a DB transaction. */
export function startEventConsumer(pool: Pool, brokerUrl: string, consumerName: string, bindings: string[], handler: DomainEventHandler) {
  if (!bindings.length) throw new Error("An event consumer must declare at least one routing binding.");
  let stopped = false;
  let connection: ChannelModel | undefined;
  let channel: ConfirmChannel | undefined;
  const queueName = `khana.${consumerName}.v1`;
  const deadLetterQueue = `khana.${consumerName}.dead.v1`;
  const retryExchange = `khana.${consumerName}.retry`;
  const retryQueue = `${queueName}.retry`;
  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const run = async () => {
    while (!stopped) {
      try {
        connection = await amqp.connect(brokerUrl);
        connection.on("error", () => process.stderr.write(`[${consumerName}] broker connection failed.\n`));
        channel = await connection.createConfirmChannel();
        channel.on("error", () => process.stderr.write(`[${consumerName}] consumer channel failed.\n`));
        await channel.assertExchange("khana.domain", "topic", { durable: true });
        await channel.assertExchange("khana.domain.dlq", "topic", { durable: true });
        await channel.assertExchange(retryExchange, "topic", { durable: true });
        await channel.assertQueue(deadLetterQueue, { durable: true });
        await channel.bindQueue(deadLetterQueue, "khana.domain.dlq", "#");
        await channel.assertQueue(retryQueue, { durable: true, arguments: { "x-message-ttl": 5000, "x-dead-letter-exchange": "khana.domain" } });
        await channel.bindQueue(retryQueue, retryExchange, "#");
        await channel.assertQueue(queueName, { durable: true, arguments: { "x-dead-letter-exchange": "khana.domain.dlq" } });
        for (const binding of bindings) await channel.bindQueue(queueName, "khana.domain", binding);
        await channel.prefetch(10);
        await channel.consume(queueName, (message) => {
          if (!message || !channel) return;
          const activeChannel = channel;
          void (async () => {
            let event: DomainEvent;
            try {
              event = domainEventSchema.parse(JSON.parse(message.content.toString("utf8")));
            } catch (error) {
              const detail = error instanceof Error ? error.message.slice(0,300) : "invalid event";
              process.stderr.write(`[${consumerName}] invalid event moved to dead-letter queue: ${detail}\n`);
              activeChannel.nack(message,false,false);
              return;
            }
            try {
              await transaction(pool, async (client) => {
                if (await beginEventConsumption(client, consumerName, event)) await handler(client, event);
              });
              activeChannel.ack(message);
            } catch (error) {
              const detail = error instanceof Error ? error.message.slice(0,300) : "consumer handler failed";
              const retries = Number(message.properties.headers?.["x-khana-retry"] ?? 0);
              if (Number.isFinite(retries) && retries < 5) {
                try {
                  await new Promise<void>((resolve,reject)=>activeChannel.publish(retryExchange,event.type,message.content,{persistent:true,contentType:"application/json",messageId:event.eventId,timestamp:Math.floor(Date.parse(event.occurredAt)/1000),headers:{...message.properties.headers,"x-khana-retry":retries+1}},error=>error?reject(error):resolve()));
                  activeChannel.ack(message);
                  process.stderr.write(`[${consumerName}] event handler failed; scheduled retry ${retries+1}/5: ${detail}\n`);
                } catch {
                  activeChannel.nack(message,false,true);
                }
              } else {
                process.stderr.write(`[${consumerName}] event exhausted retries and moved to dead-letter queue: ${detail}\n`);
                activeChannel.nack(message,false,false);
              }
            }
          })();
        }, { noAck:false });
        await new Promise<void>((resolve) => {
          if (stopped) resolve();
          else connection?.once("close",resolve);
        });
      } catch (error) {
        if (!stopped) {
          const detail = error instanceof Error ? error.message : "unknown broker failure";
          process.stderr.write(`[${consumerName}] event consumer unavailable: ${detail}\n`);
          await pause(5000);
        }
      } finally {
        channel = undefined;
        if (connection) await connection.close().catch(() => undefined);
        connection = undefined;
      }
    }
  };
  void run();
  const stop = async () => {
    stopped = true;
    await channel?.close().catch(() => undefined);
    await connection?.close().catch(() => undefined);
  };
  registerShutdown(stop);
  return stop;
}
