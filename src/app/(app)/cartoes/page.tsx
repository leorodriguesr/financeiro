import type { Metadata } from "next";
import Link from "next/link";
import { ClosingForm } from "@/components/closing-form";
import { CardForm } from "@/components/card-form";
import { Panel } from "@/components/panel";
import { requireUser } from "@/lib/auth";
import { monthLabel, parseMonth, withMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getCardPage } from "@/lib/queries";

export const metadata: Metadata = { title: "Cartões" };

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;
  const month = parseMonth(mes);
  const cards = await getCardPage(user.id, month);

  return (
    <>
      <div>
        <h1 className="font-serif text-4xl tracking-tight">Cartões</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
          Até o fechamento de {monthLabel(month)}, a compra entra no gasto deste mês e vence na fatura seguinte.
          Depois desse dia, o gasto vai para o mês seguinte e a fatura só cai no outro. O dia abaixo vale só para este mês.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="flex flex-col gap-3">
          {cards.length === 0 ? (
            <Panel title="Nenhum cartão ainda">
              <p className="text-sm leading-6 text-muted">
                Cadastre o cartão. Aí dá para lançar compras à vista ou parceladas. Depois do fechamento, o gasto vai para o mês seguinte.
              </p>
            </Panel>
          ) : (
            cards.map((card) => (
              <div
                key={card.id}
                className="rounded-3xl border border-line bg-card shadow-[0_12px_40px_-28px_rgba(28,25,21,0.45)]"
              >
                <Link href={withMonth(`/cartoes/${card.id}`, month)} className="block p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span className="mb-3 block h-1.5 w-16 rounded-full" style={{ background: card.color }} />
                      <h2 className="font-serif text-2xl">{card.name}</h2>
                      <p className="mt-1 text-sm text-muted">
                        {card.lastDigits ? `Final ${card.lastDigits} · ` : ""}
                        em {monthLabel(month)} fecha dia {card.monthClosingDay}
                        {card.closingCustom ? ` · o padrão do cartão é dia ${card.closingDay}` : ""}
                        {" · "}vence dia {card.dueDay}
                      </p>
                    </div>
                    <p className="font-serif text-2xl tabular-nums">{formatBRL(card.invoiceCents)}</p>
                  </div>
                  <p className="mt-4 text-sm text-muted">
                    {card.itemCount === 0
                      ? "Nenhum gasto neste mês"
                      : `${card.itemCount} lançamento${card.itemCount === 1 ? "" : "s"} neste mês`}
                    {card.openPlans > 0
                      ? ` · ${card.openPlans} parcelamento${card.openPlans === 1 ? "" : "s"} em aberto`
                      : ""}
                    {card.limitCents != null ? ` · limite ${formatBRL(card.limitCents)}` : ""}
                  </p>
                </Link>
                <div className="border-t border-line px-5 py-4">
                  <ClosingForm
                    cardId={card.id}
                    month={month}
                    day={card.monthClosingDay}
                    next={withMonth("/cartoes", month)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
        <Panel title="Novo cartão">
          <CardForm month={month} />
        </Panel>
      </div>
    </>
  );
}
