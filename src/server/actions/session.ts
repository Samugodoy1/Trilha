"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { verifyPassword, hashPassword } from "@/lib/password";
import { createSession, destroySession, getSession, homeFor, setActiveStudent, switchMembership, clientIp } from "../session";
import { familyStudentIds } from "../access";
import { audit } from "../audit";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

/* Limite simples de tentativas por e-mail+IP (memória do processo). Em produção, use um armazenamento compartilhado. */
const attempts = new Map<string, { n: number; until: number }>();
function limited(key: string) {
  const a = attempts.get(key);
  return a && a.n >= 5 && a.until > Date.now();
}
function fail(key: string) {
  const a = attempts.get(key);
  const n = a && a.until > Date.now() ? a.n + 1 : 1;
  attempts.set(key, { n, until: Date.now() + 10 * 60_000 });
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido."),
  password: z.string().min(1, "Digite sua senha."),
  next: z.string().optional(),
});

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])) };
  }
  const { email, password, next } = parsed.data;
  const key = `${email}|${await clientIp()}`;
  if (limited(key)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, "scrypt$16384$8$1$AAAA$AAAA");
  if (!user || !ok) {
    fail(key);
    await audit(null, "login.failed", "user", undefined, { email });
    return { error: "E-mail ou senha incorretos." };
  }
  const mems = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.userId, user.id), isNull(schema.memberships.revokedAt)));
  if (mems.length === 0) {
    const [old] = await db.select({ id: schema.memberships.id }).from(schema.memberships).where(eq(schema.memberships.userId, user.id)).limit(1);
    return {
      error: old
        ? "Seu acesso à escola foi desativado. Se você mudou de escola, entre com o código de convite da nova escola em “Recebi um convite da escola”."
        : "Sua conta ainda não está vinculada a nenhuma escola.",
    };
  }
  // Prioriza o papel pedagógico quando houver mais de um
  const order = ["teacher", "coordinator", "admin", "guardian", "student"];
  const membership = [...mems].sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))[0];
  await createSession(user.id, membership.id);
  attempts.delete(key);
  await audit({ user, school: { id: membership.schoolId } }, "login", "user", user.id);

  if (!membership.onboardedAt && (membership.role === "teacher" || membership.role === "guardian")) redirect("/boas-vindas");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  redirect(safeNext ?? homeFor(membership.role));
}

export async function logoutAction() {
  const s = await getSession();
  if (s) await audit(s, "logout", "user", s.user.id);
  await destroySession();
  redirect("/entrar");
}

export async function switchMembershipAction(membershipId: string) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const db = await getDb();
  const [m] = await db
    .select()
    .from(schema.memberships)
    .where(and(eq(schema.memberships.id, membershipId), eq(schema.memberships.userId, s.user.id), isNull(schema.memberships.revokedAt)));
  if (!m) return;
  await switchMembership(s.sessionId, m.id);
  redirect(homeFor(m.role));
}

export async function setActiveStudentAction(studentId: string) {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const allowed = await familyStudentIds(s);
  if (!allowed.includes(studentId)) return;
  await setActiveStudent(s.sessionId, studentId);
  redirect("/familia");
}

const signupSchema = z.object({
  name: z.string().trim().min(3, "Digite seu nome completo."),
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido."),
  password: z
    .string()
    .min(10, "Use pelo menos 10 caracteres.")
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Combine letras e números."),
});

/** Cria a conta do professor; o vínculo com a escola é feito no onboarding. */
export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])) };
  const db = await getDb();
  const exists = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, parsed.data.email));
  if (exists.length) return { fieldErrors: { email: "Já existe uma conta com este e-mail. Entre com sua senha." } };
  const [user] = await db
    .insert(schema.users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      hue: Math.floor(Math.random() * 360),
    })
    .returning();
  await createSession(user.id, null);
  redirect("/boas-vindas");
}

/** Troca de senha: exige a senha atual e encerra as outras sessões abertas. */
export async function changePasswordAction(input: { current: string; next: string }): Promise<{ ok: boolean; error?: string }> {
  const s = await getSession();
  if (!s) redirect("/entrar");
  const next = String(input.next ?? "");
  if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) return { ok: false, error: "Use pelo menos 10 caracteres, com letras e números." };
  const db = await getDb();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, s.user.id));
  if (!user || !(await verifyPassword(String(input.current ?? ""), user.passwordHash))) return { ok: false, error: "A senha atual não confere." };
  await db.update(schema.users).set({ passwordHash: await hashPassword(next) }).where(eq(schema.users.id, s.user.id));
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, s.user.id), ne(schema.sessions.id, s.sessionId)));
  await audit(s, "password.change", "user", s.user.id);
  return { ok: true };
}
