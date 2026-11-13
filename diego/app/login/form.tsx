"use client";
import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm({ next }: { next: string }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="mt-6 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input
        name="password" type="password" required autoFocus autoComplete="current-password"
        placeholder="Contraseña"
        className="card px-4 py-3 outline-none focus:border-accent"
      />
      <button className="btn" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
      {error && <p className="text-sm text-bad">{error}</p>}
    </form>
  );
}
