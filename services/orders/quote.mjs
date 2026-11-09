export class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function text(value, max) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function parseCart(input) {
  if (!['Islamabad', 'Rawalpindi'].includes(input?.city) || !text(input?.address, 600)) {
    throw new OrderError(400, 'Choose a delivery city and address.');
  }
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 100) {
    throw new OrderError(400, 'Choose between 1 and 100 cart items.');
  }
  const keys = new Set();
  const items = input.items.map(line => {
    if (!text(line?.branchId, 100) || !text(line?.dishId, 100) ||
        !Number.isInteger(line.qty) || line.qty < 1 || line.qty > 99 ||
        (line.addon !== undefined && typeof line.addon !== 'boolean')) {
      throw new OrderError(400, 'Check your cart quantities and options.');
    }
    const item = { branchId: line.branchId, dishId: line.dishId, qty: line.qty, addon: !!line.addon };
    const key = JSON.stringify([item.branchId, item.dishId, item.addon]);
    if (keys.has(key)) throw new OrderError(400, 'The cart contains a duplicate line.');
    keys.add(key);
    return item;
  });
  const payment = input.payment || 'cod';
  if (!['cod','digital'].includes(payment)) throw new OrderError(400, 'Choose a payment method.');
  const pin = input.pin;
  if (pin != null && (!Number.isFinite(pin.latitude) || Math.abs(pin.latitude)>90 || !Number.isFinite(pin.longitude) || Math.abs(pin.longitude)>180)) {
    throw new OrderError(400, 'Check the delivery pin.');
  }
  return { city:input.city, address:input.address.trim(), items, payment, ...(pin ? {pin:{latitude:pin.latitude,longitude:pin.longitude}} : {}) };
}

function amount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function priceCart(cart, restaurants, config) {
  if (!amount(config.delivery) || !amount(config.taxBps) || config.taxBps > 10000) {
    throw new OrderError(503, 'Delivery and tax rates are not configured.');
  }
  const branches = new Map();
  const items = cart.items.map(line => {
    const branch = restaurants.find(b => b.id === line.branchId && b.city === cart.city);
    const dish = branch?.menu.find(d => d.id === line.dishId && d.available);
    if (!dish || (line.addon && !dish.addon)) {
      throw new OrderError(409, 'A dish or option is no longer available at this address. Update your cart.');
    }
    if (!amount(dish.price) || (line.addon && !amount(dish.addon.price))) throw new OrderError(503, 'Menu price unavailable.');
    const unit = dish.price + (line.addon ? dish.addon.price : 0);
    branches.set(branch.id, {id: branch.id, name: branch.name, status: 'received'});
    return {
      branchId: branch.id, restaurant: branch.name, dishId: dish.id, name: dish.name,
      photo: dish.photo, addon: line.addon ? dish.addon.name : '', qty: line.qty, unit, total: unit * line.qty
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxBase = subtotal * config.taxBps;
  const tax = Math.round(taxBase / 10000);
  const platform = 1000;
  const total = subtotal + config.delivery + platform + tax;
  if (![subtotal,taxBase,total].every(amount)) throw new OrderError(400, 'Order exceeds the supported amount.');
  return { items, branches: [...branches.values()], subtotal, delivery: config.delivery, platform, tax,
    taxRateBps:config.taxBps, total, pricingMode:'preview' };
}
