import { createStore } from './store.mjs';
import { createOrdersServer } from './server.mjs';

const rate = name => /^\d+$/.test(process.env[name] || '') ? Number(process.env[name]) : undefined;
const store = createStore(process.env.ORDERS_DB || '/data/orders.sqlite');
const server = createOrdersServer(store,{
  identityOrigin:process.env.IDENTITY_ORIGIN || 'http://identity:8081',
  catalogueOrigin:process.env.CATALOGUE_ORIGIN || 'http://catalogue:8082',
  delivery:rate('PREVIEW_DELIVERY_PAISA'),
  taxBps:rate('PREVIEW_TAX_BPS'),
  erasureKey:process.env.ACCOUNT_ERASURE_KEY,
  operationsKey:process.env.ORDER_OPERATIONS_KEY
});
server.listen(Number(process.env.PORT || 8083),'0.0.0.0');
process.on('SIGTERM',() => server.close(() => store.close()));
