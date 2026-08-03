// Crea la tabla progress en Neon (idempotente). Uso: npm run init-db
import "./load-env.js";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (en .env.local o en el entorno).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

await sql`
  CREATE TABLE IF NOT EXISTS progress (
    key text PRIMARY KEY,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`;

const [{ count }] = await sql`SELECT count(*)::int AS count FROM progress`;
console.log(`Tabla progress lista. Filas actuales: ${count}`);
