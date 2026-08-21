import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  accountProfiles,
  auditEvents,
  businessOrganisations,
  businessOutlets,
  businessStaffMemberships,
  cloudKitchens,
  customerAddresses,
  domainOutboxEvents,
  kitchenBrands,
  menuCategories,
  menuItems,
  menuModifiers,
  orderItemModifiers,
  orderItems,
  orders,
  orderStatusHistory,
  riderAssignments,
  riderLocationUpdates,
  serviceZones,
  workspaceMemberships,
} from "../drizzle/schema";
import { canTransitionOrder, type OrderStatus } from "../shared/order";
import { distanceMeters, estimateCourierMinutes } from "../shared/delivery";
import type { OrderPlaceInput, OrderQuoteInput } from "./modules/contracts/orders";
import { DomainError } from "./modules/gateway/domain-error";
import { getDb } from "./db";

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
  const [itemRows, modifierRows, categoryRows, outletRows, kitchenRows, brandRows, organisationRows, zoneRows] = await Promise.all([
    db.select().from(menuItems), db.select().from(menuModifiers), db.select().from(menuCategories), db.select().from(businessOutlets), db.select().from(cloudKitchens), db.select().from(kitchenBrands), db.select().from(businessOrganisations), db.select().from(serviceZones),
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
  return { organisationId: first.organisationId!, outletId: first.outletId, kitchenBrandId: first.kitchenBrandId, lines: resolved.map(({ organisationId: _organisationId, outletId: _outletId, kitchenBrandId: _kitchenBrandId, ...line }) => line), itemSubtotalMinor, deliveryFeeMinor, serviceFeeMinor, discountMinor, totalMinor: itemSubtotalMinor + deliveryFeeMinor + serviceFeeMinor - discountMinor, delivery: { addressId: address.id, recipientName: address.recipientName, phoneE164: address.phoneE164, addressLine1: address.addressLine1, addressLine2: address.addressLine2, city: address.city, instructions: address.instructions, latitudeE6: address.latitudeE6, longitudeE6: address.longitudeE6, zoneId: zone.id, distanceMeters: deliveryDistance, estimatedCourierMinutes, estimatedTotalMinutes } };
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
  const [modifiers, history, assignmentRows] = await Promise.all([
    lineIds.length ? db.select().from(orderItemModifiers).where(inArray(orderItemModifiers.orderItemId, lineIds)) : [],
    db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, order.id)),
    db.select().from(riderAssignments).where(eq(riderAssignments.orderId, order.id)).limit(1),
  ]);
  const assignment = assignmentRows[0] ?? null;
  const profile = assignment ? (await db.select().from(accountProfiles).where(eq(accountProfiles.userId, assignment.riderUserId)).limit(1))[0] ?? null : null;
  const latest = assignment && (order.status === "assigned" || order.status === "picked_up") ? (await db.select().from(riderLocationUpdates).where(and(eq(riderLocationUpdates.orderId, order.id), eq(riderLocationUpdates.riderUserId, assignment.riderUserId))).orderBy(desc(riderLocationUpdates.createdAt)).limit(1))[0] ?? null : null;
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
    await tx.insert(orders).values({ publicId, customerUserId: userId, organisationId: quote.organisationId, outletId: quote.outletId, kitchenBrandId: quote.kitchenBrandId, paymentMethod: input.paymentMethod, paymentStatus: "cash_due", deliveryRecipientName: quote.delivery.recipientName, deliveryPhoneE164: quote.delivery.phoneE164, deliveryAddressLine1: quote.delivery.addressLine1, deliveryAddressLine2: quote.delivery.addressLine2, deliveryCity: quote.delivery.city, deliveryInstructions: quote.delivery.instructions, deliveryAddressId: quote.delivery.addressId, deliveryLatitudeE6: quote.delivery.latitudeE6, deliveryLongitudeE6: quote.delivery.longitudeE6, deliveryZoneId: quote.delivery.zoneId, deliveryDistanceMeters: quote.delivery.distanceMeters, estimatedCourierMinutes: quote.delivery.estimatedCourierMinutes, estimatedTotalMinutes: quote.delivery.estimatedTotalMinutes, itemSubtotalMinor: quote.itemSubtotalMinor, deliveryFeeMinor: quote.deliveryFeeMinor, serviceFeeMinor: quote.serviceFeeMinor, discountMinor: quote.discountMinor, totalMinor: quote.totalMinor, idempotencyKey: input.idempotencyKey });
    const order = (await tx.select().from(orders).where(eq(orders.publicId, publicId)).limit(1))[0];
    if (!order) throw new DomainError("INTERNAL", "The order could not be created.");
    for (const line of quote.lines) {
      await tx.insert(orderItems).values({ orderId: order.id, menuItemId: line.menuItemId, dishName: line.dishName, dishDescription: line.dishDescription, dishImageKey: line.dishImageKey, unitPriceMinor: line.unitPriceMinor, modifierTotalMinor: line.modifierTotalMinor, lineTotalMinor: line.lineTotalMinor, quantity: line.quantity, prepTimeMinutes: line.prepTimeMinutes });
      const storedLine = (await tx.select().from(orderItems).where(and(eq(orderItems.orderId, order.id), eq(orderItems.menuItemId, line.menuItemId))).limit(1))[0];
      if (!storedLine) throw new DomainError("INTERNAL", "The order item could not be recorded.");
      if (line.modifiers.length) await tx.insert(orderItemModifiers).values(line.modifiers.map((modifier) => ({ orderItemId: storedLine.id, ...modifier })));
    }
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: null, toStatus: "placed", actorUserId: userId, note: "Customer placed COD order" });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(order.id), action: "order_placed", nextValue: JSON.stringify({ publicId, totalMinor: quote.totalMinor, paymentMethod: input.paymentMethod }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: "order.placed", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId, organisationId: quote.organisationId, customerUserId: userId, totalMinor: quote.totalMinor }), deduplicationKey: eventKey("order.placed", order.id) });
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
  const riderIds = memberships.map((membership: typeof workspaceMemberships.$inferSelect) => membership.userId);
  if (!riderIds.length) return [];
  const profiles = await db.select().from(accountProfiles).where(inArray(accountProfiles.userId, riderIds));
  return riderIds.map((riderUserId: number) => ({ riderUserId, displayName: profiles.find((profile: typeof accountProfiles.$inferSelect) => profile.userId === riderUserId)?.givenName ?? `Rider ${riderUserId}` }));
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
    if (existing) throw new DomainError("CONFLICT", "This order has already been assigned.");
    const now = new Date();
    await tx.insert(riderAssignments).values({ orderId: order.id, riderUserId: input.riderUserId, assignedByUserId: userId, assignedAt: now });
    await tx.update(orders).set({ status: "assigned", updatedAt: now }).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: "ready_for_pickup", toStatus: "assigned", actorUserId: userId, note: "Rider assigned by Restaurant dispatch" });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "rider_assignment", entityId: String(order.id), action: "rider_assigned", nextValue: JSON.stringify({ riderUserId: input.riderUserId, orderId: order.id }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: "order.assigned", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, organisationId, riderUserId: input.riderUserId }), deduplicationKey: eventKey("order.assigned", order.id) });
    return hydrateOrder(tx, { ...order, status: "assigned", updatedAt: now });
  });
}

