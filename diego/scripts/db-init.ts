// Crea las tablas de progreso. Idempotente.
// Uso: npm run db:init  (lee DATABASE_URL del entorno, de .env.local o de .env)
import { readFileSync, existsSync } from "node:fs";

for (const f of [".env.local", ".env"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.DATABASE_URL;
if (!url) { console.error("Falta DATABASE_URL"); process.exit(1); }
const ddl = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
const stmts = ddl.split(";").map((s) => s.trim()).filter(Boolean);

if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  const { default: pg } = await import("pg");
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  for (const s of stmts) await c.query(s);
  await c.end();
} else {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  for (const s of stmts) await sql.query(s);
}
console.log("Tablas listas.");
