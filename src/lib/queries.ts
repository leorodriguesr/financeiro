import { parcelDate, parcelDueMonth } from "@/lib/billing";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { queryRows } from "@/lib/db";

export type Category = { id: string; name: string; tone: string };

export type CardRecord = {
  id: string;
  name: string;
  lastDigits: string | null;
  closingDay: number;
  dueDay: number;
  limitCents: number | null;
  color: string;
};

export type ExpenseItem = {
  id: string;
  description: string;
  amountCents: number;
  spentOn: string;
  budgetMonth: string;
  dueMonth?: string;
  paymentMethod: string;
  cardId: string | null;
  cardName: string | null;
  cardColor: string | null;
  categoryName: string | null;
  categoryTone: string | null;
  groupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
};

export type Breakdown = { key: string; label: string; tone: string; total: number };

export type CardInvoice = CardRecord & { invoiceCents: number; itemCount: number; openPlans: number };

export type CardMonth = CardInvoice & { monthClosingDay: number; closingCustom: boolean };

export type CardBill = { id: string; name: string; color: string; total: number };

export type InstallmentRow = {
  groupId: string;
  description: string;
  amountCents: number;
  budgetMonth: string;
  spentOn: string;
  installmentNumber: number;
  installmentTotal: number;
};

function num(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value !== "") return Number(value);
  return 0;
}

function text(value: unknown) {
  return value == null ? "" : String(value);
}

function optionalText(value: unknown) {
  return value == null ? null : String(value);
}

function mapCard(row: Record<string, unknown>): CardRecord {
  return {
    id: text(row.id),
    name: text(row.name),
    lastDigits: optionalText(row.last_digits),
    closingDay: num(row.closing_day),
    dueDay: num(row.due_day),
    limitCents: row.limit_cents == null ? null : num(row.limit_cents),
    color: text(row.color),
  };
}

function mapExpense(row: Record<string, unknown>): ExpenseItem {
  return {
    id: text(row.id),
    description: text(row.description),
    amountCents: num(row.amount_cents),
    spentOn: text(row.spent_on),
    budgetMonth: text(row.budget_month),
    paymentMethod: text(row.payment_method),
    cardId: optionalText(row.card_id),
    cardName: optionalText(row.card_name),
    cardColor: optionalText(row.card_color),
    categoryName: optionalText(row.category_name),
    categoryTone: optionalText(row.category_tone),
    groupId: optionalText(row.group_id),
    installmentNumber: row.installment_number == null ? null : num(row.installment_number),
    installmentTotal: row.installment_total == null ? null : num(row.installment_total),
  };
}

const expenseSelect = `
  SELECT
    e.id, e.description, e.amount_cents, e.spent_on, e.budget_month, e.payment_method,
    e.card_id, e.group_id, e.installment_number, e.installment_total,
    c.name AS card_name, c.color AS card_color, c.closing_day AS card_closing_day, c.due_day AS card_due_day,
    cat.name AS category_name, cat.tone AS category_tone
  FROM expenses e
  LEFT JOIN cards c ON c.id = e.card_id
  LEFT JOIN categories cat ON cat.id = e.category_id
`;

export async function getCategories(userId: string): Promise<Category[]> {
  const rows = await queryRows(
    "SELECT id, name, tone FROM categories WHERE user_id = ?",
    [userId],
  );
  const order = new Map<string, number>(
    DEFAULT_CATEGORIES.map((item, index) => [item.name, index]),
  );
  return rows
    .map((row) => ({
      id: text(row.id),
      name: text(row.name),
      tone: text(row.tone),
    }))
    .sort((a, b) => (order.get(a.name) ?? 99) - (order.get(b.name) ?? 99));
}

export async function getCards(userId: string): Promise<CardRecord[]> {
  const rows = await queryRows(
    "SELECT id, name, last_digits, closing_day, due_day, limit_cents, color FROM cards WHERE user_id = ? ORDER BY name",
    [userId],
  );
  return rows.map((row) => mapCard(row as Record<string, unknown>));
}

export type CardClosing = { cardId: string; month: string; day: number };

