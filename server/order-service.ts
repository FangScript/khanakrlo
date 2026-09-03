import { and, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm";

import {
  accountProfiles,
  auditEvents,
  businessCommissionPolicies,
  businessHours,
  businessOrganisations,
  businessOutlets,
  businessStaffMemberships,
  cloudKitchens,
  customerAddresses,
  deliveryRouteSnapshots,
  codCollections,
  domainOutboxEvents,
  dispatchScoreSnapshots,
  kitchenBrands,
  menuCategories,
  menuItems,
  menuModifiers,
  orderItemModifiers,
  orderItems,
  orderKitchenAcknowledgements,
  orders,
  orderStatusHistory,
  paymentLedgerEntries,
  riderAssignments,
  riderAvailability,
  riderCashAccounts,
  riderCashAccountEntries,
  riderCashSettlementReceipts,
  riderCommandReceipts,
  riderLocationUpdates,
  riderTrackingSessions,
  serviceZones,
  settlementLedgerEntries,
  workspaceMemberships,
} from "../drizzle/schema";
import { canTransitionOrder, type OrderStatus } from "../shared/order";
import { distanceMeters, estimateCourierMinutes } from "../shared/delivery";
import { isBusinessOpenAt } from "../shared/business-hours";
import type { OrderPlaceInput, OrderQuoteInput, RiderCashHistoryFilterInput, RiderCommandInput } from "./modules/contracts/orders";
import { DomainError } from "./modules/gateway/domain-error";
import { getDb } from "./db";
import { createUserNotification } from "./notification-service";
import { computeDeliveryRoute } from "./delivery-routing-service";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new DomainError("UNAVAILABLE", "Order services are temporarily unavailable.");
  return db;
}

type CheckoutLine = {
  menuItemId: number;
  dishName: string;
  dishDescription: string | null;
  dishImageKey: string | null;
  unitPriceMinor: number;
  modifierTotalMinor: number;
  lineTotalMinor: number;
  quantity: number;
  prepTimeMinutes: number;
  modifiers: Array<{ menuModifierId: number; modifierName: string; unitPriceMinor: number; quantity: number }>;
};

type CheckoutQuote = {
  organisationId: number;
  outletId: number | null;
  kitchenBrandId: number | null;
  lines: CheckoutLine[];
  itemSubtotalMinor: number;
  deliveryFeeMinor: number;
  serviceFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  commission: { policyId: number; rateBps: number; commissionableSubtotalMinor: number; platformCommissionMinor: number; restaurantPayableMinor: number; riderCashCustodyMinor: number };
  delivery: { addressId: number; recipientName: string; phoneE164: string; addressLine1: string; addressLine2: string | null; city: string; instructions: string | null; latitudeE6: number; longitudeE6: number; zoneId: number; distanceMeters: number | null; estimatedCourierMinutes: number | null; estimatedTotalMinutes: number | null };
};

function publicOrderId() {
  return `KK-${crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
}

function eventKey(eventType: string, aggregateId: number) {
  return `${eventType}:${aggregateId}:${crypto.randomUUID()}`;
}

async function calculateQuote(db: any, userId: number, input: OrderQuoteInput): Promise<CheckoutQuote> {
  const address = (await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, input.deliveryAddressId), eq(customerAddresses.userId, userId), isNull(customerAddresses.archivedAt))).limit(1))[0];
  if (!address) throw new DomainError("NOT_FOUND", "Choose a saved delivery address before checkout.");
  const [itemRows, modifierRows, categoryRows, outletRows, kitchenRows, brandRows, organisationRows, zoneRows, commissionPolicies, hoursRows] = await Promise.all([
    db.select().from(menuItems), db.select().from(menuModifiers), db.select().from(menuCategories), db.select().from(businessOutlets), db.select().from(cloudKitchens), db.select().from(kitchenBrands), db.select().from(businessOrganisations), db.select().from(serviceZones), db.select().from(businessCommissionPolicies), db.select().from(businessHours),
  ]);
  const requestedItemIds = new Set(input.items.map((line) => line.menuItemId));
  const requestedItems = itemRows.filter((item: typeof menuItems.$inferSelect) => requestedItemIds.has(item.id));
  if (requestedItems.length !== requestedItemIds.size) throw new DomainError("NOT_FOUND", "One or more requested dishes were not found.");

  const resolved = input.items.map((request) => {
    const item = requestedItems.find((candidate: typeof menuItems.$inferSelect) => candidate.id === request.menuItemId)!;
    const category = categoryRows.find((candidate: typeof menuCategories.$inferSelect) => candidate.id === item.categoryId);
    if (!category || category.archivedAt || !category.isActive || item.archivedAt || !item.isAvailable) throw new DomainError("CONFLICT", `${item.name} is no longer available.`);
    let organisationId: number | null = null;
    let outletId: number | null = null;
    let kitchenBrandId: number | null = null;
    if (category.outletId) {
      const outlet = outletRows.find((candidate: typeof businessOutlets.$inferSelect) => candidate.id === category.outletId);
      if (!outlet || outlet.isPaused || outlet.status === "suspended") throw new DomainError("CONFLICT", "This Restaurant is not accepting orders.");
      organisationId = outlet.organisationId; outletId = outlet.id;
    } else if (category.kitchenBrandId) {
      const brand = brandRows.find((candidate: typeof kitchenBrands.$inferSelect) => candidate.id === category.kitchenBrandId);
      const kitchen = brand ? kitchenRows.find((candidate: typeof cloudKitchens.$inferSelect) => candidate.id === brand.cloudKitchenId) : null;
      if (!brand || !brand.isActive || !kitchen || kitchen.isPaused || kitchen.status === "suspended") throw new DomainError("CONFLICT", "This Cloud Kitchen is not accepting orders.");
      organisationId = kitchen.organisationId; kitchenBrandId = brand.id;
    }
    const organisation = organisationRows.find((candidate: typeof businessOrganisations.$inferSelect) => candidate.id === organisationId);
    if (!organisation || organisation.status !== "live") throw new DomainError("CONFLICT", "This Business is not currently live for orders.");
    const selectedModifierIds = [...new Set(request.modifierIds)];
    const availableModifiers = modifierRows.filter((modifier: typeof menuModifiers.$inferSelect) => modifier.menuItemId === item.id && modifier.isAvailable && !modifier.archivedAt);
    if (selectedModifierIds.some((id) => !availableModifiers.some((modifier: typeof menuModifiers.$inferSelect) => modifier.id === id))) throw new DomainError("CONFLICT", `A selected modifier for ${item.name} is no longer available.`);
    if (availableModifiers.some((modifier: typeof menuModifiers.$inferSelect) => modifier.isRequired && !selectedModifierIds.includes(modifier.id))) throw new DomainError("VALIDATION", `Select the required option for ${item.name}.`);
    const modifiers = availableModifiers.filter((modifier: typeof menuModifiers.$inferSelect) => selectedModifierIds.includes(modifier.id)).map((modifier: typeof menuModifiers.$inferSelect) => ({ menuModifierId: modifier.id, modifierName: modifier.name, unitPriceMinor: modifier.priceMinor, quantity: 1 }));
    const modifierTotalMinor = modifiers.reduce((sum: number, modifier: { unitPriceMinor: number; quantity: number }) => sum + modifier.unitPriceMinor * modifier.quantity, 0);
    return { menuItemId: item.id, dishName: item.name, dishDescription: item.description, dishImageKey: item.imageKey, unitPriceMinor: item.priceMinor, modifierTotalMinor, lineTotalMinor: (item.priceMinor + modifierTotalMinor) * request.quantity, quantity: request.quantity, prepTimeMinutes: item.prepTimeMinutes, modifiers, organisationId, outletId, kitchenBrandId };
  });
  const first = resolved[0];
  if (resolved.some((line) => line.organisationId !== first.organisationId || line.outletId !== first.outletId || line.kitchenBrandId !== first.kitchenBrandId)) throw new DomainError("VALIDATION", "A checkout can contain dishes from one Restaurant or Cloud Kitchen brand only.");
  const kitchen = first.kitchenBrandId ? kitchenRows.find((candidate: typeof cloudKitchens.$inferSelect) => candidate.organisationId === first.organisationId) : null;
  const scopedHours = first.outletId ? hoursRows.filter((hour: typeof businessHours.$inferSelect) => hour.scopeType === "outlet" && hour.scopeId === first.outletId) : hoursRows.filter((hour: typeof businessHours.$inferSelect) => hour.scopeType === "cloud_kitchen" && hour.scopeId === kitchen?.id);
  if (!isBusinessOpenAt(scopedHours)) throw new DomainError("CONFLICT", "This Business is currently closed.");
  const zone = zoneRows.find((candidate: typeof serviceZones.$inferSelect) => candidate.organisationId === first.organisationId && ((first.outletId !== null && candidate.outletId === first.outletId) || (first.kitchenBrandId !== null && candidate.cloudKitchenId === kitchenRows.find((kitchen: typeof cloudKitchens.$inferSelect) => kitchen.organisationId === first.organisationId)?.id)) && candidate.isActive);
  if (!zone) throw new DomainError("CONFLICT", "This Business does not currently have an active delivery zone.");
  if (zone.city.trim().toLocaleLowerCase() !== address.city.trim().toLocaleLowerCase()) throw new DomainError("CONFLICT", `${address.label} is outside this Business's delivery city.`);
  const outlet = first.outletId ? outletRows.find((candidate: typeof businessOutlets.$inferSelect) => candidate.id === first.outletId) : null;
  const origin = zone.centerLatitudeE6 !== null && zone.centerLongitudeE6 !== null ? { latitudeE6: zone.centerLatitudeE6, longitudeE6: zone.centerLongitudeE6 } : outlet?.latitudeE6 !== null && outlet?.latitudeE6 !== undefined && outlet?.longitudeE6 !== null && outlet?.longitudeE6 !== undefined ? { latitudeE6: outlet.latitudeE6, longitudeE6: outlet.longitudeE6 } : null;
  const deliveryDistance = origin ? distanceMeters(origin, address) : null;
  if (deliveryDistance !== null && zone.radiusMeters !== null && deliveryDistance > zone.radiusMeters) throw new DomainError("CONFLICT", `${address.label} is outside the ${zone.name} delivery radius.`);
  const estimatedCourierMinutes = deliveryDistance === null ? null : estimateCourierMinutes(deliveryDistance, zone.courierBaseMinutes, zone.courierMinutesPerKm);
  const estimatedTotalMinutes = estimatedCourierMinutes === null ? null : estimatedCourierMinutes + Math.max(...resolved.map((line) => line.prepTimeMinutes));
  const itemSubtotalMinor = resolved.reduce((sum, line) => sum + line.lineTotalMinor, 0);
  if (itemSubtotalMinor < zone.minimumOrderMinor) throw new DomainError("VALIDATION", `Minimum order is PKR ${(zone.minimumOrderMinor / 100).toFixed(0)} for this Business.`);
  const deliveryFeeMinor = zone.deliveryFeeMinor;
  const serviceFeeMinor = 0;
  const discountMinor = 0;
  const now = new Date();
  const policy = commissionPolicies.filter((candidate: typeof businessCommissionPolicies.$inferSelect) => candidate.organisationId === first.organisationId && candidate.effectiveFrom <= now && (candidate.effectiveUntil === null || candidate.effectiveUntil > now)).sort((left: typeof businessCommissionPolicies.$inferSelect, right: typeof businessCommissionPolicies.$inferSelect) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0];
  if (!policy) throw new DomainError("CONFLICT", "This Business has no active commission policy and cannot accept pilot orders.");
  if (policy.commissionRateBps < 1_200 || policy.commissionRateBps > 1_500) throw new DomainError("CONFLICT", "This Business commission policy is outside the approved 12–15% pilot range.");
  const commissionableSubtotalMinor = Math.max(0, itemSubtotalMinor - discountMinor);
  const platformCommissionMinor = Math.round((commissionableSubtotalMinor * policy.commissionRateBps) / 10_000);
  const restaurantPayableMinor = commissionableSubtotalMinor - platformCommissionMinor;
  const totalMinor = itemSubtotalMinor + deliveryFeeMinor + serviceFeeMinor - discountMinor;
  return { organisationId: first.organisationId!, outletId: first.outletId, kitchenBrandId: first.kitchenBrandId, lines: resolved.map(({ organisationId: _organisationId, outletId: _outletId, kitchenBrandId: _kitchenBrandId, ...line }) => line), itemSubtotalMinor, deliveryFeeMinor, serviceFeeMinor, discountMinor, totalMinor, commission: { policyId: policy.id, rateBps: policy.commissionRateBps, commissionableSubtotalMinor, platformCommissionMinor, restaurantPayableMinor, riderCashCustodyMinor: totalMinor }, delivery: { addressId: address.id, recipientName: address.recipientName, phoneE164: address.phoneE164, addressLine1: address.addressLine1, addressLine2: address.addressLine2, city: address.city, instructions: address.instructions, latitudeE6: address.latitudeE6, longitudeE6: address.longitudeE6, zoneId: zone.id, distanceMeters: deliveryDistance, estimatedCourierMinutes, estimatedTotalMinutes } };
}

