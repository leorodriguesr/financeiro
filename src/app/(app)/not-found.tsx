import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-line bg-card px-6 py-10">
      <h1 className="font-serif text-3xl">Não encontrado</h1>
      <p className="mt-2 text-sm text-muted">Esse cartão ou essa página não existe.</p>
      <Link href="/" className="mt-6 inline-flex text-sm font-medium text-forest">
        Voltar ao mês
      </Link>
    </div>
  );
}