export async function getCardClosings(userId: string) {
  const rows = await queryRows(
    `SELECT cc.card_id, cc.month_key, cc.closing_day
     FROM card_closings cc
     JOIN cards c ON c.id = cc.card_id
     WHERE c.user_id = ?`,
    [userId],
  );
  return rows.map((row) => ({
    cardId: text(row.card_id),
    month: text(row.month_key),
    day: num(row.closing_day),
  })) satisfies CardClosing[];
}

function closingMap(rows: Record<string, unknown>[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(`${text(row.card_id)}:${text(row.month_key)}`, num(row.closing_day));
  }
  return map;
}

function withDue(row: Record<string, unknown>, closings: Map<string, number>): ExpenseItem {
  const item = mapExpense(row);
  if (item.paymentMethod !== "credito" || !item.cardId || row.card_due_day == null) return item;
  const date = parcelDate(item.spentOn, item.installmentNumber);
  const closing = closings.get(`${item.cardId}:${date.slice(0, 7)}`) ?? num(row.card_closing_day);
  return {
    ...item,
    dueMonth: parcelDueMonth(item.spentOn, item.installmentNumber, num(row.card_due_day), closing),
  };
}

export type IncomeItem = {
  id: string;
  description: string;
  amountCents: number;
  receivedOn: string;
};

export async function getIncomes(userId: string, month: string) {
  const rows = await queryRows(
    `SELECT id, description, amount_cents, received_on
     FROM incomes
     WHERE user_id = ? AND budget_month = ?
     ORDER BY received_on, created_at`,
    [userId, month],
  );
  return rows.map((row) => ({
    id: text(row.id),
    description: text(row.description),
    amountCents: num(row.amount_cents),
    receivedOn: text(row.received_on),
  })) satisfies IncomeItem[];
}

export async function getExpenses(userId: string, month: string) {
  const [rows, closingRows] = await Promise.all([
    queryRows(
      `${expenseSelect} WHERE e.user_id = ? AND e.budget_month = ? ORDER BY e.spent_on DESC, e.created_at DESC`,
      [userId, month],
    ),
    queryRows(
      `SELECT cc.card_id, cc.month_key, cc.closing_day
       FROM card_closings cc
       JOIN cards c ON c.id = cc.card_id
       WHERE c.user_id = ?`,
      [userId],
    ),
  ]);
  const closings = closingMap(closingRows as Record<string, unknown>[]);
  return rows.map((row) => withDue(row as Record<string, unknown>, closings));
}