async function ownedBusinessOrganisationId(db: any, userId: number) {
  const membership = (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "business"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
  if (!membership?.applicationId) throw new DomainError("FORBIDDEN", "An approved active Business workspace is required.");
  const organisation = (await db.select().from(businessOrganisations).where(and(eq(businessOrganisations.applicationId, membership.applicationId), eq(businessOrganisations.ownerUserId, userId))).limit(1))[0];
  if (!organisation) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
  return organisation.id;
}

async function requireActiveRider(db: any, userId: number) {
  const membership = (await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceType, "rider"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
  if (!membership) throw new DomainError("FORBIDDEN", "An approved active Rider workspace is required.");
  return membership;
}

async function hydrateOrder(db: any, order: typeof orders.$inferSelect) {
  const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  const lineIds = lines.map((line: typeof orderItems.$inferSelect) => line.id);
  const [modifiers, history, assignmentRows, trackingRows] = await Promise.all([
    lineIds.length ? db.select().from(orderItemModifiers).where(inArray(orderItemModifiers.orderItemId, lineIds)) : [],
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)),
    db.select().from(riderAssignments).where(eq(riderAssignments.orderId, order.id)).limit(1),
    db.select().from(riderTrackingSessions).where(and(eq(riderTrackingSessions.orderId, order.id), eq(riderTrackingSessions.status, "active"))).limit(1),
  ]);
  const assignment = assignmentRows[0] ?? null;
  const trackingSession = trackingRows[0] ?? null;
  const profile = assignment ? (await db.select().from(accountProfiles).where(eq(accountProfiles.userId, assignment.riderUserId)).limit(1))[0] ?? null : null;
  const latest = assignment && trackingSession && (order.status === "assigned" || order.status === "picked_up") ? (await db.select().from(riderLocationUpdates).where(and(eq(riderLocationUpdates.orderId, order.id), eq(riderLocationUpdates.riderUserId, assignment.riderUserId))).orderBy(desc(riderLocationUpdates.createdAt)).limit(1))[0] ?? null : null;
  const freshnessSeconds = latest ? Math.max(0, Math.floor((Date.now() - latest.createdAt.getTime()) / 1_000)) : null;
  return { ...order, lines: lines.map((line: typeof orderItems.$inferSelect) => ({ ...line, modifiers: modifiers.filter((modifier: typeof orderItemModifiers.$inferSelect) => modifier.orderItemId === line.id) })), history, rider: assignment ? { riderUserId: assignment.riderUserId, displayName: profile?.givenName ?? "Your Rider", assignedAt: assignment.assignedAt, location: latest ? { latitudeE6: latest.latitudeE6, longitudeE6: latest.longitudeE6, accuracyMeters: latest.accuracyMeters, updatedAt: latest.createdAt, freshnessSeconds, isFresh: freshnessSeconds !== null && freshnessSeconds <= 90 } : null } : null };
}

export async function quoteOrder(_userId: number, input: OrderQuoteInput) {
  const db = await requireDb();
  return calculateQuote(db, _userId, input);
}

