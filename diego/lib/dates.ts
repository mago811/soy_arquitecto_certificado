export const TZ = "America/Argentina/Buenos_Aires";
export const EXAM_DATE = "2026-11-28";
export const PLAN_START = "2026-11-14";

/** Fecha de hoy (YYYY-MM-DD) en Buenos Aires. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string) {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

export const daysToExam = (today = todayISO()) => diffDays(today, EXAM_DATE);

/** Día del plan (1..15) que corresponde a hoy. Antes del inicio muestra el 1. */
export function currentPlanDay(today = todayISO()) {
  return Math.min(15, Math.max(1, diffDays(PLAN_START, today) + 1));
}

export function formatDate(iso: string) {
  const wd = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
  return `${wd} ${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
}
