"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { createExpense } from "@/lib/actions";
import { parcelDate, parcelDueMonth, purchaseMonth, spendingMonth } from "@/lib/billing";
import { METHODS } from "@/lib/constants";
import { isISODate, monthLabel, withMonth } from "@/lib/dates";
import { formatBRL, parseMoney, splitCents } from "@/lib/money";
import { fieldClass, primaryButtonClass } from "@/components/styles";

type CardOption = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
  closings?: { month: string; day: number }[];
};

type CategoryOption = {
  id: string;
  name: string;
};

export function ExpenseForm({
  categories,
  cards,
  defaultDate,
  returnTo,
  month,
  lockedCardId,
}: {
  categories: CategoryOption[];
  cards: CardOption[];
  defaultDate: string;
  returnTo: string;
  month: string;
  lockedCardId?: string;
}) {
  const [state, action, pending] = useActionState(createExpense, null);
  const lockedCard = cards.find((card) => card.id === lockedCardId) ?? null;
  const [method, setMethod] = useState(lockedCard ? "credito" : "pix");
  const [cardId, setCardId] = useState(lockedCard?.id ?? cards[0]?.id ?? "");
  const [spentOn, setSpentOn] = useState(defaultDate);
  const [installments, setInstallments] = useState(1);
  const [amount, setAmount] = useState("");

  const preview = useMemo(() => {
    if (method !== "credito") return null;
    const card = cards.find((item) => item.id === cardId);
    const cents = parseMoney(amount);
    const count = Math.min(48, Math.max(1, installments));
    if (!card || !isISODate(spentOn) || cents == null) return null;
    const dates = Array.from({ length: count }, (_, index) => parcelDate(spentOn, index + 1));
    const closingFor = (date: string) =>
      card.closings?.find((item) => item.month === date.slice(0, 7))?.day ?? card.closingDay;
    const spendings = dates.map((date) => spendingMonth(date, closingFor(date)));
    const dues = dates.map((date, index) =>
      parcelDueMonth(spentOn, index + 1, card.dueDay, closingFor(date)),
    );
    const parts = splitCents(cents, count);
    return {
      first: spendings[0],
      last: spendings[count - 1],
      firstDue: dues[0],
      lastDue: dues[count - 1],
      count,
      sameValue: parts.every((part) => part === parts[0]),
      parcel: parts[0],
      cardName: card.name,
      moved: spendings[0] !== purchaseMonth(spentOn),
    };
  }, [amount, cardId, cards, installments, method, spentOn]);

  const creditWithoutCard = method === "credito" && cards.length === 0;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {lockedCard ? (
        <>
          <input type="hidden" name="payment_method" value="credito" />
          <input type="hidden" name="card_id" value={lockedCard.id} />
        </>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Descrição</span>
        <input
          name="description"
          required
          minLength={2}
          maxLength={120}
          placeholder="Feira, aluguel, farmácia"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Valor</span>
          <input
            name="amount"
            required
            inputMode="decimal"
            placeholder="0,00"
            onChange={(event) => setAmount(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-muted">Data da compra</span>
          <input
            name="spent_on"
            type="date"
            required
            value={spentOn}
            onChange={(event) => setSpentOn(event.target.value)}
            className={fieldClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-muted">Categoria</span>
        <select name="category_id" required className={fieldClass} defaultValue={categories[0]?.id ?? ""}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>

      {lockedCard ? null : (
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-muted">Como foi pago</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((item) => (
              <label
                key={item.id}
                className={`cursor-pointer rounded-full px-3 py-2 text-sm ${
                  method === item.id ? "bg-ink text-white" : "bg-paper text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value={item.id}
                  checked={method === item.id}
                  onChange={() => setMethod(item.id)}
                  className="sr-only"
                />
                {item.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {method === "credito" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {lockedCard ? null : (
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Cartão</span>
              {cards.length > 0 ? (
                <select
                  name="card_id"
                  required
                  value={cardId}
                  onChange={(event) => setCardId(event.target.value)}
                  className={fieldClass}
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-2xl bg-paper px-3 py-3 text-sm text-muted">
                  Nenhum cartão ainda.{" "}
                  <Link href={withMonth("/cartoes", month)} className="font-medium text-forest">
                    Cadastrar
                  </Link>
                </p>
              )}
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Parcelas</span>
            <input
              name="installments"
              type="number"
              min={1}
              max={48}
              required
              defaultValue={1}
              onChange={(event) => setInstallments(Number(event.target.value))}
              className={fieldClass}
            />
          </label>
        </div>
      ) : null}

      {preview ? (
        <div className="rounded-2xl bg-paper px-3.5 py-3 text-sm leading-6 text-ink">
          <p>
            {preview.count === 1
              ? "À vista no cartão."
              : `${preview.count}x de ${formatBRL(preview.parcel)}${
                  preview.sameValue ? "." : ". A última leva a diferença de centavos."
                }`}
          </p>
          <p className="text-muted">
            {preview.moved
              ? "Passou do fechamento, então o gasto vai para o mês seguinte. "
              : ""}
            {preview.count > 1
              ? `Conta no gasto de ${monthLabel(preview.first)} até ${monthLabel(preview.last)}, no ${preview.cardName}. A primeira vence em ${monthLabel(preview.firstDue)} e a última em ${monthLabel(preview.lastDue)}.`
              : `Conta no gasto de ${monthLabel(preview.first)}, no ${preview.cardName}. Vence em ${monthLabel(preview.firstDue)}.`}
          </p>
        </div>
      ) : null}

      {state?.error ? <p className="text-sm text-clay">{state.error}</p> : null}
      <button type="submit" disabled={pending || creditWithoutCard} className={primaryButtonClass}>
        {pending ? "Lançando…" : "Lançar"}
      </button>
    </form>
  );
}
