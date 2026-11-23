import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { maxQuantity, products, shipping } from './catalog.mjs';

const digest = text => createHash('sha256').update(text).digest();

export function orderRoutes(databasePath, env) {
  const db = new DatabaseSync(databasePath);
  db.exec(`PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL, fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL, kind TEXT NOT NULL, contact TEXT NOT NULL,
      total INTEGER NOT NULL, details TEXT NOT NULL
    )`);
  const unit = Number(env.OEM_UNIT_PRICE);
  const setup = Number(env.OEM_SETUP_FEE ?? 0);
  const rate = Number.isInteger(unit) && unit > 0 && unit <= 100000 &&
    Number.isInteger(setup) && setup >= 0 && setup <= 1000000 ? { unit, setup } : null;
  const admin = env.ORDER_ADMIN_TOKEN;
  const lookup = db.prepare('SELECT * FROM orders WHERE request_key = ?');
  const insert = db.prepare(`INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(request_key) DO NOTHING`);
  const list = db.prepare(`SELECT id, created_at, kind, contact, total, details FROM orders
    WHERE (? = '' OR kind = ?) AND (? = '' OR id = ? OR instr(contact, ?) > 0)
    ORDER BY rowid DESC LIMIT 51 OFFSET ?`);

  return async (request, response, url) => {
    const send = (status, body) => response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }).end(JSON.stringify(body));
    if (url.pathname === '/api/oem-rate' && request.method === 'GET') return send(200, { rate });
    if (url.pathname === '/api/admin/orders' && request.method === 'GET') {
      if (!admin || admin.length < 24) return send(503, { error: 'admin_unconfigured' });
      if (!timingSafeEqual(digest(request.headers.authorization ?? ''), digest('Bearer ' + admin))) {
        return send(401, { error: 'unauthorized' });
      }
      const kind = url.searchParams.get('kind') ?? '';
      const query = (url.searchParams.get('q') ?? '').trim();
      const page = Number(url.searchParams.get('page') ?? 1);
      if (!['', 'retail', 'oem'].includes(kind) || query.length > 120 ||
          !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
        return send(400, { error: 'invalid_query' });
      }
      const rows = list.all(kind, kind, query, query, query, (page - 1) * 50);
      return send(200, { more: rows.length > 50, orders: rows.slice(0, 50).map(row => ({
        ...row, details: JSON.parse(row.details)
      })) });
    }
    if (url.pathname !== '/api/orders' || request.method !== 'POST') return send(404, { error: 'not_found' });
    if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
      return send(415, { error: 'invalid_content_type' });
    }
    let body;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > 12000) {
          response.setHeader('Connection', 'close');
          request.resume();
          return send(413, { error: 'too_large' });
        }
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return send(400, { error: 'invalid_json' });
    }
    const contact = typeof body?.contact === 'string' ? body.contact.trim() : '';
    const key = body?.key;
    if (!contact || contact.length > 120 || typeof key !== 'string' || !/^[a-f0-9-]{36}$/.test(key)) {
      return send(400, { error: 'invalid_order' });
    }
    const fingerprint = digest(JSON.stringify(body)).toString('hex');
    const receipt = row => row.fingerprint === fingerprint
      ? send(200, { id: row.id, total: row.total })
      : send(409, { error: 'request_conflict' });
    const existing = lookup.get(key);
    if (existing) return receipt(existing);

    let details;
    let total;
    if (body.kind === 'retail') {
      if (!['discuss', 'homeDelivery', 'pickup'].includes(body.delivery) ||
          !Array.isArray(body.items) || !body.items.length || body.items.length > products.length) {
        return send(400, { error: 'invalid_order' });
      }
      const items = body.items.map(item => {
        const { id, quantity } = item ?? {};
        const product = products.find(item => item.id === id);
        if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) return null;
        return { id, name: product.names[0], quantity, unitPrice: product.price };
      });
      if (items.includes(null) || new Set(items.map(item => item.id)).size !== items.length) {
        return send(400, { error: 'invalid_order' });
      }
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const deliveryFee = subtotal < shipping.freeFrom ? shipping.estimate : 0;
      total = subtotal + deliveryFee;
      details = { items, delivery: body.delivery, subtotal, deliveryFee };
    } else if (body.kind === 'oem') {
      const specification = typeof body.specification === 'string' ? body.specification.trim() : '';
      const { quantity } = body;
      if (!specification || specification.length > 1000 || !Number.isInteger(quantity) ||
          quantity < 1 || quantity > 10000) return send(400, { error: 'invalid_order' });
      if (!rate || body.unit !== rate.unit || body.setup !== rate.setup) {
        return send(409, { error: 'rate_changed' });
      }
      total = quantity * rate.unit + rate.setup;
      details = { quantity, specification, unitPrice: rate.unit, setupFee: rate.setup };
    } else {
      return send(400, { error: 'invalid_order' });
    }
    const id = randomUUID();
    const result = insert.run(id, key, fingerprint, new Date().toISOString(), body.kind,
      contact, total, JSON.stringify(details));
    if (!result.changes) return receipt(lookup.get(key));
    return send(201, { id, total });
  };
}