export async function placeOrder(userId: number, input: OrderPlaceInput) {
  const db = await requireDb();
  const duplicate = (await db.select().from(orders).where(and(eq(orders.customerUserId, userId), eq(orders.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (duplicate) return hydrateOrder(db, duplicate);
  return db.transaction(async (tx) => {
    const existing = (await tx.select().from(orders).where(and(eq(orders.customerUserId, userId), eq(orders.idempotencyKey, input.idempotencyKey))).limit(1))[0];
    if (existing) return hydrateOrder(tx, existing);
    const quote = await calculateQuote(tx, userId, input);
    const publicId = publicOrderId();
    await tx.insert(orders).values({ publicId, customerUserId: userId, organisationId: quote.organisationId, outletId: quote.outletId, kitchenBrandId: quote.kitchenBrandId, paymentMethod: input.paymentMethod, paymentStatus: "cash_due", deliveryRecipientName: quote.delivery.recipientName, deliveryPhoneE164: quote.delivery.phoneE164, deliveryAddressLine1: quote.delivery.addressLine1, deliveryAddressLine2: quote.delivery.addressLine2, deliveryCity: quote.delivery.city, deliveryInstructions: quote.delivery.instructions, deliveryAddressId: quote.delivery.addressId, deliveryLatitudeE6: quote.delivery.latitudeE6, deliveryLongitudeE6: quote.delivery.longitudeE6, deliveryZoneId: quote.delivery.zoneId, deliveryDistanceMeters: quote.delivery.distanceMeters, estimatedCourierMinutes: quote.delivery.estimatedCourierMinutes, estimatedTotalMinutes: quote.delivery.estimatedTotalMinutes, itemSubtotalMinor: quote.itemSubtotalMinor, deliveryFeeMinor: quote.deliveryFeeMinor, serviceFeeMinor: quote.serviceFeeMinor, discountMinor: quote.discountMinor, totalMinor: quote.totalMinor, commissionPolicyId: quote.commission.policyId, commissionRateBps: quote.commission.rateBps, commissionableSubtotalMinor: quote.commission.commissionableSubtotalMinor, platformCommissionMinor: quote.commission.platformCommissionMinor, restaurantPayableMinor: quote.commission.restaurantPayableMinor, riderCashCustodyMinor: quote.commission.riderCashCustodyMinor, idempotencyKey: input.idempotencyKey });
    const order = (await tx.select().from(orders).where(eq(orders.publicId, publicId)).limit(1))[0];
    if (!order) throw new DomainError("INTERNAL", "The order could not be created.");
    await tx.insert(settlementLedgerEntries).values([
      { orderId: order.id, organisationId: quote.organisationId, partyType: "platform", entryType: "commission", amountMinor: quote.commission.platformCommissionMinor },
      { orderId: order.id, organisationId: quote.organisationId, partyType: "restaurant", entryType: "restaurant_payable", amountMinor: quote.commission.restaurantPayableMinor },
      { orderId: order.id, organisationId: quote.organisationId, partyType: "rider", entryType: "rider_cash_custody", amountMinor: quote.commission.riderCashCustodyMinor },
    ]);
    await tx.insert(paymentLedgerEntries).values([
      { orderId: order.id, organisationId: quote.organisationId, partyType: "customer", entryType: "order_total_due", amountMinor: quote.totalMinor, status: "pending", reference: `order-total:${order.id}` },
      { orderId: order.id, organisationId: quote.organisationId, partyType: "business", entryType: "business_payable", amountMinor: quote.commission.restaurantPayableMinor, status: "pending", reference: `business-payable:${order.id}` },
      { orderId: order.id, organisationId: quote.organisationId, partyType: "platform", entryType: "platform_commission", amountMinor: quote.commission.platformCommissionMinor, status: "pending", reference: `platform-commission:${order.id}` },
    ]);
    for (const line of quote.lines) {
      await tx.insert(orderItems).values({ orderId: order.id, menuItemId: line.menuItemId, dishName: line.dishName, dishDescription: line.dishDescription, dishImageKey: line.dishImageKey, unitPriceMinor: line.unitPriceMinor, modifierTotalMinor: line.modifierTotalMinor, lineTotalMinor: line.lineTotalMinor, quantity: line.quantity, prepTimeMinutes: line.prepTimeMinutes });
      const storedLine = (await tx.select().from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.menuItemId, line.menuItemId))).limit(1))[0];
      if (!storedLine) throw new DomainError("INTERNAL", "The order item could not be recorded.");
      if (line.modifiers.length) await tx.insert(orderItemModifiers).values(line.modifiers.map((modifier) => ({ orderItemId: storedLine.id, ...modifier })));
    }
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: null, toStatus: "placed", actorUserId: userId, note: "Customer placed COD order" });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(order.id), action: "order_placed", nextValue: JSON.stringify({ publicId, totalMinor: quote.totalMinor, paymentMethod: input.paymentMethod, commissionRateBps: quote.commission.rateBps, platformCommissionMinor: quote.commission.platformCommissionMinor }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: "order.placed", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId, organisationId: quote.organisationId, customerUserId: userId, totalMinor: quote.totalMinor, commissionRateBps: quote.commission.rateBps, platformCommissionMinor: quote.commission.platformCommissionMinor }), deduplicationKey: eventKey("order.placed", order.id) });
    return hydrateOrder(tx, order);
  });
}

export async function listMyOrders(userId: number) {
  const db = await requireDb();
  const rows = await db.select().from(orders).where(eq(orders.customerUserId, userId));
  return Promise.all(rows.sort((left, right) => right.placedAt.getTime() - left.placedAt.getTime()).map((order) => hydrateOrder(db, order)));
}

export async function getOrderForActor(userId: number, orderId: number) {
  const db = await requireDb();
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
  if (order.customerUserId !== userId) {
    const assignment = (await db.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, order.id), eq(riderAssignments.riderUserId, userId))).limit(1))[0];
    if (!assignment) {
      const organisationId = await ownedBusinessOrganisationId(db, userId);
      if (order.organisationId !== organisationId) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
    }
  }
  return hydrateOrder(db, order);
}

/** Returns an advisory live-delivery route only to an actor already authorized to open the order. */
export async function getDeliveryRouteForActor(userId: number, orderId: number) {
  const db = await requireDb();
  const order = await getOrderForActor(userId, orderId);
  const riderLocation = order.rider?.location;
  if (!riderLocation || order.deliveryLatitudeE6 === null || order.deliveryLongitudeE6 === null) return { status: "provider_unavailable" as const, provider: "none" as const, routeRevision: null, distanceMeters: null, durationSeconds: null, etaMinutes: null, encodedPolyline: null, metadata: { reason: "A fresh Rider position and delivery coordinate are required." } };
  const result = await computeDeliveryRoute({ latitudeE6: riderLocation.latitudeE6, longitudeE6: riderLocation.longitudeE6 }, { latitudeE6: order.deliveryLatitudeE6, longitudeE6: order.deliveryLongitudeE6 });
  const existing = (await db.select().from(deliveryRouteSnapshots).where(and(eq(deliveryRouteSnapshots.orderId, orderId), eq(deliveryRouteSnapshots.routeRevision, result.routeRevision))).limit(1))[0];
  if (!existing) await db.insert(deliveryRouteSnapshots).values({ orderId, status: result.status, distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds, etaMinutes: result.etaMinutes, provider: result.provider, routeRevision: result.routeRevision, responseMetadataJson: JSON.stringify(result.metadata) });
  return result;
}

export async function listBusinessOrders(userId: number) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  const rows = await db.select().from(orders).where(eq(orders.organisationId, organisationId));
  return Promise.all(rows.sort((left, right) => right.placedAt.getTime() - left.placedAt.getTime()).map((order) => hydrateOrder(db, order)));
}

export async function listAvailableRiders(userId: number) {
  const db = await requireDb();
  await ownedBusinessOrganisationId(db, userId);
  const memberships = await db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceType, "rider"), eq(workspaceMemberships.status, "active")));
  const onlineRows = await db.select().from(riderAvailability).where(eq(riderAvailability.status, "online"));
  const onlineIds = new Set(onlineRows.map((availability: typeof riderAvailability.$inferSelect) => availability.riderUserId));
  const riderIds = memberships.filter((membership: typeof workspaceMemberships.$inferSelect) => onlineIds.has(membership.userId)).map((membership: typeof workspaceMemberships.$inferSelect) => membership.userId);
  if (!riderIds.length) return [];
  const profiles = await db.select().from(accountProfiles).where(inArray(accountProfiles.userId, riderIds));
  return riderIds.map((riderUserId: number) => ({ riderUserId, displayName: profiles.find((profile: typeof accountProfiles.$inferSelect) => profile.userId === riderUserId)?.givenName ?? `Rider ${riderUserId}` }));
}

