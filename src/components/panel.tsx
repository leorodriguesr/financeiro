export function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-line bg-card px-5 py-5 shadow-[0_12px_40px_-28px_rgba(28,25,21,0.45)]">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-base font-medium">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
