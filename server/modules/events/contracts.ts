export const DOMAIN_EVENT_TYPES = [
  "business.approved",
  "business.live_status_changed",
  "catalogue.item_availability_changed",
  "order.placed",
  "order.ready_for_dispatch",
  "dispatch.assigned",
  "dispatch.delivered",
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

export type DomainEventEnvelope<TPayload = Record<string, unknown>> = {
  domain: string;
  eventType: DomainEventType;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
  deduplicationKey: string;
};

export function createDomainEvent<TPayload>(event: DomainEventEnvelope<TPayload>): DomainEventEnvelope<TPayload> {
  if (!event.domain.trim() || !event.aggregateType.trim() || !event.aggregateId.trim() || !event.deduplicationKey.trim()) throw new Error("Domain event identity fields are required.");
  if (!DOMAIN_EVENT_TYPES.includes(event.eventType)) throw new Error("Unsupported domain event type.");
  return event;
}
