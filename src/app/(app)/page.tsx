import type { Metadata } from "next";
import Link from "next/link";
import { ExpenseList } from "@/components/expense-list";
import { IncomeForm } from "@/components/income-form";
import { Panel } from "@/components/panel";
import { quietButtonClass } from "@/components/styles";
import { requireUser } from "@/lib/auth";
import { methodLabel } from "@/lib/constants";
import { currentMonthKey, monthLabel, parseMonth, todayISO, withMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getDashboard, type Breakdown } from "@/lib/queries";

export const metadata: Metadata = { title: "Mês" };

const methodTones: Record<string, string> = {
  dinheiro: "#8a6a2f",
  debito: "#243044",
  pix: "#1f6f8b",
  credito: "#1e6b45",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;
  const month = parseMonth(mes);
  const data = await getDashboard(user.id, month);
  const income = data.incomes.reduce((sum, item) => sum + item.amountCents, 0);
  const cardSpent = data.byMethod.find((item) => item.key === "credito")?.total ?? 0;
  const bills = data.spent - cardSpent;
  const installments = data.parcels.reduce((sum, item) => sum + item.amountCents, 0);
  const cardPurchases = cardSpent - installments;
  const hasIncome = income > 0;
  const remaining = hasIncome ? income - data.spent : null;
  const over = remaining != null && remaining < 0;
  const heroAmount = remaining == null ? data.spent : Math.abs(remaining);
  const ratio = income > 0 ? data.spent / income : 0;
  const defaultDate = month === currentMonthKey() ? todayISO() : `${month}-01`;
  const methods: Breakdown[] = data.byMethod.map((item) => ({
    ...item,
    label: methodLabel(item.key),
    tone: methodTones[item.key] ?? "#1e6b45",
  }));

  return (
    <>
      <h1 className="sr-only">Mês de {monthLabel(month)}</h1>
      <section className="overflow-hidden rounded-[2rem] border border-line bg-card shadow-[0_12px_40px_-28px_rgba(28,25,21,0.45)]">
        <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1.35fr_0.8fr] xl:items-end">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
              {remaining == null ? "Gasto no mês" : over ? "Passou do que recebeu" : "Ainda pode gastar no cartão"}
            </p>
            <p
              className={`mt-3 font-serif text-4xl tracking-tight tabular-nums sm:text-5xl xl:text-6xl ${
                over ? "text-clay" : remaining == null ? "text-ink" : "text-forest"
              }`}
            >
              {formatBRL(heroAmount)}
            </p>
            {hasIncome ? (
              <ul className="mt-4 max-w-md space-y-1.5 text-sm">
                <RoomLine label="Receitas" amount={income} sign="plus" />
                <RoomLine label="Contas fora do cartão" amount={bills} sign="minus" />
                <RoomLine label="Parcelas do cartão" amount={installments} sign="minus" />
                <RoomLine label="Outras compras no cartão" amount={cardPurchases} sign="minus" />
              </ul>
            ) : (
              <p className="mt-3 max-w-md text-sm leading-6 text-muted">
                Já saíram {formatBRL(data.spent)} em {monthLabel(month)}. Lance o salário e os outros recebimentos. A
                soma, menos as contas e as parcelas, é o que ainda pode ir para o cartão.
              </p>
            )}
            <Link href={withMonth("/despesas", month)} className={`${quietButtonClass} mt-5`}>
              Lançar despesa
            </Link>
          </div>
          <IncomeForm month={month} defaultDate={defaultDate} incomes={data.incomes} />
        </div>
        {hasIncome ? (
          <div className="border-t border-line px-6 py-4 sm:px-8">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>{Math.round(ratio * 100)}% do que entrou</span>
              <span>{over ? "Passou do que entrou" : "Dentro do que entrou"}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-paper">
              <div
                className={`h-full rounded-full ${over ? "bg-clay" : "bg-forest"}`}
                style={{ width: `${Math.min(ratio, 1) * 100}%` }}
              />
            </div>
          </div>
        ) : null}
      </section>

      <p className="px-1 text-sm leading-6 text-muted">
        O que entra no mês é o teto. Saem as contas pagas em Pix, dinheiro ou débito, e o cartão deste mês, inclusive
        as parcelas. Compra depois do fechamento entra no gasto do mês seguinte. A fatura que vence agora não sai de novo.
      </p>

      {data.bills.length > 0 ? (
        <Panel title={`Conta paga no início de ${monthLabel(month)}`} eyebrow="Com o salário">
          <p className="mb-4 text-sm leading-6 text-muted">
            Esta é a fatura que vence agora. Entram as compras feitas até o fechamento do ciclo. O que passou do dia de
            fechamento entra no gasto do mês seguinte e fica para a fatura de depois. Este valor não reduz o que você ainda pode gastar neste mês.
          </p>
          <ul className="flex flex-col gap-3">
            {data.bills.map((bill) => (
              <li key={bill.id} className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: bill.color }} />
                  <span className="truncate">{bill.name}</span>
                </span>
                <span className="font-serif text-lg tabular-nums">{formatBRL(bill.total)}</span>
              </li>
            ))}
          </ul>
          {data.bills.length > 1 ? (
            <p className="mt-4 border-t border-line pt-4 font-serif text-2xl tabular-nums">
              {formatBRL(data.bills.reduce((sum, bill) => sum + bill.total, 0))}
            </p>
          ) : null}
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Por categoria">
          <BreakdownList items={data.byCategory} />
        </Panel>
        <Panel title="Como foi pago">
          <BreakdownList items={methods} />
        </Panel>
      </div>

      <Panel
        title="Gastos no cartão neste mês"
        eyebrow="O vencimento segue o fechamento"
        action={
          <Link href={withMonth("/cartoes", month)} className="text-sm font-medium text-forest">
            Ver cartões
          </Link>
        }
      >
        {data.invoices.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum cartão cadastrado.{" "}
            <Link href={withMonth("/cartoes", month)} className="font-medium text-forest">
              Adicionar o primeiro
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.invoices.map((card) => (
              <li key={card.id}>
                <Link
                  href={withMonth(`/cartoes/${card.id}`, month)}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-3"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: card.color }} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{card.name}</span>
                      <span className="block text-xs text-muted">
                        {card.itemCount === 0
                          ? "Nenhum gasto neste mês"
                          : `${card.itemCount} lançamento${card.itemCount === 1 ? "" : "s"}`}
                        {card.openPlans > 0
                          ? ` · ${card.openPlans} parcelamento${card.openPlans === 1 ? "" : "s"} em aberto`
                          : ""}
                      </span>
                    </span>
                  </span>
                  <span className="font-serif text-lg tabular-nums">{formatBRL(card.invoiceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Parcelas deste mês">
        <ExpenseList items={data.parcels} next={withMonth("/", month)} />
      </Panel>

      <Panel title="Já comprometido à frente">
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum gasto futuro lançado. Parcelas de cartão aparecem aqui assim que você registrar a compra.
          </p>
        ) : (
          <BreakdownList
            items={data.upcoming.map((item) => ({
              key: item.month,
              label: monthLabel(item.month),
              tone: "#1e6b45",
              total: item.total,
            }))}
          />
        )}
      </Panel>

      <Panel
        title="Últimos lançamentos"
        action={
          <Link href={withMonth("/despesas", month)} className="text-sm font-medium text-forest">
            Ver todas
          </Link>
        }
      >
        <ExpenseList items={data.recent} next={withMonth("/", month)} />
      </Panel>
    </>
  );
}

function RoomLine({ label, amount, sign }: { label: string; amount: number; sign: "plus" | "minus" }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className={`font-serif tabular-nums ${sign === "plus" ? "text-forest" : "text-ink"}`}>
        {sign === "plus" ? "+ " : "− "}
        {formatBRL(amount)}
      </span>
    </li>
  );
}

function BreakdownList({ items }: { items: Breakdown[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Sem lançamentos neste mês.</p>;
  }

  const max = Math.max(...items.map((item) => item.total));
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span>{item.label}</span>
            <span className="font-serif tabular-nums">{formatBRL(item.total)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full"
              style={{
                width: `${max > 0 ? Math.max(8, Math.round((item.total / max) * 100)) : 0}%`,
                background: item.tone,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
