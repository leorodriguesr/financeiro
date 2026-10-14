"use client";

import { useActionState, useEffect } from "react";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { fieldClass, primaryButtonClass } from "@/components/styles";
import { createIncome, deleteIncome } from "@/lib/actions";
import { formatDay, withMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import type { IncomeItem } from "@/lib/queries";

export function IncomeForm({
  month,
  defaultDate,
  incomes,
}: {
  month: string;
  defaultDate: string;
  incomes: IncomeItem[];
}) {
  const [state, action, pending] = useActionState(createIncome, null);
  const waiting = pending || state?.ok === true;
  const total = incomes.reduce((sum, item) => sum + item.amountCents, 0);

  useEffect(() => {
    if (state?.ok && state.next) {
      window.location.assign(state.next);
    }
  }, [state]);

  return (
    <div className="rounded-3xl bg-paper p-4">
      <form action={action} className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted">O que entrou neste mês</p>
        <label className="block">
          <span className="sr-only">Descrição</span>
          <input name="description" required maxLength={80} placeholder="Salário, 13º, reembolso" className={fieldClass} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="sr-only">Valor</span>
            <input name="amount" required inputMode="decimal" placeholder="0,00" className={fieldClass} />
          </label>
          <label className="block">
            <span className="sr-only">Data</span>
            <input name="received_on" type="date" required defaultValue={defaultDate} className={fieldClass} />
          </label>
        </div>
        {state?.error ? <p className="text-sm text-clay">{state.error}</p> : null}
        <button type="submit" disabled={waiting} className={`${primaryButtonClass} w-full`}>
          {waiting ? "Salvando…" : "Adicionar receita"}
        </button>
      </form>

      {incomes.length > 0 ? (
        <ul className="mt-4 border-t border-line pt-3">
          {incomes.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.description}</p>
                <p className="text-xs text-muted">{formatDay(item.receivedOn)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-serif text-base tabular-nums">{formatBRL(item.amountCents)}</p>
                <ConfirmSubmit
                  action={deleteIncome}
                  fields={{ id: item.id, next: withMonth("/", month) }}
                  label="Excluir"
                  message={`Excluir "${item.description}"?`}
                />
              </div>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
            <span className="text-muted">Total recebido</span>
            <span className="font-serif tabular-nums">{formatBRL(total)}</span>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
