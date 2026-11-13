"use client";
import { useOptimistic, useTransition } from "react";
import { toggleTask } from "@/app/actions";

export function TaskCheck({ id, done }: { id: string; done: boolean }) {
  const [opt, setOpt] = useOptimistic(done);
  const [, start] = useTransition();
  return (
    <input
      type="checkbox"
      aria-label="Marcar como hecho"
      checked={opt}
      onChange={(e) => {
        const v = e.target.checked;
        start(async () => { setOpt(v); await toggleTask(id, v); });
      }}
      className="mt-1 size-5 shrink-0 accent-[var(--accent)]"
    />
  );
}
