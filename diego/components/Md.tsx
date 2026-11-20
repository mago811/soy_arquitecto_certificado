import { Fragment } from "react";

/** Texto de preguntas con `código` en línea (sin markdown completo). Sirve en server y client. */
export function Md({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("`") && p.endsWith("`")
          ? <code key={i} className="rounded border border-line bg-bg px-1 py-px font-mono text-[0.9em]">{p.slice(1, -1)}</code>
          : <Fragment key={i}>{p}</Fragment>,
      )}
    </>
  );
}
