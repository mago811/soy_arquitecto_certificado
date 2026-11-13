import "server-only";
import { neon } from "@neondatabase/serverless";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;
export type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<Row[]>;

let _sql: Sql | null = null;

/**
 * En producción: driver HTTP de Neon.
 * En local (DATABASE_URL a localhost): driver `pg`, para poder probar con un Postgres común.
 */
export function sql(): Sql {
  if (_sql) return _sql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    let pool: import("pg").Pool | null = null;
    _sql = async (strings, ...values) => {
      if (!pool) { const { Pool } = await import("pg"); pool = new Pool({ connectionString: url }); }
      const text = strings.reduce((acc, s, i) => acc + s + (i < values.length ? `$${i + 1}` : ""), "");
      return (await pool.query(text, values)).rows;
    };
  } else {
    _sql = neon(url) as unknown as Sql;
  }
  return _sql;
}