export async function getDashboard(userId: string, month: string) {
  const [incomes, expenses, categoryRows, methodRows, cardRows, planRows, upcomingRows, parcelRows, chargeRows, closingRows] =
    await Promise.all([
      getIncomes(userId, month),
      queryRows(
        `${expenseSelect} WHERE e.user_id = ? AND e.budget_month = ? ORDER BY e.spent_on DESC, e.created_at DESC LIMIT 6`,
        [userId, month],
      ),
      queryRows(
        `SELECT cat.name AS label, cat.tone AS tone, COALESCE(SUM(e.amount_cents), 0) AS total
         FROM expenses e
         LEFT JOIN categories cat ON cat.id = e.category_id
         WHERE e.user_id = ? AND e.budget_month = ?
         GROUP BY cat.id
         ORDER BY total DESC`,
        [userId, month],
      ),
      queryRows(
        `SELECT payment_method AS label, COALESCE(SUM(amount_cents), 0) AS total
         FROM expenses
         WHERE user_id = ? AND budget_month = ?
         GROUP BY payment_method
         ORDER BY total DESC`,
        [userId, month],
      ),
      queryRows(
        `SELECT c.id, c.name, c.last_digits, c.closing_day, c.due_day, c.limit_cents, c.color,
                COALESCE(SUM(e.amount_cents), 0) AS invoice_cents,
                COUNT(e.id) AS item_count
         FROM cards c
         LEFT JOIN expenses e ON e.card_id = c.id AND e.user_id = c.user_id AND e.budget_month = ?
         WHERE c.user_id = ?
         GROUP BY c.id
         ORDER BY c.name`,
        [month, userId],
      ),
      queryRows(
        `SELECT card_id, COUNT(DISTINCT group_id) AS plans
         FROM expenses
         WHERE user_id = ? AND group_id IS NOT NULL AND budget_month >= ?
         GROUP BY card_id`,
        [userId, month],
      ),
      queryRows(
        `SELECT budget_month, COALESCE(SUM(amount_cents), 0) AS total
         FROM expenses
         WHERE user_id = ? AND budget_month > ?
         GROUP BY budget_month
         ORDER BY budget_month
         LIMIT 4`,
        [userId, month],
      ),
      queryRows(
        `${expenseSelect}
         WHERE e.user_id = ? AND e.budget_month = ? AND e.installment_total > 1
         ORDER BY c.name, e.description`,
        [userId, month],
      ),
      queryRows(
        `SELECT e.card_id, e.amount_cents, e.spent_on, e.installment_number,
                c.name, c.color, c.closing_day, c.due_day
         FROM expenses e
         JOIN cards c ON c.id = e.card_id
         WHERE e.user_id = ? AND e.payment_method = 'credito'`,
        [userId],
      ),
      queryRows(
        `SELECT cc.card_id, cc.month_key, cc.closing_day
         FROM card_closings cc
         JOIN cards c ON c.id = cc.card_id
         WHERE c.user_id = ?`,
        [userId],
      ),
    ]);

  const closings = closingMap(closingRows as Record<string, unknown>[]);
  const spent = categoryRows.reduce((sum, row) => sum + num(row.total), 0);
  const plansByCard = new Map(planRows.map((row) => [text(row.card_id), num(row.plans)]));

  return {
    incomes,
    spent,
    byCategory: categoryRows.map((row) => ({
      key: text(row.label) || "Sem categoria",
      label: text(row.label) || "Sem categoria",
      tone: text(row.tone) || "#6f675c",
      total: num(row.total),
    })) satisfies Breakdown[],
    byMethod: methodRows.map((row) => ({
      key: text(row.label),
      label: text(row.label),
      tone: "#1e6b45",
      total: num(row.total),
    })) satisfies Breakdown[],
    invoices: cardRows.map((row) => ({
      ...mapCard(row as Record<string, unknown>),
      invoiceCents: num(row.invoice_cents),
      itemCount: num(row.item_count),
      openPlans: plansByCard.get(text(row.id)) ?? 0,
    })) satisfies CardInvoice[],
    upcoming: upcomingRows.map((row) => ({
      month: text(row.budget_month),
      total: num(row.total),
    })),
    parcels: parcelRows.map((row) => withDue(row as Record<string, unknown>, closings)),
    recent: expenses.map((row) => withDue(row as Record<string, unknown>, closings)),
    bills: dueBills(chargeRows as Record<string, unknown>[], closings, month),
  };
}

