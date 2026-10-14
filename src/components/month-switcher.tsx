"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { currentMonthKey, monthLabel, parseMonth, shiftMonth, withMonth } from "@/lib/dates";

export function MonthSwitcher() {
  const pathname = usePathname();
  const params = useSearchParams();
  const month = parseMonth(params.get("mes"));
  const today = currentMonthKey();

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href={withMonth(pathname, shiftMonth(month, -1))}
          aria-label="Mês anterior"
          className="grid size-10 place-items-center rounded-full border border-line bg-card text-lg text-ink"
        >
          ‹
        </Link>
        <div className="min-w-36 text-center sm:min-w-44">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Mês</p>
          <p className="font-serif text-lg leading-tight sm:text-xl">{monthLabel(month)}</p>
        </div>
        <Link
          href={withMonth(pathname, shiftMonth(month, 1))}
          aria-label="Próximo mês"
          className="grid size-10 place-items-center rounded-full border border-line bg-card text-lg text-ink"
        >
          ›
        </Link>
      </div>
      {month !== today ? (
        <Link href={withMonth(pathname, today)} className="text-xs font-medium text-forest">
          Ir para o mês atual
        </Link>
      ) : null}
    </div>
  );
}