/** Deterministic pilot ranking: active, online Riders receive a score reduced by active workload and stale availability. No compensation, acceptance, or hidden demographic factor is used. */
export async function getDispatchRecommendations(userId: number, orderId: number) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
  if (order.organisationId !== organisationId) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
  if (order.status !== "ready_for_pickup") throw new DomainError("CONFLICT", "Dispatch recommendations are available only for ready-for-pickup orders.");
  const [memberships, availabilityRows, assignmentRows, allOrders, profiles] = await Promise.all([
    db.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.workspaceType, "rider"), eq(workspaceMemberships.status, "active"))),
    db.select().from(riderAvailability),
    db.select().from(riderAssignments).where(eq(riderAssignments.offerStatus, "accepted")),
    db.select().from(orders),
    db.select().from(accountProfiles),
  ]);
  const orderById = new Map(allOrders.map((candidate: typeof orders.$inferSelect) => [candidate.id, candidate]));
  const activeWorkload = new Map<number, number>();
  for (const assignment of assignmentRows as typeof riderAssignments.$inferSelect[]) {
    const assignedOrder = orderById.get(assignment.orderId);
    if (assignedOrder && (assignedOrder.status === "assigned" || assignedOrder.status === "picked_up")) activeWorkload.set(assignment.riderUserId, (activeWorkload.get(assignment.riderUserId) ?? 0) + 1);
  }
  const availabilityByRider = new Map((availabilityRows as typeof riderAvailability.$inferSelect[]).map((row) => [row.riderUserId, row]));
  const profileByRider = new Map((profiles as typeof accountProfiles.$inferSelect[]).map((row) => [row.userId, row]));
  const now = new Date();
  const recommendations = (memberships as typeof workspaceMemberships.$inferSelect[]).map((membership) => {
    const availability = availabilityByRider.get(membership.userId);
    const workload = activeWorkload.get(membership.userId) ?? 0;
    const availabilityAgeSeconds = availability ? Math.max(0, Math.floor((now.getTime() - availability.updatedAt.getTime()) / 1_000)) : Number.MAX_SAFE_INTEGER;
    const eligible = availability?.status === "online";
    const workloadPenalty = workload * 200;
    const freshnessPenalty = Math.min(60, Math.floor(availabilityAgeSeconds / 15));
    const score = eligible ? Math.max(0, 1_000 - workloadPenalty - freshnessPenalty) : 0;
    const explanation = { eligibility: eligible ? "eligible" : "ineligible", reasons: eligible ? ["Rider is online", `Active workload: ${workload}`, `Availability last updated ${availabilityAgeSeconds}s ago`] : [availability ? "Rider is offline" : "Rider has not set availability"], scoreComponents: { base: eligible ? 1_000 : 0, workloadPenalty, freshnessPenalty } };
    return { riderUserId: membership.userId, displayName: profileByRider.get(membership.userId)?.givenName ?? `Rider ${membership.userId}`, score, activeWorkload: workload, availabilityAgeSeconds, eligibility: eligible ? "eligible" as const : "ineligible" as const, explanation };
  }).sort((left, right) => right.score - left.score || left.activeWorkload - right.activeWorkload || left.riderUserId - right.riderUserId);
  for (const recommendation of recommendations) {
    await db.insert(dispatchScoreSnapshots).values({ orderId, riderUserId: recommendation.riderUserId, score: recommendation.score, activeWorkload: recommendation.activeWorkload, availabilityAgeSeconds: recommendation.availabilityAgeSeconds, eligibility: recommendation.eligibility, explanationJson: JSON.stringify(recommendation.explanation), computedAt: now }).onConflictDoUpdate({ target: [dispatchScoreSnapshots.orderId, dispatchScoreSnapshots.riderUserId], set: { score: recommendation.score, activeWorkload: recommendation.activeWorkload, availabilityAgeSeconds: recommendation.availabilityAgeSeconds, eligibility: recommendation.eligibility, explanationJson: JSON.stringify(recommendation.explanation), computedAt: now } });
  }
  return recommendations;
}

export async function offerRecommendedRider(userId: number, orderId: number) {
  const recommendations = await getDispatchRecommendations(userId, orderId);
  const recommendation = recommendations.find((candidate) => candidate.eligibility === "eligible");
  if (!recommendation) throw new DomainError("CONFLICT", "No eligible online Rider is available for this order.");
  return assignRiderToOrder(userId, { orderId, riderUserId: recommendation.riderUserId });
}

export async function getBusinessStatement(userId: number) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  const entries = await db.select().from(paymentLedgerEntries).where(eq(paymentLedgerEntries.organisationId, organisationId)).orderBy(desc(paymentLedgerEntries.createdAt)).limit(250);
  const sum = (entryType: typeof paymentLedgerEntries.$inferSelect["entryType"], statuses?: Array<typeof paymentLedgerEntries.$inferSelect["status"]>) => entries.filter((entry: typeof paymentLedgerEntries.$inferSelect) => entry.entryType === entryType && (!statuses || statuses.includes(entry.status))).reduce((total: number, entry: typeof paymentLedgerEntries.$inferSelect) => total + entry.amountMinor, 0);
  return { entries, totals: { grossOrderValueMinor: sum("order_total_due"), platformCommissionMinor: sum("platform_commission"), businessPayablePendingMinor: sum("business_payable", ["pending", "approved"]), businessPayableSettledMinor: sum("business_payable", ["settled"]), refundsRequestedMinor: sum("refund_requested"), refundsSettledMinor: sum("refund_settled") }, settlementStatus: "pilot_manual_payout_review" as const };
}

export async function getRiderStatement(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const entries = await db.select().from(paymentLedgerEntries).where(eq(paymentLedgerEntries.riderUserId, userId)).orderBy(desc(paymentLedgerEntries.createdAt)).limit(250);
  const sum = (entryType: typeof paymentLedgerEntries.$inferSelect["entryType"], statuses?: Array<typeof paymentLedgerEntries.$inferSelect["status"]>) => entries.filter((entry: typeof paymentLedgerEntries.$inferSelect) => entry.entryType === entryType && (!statuses || statuses.includes(entry.status))).reduce((total: number, entry: typeof paymentLedgerEntries.$inferSelect) => total + entry.amountMinor, 0);
  return { entries, totals: { cashCollectedMinor: sum("cash_collected"), cashCustodyOpenMinor: sum("cash_collected", ["pending", "approved"]), cashCustodySettledMinor: sum("cash_collected", ["settled"]), commissionReservedMinor: 0 }, earningsStatus: "requires_payout_policy" as const, note: "Rider compensation is intentionally not calculated until a payout policy is approved." };
}

export async function getRiderAvailability(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return (await db.select().from(riderAvailability).where(eq(riderAvailability.riderUserId, userId)).limit(1))[0] ?? { riderUserId: userId, status: "offline" as const, updatedAt: null };
}

export async function setRiderAvailability(userId: number, status: "online" | "offline") {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const now = new Date();
  await db.insert(riderAvailability).values({ riderUserId: userId, status, updatedAt: now }).onConflictDoUpdate({ target: riderAvailability.riderUserId, set: { status, updatedAt: now } });
  await db.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_availability", entityId: String(userId), action: `rider_${status}`, nextValue: JSON.stringify({ status, updatedAt: now.toISOString() }) });
  await db.insert(domainOutboxEvents).values({ domain: "dispatch", eventType: `rider.availability_${status}`, aggregateType: "rider", aggregateId: String(userId), payload: JSON.stringify({ riderUserId: userId, status }), deduplicationKey: eventKey(`rider.availability_${status}`, userId) });
  return { riderUserId: userId, status, updatedAt: now };
}

export async function getRiderCashCustodySummary(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const collections = await db.select().from(codCollections).where(eq(codCollections.riderUserId, userId));
  const orderIds = collections.map((collection: typeof codCollections.$inferSelect) => collection.orderId);
  const orderRows = orderIds.length ? await db.select().from(orders).where(inArray(orders.id, orderIds)) : [];
  const orderById = new Map(orderRows.map((order: typeof orders.$inferSelect) => [order.id, order]));
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startWeek = new Date(startToday); startWeek.setDate(startToday.getDate() - ((startToday.getDay() + 6) % 7));
  const totalSince = (from: Date) => collections.filter((collection: typeof codCollections.$inferSelect) => collection.confirmedAt >= from).reduce((sum: number, collection: typeof codCollections.$inferSelect) => sum + collection.collectedMinor, 0);
  const varianceSince = (from: Date) => collections.filter((collection: typeof codCollections.$inferSelect) => collection.confirmedAt >= from).reduce((sum: number, collection: typeof codCollections.$inferSelect) => sum + collection.varianceMinor, 0);
  const openCustodyMinor = collections.filter((collection: typeof codCollections.$inferSelect) => orderById.get(collection.orderId)?.settlementStatus === "unsettled").reduce((sum: number, collection: typeof codCollections.$inferSelect) => sum + collection.collectedMinor, 0);
  return { todayCollectedMinor: totalSince(startToday), weekCollectedMinor: totalSince(startWeek), todayVarianceMinor: varianceSince(startToday), weekVarianceMinor: varianceSince(startWeek), openCustodyMinor, confirmedCollections: collections.length, earningsStatus: "requires_payout_policy" as const };
}