function dueBills(rows: Record<string, unknown>[], closings: Map<string, number>, month: string) {
  const bills = new Map<string, CardBill>();
  for (const row of rows) {
    const spentOn = text(row.spent_on);
    const installment = row.installment_number == null ? null : num(row.installment_number);
    const date = parcelDate(spentOn, installment);
    const cardId = text(row.card_id);
    const closing = closings.get(`${cardId}:${date.slice(0, 7)}`) ?? num(row.closing_day);
    const due = parcelDueMonth(spentOn, installment, num(row.due_day), closing);
    if (due !== month) continue;
    const current = bills.get(cardId) ?? {
      id: cardId,
      name: text(row.name),
      color: text(row.color),
      total: 0,
    };
    current.total += num(row.amount_cents);
    bills.set(cardId, current);
  }
  return [...bills.values()].filter((bill) => bill.total > 0).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCardPage(userId: string, month: string) {
  const [cards, planRows, closingRows] = await Promise.all([
    queryRows(
      `SELECT c.id, c.name, c.last_digits, c.closing_day, c.due_day, c.limit_cents, c.color,
              COALESCE(SUM(e.amount_cents), 0) AS invoice_cents,
              COUNT(e.id) AS item_count
       FROM cards c
       LEFT JOIN expenses e ON e.card_id = c.id AND e.user_id = c.user_id AND e.budget_month = ?
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.name`,
      [month, userId],
    ),
    queryRows(
      `SELECT card_id, COUNT(DISTINCT group_id) AS plans
       FROM expenses
       WHERE user_id = ? AND group_id IS NOT NULL AND budget_month >= ?
       GROUP BY card_id`,
      [userId, month],
    ),
    queryRows(
      `SELECT cc.card_id, cc.closing_day
       FROM card_closings cc
       JOIN cards c ON c.id = cc.card_id
       WHERE c.user_id = ? AND cc.month_key = ?`,
      [userId, month],
    ),
  ]);

  const plansByCard = new Map(planRows.map((row) => [text(row.card_id), num(row.plans)]));
  const monthClosings = new Map(closingRows.map((row) => [text(row.card_id), num(row.closing_day)]));
  return cards.map((row) => {
    const card = mapCard(row as Record<string, unknown>);
    const override = monthClosings.get(card.id);
    return {
      ...card,
      invoiceCents: num(row.invoice_cents),
      itemCount: num(row.item_count),
      openPlans: plansByCard.get(text(row.id)) ?? 0,
      monthClosingDay: override ?? card.closingDay,
      closingCustom: override != null,
    };
  }) satisfies CardMonth[];
}

export async function getCardDetail(userId: string, cardId: string, month: string) {
  const cardRows = await queryRows(
    `SELECT id, name, last_digits, closing_day, due_day, limit_cents, color
     FROM cards WHERE id = ? AND user_id = ?`,
    [cardId, userId],
  );
  if (!cardRows[0]) return null;
  const card = mapCard(cardRows[0] as Record<string, unknown>);

  const [invoiceRows, planRows, forecastRows, chargeRows, closingRows] = await Promise.all([
    queryRows(
      `${expenseSelect} WHERE e.user_id = ? AND e.card_id = ? AND e.budget_month = ? ORDER BY e.spent_on, e.description`,
      [userId, cardId, month],
    ),
    queryRows(
      `SELECT group_id, description, amount_cents, budget_month, spent_on, installment_number, installment_total
       FROM expenses
       WHERE user_id = ? AND card_id = ? AND group_id IS NOT NULL
       ORDER BY budget_month, installment_number`,
      [userId, cardId],
    ),
    queryRows(
      `SELECT budget_month, COALESCE(SUM(amount_cents), 0) AS total, COUNT(*) AS items
       FROM expenses
       WHERE user_id = ? AND card_id = ? AND budget_month >= ?
       GROUP BY budget_month
       ORDER BY budget_month
       LIMIT 18`,
      [userId, cardId, month],
    ),
    queryRows(
      `SELECT amount_cents, spent_on, installment_number
       FROM expenses
       WHERE user_id = ? AND card_id = ? AND payment_method = 'credito'`,
      [userId, cardId],
    ),
    queryRows("SELECT month_key, closing_day FROM card_closings WHERE card_id = ?", [cardId]),
  ]);

  const closings = new Map(
    closingRows.map((row) => [`${cardId}:${text(row.month_key)}`, num(row.closing_day)]),
  );
  const monthClosingDay = closings.get(`${cardId}:${month}`) ?? card.closingDay;
  const invoice = invoiceRows.map((row) => withDue(row as Record<string, unknown>, closings));
  const dueNowCents = chargeRows.reduce((sum, row) => {
    const spentOn = text(row.spent_on);
    const installment = row.installment_number == null ? null : num(row.installment_number);
    const date = parcelDate(spentOn, installment);
    const closing = closings.get(`${cardId}:${date.slice(0, 7)}`) ?? card.closingDay;
    const due = parcelDueMonth(spentOn, installment, card.dueDay, closing);
    return due === month ? sum + num(row.amount_cents) : sum;
  }, 0);

  const grouped = new Map<string, InstallmentRow[]>();
  for (const row of planRows) {
    const item: InstallmentRow = {
      groupId: text(row.group_id),
      description: text(row.description),
      amountCents: num(row.amount_cents),
      budgetMonth: text(row.budget_month),
      spentOn: text(row.spent_on),
      installmentNumber: num(row.installment_number),
      installmentTotal: num(row.installment_total),
    };
    const list = grouped.get(item.groupId) ?? [];
    list.push(item);
    grouped.set(item.groupId, list);
  }

  const plans = [...grouped.values()]
    .filter((rows) => rows.some((row) => row.budgetMonth >= month))
    .sort((a, b) => a[0].budgetMonth.localeCompare(b[0].budgetMonth));

  return {
    card,
    invoice,
    plans,
    forecast: forecastRows.map((row) => ({
      month: text(row.budget_month),
      total: num(row.total),
      items: num(row.items),
    })),
    monthClosingDay,
    closingCustom: closings.has(`${cardId}:${month}`),
    dueNowCents,
  };
}
