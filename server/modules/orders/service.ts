import * as legacyOrders from "../../order-service";

/** Order domain interface kept behind the gateway during the service migration. */
export const orderService = {
  quote: (userId: number, input: Parameters<typeof legacyOrders.quoteOrder>[1]) => legacyOrders.quoteOrder(userId, input),
  place: (userId: number, input: Parameters<typeof legacyOrders.placeOrder>[1]) => legacyOrders.placeOrder(userId, input),
  mine: (userId: number) => legacyOrders.listMyOrders(userId),
  byId: (userId: number, orderId: number) => legacyOrders.getOrderForActor(userId, orderId),
  businessQueue: (userId: number) => legacyOrders.listBusinessOrders(userId),
  transition: (userId: number, input: Parameters<typeof legacyOrders.transitionBusinessOrder>[1]) => legacyOrders.transitionBusinessOrder(userId, input),
  availableRiders: (userId: number) => legacyOrders.listAvailableRiders(userId),
  assignRider: (userId: number, input: Parameters<typeof legacyOrders.assignRiderToOrder>[1]) => legacyOrders.assignRiderToOrder(userId, input),
  riderQueue: (userId: number) => legacyOrders.listRiderOrders(userId),
  riderTransition: (userId: number, input: Parameters<typeof legacyOrders.transitionRiderOrder>[1]) => legacyOrders.transitionRiderOrder(userId, input),
  updateRiderLocation: (userId: number, input: Parameters<typeof legacyOrders.updateRiderLocation>[1]) => legacyOrders.updateRiderLocation(userId, input),
};
