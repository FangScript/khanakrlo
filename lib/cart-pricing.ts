export type PricedCartLine = {
  quantity: number;
  unitPrice: number;
  addOns: Array<{ price: number }>;
};

export const formatPKR = (amount: number) => `Rs. ${amount.toLocaleString("en-PK")}`;

export const getCartSubtotal = (items: PricedCartLine[]) =>
  items.reduce(
    (total, item) =>
      total + (item.unitPrice + item.addOns.reduce((sum, addOn) => sum + addOn.price, 0)) * item.quantity,
    0,
  );

export const getCartItemCount = (items: Pick<PricedCartLine, "quantity">[]) =>
  items.reduce((count, item) => count + item.quantity, 0);

