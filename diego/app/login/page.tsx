import { LoginForm } from "./form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">CCAR-F · retake</p>
      <h1 className="mt-1 text-2xl font-bold">Hola, Diego</h1>
      <p className="mt-1 text-muted">Ingresá la contraseña para seguir con tu plan.</p>
      <LoginForm next={next ?? "/"} />
    </main>
  );
}