export async function listRiderOrders(userId: number) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  const assignments = await db.select().from(riderAssignments).where(eq(riderAssignments.riderUserId, userId));
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
    const now = new Date();
    await tx.update(orders).set({ status: input.toStatus, updatedAt: now, ...(input.toStatus === "delivered" ? { paymentStatus: "paid" } : {}) }).where(eq(orders.id, order.id));
    await tx.insert(orderStatusHistory).values({ orderId: order.id, fromStatus: order.status, toStatus: input.toStatus, actorUserId: userId, note: input.note ?? null });
    await tx.insert(auditEvents).values({ actorUserId: userId, entityType: "order", entityId: String(order.id), action: `rider_order_${input.toStatus}`, previousValue: JSON.stringify({ status: order.status }), nextValue: JSON.stringify({ status: input.toStatus, note: input.note ?? null }) });
    await tx.insert(domainOutboxEvents).values({ domain: "orders", eventType: `order.${input.toStatus}`, aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, publicId: order.publicId, riderUserId: userId, fromStatus: order.status, toStatus: input.toStatus }), deduplicationKey: eventKey(`order.${input.toStatus}`, order.id) });
    return hydrateOrder(tx, { ...order, status: input.toStatus, paymentStatus: input.toStatus === "delivered" ? "paid" : order.paymentStatus, updatedAt: now });
  });
}

export async function updateRiderLocation(userId: number, input: { orderId: number; latitudeE6: number; longitudeE6: number; accuracyMeters?: number }) {
  const db = await requireDb();
  await requireActiveRider(db, userId);
  return db.transaction(async (tx) => {
    const order = (await tx.select().from(orders).where(eq(orders.id, input.orderId)).limit(1))[0];
    const assignment = (await tx.select().from(riderAssignments).where(eq(riderAssignments.orderId, input.orderId)).limit(1))[0];
    if (!order || !assignment) throw new DomainError("NOT_FOUND", "Assigned delivery not found.");
    if (assignment.riderUserId !== userId) throw new DomainError("FORBIDDEN", "This delivery is assigned to another Rider.");
    if (order.status !== "assigned" && order.status !== "picked_up") throw new DomainError("CONFLICT", "Location sharing is available only while travelling on an active delivery.");
    const now = new Date();
    await tx.insert(riderLocationUpdates).values({ orderId: order.id, riderUserId: userId, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, accuracyMeters: input.accuracyMeters ?? null, createdAt: now });
    await tx.insert(domainOutboxEvents).values({ domain: "delivery", eventType: "rider.location_updated", aggregateType: "order", aggregateId: String(order.id), payload: JSON.stringify({ orderId: order.id, riderUserId: userId, latitudeE6: input.latitudeE6, longitudeE6: input.longitudeE6, accuracyMeters: input.accuracyMeters ?? null, receivedAt: now.toISOString() }), deduplicationKey: eventKey("rider.location_updated", order.id) });
    return { updatedAt: now };
  });
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
