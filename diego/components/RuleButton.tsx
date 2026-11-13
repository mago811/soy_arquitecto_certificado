"use client";
import { useOptimistic, useTransition } from "react";
import { markRule } from "@/app/actions";

export function RuleButton({ objective, reviewed }: { objective: number; reviewed: boolean }) {
  const [opt, setOpt] = useOptimistic(reviewed);
  const [, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { setOpt(!opt); await markRule(objective, !opt); })}
      className={`shrink-0 rounded-lg border px-2.5 py-1 text-xs font-semibold ${opt ? "border-ok bg-ok-soft text-ok" : "border-line text-muted hover:text-ink"}`}
    >
      {opt ? "✓ Repasada" : "Marcar repasada"}
    </button>
  );
}
