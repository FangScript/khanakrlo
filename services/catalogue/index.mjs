import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

const branches = process.env.CATALOGUE_FILE
  ? JSON.parse(await readFile(process.env.CATALOGUE_FILE, 'utf8'))
  : [];
createServer((req, res) => {
  const url = new URL(req.url, 'http://catalogue');
  res.setHeader('content-type', 'application/json');
  if (req.method !== 'GET' || url.pathname !== '/restaurants') return res.writeHead(404).end();
  const city = url.searchParams.get('city')?.trim();
  if (!city) return res.writeHead(400).end(JSON.stringify({ error: 'Choose a city' }));
  const restaurants = branches.filter(branch => branch.open && branch.city === city)
    .map(({ open, ...branch }) => ({ ...branch, menu: branch.menu.filter(dish => dish.available) }))
    .filter(branch => branch.menu.length);
  res.end(JSON.stringify({ restaurants }));
}).listen(Number(process.env.PORT || 8082), process.env.HOST || '0.0.0.0');
