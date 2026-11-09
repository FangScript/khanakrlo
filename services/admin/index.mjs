import {adminStore} from './store.mjs';
import {adminServer} from './server.mjs';
const store=adminStore(process.env.ADMIN_DB||'/data/admin.sqlite');
const server=adminServer(store,{
  identity:process.env.IDENTITY_ORIGIN,merchant:process.env.MERCHANT_ORIGIN,rider:process.env.RIDER_ORIGIN,
  orders:process.env.ORDERS_ORIGIN,adminKey:process.env.ADMIN_ACCESS_KEY,orderKey:process.env.ORDER_OPERATIONS_KEY,
  publicOrigin:process.env.ADMIN_PUBLIC_ORIGIN,
});
server.listen(8086);
process.on('SIGTERM',()=>server.close(()=>store.close()));
