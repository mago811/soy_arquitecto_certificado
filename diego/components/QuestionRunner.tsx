"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { answerQuestion } from "@/app/actions";
import type { Question } from "@/lib/content";

const L = ["A", "B", "C", "D"];

export function QuestionRunner({ questions: initial, mode, doneHref }: { questions: Question[]; mode: "practice" | "review"; doneHref: string }) {
  // Congelamos la lista: revalidar la página después de responder no debe reordenarla.
  const [questions] = useState(initial);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState({ ok: 0, n: 0 });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) return <p className="text-muted">No hay preguntas para mostrar acá todavía.</p>;

  if (i >= questions.length) {
    return (
      <div className="card p-6 text-center">
        <p className="text-4xl font-bold">{score.ok}/{score.n}</p>
        <p className="mt-1 text-muted">{score.ok === score.n ? "Todas bien. Seguí así." : "Las que fallaste vuelven en 1, 3 y 7 días, y quedan en el registro de errores."}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href={doneHref} className="btn">Volver</Link>
          <Link href="/errores" className="btn btn-ghost">Ver errores</Link>
        </div>
      </div>
    );
  }

  const q = questions[i];
  const answered = chosen !== null;

  function choose(k: number) {
    if (answered || pending) return;
    setChosen(k);
    setError(null);
    start(async () => {
      try {
        await answerQuestion(q.id, k, mode);
        setScore((s) => ({ ok: s.ok + (k === q.correct ? 1 : 0), n: s.n + 1 }));
      } catch {
        setError("No se pudo guardar la respuesta. Revisá la conexión y probá de nuevo.");
        setChosen(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-muted">
        <span>Pregunta {i + 1} de {questions.length}</span>
        <span>Objetivo {q.objective}</span>
      </div>
      <div className="card p-5">
        <p className="whitespace-pre-line leading-relaxed">{q.scenario}</p>
        <ol className="mt-4 flex flex-col gap-2">
          {q.options.map((opt, k) => {
            let cls = "border-line hover:border-accent";
            if (answered) {
              if (k === q.correct) cls = "border-ok bg-ok-soft";
              else if (k === chosen) cls = "border-bad bg-bad-soft";
              else cls = "border-line opacity-70";
            }
            return (
              <li key={k}>
                <button onClick={() => choose(k)} disabled={answered}
                  className={`flex w-full gap-3 rounded-xl border p-3 text-left ${cls}`}>
                  <span className="font-bold">{L[k]}</span><span>{opt}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      </div>

      {answered && (
        <div className="mt-4 flex flex-col gap-3">
          <div className={`card p-4 ${chosen === q.correct ? "border-ok" : "border-bad"}`}>
            <p className={`font-bold ${chosen === q.correct ? "text-ok" : "text-bad"}`}>
              {chosen === q.correct ? "¡Bien!" : `No. La correcta es la ${L[q.correct]}.`}
            </p>
            <p className="mt-2"><b>Por qué {L[q.correct]}:</b> {q.why_correct}</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {Object.entries(q.why_wrong).map(([k, why]) => (
                <li key={k} className={Number(k) === chosen ? "font-medium" : "text-muted"}>
                  <b>{L[Number(k)]} no:</b> {why}
                </li>
              ))}
            </ul>
          </div>
          <div className="card bg-accent-soft p-4 text-sm">
            <p><b>Regla:</b> {q.rule}</p>
            <p className="mt-2 text-muted">Fuente: <a className="underline" href={q.source_url} target="_blank" rel="noreferrer">{q.source_url.replace(/^https:\/\//, "")}</a></p>
            <blockquote className="mt-1 italic text-muted">“{q.source_quote}”</blockquote>
          </div>
          <button className="btn self-end" disabled={pending} onClick={() => { setChosen(null); setI(i + 1); window.scrollTo({ top: 0 }); }}>
            {i + 1 < questions.length ? "Siguiente" : "Terminar"}
          </button>
        </div>
      )}
    </div>
  );
}
