import fs from "node:fs";
import path from "node:path";
import { createClient, type Client, type InArgs } from "@libsql/client";
import bcrypt from "bcryptjs";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { parcelDate, parcelSpendingMonth } from "@/lib/billing";

let client: Client | null = null;
let ready: Promise<void> | null = null;

function databaseConfig() {
  const configured = process.env.TURSO_DATABASE_URL?.trim();
  if (!configured || configured.startsWith("file:")) {
    const raw = configured?.startsWith("file:")
      ? configured.slice("file:".length)
      : path.join("data", "financeiro.db");
    const absolute = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    return { url: `file:${absolute}` };
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!authToken) {
    throw new Error("Defina TURSO_AUTH_TOKEN no .env.local para conectar ao Turso.");
  }
  return { url: configured, authToken };
}

export function getDb() {
  if (!client) {
    client = createClient(databaseConfig());
  }
  return client;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tone TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    last_digits TEXT,
    closing_day INTEGER NOT NULL,
    due_day INTEGER NOT NULL,
    limit_cents INTEGER,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS budgets (
    user_id TEXT NOT NULL,
    month_key TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    PRIMARY KEY (user_id, month_key)
  )`,
  `CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    received_on TEXT NOT NULL,
    budget_month TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS incomes_user_month ON incomes (user_id, budget_month)`,
  `CREATE TABLE IF NOT EXISTS card_closings (
    card_id TEXT NOT NULL,
    month_key TEXT NOT NULL,
    closing_day INTEGER NOT NULL,
    PRIMARY KEY (card_id, month_key)
  )`,
  `CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    spent_on TEXT NOT NULL,
    budget_month TEXT NOT NULL,
    category_id TEXT,
    payment_method TEXT NOT NULL,
    card_id TEXT,
    group_id TEXT,
    installment_number INTEGER,
    installment_total INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS expenses_user_month ON expenses (user_id, budget_month)`,
  `CREATE INDEX IF NOT EXISTS expenses_card_month ON expenses (user_id, card_id, budget_month)`,
  `CREATE INDEX IF NOT EXISTS expenses_group ON expenses (group_id)`,
];

async function seedUser(db: Client) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env.local.");
  }

  const existing = await db.execute({
    sql: "SELECT id, password_hash FROM users WHERE email = ?",
    args: [email],
  });

  let userId: string;
  if (existing.rows.length === 0) {
    userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await db.execute({
      sql: "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
      args: [userId, email, passwordHash, "Casa"],
    });
  } else {
    userId = String(existing.rows[0].id);
    const matches = await bcrypt.compare(password, String(existing.rows[0].password_hash));
    if (!matches) {
      const passwordHash = await bcrypt.hash(password, 10);
      await db.execute({
        sql: "UPDATE users SET password_hash = ? WHERE id = ?",
        args: [passwordHash, userId],
      });
    }
  }

  const categories = await db.execute({
    sql: "SELECT COUNT(*) AS total FROM categories WHERE user_id = ?",
    args: [userId],
  });
  if (Number(categories.rows[0].total) === 0) {
    for (const category of DEFAULT_CATEGORIES) {
      await db.execute({
        sql: "INSERT INTO categories (id, user_id, name, tone) VALUES (?, ?, ?, ?)",
        args: [crypto.randomUUID(), userId, category.name, category.tone],
      });
    }
  }

  await alignCreditToPurchaseMonth(db);
}

export async function realignCreditMonths(db: Client, cardId?: string) {
  const expenses = await db.execute({
    sql: `SELECT e.id, e.spent_on, e.budget_month, e.installment_number, e.card_id, c.closing_day
          FROM expenses e
          JOIN cards c ON c.id = e.card_id
          WHERE e.payment_method = 'credito'${cardId ? " AND e.card_id = ?" : ""}`,
    args: cardId ? [cardId] : [],
  });
  const closings = await db.execute({
    sql: `SELECT card_id, month_key, closing_day FROM card_closings${cardId ? " WHERE card_id = ?" : ""}`,
    args: cardId ? [cardId] : [],
  });
  const byMonth = new Map<string, number>();
  for (const row of closings.rows) {
    byMonth.set(`${row.card_id}:${row.month_key}`, Number(row.closing_day));
  }

  for (const row of expenses.rows) {
    const spentOn = String(row.spent_on);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(spentOn)) continue;
    const number = row.installment_number == null ? null : Number(row.installment_number);
    const date = parcelDate(spentOn, number);
    const closing = byMonth.get(`${row.card_id}:${date.slice(0, 7)}`) ?? Number(row.closing_day);
    const budgetMonth = parcelSpendingMonth(spentOn, number, closing);
    if (budgetMonth === String(row.budget_month)) continue;
    await db.execute({
      sql: "UPDATE expenses SET budget_month = ? WHERE id = ?",
      args: [budgetMonth, String(row.id)],
    });
  }
}

async function alignCreditToPurchaseMonth(db: Client) {
  await realignCreditMonths(db);
}

async function migrateBudgetsToIncomes(db: Client) {
  await db.execute({
    sql: `INSERT INTO incomes (id, user_id, description, amount_cents, received_on, budget_month, created_at)
          SELECT lower(hex(randomblob(16))), user_id, 'Salário', amount_cents, month_key || '-01', month_key, ?
          FROM budgets
          WHERE amount_cents > 0
            AND NOT EXISTS (
              SELECT 1 FROM incomes
              WHERE incomes.user_id = budgets.user_id AND incomes.budget_month = budgets.month_key
            )`,
    args: [new Date().toISOString()],
  });
  await db.execute("DELETE FROM budgets");
}

async function init() {
  const db = getDb();
  for (const statement of SCHEMA) {
    await db.execute(statement);
  }
  await seedUser(db);
  await migrateBudgetsToIncomes(db);
}

export function ensureDb() {
  if (!ready) {
    ready = init().catch((error: unknown) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

export async function queryRows(sql: string, args: InArgs = []) {
  await ensureDb();
  const result = await getDb().execute({ sql, args });
  return result.rows;
}
