import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosingForm } from "@/components/closing-form";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import { Panel } from "@/components/panel";
import { requireUser } from "@/lib/auth";
import { deleteCard, deleteInstallmentPlan } from "@/lib/actions";
import { addDays, dueMonth, spendingMonth } from "@/lib/billing";
import { currentMonthKey, formatDay, monthLabel, parseMonth, shortMonth, todayISO, withMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getCardClosings, getCardDetail, getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Cartão" };

export default async function CardDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mes?: string; erro?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { mes, erro } = await searchParams;
  const month = parseMonth(mes);
  const [detail, categories, closings] = await Promise.all([
    getCardDetail(user.id, id, month),
    getCategories(user.id),
    getCardClosings(user.id),
  ]);
  if (!detail) notFound();

  const { card, invoice, plans, forecast, monthClosingDay, closingCustom, dueNowCents } = detail;
  const invoiceTotal = invoice.reduce((sum, item) => sum + item.amountCents, 0);
  const dueGroups = new Map<string, number>();
  for (const item of invoice) {
    if (!item.dueMonth) continue;
    dueGroups.set(item.dueMonth, (dueGroups.get(item.dueMonth) ?? 0) + item.amountCents);
  }
  const closingDate = `${month}-${String(monthClosingDay).padStart(2, "0")}`;
  const afterDate = addDays(closingDate, 1);
  const afterClosing = afterDate.slice(0, 7) === month ? monthClosingDay : card.closingDay;
  const dueOnClosing = dueMonth(closingDate, monthClosingDay, card.dueDay);
  const dueAfterClosing = dueMonth(afterDate, afterClosing, card.dueDay);
  const spendOnClosing = spendingMonth(closingDate, monthClosingDay);
  const spendAfter = spendingMonth(afterDate, afterClosing);
  const defaultDate = month === currentMonthKey() ? todayISO() : `${month}-01`;
  const here = withMonth(`/cartoes/${card.id}`, month);
  const forecastMax = Math.max(...forecast.map((item) => item.total), 1);

  return (
    <>
      <div>
        <Link href={withMonth("/cartoes", month)} className="text-sm font-medium text-forest">
          Cartões
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="mb-3 block h-1.5 w-16 rounded-full" style={{ background: card.color }} />
            <h1 className="font-serif text-4xl tracking-tight">{card.name}</h1>
            <p className="mt-2 text-sm text-muted">
              {card.lastDigits ? `Final ${card.lastDigits} · ` : ""}
              em {monthLabel(month)} fecha dia {monthClosingDay}
              {closingCustom ? ` · o padrão do cartão é dia ${card.closingDay}` : ""}
              {" · "}vence dia {card.dueDay}
              {card.limitCents != null ? ` · limite ${formatBRL(card.limitCents)}` : ""}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Até o dia {monthClosingDay}, entra no gasto de {monthLabel(spendOnClosing)} e vence em{" "}
              {monthLabel(dueOnClosing)}. Depois, entra no gasto de {monthLabel(spendAfter)} e vence em{" "}
              {monthLabel(dueAfterClosing)}.
            </p>
            <div className="mt-4">
              <ClosingForm
                cardId={card.id}
                month={month}
                day={monthClosingDay}
                next={withMonth(`/cartoes/${card.id}`, month)}
              />
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              Gastos em {monthLabel(month)}
            </p>
            <p className="font-serif text-4xl tabular-nums">{formatBRL(invoiceTotal)}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted">
              {[...dueGroups.entries()].map(([due, total]) => (
                <li key={due}>
                  {formatBRL(total)} vencem em {monthLabel(due)}
                </li>
              ))}
            </ul>
            {dueNowCents > 0 ? (
              <p className="mt-2 max-w-xs text-sm leading-5 text-muted sm:ml-auto">
                No início de {monthLabel(month)} você paga {formatBRL(dueNowCents)} deste cartão.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {erro === "tem-lancamentos" ? (
        <p className="rounded-2xl bg-clay/10 px-4 py-3 text-sm text-clay">
          Este cartão tem lançamentos. Exclua as despesas ou os parcelamentos antes de apagá-lo.
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Nova compra neste cartão">
          <ExpenseForm
            categories={categories}
            cards={[
              {
                id: card.id,
                name: card.name,
                closingDay: card.closingDay,
                dueDay: card.dueDay,
                closings: closings
                  .filter((item) => item.cardId === card.id)
                  .map((item) => ({ month: item.month, day: item.day })),
              },
            ]}
            defaultDate={defaultDate}
            returnTo={`/cartoes/${card.id}`}
            month={month}
            lockedCardId={card.id}
          />
        </Panel>
        <Panel title="Compras deste mês">
          <ExpenseList items={invoice} next={here} />
        </Panel>
      </div>

      <Panel title="Gastos já lançados" eyebrow="Já lançado neste cartão">
        {forecast.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma compra deste cartão daqui para a frente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {forecast.map((item) => (
              <li key={item.month}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                  <span>
                    {monthLabel(item.month)}
                    <span className="text-muted">
                      {" "}
                      · {item.items} lançamento{item.items === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="font-serif tabular-nums">{formatBRL(item.total)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-paper">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(8, Math.round((item.total / forecastMax) * 100))}%`,
                      background: item.month === month ? card.color : "#cfc6b6",
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Parcelamentos em aberto">
        {plans.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhuma compra parcelada segue depois deste mês. Lance uma compra com mais de uma parcela para acompanhar aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-5">
            {plans.map((rows) => {
              const first = rows[0];
              const total = rows.reduce((sum, row) => sum + row.amountCents, 0);
              const passed = rows.filter((row) => row.budgetMonth < month);
              const ahead = rows.filter((row) => row.budgetMonth >= month);
              const remaining = ahead.reduce((sum, row) => sum + row.amountCents, 0);
              return (
                <li key={first.groupId} className="rounded-2xl border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{first.description}</h3>
                      <p className="mt-1 text-sm text-muted">
                        Compra em {formatDay(first.spentOn)} · {first.installmentTotal}x · total {formatBRL(total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-2xl tabular-nums">{formatBRL(remaining)}</p>
                      <p className="text-xs text-muted">
                        {passed.length === 0
                          ? "Nenhuma anterior"
                          : passed.length === 1
                            ? "1 já passou"
                            : `${passed.length} já passaram`}
                        {" · "}
                        {ahead.length} pela frente
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {rows.map((row) => {
                      const state =
                        row.budgetMonth === month ? "current" : row.budgetMonth < month ? "past" : "future";
                      return (
                        <span
                          key={row.budgetMonth}
                          className={`rounded-full px-2.5 py-1 text-[11px] tabular-nums ${
                            state === "current"
                              ? "bg-forest text-white"
                              : state === "past"
                                ? "bg-paper text-muted"
                                : "border border-line bg-white text-ink"
                          }`}
                        >
                          {row.installmentNumber}/{row.installmentTotal} · {shortMonth(row.budgetMonth)} ·{" "}
                          {formatBRL(row.amountCents)}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-3">
                    <ConfirmSubmit
                      action={deleteInstallmentPlan}
                      fields={{ group_id: first.groupId, next: here }}
                      label="Excluir parcelamento inteiro"
                      message={`Excluir todas as parcelas de "${first.description}"?`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <div className="flex justify-end">
        <ConfirmSubmit
          action={deleteCard}
          fields={{ id: card.id, month }}
          label="Excluir cartão"
          message={`Excluir o cartão ${card.name}?`}
          className="text-sm text-clay hover:underline"
        />
      </div>
    </>
  );
}
