import Link from "next/link";
import { notFound } from "next/navigation";
import { getLab, getObjective } from "@/lib/content";
import { Sources } from "@/components/Sources";

export default async function Lab({ params }: { params: Promise<{ obj: string }> }) {
  const id = Number((await params).obj);
  const lab = getLab(id);
  if (!getObjective(id) || !lab) notFound();
  return (
    <article>
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Laboratorio · objetivo {id}</p>
      <h1 className="mt-1 text-2xl font-bold">{lab.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {lab.minutes ? `⏱️ ${lab.minutes} min` : ""}{lab.needs?.length ? ` · Necesitás: ${lab.needs.join(", ")}` : ""}
      </p>
      {lab.status !== "verificada" && (
        <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">Este laboratorio todavía no pasó la verificación contra la documentación oficial.</p>
      )}
      <div className="prose-c mt-4" dangerouslySetInnerHTML={{ __html: lab.html }} />
      <Sources sources={lab.sources} />
      <div className="mt-8"><Link href={`/leccion/${id}`} className="btn btn-ghost">← Volver a la lección</Link></div>
    </article>
  );
}
