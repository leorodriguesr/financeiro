import { shiftMonth } from "@/lib/dates";

/** Mês calendário da compra. O gasto no cartão usa spendingMonth. */
export function purchaseMonth(spentOn: string) {
  return spentOn.slice(0, 7);
}

export function shiftDate(iso: string, months: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const base = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  const clamped = Math.min(day, last);
  return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

/** Compras até o fechamento vencem na fatura deste ciclo. Depois do fechamento, no ciclo seguinte. */
export function dueMonth(spentOn: string, closingDay: number, dueDay: number) {
  const [yearText, monthText, dayText] = spentOn.split("-");
  let year = Number(yearText);
  let monthIndex = Number(monthText) - 1;
  const day = Number(dayText);

  if (day > closingDay) {
    const next = shiftMonth(`${year}-${String(monthIndex + 1).padStart(2, "0")}`, 1);
    year = Number(next.slice(0, 4));
    monthIndex = Number(next.slice(5, 7)) - 1;
  }

  if (dueDay <= closingDay) {
    const next = shiftMonth(`${year}-${String(monthIndex + 1).padStart(2, "0")}`, 1);
    year = Number(next.slice(0, 4));
    monthIndex = Number(next.slice(5, 7)) - 1;
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function parcelDate(spentOn: string, installmentNumber: number | null) {
  const index = installmentNumber == null ? 0 : Math.max(installmentNumber, 1) - 1;
  return shiftDate(spentOn, index);
}

/** Até o fechamento, o gasto fica no mês da compra. Depois dele, vai para o mês seguinte. */
export function spendingMonth(spentOn: string, closingDay: number) {
  const month = spentOn.slice(0, 7);
  const day = Number(spentOn.slice(8, 10));
  return day > closingDay ? shiftMonth(month, 1) : month;
}

export function parcelSpendingMonth(spentOn: string, installmentNumber: number | null, closingDay: number) {
  return spendingMonth(parcelDate(spentOn, installmentNumber), closingDay);
}

export function parcelDueMonth(
  spentOn: string,
  installmentNumber: number | null,
  dueDay: number,
  closingDay: number,
) {
  return dueMonth(parcelDate(spentOn, installmentNumber), closingDay, dueDay);
}
