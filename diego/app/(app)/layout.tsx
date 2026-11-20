import Link from "next/link";
import { logout } from "../actions";
import { daysToExam } from "@/lib/dates";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Hoy" },
  { href: "/plan", label: "Plan" },
  { href: "/practica", label: "Práctica" },
  { href: "/diagnostico", label: "Test de nivel" },
  { href: "/simulacros", label: "Simulacros" },
  { href: "/progreso", label: "Progreso" },
  { href: "/errores", label: "Errores" },
  { href: "/reglas", label: "Reglas" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const left = daysToExam();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="sticky top-0 z-10 -mx-4 border-b border-line bg-bg/95 px-4 pt-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-bold">CCAR-F <span className="text-accent">· Diego</span></Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 font-semibold text-accent">
              {left > 0 ? `${left} ${left === 1 ? "día" : "días"} al examen` : left === 0 ? "Hoy es el examen" : "Examen rendido"}
            </span>
            <form action={logout}><button className="text-muted hover:text-ink">Salir</button></form>
          </div>
        </div>
        <nav className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-lg px-2.5 py-1.5 text-muted hover:bg-surface hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="pt-5">{children}</main>
    </div>
  );
}
