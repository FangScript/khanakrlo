import {createStore} from './store.mjs';
import {createMerchantServer} from './server.mjs';
const store=createStore(process.env.MERCHANT_DB||'/data/merchant.sqlite');
const server=createMerchantServer(store,{
 identity:process.env.IDENTITY_ORIGIN||'http://identity:8081',orders:process.env.ORDERS_ORIGIN||'http://orders:8083',rider:process.env.RIDER_ORIGIN||'http://rider:8085',
 key:process.env.ORDER_OPERATIONS_KEY,erasureKey:process.env.ACCOUNT_ERASURE_KEY
});
server.listen(Number(process.env.PORT||8084),'0.0.0.0');
process.on('SIGTERM',()=>server.close(()=>store.db.close()));
