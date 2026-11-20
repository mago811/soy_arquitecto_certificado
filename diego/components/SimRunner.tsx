"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { finishSim, saveSimAnswer, finishDiag, saveDiagAnswer } from "@/app/actions";
import { Md } from "@/components/Md";

const L = ["A", "B", "C", "D"];
type Q = { id: string; scenario: string; options: string[] };

export function SimRunner({ simId, attemptId, questions, initialAnswers, deadline, kind = "sim" }: {
  simId: number; attemptId: number; questions: Q[]; initialAnswers: Record<string, number>; deadline: string; kind?: "sim" | "diag";
}) {
  const isDiag = kind === "diag";
  const save = isDiag ? saveDiagAnswer : saveSimAnswer;
  const done = isDiag ? finishDiag : finishSim;
  const [answers, setAnswers] = useState<Record<string, number>>(initialAnswers);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(() => new Date(deadline).getTime() - Date.now());
  const [pending, start] = useTransition();
  const finishing = useRef(false);

  const finish = () => {
    if (finishing.current) return;
    finishing.current = true;
    start(async () => { await done(attemptId); });
  };

  useEffect(() => {
    const t = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now();
      setLeft(ms);
      if (ms <= 0) finish();
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const q = questions[i];
  const answered = Object.keys(answers).length;
  const mm = Math.max(0, Math.floor(left / 60000));
  const ss = Math.max(0, Math.floor((left % 60000) / 1000));

  function choose(k: number) {
    setAnswers((a) => ({ ...a, [q.id]: k }));
    void save(attemptId, q.id, k);
  }

  return (
    <div>
      <div className="sticky top-[86px] z-10 -mx-4 mb-4 flex items-center justify-between border-b border-line bg-bg/95 px-4 py-2 backdrop-blur">
        <span className="text-sm font-semibold">{isDiag ? "Test de nivel" : `Simulacro ${simId}`} · {answered}/{questions.length} respondidas</span>
        <span className={`font-mono text-lg font-bold ${left < 10 * 60000 ? "text-bad" : ""}`}>
          {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
        </span>
      </div>

      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between text-sm text-muted">
          <span>Pregunta {i + 1} de {questions.length}</span>
          <button
            onClick={() => setMarked((m) => { const n = new Set(m); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}
            className={marked.has(q.id) ? "font-semibold text-warn" : "hover:text-ink"}
          >
            {marked.has(q.id) ? "★ Marcada para revisar" : "☆ Marcar para revisar"}
          </button>
        </div>
        <p className="whitespace-pre-line leading-relaxed"><Md text={q.scenario} /></p>
        <ol className="mt-4 flex flex-col gap-2">
          {q.options.map((opt, k) => (
            <li key={k}>
              <button onClick={() => choose(k)}
                className={`flex w-full gap-3 rounded-xl border p-3 text-left ${answers[q.id] === k ? "border-accent bg-accent-soft" : "border-line hover:border-accent"}`}>
                <span className="font-bold">{L[k]}</span><span><Md text={opt} /></span>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-4 flex justify-between">
        <button className="btn btn-ghost" disabled={i === 0} onClick={() => setI(i - 1)}>← Anterior</button>
        {i + 1 < questions.length
          ? <button className="btn btn-ghost" onClick={() => setI(i + 1)}>Siguiente →</button>
          : <span />}
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {questions.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)}
            className={`size-8 rounded-md text-xs font-semibold ${k === i ? "ring-2 ring-accent" : ""} ${marked.has(x.id) ? "bg-warn-soft text-warn" : answers[x.id] !== undefined ? "bg-accent text-white" : "bg-surface border border-line text-muted"}`}>
            {k + 1}
          </button>
        ))}
      </div>

      <div className="mt-8 border-t border-line pt-4 text-center">
        <button className="btn" disabled={pending}
          onClick={() => {
            const missing = questions.length - answered;
            if (confirm(missing ? `Te faltan ${missing} preguntas. ¿Terminar igual?` : "¿Terminar y ver el informe?")) finish();
          }}>
          {pending ? "Corrigiendo…" : isDiag ? "Terminar test" : "Terminar simulacro"}
        </button>
      </div>
    </div>
  );
}
