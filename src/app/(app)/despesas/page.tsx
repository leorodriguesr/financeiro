import type { Metadata } from "next";
import { ExpenseForm } from "@/components/expense-form";
import { ExpenseList } from "@/components/expense-list";
import { Panel } from "@/components/panel";
import { requireUser } from "@/lib/auth";
import { currentMonthKey, monthLabel, parseMonth, todayISO, withMonth } from "@/lib/dates";
import { formatBRL } from "@/lib/money";
import { getCardClosings, getCards, getCategories, getExpenses } from "@/lib/queries";

export const metadata: Metadata = { title: "Despesas" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const user = await requireUser();
  const { mes } = await searchParams;
  const month = parseMonth(mes);
  const [categories, cards, expenses, closings] = await Promise.all([
    getCategories(user.id),
    getCards(user.id),
    getExpenses(user.id, month),
    getCardClosings(user.id),
  ]);
  const total = expenses.reduce((sum, item) => sum + item.amountCents, 0);
  const defaultDate = month === currentMonthKey() ? todayISO() : `${month}-01`;

  return (
    <>
      <div>
        <h1 className="font-serif text-4xl tracking-tight">Despesas</h1>
        <p className="mt-2 text-sm text-muted">
          {monthLabel(month)} · {formatBRL(total)}
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Novo gasto">
          <ExpenseForm
            categories={categories}
            cards={cards.map((card) => ({
              id: card.id,
              name: card.name,
              closingDay: card.closingDay,
              dueDay: card.dueDay,
              closings: closings
                .filter((item) => item.cardId === card.id)
                .map((item) => ({ month: item.month, day: item.day })),
            }))}
            defaultDate={defaultDate}
            returnTo="/despesas"
            month={month}
          />
        </Panel>
        <Panel title="O que entra neste mês">
          <ExpenseList items={expenses} next={withMonth("/despesas", month)} />
        </Panel>
      </div>
    </>
  );
}
