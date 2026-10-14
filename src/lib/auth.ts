import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { ensureDb, queryRows } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export type User = {
  id: string;
  email: string;
  name: string;
};

export async function getUserId() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSession(token);
}

export async function findUserByEmail(email: string) {
  await ensureDb();
  const rows = await queryRows(
    "SELECT id, email, name, password_hash FROM users WHERE email = ?",
    [email],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    passwordHash: String(row.password_hash),
  };
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

async function findUserById(userId: string): Promise<User | null> {
  const rows = await queryRows("SELECT id, email, name FROM users WHERE id = ?", [userId]);
  const row = rows[0];
  if (!row) return null;
  return { id: String(row.id), email: String(row.email), name: String(row.name) };
}

export const requireUser = cache(async () => {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  await ensureDb();
  const user = await findUserById(userId);
  if (!user) redirect("/sair");
  return user;
});