async function reserveRiderCommission(tx: any, riderUserId: number, order: typeof orders.$inferSelect) {
  const riderCashThresholdMinor = 1_000_000;
  const existing = (await tx.select().from(riderCashAccounts).where(eq(riderCashAccounts.riderUserId, riderUserId)).limit(1))[0];
  if (!existing) { await tx.insert(riderCashAccounts).values({ riderUserId, balanceMinor: 0, status: "active" }); }
  const account = existing ?? (await tx.select().from(riderCashAccounts).where(eq(riderCashAccounts.riderUserId, riderUserId)).limit(1))[0];
  if (!account || account.status !== "active") throw new DomainError("CONFLICT", "Your Rider Cash Account is not eligible for a new COD job.");
  if (order.paymentMethod === "cod" && account.balanceMinor > riderCashThresholdMinor) throw new DomainError("CONFLICT", "Your outstanding Rider Cash Account balance exceeds the PKR 10,000 pilot limit. Submit a remittance for reconciliation before accepting another COD job.");
  const commissionMinor = order.paymentMethod === "cod" ? order.platformCommissionMinor : 0;
  const nextBalance = account.balanceMinor - commissionMinor;
  await tx.update(riderCashAccounts).set({ balanceMinor: nextBalance, updatedAt: new Date() }).where(eq(riderCashAccounts.id, account.id));
  if (commissionMinor > 0) await tx.insert(riderCashAccountEntries).values({ riderCashAccountId: account.id, riderUserId, orderId: order.id, entryType: "commission_reserved", amountMinor: -commissionMinor, balanceAfterMinor: nextBalance, reference: `commission:${order.publicId}` });
  return { accountId: account.id, commissionMinor, balanceMinor: nextBalance, riderCashThresholdMinor };
}

export async function getRiderCashAccount(userId: number, filter?: RiderCashHistoryFilterInput) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const account = (await db.select().from(riderCashAccounts).where(eq(riderCashAccounts.riderUserId, userId)).limit(1))[0] ?? { riderUserId: userId, balanceMinor: 0, status: "active" as const, updatedAt: null };
  const filters = [eq(riderCashAccountEntries.riderUserId, userId)];
  if (filter?.fromDate) filters.push(gte(riderCashAccountEntries.createdAt, new Date(filter.fromDate)));
  if (filter?.toDate) filters.push(lte(riderCashAccountEntries.createdAt, new Date(filter.toDate)));
  if (filter?.entryTypes?.length) filters.push(inArray(riderCashAccountEntries.entryType, filter.entryTypes));
  const entries = account.id ? await db.select().from(riderCashAccountEntries).where(and(...filters)).orderBy(desc(riderCashAccountEntries.createdAt)).limit(100) : [];
  const receipts = account.id ? await db.select().from(riderCashSettlementReceipts).where(eq(riderCashSettlementReceipts.riderUserId, userId)).orderBy(desc(riderCashSettlementReceipts.issuedAt)).limit(50) : [];
  return { account, entries, receipts };
}

export async function getRiderSettlementReceipt(userId: number, receiptId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const receipt = (await db.select().from(riderCashSettlementReceipts).where(and(eq(riderCashSettlementReceipts.id, receiptId), eq(riderCashSettlementReceipts.riderUserId, userId))).limit(1))[0];
  if (!receipt) throw new DomainError("NOT_FOUND", "Settlement receipt not found.");
  return { ...receipt, reconciledOrderIds: JSON.parse(receipt.reconciledOrderIdsJson) as number[] };
}

export async function remitRiderCash(userId: number, amountMinor: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const account = (await tx.select().from(riderCashAccounts).where(eq(riderCashAccounts.riderUserId, userId)).limit(1))[0];
    if (!account) throw new DomainError("NOT_FOUND", "Rider Cash Account not found.");
    const assignments = (await tx.select().from(riderAssignments).where(and(eq(riderAssignments.riderUserId, userId), eq(riderAssignments.offerStatus, "accepted"))));
    const orderIds = assignments.map((assignment: typeof riderAssignments.$inferSelect) => assignment.orderId);
    const unsettled = orderIds.length ? (await tx.select().from(orders).where(inArray(orders.id, orderIds))).filter((order: typeof orders.$inferSelect) => order.paymentMethod === "cod" && order.paymentStatus === "paid" && order.settlementStatus === "unsettled") : [];
    const outstandingMinor = unsettled.reduce((sum: number, order: typeof orders.$inferSelect) => sum + order.riderCashCustodyMinor, 0);
    if (!outstandingMinor) throw new DomainError("CONFLICT", "There is no COD custody ready for remittance.");
    if (amountMinor !== outstandingMinor) throw new DomainError("VALIDATION", "Remittance must match the server-calculated outstanding COD custody amount.");
    const now = new Date(); const nextBalance = account.balanceMinor - amountMinor;
    await tx.update(riderCashAccounts).set({ balanceMinor: nextBalance, updatedAt: now }).where(eq(riderCashAccounts.id, account.id));
    const remittanceReference = `remittance:${now.toISOString()}`;
    const [entryCreated] = await tx.insert(riderCashAccountEntries).values({ riderCashAccountId: account.id, riderUserId: userId, entryType: "settlement_adjustment", amountMinor: -amountMinor, balanceAfterMinor: nextBalance, reference: remittanceReference }).returning({ id: riderCashAccountEntries.id });
    const cashAccountEntryId = entryCreated.id;
    const reconciledOrderIds = unsettled.map((order: typeof orders.$inferSelect) => order.id);
    const receiptCode = `KK-SR-${userId}-${now.getTime()}-${cashAccountEntryId}`;
    const [receiptCreated] = await tx.insert(riderCashSettlementReceipts).values({ riderUserId: userId, riderCashAccountId: account.id, cashAccountEntryId, receiptCode, amountMinor, balanceAfterMinor: nextBalance, reconciledOrderIdsJson: JSON.stringify(reconciledOrderIds), issuedAt: now }).returning({ id: riderCashSettlementReceipts.id });
    const receiptId = receiptCreated.id;
    await tx.update(orders).set({ settlementStatus: "reconciled", updatedAt: now }).where(inArray(orders.id, reconciledOrderIds));
    await tx.update(paymentLedgerEntries).set({ status: "settled" }).where(and(inArray(paymentLedgerEntries.orderId, reconciledOrderIds), eq(paymentLedgerEntries.riderUserId, userId), eq(paymentLedgerEntries.entryType, "rider_cash_custody")));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_cash_account", entityId: String(account.id), action: "rider_remittance_submitted", nextValue: JSON.stringify({ amountMinor, orderIds: reconciledOrderIds, receiptCode }) });
    await tx.insert(domainOutboxEvents).values({ domain: "settlement", eventType: "rider.remittance_submitted", aggregateType: "rider", aggregateId: String(userId), payload: JSON.stringify({ riderUserId: userId, amountMinor, orderIds: reconciledOrderIds, receiptCode }), deduplicationKey: eventKey("rider.remittance_submitted", userId) });
    return { amountMinor, reconciledOrderIds, balanceMinor: nextBalance, receiptId, receiptCode };
  });
}

