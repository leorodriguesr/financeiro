"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser, findUserByEmail, verifyPassword } from "@/lib/auth";
import { parcelDate, purchaseMonth, spendingMonth } from "@/lib/billing";
import { CARD_COLORS, isPaymentMethod } from "@/lib/constants";
import { isISODate, parseMonth, withMonth } from "@/lib/dates";
import { ensureDb, getDb, realignCreditMonths } from "@/lib/db";
import { parseMoney, splitCents } from "@/lib/money";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export type ActionState = { error?: string; ok?: boolean; next?: string } | null;

function safePath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

function readDay(value: FormDataEntryValue | null) {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 28) return null;
  return day;
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Informe o e-mail e a senha." };
  }

  await ensureDb();
  const user = await findUserByEmail(email);
  const matches = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !matches) {
    return { error: "E-mail ou senha incorretos." };
  }

  const token = await signSession(user.id);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
  return { ok: true };
}

export async function createIncome(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const receivedOn = String(formData.get("received_on") ?? "");

  if (description.length < 2 || description.length > 80) {
    return { error: "Descreva o recebimento com pelo menos 2 letras." };
  }
  if (amount == null) {
    return { error: "Informe um valor maior que zero." };
  }
  if (!isISODate(receivedOn)) {
    return { error: "Informe a data em que o valor entrou." };
  }

  const month = purchaseMonth(receivedOn);
  await getDb().execute({
    sql: `INSERT INTO incomes (id, user_id, description, amount_cents, received_on, budget_month, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [crypto.randomUUID(), user.id, description, amount, receivedOn, month, new Date().toISOString()],
  });

  revalidatePath("/", "layout");
  return { ok: true, next: withMonth("/", month) };
}

export async function deleteIncome(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const next = safePath(String(formData.get("next") ?? "/"));
  await getDb().execute({
    sql: "DELETE FROM incomes WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  revalidatePath("/", "layout");
  redirect(next);
}

export async function createExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const description = String(formData.get("description") ?? "").trim();
  const amount = parseMoney(String(formData.get("amount") ?? ""));
  const spentOn = String(formData.get("spent_on") ?? "");
  const categoryId = String(formData.get("category_id") ?? "");
  const method = String(formData.get("payment_method") ?? "");
  const returnTo = safePath(String(formData.get("returnTo") ?? "/despesas"));

  if (description.length < 2 || description.length > 120) {
    return { error: "Descreva o gasto com pelo menos 2 letras." };
  }
  if (amount == null) {
    return { error: "Informe um valor maior que zero." };
  }
  if (!isISODate(spentOn)) {
    return { error: "Informe a data da compra." };
  }
  if (!isPaymentMethod(method)) {
    return { error: "Escolha como esse gasto foi pago." };
  }

  const category = await getDb().execute({
    sql: "SELECT id FROM categories WHERE id = ? AND user_id = ?",
    args: [categoryId, user.id],
  });
  if (category.rows.length === 0) {
    return { error: "Escolha uma categoria." };
  }

  let installments = 1;
  let cardId: string | null = null;
  let closingDay = 1;
  const closingOverrides = new Map<string, number>();

  if (method === "credito") {
    cardId = String(formData.get("card_id") ?? "");
    const cardResult = await getDb().execute({
      sql: "SELECT id, closing_day FROM cards WHERE id = ? AND user_id = ?",
      args: [cardId, user.id],
    });
    if (cardResult.rows.length === 0) {
      return { error: "Cadastre um cartão antes de lançar no crédito." };
    }
    const parsedInstallments = Number(formData.get("installments") ?? 1);
    if (!Number.isInteger(parsedInstallments) || parsedInstallments < 1 || parsedInstallments > 48) {
      return { error: "O parcelamento precisa ficar entre 1 e 48 vezes." };
    }
    installments = parsedInstallments;
    cardId = String(cardResult.rows[0].id);
    closingDay = Number(cardResult.rows[0].closing_day);
    const closingRows = await getDb().execute({
      sql: "SELECT month_key, closing_day FROM card_closings WHERE card_id = ?",
      args: [cardId],
    });
    for (const row of closingRows.rows) {
      closingOverrides.set(String(row.month_key), Number(row.closing_day));
    }
  }

  const parts = splitCents(amount, installments);
  const groupId = installments > 1 ? crypto.randomUUID() : null;
  const budgetMonths = parts.map((_, index) => {
    if (method !== "credito") return purchaseMonth(spentOn);
    const date = parcelDate(spentOn, index + 1);
    const closing = closingOverrides.get(date.slice(0, 7)) ?? closingDay;
    return spendingMonth(date, closing);
  });
  const tx = await getDb().transaction("write");

  try {
    for (let index = 0; index < parts.length; index += 1) {
      await tx.execute({
        sql: `INSERT INTO expenses (
          id, user_id, description, amount_cents, spent_on, budget_month, category_id,
          payment_method, card_id, group_id, installment_number, installment_total, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          crypto.randomUUID(),
          user.id,
          description,
          parts[index],
          spentOn,
          budgetMonths[index],
          categoryId,
          method,
          cardId,
          groupId,
          installments > 1 ? index + 1 : null,
          installments > 1 ? installments : null,
          new Date().toISOString(),
        ],
      });
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(withMonth(returnTo, budgetMonths[0]));
}

