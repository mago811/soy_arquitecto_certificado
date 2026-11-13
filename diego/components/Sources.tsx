export function Sources({ sources }: { sources: { url: string; title?: string }[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-8 border-t border-line pt-4">
      <p className="text-sm font-bold">Documentación oficial</p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {sources.map((s) => (
          <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline">{s.title || s.url}</a></li>
        ))}
      </ul>
    </div>
  );
}
