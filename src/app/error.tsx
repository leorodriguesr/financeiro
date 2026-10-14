"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-serif text-3xl">Casa</p>
      <h1 className="mt-4 font-serif text-4xl">Não foi possível abrir</h1>
      <p className="mt-3 text-sm leading-6 text-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 w-fit rounded-full bg-forest px-5 py-2.5 text-sm font-medium text-white"
      >
        Tentar de novo
      </button>
    </main>
  );
}
