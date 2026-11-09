const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');
const config = getDefaultConfig(__dirname);
const enhance = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const metro = enhance ? enhance(middleware, server) : middleware;
  return (req, res, next) => {
    if (!['/dev-api/identity/register', '/dev-api/identity/login', '/dev-api/identity/session'].includes(req.url)) {
      return metro(req, res, next);
    }
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) {
      res.writeHead(403).end();
      return;
    }
    const local = req.socket.localAddress.replace(/^::ffff:/, '');
    const base = process.env.KHANA_DEV_GATEWAY || 'http://' + (local.includes(':') ? '[' + local + ']' : local) + ':18218';
    const target = new URL(req.url.slice('/dev-api'.length), base);
    const upstream = http.request(target, {
      method: req.method, timeout: 6000,
      headers: { 'content-type': 'application/json', authorization: req.headers.authorization || '' },
    }, response => {
      res.writeHead(response.statusCode, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => res.writeHead(503).end());
    req.pipe(upstream);
  };
};
module.exports = config;
