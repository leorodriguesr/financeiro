import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <p className="font-serif text-3xl">Casa</p>
      <h1 className="mt-4 font-serif text-4xl">Não encontrado</h1>
      <Link href="/" className="mt-6 text-sm font-medium text-forest">
        Ir para o mês
      </Link>
    </main>
  );
}
