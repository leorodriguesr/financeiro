import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/"
        className="grid size-10 place-items-center rounded-2xl bg-forest font-serif text-lg text-white"
        aria-label="Casa"
      >
        C
      </Link>
    );
  }

  return (
    <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-1">
      <span className="grid size-11 place-items-center rounded-2xl bg-forest font-serif text-xl text-white">
        C
      </span>
      <span>
        <span className="block font-serif text-2xl leading-none">Casa</span>
        <span className="mt-1 block text-xs text-muted">gastos da casa</span>
      </span>
    </Link>
  );
}