export async function assignRiderToOrder(userId: number, input: { orderId: number; riderUserId: number }) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
    if (order.organisationId !== organisationId) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
    if (order.status !== "ready_for_pickup") throw new DomainError("CONFLICT", "Only ready-for-pickup orders can be assigned to a Rider.");
    const rider = (await tx.select().from(workspaceMemberships).where(and(eq(workspaceMemberships.userId, input.riderUserId), eq(workspaceMemberships.workspaceType, "rider"), eq(workspaceMemberships.status, "active"))).limit(1))[0];
    if (!rider) throw new DomainError("VALIDATION", "Choose an approved active Rider.");
    const existing = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, order.id)).limit(1))[0];
    if (existing && existing.offerStatus === "accepted") throw new DomainError("CONFLICT", "This order has already been assigned.");
    const now = new Date();
    const offerExpiresAt = new Date(now.getTime() + 5 * 60_000);
    if (existing) await tx.update(riderAssignments).set({ riderUserId: input.riderUserId, assignedByUserId: userId, assignedAt: now, offerStatus: "offered", offerExpiresAt, respondedAt: null, updatedAt: now }).where(eq(riderAssignments.id, existing.id));
    else await tx.insert(riderAssignments).values({ orderId: order.id, riderUserId: input.riderUserId, assignedByUserId: userId, assignedAt: now, offerStatus: "offered", offerExpiresAt });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_offer", entityId: String(order.id), action: "rider_offer_created", nextValue: JSON.stringify({ riderUserId: input.riderUserId, orderId: order.id, offerExpiresAt }) });
    await tx.insert(domainOutboxEvents).values({ domain: "dispatch", eventType: "rider.offer_created", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, organisationId, riderUserId: input.riderUserId, offerExpiresAt: offerExpiresAt.toISOString() }), deduplicationKey: eventKey("rider.offer_created", order.id) });
    await createUserNotification({ recipientUserId: input.riderUserId, category: "rider_offer", title: "New delivery offer", body: `${order.publicId} is ready for pickup. Respond within five minutes.`, route: "/rider", orderId: order.id, deduplicationKey: `rider-offer:${order.id}:${input.riderUserId}:${offerExpiresAt.getTime()}` });
    return { ...(await hydrateOrder(tx, order)), offerExpiresAt };
  });
}

export async function acknowledgeKitchenOrder(userId: number, orderId: number) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
    if (order.organisationId !== organisationId) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
    if (order.status !== "placed") throw new DomainError("CONFLICT", "Only a newly placed order can be acknowledged in the KDS.");
    const existing = (await tx.select().from(orderKitchenAcknowledgements).where(eq(orderKitchenAcknowledgements.orderId, orderId)).limit(1))[0];
    if (existing) return { ...existing, duplicate: true };
    const now = new Date();
    await tx.insert(orderKitchenAcknowledgements).values({ orderId, acknowledgedByUserId: userId, acknowledgedAt: now });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(orderId), action: "kds_order_acknowledged", nextValue: JSON.stringify({ acknowledgedAt: now.toISOString() }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: "order.kds_acknowledged", aggregateType: "order", aggregateId: String(orderId), payload: JSON.stringify({ orderId, organisationId, acknowledgedByUserId: userId }), deduplicationKey: eventKey("order.kds_acknowledged", orderId) });
    return { orderId, acknowledgedAt: now, duplicate: false };
  });
}

export async function listRiderOffers(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const now = new Date();
  const rows = await db.select().from(riderAssignments).where(and(eq(riderAssignments.riderUserId, userId), eq(riderAssignments.offerStatus, "offered")));
  const active = rows.filter((row: typeof riderAssignments.$inferSelect) => row.offerExpiresAt && row.offerExpiresAt > now);
  const expired = rows.filter((row: typeof riderAssignments.$inferSelect) => !row.offerExpiresAt || row.offerExpiresAt <= now);
  if (expired.length) await db.update(riderAssignments).set({ offerStatus: "expired", respondedAt: now }).where(inArray(riderAssignments.id, expired.map((row: typeof riderAssignments.$inferSelect) => row.id)));
  return Promise.all(active.map(async (offer: typeof riderAssignments.$inferSelect) => ({ ...(await hydrateOrder(db, (await db.select().from(orders).where(eq(orders.id, offer.orderId)).limit(1))[0])), offerExpiresAt: offer.offerExpiresAt })));
}

export async function respondToRiderOffer(userId: number, input: { orderId: number; decision: "accept" | "decline"; note?: string }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const offer = (await tx.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, userId))).limit(1))[0];
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!offer || !order) throw new DomainError("NOT_FOUND", "Rider job offer not found.");
    const now = new Date();
    if (offer.offerStatus !== "offered") throw new DomainError("CONFLICT", "This job offer is no longer available.");
    if (!offer.offerExpiresAt || offer.offerExpiresAt <= now) { await tx.update(riderAssignments).set({ offerStatus: "expired", respondedAt: now }).where(eq(riderAssignments.id, offer.id)); throw new DomainError("CONFLICT", "This job offer has expired."); }
    if (order.status !== "ready_for_pickup") throw new DomainError("CONFLICT", "This order is no longer ready for dispatch.");
    const accepted = input.decision === "accept";
    await tx.update(riderAssignments).set({ offerStatus: accepted ? "accepted" : "declined", respondedAt: now, updatedAt: now }).where(eq(riderAssignments.id, offer.id));
    if (accepted) { await reserveRiderCommission(tx, userId, order); await tx.update(orders).set({ status: "assigned", updatedAt: now }).where(eq(orders.id, order.id)); await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: "ready_for_pickup", toStatus: "assigned", actorUserId: userId, note: "Rider accepted dispatch offer and commission was reserved against Rider Cash Account" }); }
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_offer", entityId: String(order.id), action: accepted ? "rider_offer_accepted" : "rider_offer_declined", nextValue: JSON.stringify({ note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "dispatch", eventType: accepted ? "rider.offer_accepted" : "rider.offer_declined", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, riderUserId: userId, note: input.note ?? null }), deduplicationKey: eventKey(accepted ? "rider.offer_accepted" : "rider.offer_declined", order.id) });
    if (accepted) await createUserNotification({ recipientUserId: order.customerUserId, category: "order", title: "A Rider accepted your order", body: `${order.publicId} is being collected from the Business.`, route: `/order-tracking?id=${order.id}`, orderId: order.id, deduplicationKey: `order-assigned:${order.id}` });
    return accepted ? hydrateOrder(tx, { ...order, status: "assigned", updatedAt: now }) : { orderId: order.id, declined: true };
  });
}

export async function listRiderOrders(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const assignments = (await db.select().from(riderAssignments).where(eq(riderAssignments.riderUserId, userId))).filter((assignment: typeof riderAssignments.$inferSelect) => assignment.offerStatus === "accepted");
  const orderIds = assignments.map((assignment: typeof riderAssignments.$inferSelect) => assignment.orderId);
  if (!orderIds.length) return [];
  const rows = await db.select().from(orders).where(inArray(orders.id, orderIds));
  return Promise.all(rows.sort((left: typeof orders.$inferSelect, right: typeof orders.$inferSelect) => right.placedAt.getTime() - left.placedAt.getTime()).map((order: typeof orders.$inferSelect) => hydrateOrder(db, order)));
}

export async function transitionRiderOrder(userId: number, input: { orderId: number; toStatus: "picked_up" | "delivered"; note?: string }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    const assignment = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, input.orderId)).limit(1))[0];
    if (!order || !assignment) throw new DomainError("NOT_FOUND", "Assigned delivery not found.");
    if (assignment.riderUserId !== userId) throw new DomainError("FORBIDDEN", "This delivery is assigned to another Rider.");
    if (!canTransitionOrder(order.status, input.toStatus)) throw new DomainError("CONFLICT", `Delivery cannot move from ${order.status} to ${input.toStatus}.`);
    if (input.toStatus === "delivered" && order.paymentMethod === "cod" && order.paymentStatus !== "paid") throw new DomainError("CONFLICT", "Confirm COD collection before marking this order delivered.");
    const now = new Date();
    await tx.update(orders).set({ status: input.toStatus, updatedAt: now }).where(eq(orders.id, order.id));
    if (input.toStatus === "delivered") await tx.update(riderTrackingSessions).set({ status: "ended", endedAt: now, endedReason: "delivery_completed", updatedAt: now }).where(and(eq(riderTrackingSessions.orderId, order.id), eq(riderTrackingSessions.riderUserId, userId), eq(riderTrackingSessions.status, "active")));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: input.toStatus, actorUserId: userId, note: input.note ?? null });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(order.id), action: `rider_order_${input.toStatus}`, previousValue: JSON.stringify({ status: order.status }), nextValue: JSON.stringify({ status: input.toStatus, note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: `order.${input.toStatus}`, aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, riderUserId: userId, fromStatus: order.status, toStatus: input.toStatus }), deduplicationKey: eventKey(`order.${input.toStatus}`, order.id) });
    await createUserNotification({ recipientUserId: order.customerUserId, category: "order", title: input.toStatus === "picked_up" ? "Your order is on the way" : "Your order was delivered", body: input.toStatus === "picked_up" ? `${order.publicId} has left the Business.` : `${order.publicId} is marked delivered.`, route: `/order-tracking?id=${order.id}`, orderId: order.id, deduplicationKey: `order-status:${order.id}:${input.toStatus}` });
    return hydrateOrder(tx, { ...order, status: input.toStatus, updatedAt: now });
  });
}

