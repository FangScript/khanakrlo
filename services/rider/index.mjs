import { openStore } from './store.mjs';
import { riderServer } from './server.mjs';
const store = openStore(process.env.RIDER_DB || '/data/rider.sqlite');
const server = riderServer(store, process.env);
server.listen(8085);
process.on('SIGTERM', () => server.close(() => store.close()));
