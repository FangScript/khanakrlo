import { OrderError } from './quote.mjs';

const allowed = {
  accepted:['received'],
  preparing:['accepted'],
  ready:['preparing'],
  picked_up:['ready'],
  cancelled:['received','accepted','preparing','ready']
};
const titles = {
  accepted:'accepted your order', preparing:'is preparing your food',
  ready:'is ready for pickup', picked_up:'was collected by the rider', cancelled:'cancelled their items'
};

function cancelBranch(order, branch, createdAt) {
  const {subtotal,delivery,platform,tax,total} = order;
  order.originalTotals ||= {subtotal,delivery,platform,tax,total};
  const cancelled = order.items.filter(item=>item.branchId===branch.id);
  for (const item of cancelled) item.status = 'cancelled';
  order.subtotal -= cancelled.reduce((sum,item)=>sum+item.total,0);
  order.tax = Math.round(order.subtotal * (order.taxRateBps ?? 0) / 10000);
  if (order.branches.every(b=>b.status==='cancelled')) {
    order.delivery = 0;
    order.platform = 0;
  }
  order.total = order.subtotal + order.tax + order.delivery + order.platform;
  order.adjustments.push({
    branchId:branch.id, restaurant:branch.name, name:branch.name, items:cancelled, amount:total-order.total,
    refundAmount:0, status:'cod_adjusted', createdAt
  });
}

export function updateBranch(order, event, createdAt) {
  const branch = order.branches.find(b=>b.id===event.branchId);
  if (!branch || !Object.hasOwn(allowed,event.type)) throw new OrderError(400,'Unknown branch or order event.');
  if (!allowed[event.type].includes(branch.status)) throw new OrderError(409,'This order event is out of sequence.');
  branch.status = event.type;
  if (event.type==='cancelled') cancelBranch(order,branch,createdAt);
  const remaining = order.branches.filter(b=>b.status!=='cancelled');
  if (!remaining.length) order.status = 'cancelled';
  else if (remaining.every(b=>b.status==='picked_up')) order.status = 'on_the_way';
  else if (remaining.every(b=>['ready','picked_up'].includes(b.status))) order.status = 'ready';
  else if (remaining.some(b=>['preparing','ready','picked_up'].includes(b.status))) order.status = 'preparing';
  else if (remaining.every(b=>b.status==='accepted')) order.status = 'accepted';
  else order.status = 'received';
  return branch.name+' '+titles[event.type];
}