export async function deleteExpense(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const next = safePath(String(formData.get("next") ?? "/despesas"));
  await getDb().execute({
    sql: "DELETE FROM expenses WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  revalidatePath("/", "layout");
  redirect(next);
}

export async function deleteInstallmentPlan(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("group_id") ?? "");
  const next = safePath(String(formData.get("next") ?? "/cartoes"));
  if (groupId) {
    await getDb().execute({
      sql: "DELETE FROM expenses WHERE group_id = ? AND user_id = ?",
      args: [groupId, user.id],
    });
  }
  revalidatePath("/", "layout");
  redirect(next);
}

export async function setMonthClosing(formData: FormData) {
  const user = await requireUser();
  const cardId = String(formData.get("card_id") ?? "");
  const month = parseMonth(String(formData.get("month") ?? ""));
  const next = safePath(String(formData.get("next") ?? withMonth("/cartoes", month)));
  const closingDay = readDay(formData.get("closing_day"));
  if (closingDay == null) redirect(next);

  const cards = await getDb().execute({
    sql: "SELECT id FROM cards WHERE id = ? AND user_id = ?",
    args: [cardId, user.id],
  });
  if (cards.rows.length === 0) redirect(next);

  await getDb().execute({
    sql: `INSERT INTO card_closings (card_id, month_key, closing_day) VALUES (?, ?, ?)
          ON CONFLICT(card_id, month_key) DO UPDATE SET closing_day = excluded.closing_day`,
    args: [cardId, month, closingDay],
  });
  await realignCreditMonths(getDb(), cardId);
  revalidatePath("/", "layout");
  redirect(next);
}

export async function createCard(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const digits = String(formData.get("last_digits") ?? "").trim();
  const color = String(formData.get("color") ?? CARD_COLORS[0].hex);
  const month = parseMonth(String(formData.get("month") ?? ""));
  const closingDay = readDay(formData.get("closing_day"));
  const dueDay = readDay(formData.get("due_day"));
  if (closingDay == null || dueDay == null) {
    return { error: "Fechamento e vencimento precisam ser dias entre 1 e 28." };
  }
  if (name.length < 2 || name.length > 40) {
    return { error: "Dê um nome ao cartão." };
  }
  if (digits && !/^\d{4}$/.test(digits)) {
    return { error: "Os finais do cartão precisam ter 4 números." };
  }
  if (!CARD_COLORS.some((item) => item.hex === color)) {
    return { error: "Escolha uma cor do cartão." };
  }

  const limitRaw = String(formData.get("limit") ?? "").trim();
  const limitCents = limitRaw ? parseMoney(limitRaw) : null;
  if (limitRaw && limitCents == null) {
    return { error: "O limite do cartão precisa ser um valor válido." };
  }

  const id = crypto.randomUUID();
  await getDb().execute({
    sql: `INSERT INTO cards (
      id, user_id, name, last_digits, closing_day, due_day, limit_cents, color, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      user.id,
      name,
      digits || null,
      closingDay,
      dueDay,
      limitCents,
      color,
      new Date().toISOString(),
    ],
  });

  revalidatePath("/", "layout");
  redirect(`/cartoes/${id}?mes=${month}`);
}

export async function deleteCard(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const month = parseMonth(String(formData.get("month") ?? ""));
  const linked = await getDb().execute({
    sql: "SELECT COUNT(*) AS total FROM expenses WHERE card_id = ? AND user_id = ?",
    args: [id, user.id],
  });
  if (Number(linked.rows[0]?.total ?? 0) > 0) {
    redirect(`/cartoes/${id}?mes=${month}&erro=tem-lancamentos`);
  }

  await getDb().execute({
    sql: "DELETE FROM cards WHERE id = ? AND user_id = ?",
    args: [id, user.id],
  });
  revalidatePath("/", "layout");
  redirect(`/cartoes?mes=${month}`);
}