/** Confirms actual cash prior to delivery completion; a variance never silently clears settlement. */
export async function confirmCodCollection(userId: number, input: { orderId: number; collectedMinor: number; varianceReason?: string }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    const assignment = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, input.orderId)).limit(1))[0];
    if (!order || !assignment) throw new DomainError("NOT_FOUND", "Assigned delivery not found.");
    if (assignment.riderUserId !== userId) throw new DomainError("FORBIDDEN", "This delivery is assigned to another Rider.");
    if (order.status !== "picked_up") throw new DomainError("CONFLICT", "COD can be confirmed only after pickup and before delivery completion.");
    if (order.paymentMethod !== "cod") throw new DomainError("CONFLICT", "Cash collection applies only to COD orders.");
    const existing = (await tx.select().from(codCollections).where(eq(codCollections.orderId, order.id)).limit(1))[0];
    if (existing) return { ...existing, duplicate: true };
    const expectedMinor = order.totalMinor;
    const varianceMinor = input.collectedMinor - expectedMinor;
    if (varianceMinor !== 0 && !input.varianceReason) throw new DomainError("VALIDATION", "Provide a variance reason when the collected cash differs from the expected COD amount.");
    const collectionStatus = varianceMinor === 0 ? "collected" : varianceMinor < 0 ? "short" : "over" as const;
    const now = new Date();
    await tx.insert(codCollections).values({ orderId: order.id, riderUserId: userId, expectedMinor, collectedMinor: input.collectedMinor, varianceMinor, varianceReason: input.varianceReason ?? null, status: collectionStatus, confirmedAt: now });
    const account = (await tx.select().from(riderCashAccounts).where(eq(riderCashAccounts.riderUserId, userId)).limit(1))[0];
    if (!account) throw new DomainError("CONFLICT", "Rider Cash Account was not reserved when this job was accepted.");
    const balanceAfterCollection = account.balanceMinor + input.collectedMinor;
    await tx.update(riderCashAccounts).set({ balanceMinor: balanceAfterCollection, updatedAt: now }).where(eq(riderCashAccounts.id, account.id));
    await tx.insert(riderCashAccountEntries).values({ riderCashAccountId: account.id, riderUserId: userId, orderId: order.id, entryType: "cash_collected", amountMinor: input.collectedMinor, balanceAfterMinor: balanceAfterCollection, reference: `cod:${order.publicId}` });
    if (varianceMinor !== 0) await tx.insert(riderCashAccountEntries).values({ riderCashAccountId: account.id, riderUserId: userId, orderId: order.id, entryType: "cash_variance", amountMinor: varianceMinor, balanceAfterMinor: balanceAfterCollection, reference: `variance:${order.publicId}` });
    await tx.update(orders).set({ paymentStatus: "paid", riderCashCustodyMinor: input.collectedMinor, settlementStatus: varianceMinor === 0 ? "unsettled" : "variance", updatedAt: now }).where(eq(orders.id, order.id));
    if (varianceMinor !== 0) await tx.insert(settlementLedgerEntries).values({ orderId: order.id, organisationId: order.organisationId, partyType: "rider", entryType: "collection_variance", amountMinor: varianceMinor });
    await tx.insert(paymentLedgerEntries).values([
      { orderId: order.id, organisationId: order.organisationId, riderUserId: userId, partyType: "customer", entryType: "cash_collected", amountMinor: input.collectedMinor, status: "approved", reference: `cash-collected:${order.id}` },
      { orderId: order.id, organisationId: order.organisationId, riderUserId: userId, partyType: "rider", entryType: "rider_cash_custody", amountMinor: input.collectedMinor, status: "pending", reference: `rider-custody:${order.id}` },
    ]);
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "cod_collection", entityId: String(order.id), action: "cod_collection_confirmed", previousValue: JSON.stringify({ expectedMinor }), nextValue: JSON.stringify({ collectedMinor: input.collectedMinor, varianceMinor, varianceReason: input.varianceReason ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "payments", eventType: "cod.collection_confirmed", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, riderUserId: userId, expectedMinor, collectedMinor: input.collectedMinor, varianceMinor, settlementStatus: varianceMinor === 0 ? "unsettled" : "variance" }), deduplicationKey: eventKey("cod.collection_confirmed", order.id) });
    return { orderId: order.id, expectedMinor, collectedMinor: input.collectedMinor, varianceMinor, status: collectionStatus, duplicate: false };
  });
}

export async function startRiderTrackingSession(userId: number, orderId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
    const assignment = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, orderId)).limit(1))[0];
    if (!order || !assignment) throw new DomainError("NOT_FOUND", "Assigned delivery not found.");
    if (assignment.riderUserId !== userId) throw new DomainError("FORBIDDEN", "This delivery is assigned to another Rider.");
    if (order.status !== "assigned" && order.status !== "picked_up") throw new DomainError("CONFLICT", "Location sharing is available only while travelling on an active delivery.");
    const now = new Date();
    const existing = (await tx.select().from(riderTrackingSessions).where(eq(riderTrackingSessions.orderId, orderId)).limit(1))[0];
    if (existing?.status === "ended") throw new DomainError("CONFLICT", "This delivery tracking session has already ended.");
    if (existing?.status === "active") return { ...existing, duplicate: true };
    if (existing) await tx.update(riderTrackingSessions).set({ status: "active", pausedAt: null, endedAt: null, endedReason: null, updatedAt: now }).where(eq(riderTrackingSessions.id, existing.id));
    else await tx.insert(riderTrackingSessions).values({ orderId, riderUserId: userId, status: "active", consentGrantedAt: now, startedAt: now });
    const session = (await tx.select().from(riderTrackingSessions).where(eq(riderTrackingSessions.orderId, orderId)).limit(1))[0]!;
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_tracking_session", entityId: String(session.id), action: "rider_tracking_started", nextValue: JSON.stringify({ orderId }) });
    await tx.insert(domainOutboxEvents).values({ domain: "delivery", eventType: "rider.tracking_started", aggregateType: "order", aggregateId: String(orderId), payload: JSON.stringify({ orderId, riderUserId: userId, startedAt: now.toISOString() }), deduplicationKey: eventKey("rider.tracking_started", orderId) });
    return { ...session, duplicate: false };
  });
}

export async function setRiderTrackingSessionState(userId: number, input: { orderId: number; action: "pause" | "resume" | "stop" }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const session = (await tx.select().from(riderTrackingSessions).where(and(eq(riderTrackingSessions.orderId, input.orderId), eq(riderTrackingSessions.riderUserId, userId))).limit(1))[0];
    if (!session) throw new DomainError("NOT_FOUND", "Tracking is not active for this delivery.");
    if (session.status === "ended") return { ...session, duplicate: true };
    const now = new Date();
    if (input.action === "pause") await tx.update(riderTrackingSessions).set({ status: "paused", pausedAt: now, endedAt: null, endedReason: "rider_paused", updatedAt: now }).where(eq(riderTrackingSessions.id, session.id));
    else if (input.action === "resume") await tx.update(riderTrackingSessions).set({ status: "active", pausedAt: null, endedAt: null, endedReason: null, updatedAt: now }).where(eq(riderTrackingSessions.id, session.id));
    else await tx.update(riderTrackingSessions).set({ status: "ended", pausedAt: null, endedAt: now, endedReason: "rider_stopped", updatedAt: now }).where(eq(riderTrackingSessions.id, session.id));
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_tracking_session", entityId: String(session.id), action: `rider_tracking_${input.action}`, nextValue: JSON.stringify({ orderId: input.orderId }) });
    await tx.insert(domainOutboxEvents).values({ domain: "delivery", eventType: `rider.tracking_${input.action}`, aggregateType: "order", aggregateId: String(input.orderId), payload: JSON.stringify({ orderId: input.orderId, riderUserId: userId, action: input.action, occurredAt: now.toISOString() }), deduplicationKey: eventKey(`rider.tracking_${input.action}`, input.orderId) });
    return (await tx.select().from(riderTrackingSessions).where(eq(riderTrackingSessions.id, session.id)).limit(1))[0]!;
  });
}

export async function getRiderTrackingSession(userId: number, orderId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return (await db.select().from(riderTrackingSessions).where(and(eq(riderTrackingSessions.orderId, orderId), eq(riderTrackingSessions.riderUserId, userId))).limit(1))[0] ?? null;
}

