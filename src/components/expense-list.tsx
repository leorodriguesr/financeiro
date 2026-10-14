import { ConfirmSubmit } from "@/components/confirm-submit";
import { deleteExpense } from "@/lib/actions";
import { methodLabel } from "@/lib/constants";
import { formatDay, monthLabel } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { ExpenseItem } from "@/lib/queries";

export function ExpenseList({ items, next }: { items: ExpenseItem[]; next: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Nada lançado neste mês.</p>;
  }

  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-b-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: item.categoryTone ?? "#6f675c" }}
              />
              <p className="font-medium">{item.description}</p>
              {item.installmentNumber && item.installmentTotal ? (
                <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-muted">
                  {item.installmentNumber}/{item.installmentTotal}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatDay(item.spentOn)}
              {" · "}
              {item.categoryName ?? "Sem categoria"}
              {" · "}
              {methodLabel(item.paymentMethod)}
              {item.cardName ? ` · ${item.cardName}` : ""}
              {item.dueMonth ? ` · vence em ${monthLabel(item.dueMonth)}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-serif text-lg tabular-nums">{formatBRL(item.amountCents)}</p>
            <ConfirmSubmit
              action={deleteExpense}
              fields={{ id: item.id, next }}
              label="Excluir"
              message={`Excluir "${item.description}"?`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
