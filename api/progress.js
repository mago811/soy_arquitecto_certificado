// Sync de progreso — Vercel Function (runtime Node.js, Web handlers)
// GET  /api/progress  -> todas las filas { key, data, updated_at }
// PUT  /api/progress  -> [{ key, data, client_updated_at }] con last-write-wins por clave
// Auth: header Authorization: Bearer <SYNC_TOKEN>

import { neon } from "@neondatabase/serverless";

let _sql;
function sql(...args) {
  if (!_sql) _sql = neon(process.env.DATABASE_URL);
  return _sql(...args);
}

function autorizado(req) {
  const token = process.env.SYNC_TOKEN;
  const header = req.headers.get("authorization") || "";
  return Boolean(token) && header === `Bearer ${token}`;
}

const noAutorizado = () =>
  Response.json({ error: "unauthorized" }, { status: 401 });

export async function GET(req) {
  if (!autorizado(req)) return noAutorizado();
  const rows = await sql`SELECT key, data, updated_at FROM progress ORDER BY key`;
  return Response.json(rows);
}

export async function PUT(req) {
  if (!autorizado(req)) return noAutorizado();

  let items;
  try {
    items = await req.json();
    if (!Array.isArray(items)) throw new Error("no es array");
  } catch {
    return Response.json(
      { error: "se espera un array de { key, data, client_updated_at }" },
      { status: 400 }
    );
  }

  const results = [];
  for (const item of items) {
    const valido =
      item && typeof item.key === "string" && item.key.length > 0 &&
      item.data !== undefined &&
      typeof item.client_updated_at === "string" &&
      !Number.isNaN(Date.parse(item.client_updated_at));

    if (!valido) {
      results.push({ key: item?.key ?? null, applied: false, reason: "item inválido" });
      continue;
    }

    // upsert solo si el timestamp del cliente es MÁS NUEVO que el de la fila
    const rows = await sql`
      INSERT INTO progress (key, data, updated_at)
      VALUES (${item.key}, ${JSON.stringify(item.data)}::jsonb, ${item.client_updated_at})
      ON CONFLICT (key) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at
        WHERE progress.updated_at < EXCLUDED.updated_at
      RETURNING key`;
    results.push({ key: item.key, applied: rows.length > 0 });
  }

  return Response.json({ results });
}