export async function updateRiderLocation(userId: number, input: { orderId: number; latitudeE6: number; longitudeE6: number; accuracyMeters?: number; source?: "foreground" | "background"; deviceObservedAt?: Date }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    const assignment = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, input.orderId)).limit(1))[0];
    if (!order || !assignment) throw new DomainError("NOT_FOUND", "Assigned delivery not found.");
    if (assignment.riderUserId !== userId) throw new DomainError("FORBIDDEN", "This delivery is assigned to another Rider.");
    if (order.status !== "assigned" && order.status !== "picked_up") throw new DomainError("CONFLICT", "Location sharing is available only while travelling on an active delivery.");
    const session = (await tx.select().from(riderTrackingSessions).where(and(eq(riderTrackingSessions.orderId, order.id), eq(riderTrackingSessions.riderUserId, userId))).limit(1))[0];
    if (!session || session.status !== "active") throw new DomainError("CONFLICT", "Start delivery location sharing before sending a Rider position.");
    const now = new Date();
    if (input.deviceObservedAt && Math.abs(now.getTime() - input.deviceObservedAt.getTime()) > 5 * 60_000) throw new DomainError("VALIDATION", "Location samples must be observed within five minutes of submission.");
    const prior = (await tx.select().from(riderLocationUpdates).where(and(eq(riderLocationUpdates.orderId, order.id), eq(riderLocationUpdates.riderUserId, userId))).orderBy(desc(riderLocationUpdates.createdAt)).limit(1))[0];
    if (prior && now.getTime() - prior.createdAt.getTime() < 5_000) throw new DomainError("CONFLICT", "Location updates are limited to one sample every five seconds.");
    await tx.insert(riderLocationUpdates).values({ orderId: order.id, riderUserId: userId, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, accuracyMeters: input.accuracyMeters ?? null, source: input.source ?? "foreground", deviceObservedAt: input.deviceObservedAt ?? null, createdAt: now });
    await tx.update(riderTrackingSessions).set({ lastLocationAt: now, updatedAt: now }).where(eq(riderTrackingSessions.id, session.id));
    await tx.insert(domainOutboxEvents).values({ domain: "delivery", eventType: "rider.location_updated", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, riderUserId: userId, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, accuracyMeters: input.accuracyMeters ?? null, source: input.source ?? "foreground", receivedAt: now.toISOString() }), deduplicationKey: eventKey("rider.location_updated", order.id) });
    return { updatedAt: now };
  });
}

async function isRiderCommandAlreadyApplied(db: any, riderUserId: number, input: RiderCommandInput) {
  if (input.type === "availability") {
    const availability = (await db.select().from(riderAvailability).where(eq(riderAvailability.riderUserId, riderUserId)).limit(1))[0];
    return availability?.status === input.status;
  }
  const order = (await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
  if (!order) return false;
  if (input.type === "transition") return order.status === input.toStatus;
  if (input.type === "cod_collection") {
    const collection = (await db.select().from(codCollections).where(and(eq(codCollections.orderId, input.orderId), eq(codCollections.riderUserId, riderUserId))).limit(1))[0];
    return Boolean(collection);
  }
  if (input.type === "offer_decision") {
    const assignment = (await db.select().from(riderAssignments).where(and(eq(riderAssignments.orderId, input.orderId), eq(riderAssignments.riderUserId, riderUserId))).limit(1))[0];
    return assignment?.offerStatus === (input.decision === "accept" ? "accepted" : "declined");
  }
  return false;
}

/** Processes one sensitive Rider intent. A replay with the same user-scoped idempotency key returns the first success and never repeats cash or state mutations. */
export async function executeRiderCommand(userId: number, input: RiderCommandInput) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const existing = (await db.select().from(riderCommandReceipts).where(and(eq(riderCommandReceipts.riderUserId, userId), eq(riderCommandReceipts.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (existing?.status === "succeeded") return { status: "succeeded" as const, duplicate: true, result: existing.resultJson ? JSON.parse(existing.resultJson) : null };
  if (existing?.status === "rejected") throw new DomainError((existing.errorCode as "VALIDATION" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT") ?? "CONFLICT", existing.errorMessage ?? "This command was previously rejected.");
  const now = new Date();
  if (existing) await db.update(riderCommandReceipts).set({ status: "processing", attempts: existing.attempts + 1, errorCode: null, errorMessage: null, updatedAt: now }).where(eq(riderCommandReceipts.id, existing.id));
  else await db.insert(riderCommandReceipts).values({ riderUserId: userId, orderId: "orderId" in input ? input.orderId : null, commandType: input.type, idempotencyKey: input.idempotencyKey, payloadJson: JSON.stringify(input), status: "processing", attempts: 1, receivedAt: now });
  const receipt = (await db.select().from(riderCommandReceipts).where(and(eq(riderCommandReceipts.riderUserId, userId), eq(riderCommandReceipts.idempotencyKey, input.idempotencyKey))).limit(1))[0];
  if (!receipt) throw new DomainError("INTERNAL", "The Rider command receipt could not be created.");
  try {
    let result: unknown;
    if (input.type === "offer_decision") result = await respondToRiderOffer(userId, { orderId: input.orderId, decision: input.decision, note: input.note });
    else if (input.type === "transition") result = await transitionRiderOrder(userId, { orderId: input.orderId, toStatus: input.toStatus, note: input.note });
    else if (input.type === "cod_collection") result = await confirmCodCollection(userId, { orderId: input.orderId, collectedMinor: input.collectedMinor, varianceReason: input.varianceReason });
    else if (input.type === "location_update") result = await updateRiderLocation(userId, { orderId: input.orderId, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, accuracyMeters: input.accuracyMeters, source: input.source, deviceObservedAt: input.deviceObservedAt ? new Date(input.deviceObservedAt) : undefined });
    else result = await setRiderAvailability(userId, input.status);
    await db.update(riderCommandReceipts).set({ status: "succeeded", resultJson: JSON.stringify(result), processedAt: new Date(), updatedAt: new Date() }).where(eq(riderCommandReceipts.id, receipt.id));
    await db.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_command", entityId: String(receipt.id), action: "rider_command_succeeded", nextValue: JSON.stringify({ type: input.type, orderId: "orderId" in input ? input.orderId : null, idempotencyKey: input.idempotencyKey }) });
    return { status: "succeeded" as const, duplicate: false, result };
  } catch (error) {
    if (await isRiderCommandAlreadyApplied(db, userId, input)) {
      const result = { recoveredFromRetry: true, type: input.type };
      await db.update(riderCommandReceipts).set({ status: "succeeded", resultJson: JSON.stringify(result), processedAt: new Date(), updatedAt: new Date() }).where(eq(riderCommandReceipts.id, receipt.id));
      return { status: "succeeded" as const, duplicate: true, result };
    }
    const domainError = error instanceof DomainError ? error : new DomainError("UNAVAILABLE", error instanceof Error ? error.message : "Rider command could not be processed.");
    const rejected = ["VALIDATION", "FORBIDDEN", "NOT_FOUND", "CONFLICT"].includes(domainError.code);
    await db.update(riderCommandReceipts).set({ status: rejected ? "rejected" : "failed", errorCode: domainError.code, errorMessage: domainError.message.slice(0, 500), updatedAt: new Date() }).where(eq(riderCommandReceipts.id, receipt.id));
    throw domainError;
  }
}

export async function transitionBusinessOrder(userId: number, input: { orderId: number; toStatus: OrderStatus; note?: string }) {
  const db = await requireDb();
  const organisationId = await ownedBusinessOrganisationId(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    if (!order) throw new DomainError("NOT_FOUND", "Order not found.");
    if (order.organisationId !== organisationId) throw new DomainError("FORBIDDEN", "This order is outside your Business workspace.");
    if (!canTransitionOrder(order.status, input.toStatus)) throw new DomainError("CONFLICT", `Order cannot move from ${order.status} to ${input.toStatus}.`);
    const now = new Date();
    await tx.update(orders).set({ status: input.toStatus, updatedAt: now }).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: input.toStatus, actorUserId: userId, note: input.note ?? null });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(order.id), action: `order_${input.toStatus}`, previousValue: JSON.stringify({ status: order.status }), nextValue: JSON.stringify({ status: input.toStatus, note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: `order.${input.toStatus}`, aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, organisationId: order.organisationId, fromStatus: order.status, toStatus: input.toStatus }), deduplicationKey: eventKey(`order.${input.toStatus}`, order.id) });
    const updated = { ...order, status: input.toStatus, updatedAt: now };
    return hydrateOrder(tx, updated);
  });
}
