"use server";

import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { hashInviteCode } from "@/lib/invite";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, createSession } from "../session";
import { audit } from "../audit";

const ipAttempts = new Map<string, { n: number; until: number }>();
function throttled(ip: string | null) {
  const k = ip ?? "?";
  const a = ipAttempts.get(k);
  if (a && a.until > Date.now() && a.n >= 10) return true;
  ipAttempts.set(k, { n: a && a.until > Date.now() ? a.n + 1 : 1, until: Date.now() + 15 * 60_000 });
  return false;
}

async function findInvite(code: string) {
  const db = await getDb();
  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.tokenHash, hashInviteCode(code)), isNull(schema.invitations.acceptedAt), isNull(schema.invitations.revokedAt)));
  if (!inv || inv.expiresAt < new Date() || inv.failedAttempts >= 5 || !inv.studentId) return null;
  return inv;
}

export type InvitePreview = { ok: true; school: string; childFirstName: string; relationship: string | null } | { ok: false; error: string };

/** Valida o código sem revelar dados: mostra apenas o primeiro nome da criança e a escola. */
export async function checkInviteAction(code: string): Promise<InvitePreview> {
  if (throttled(await clientIp())) return { ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." };
  const inv = await findInvite(code);
  if (!inv) return { ok: false, error: "Código inválido, expirado ou já utilizado. Confira com a escola." };
  const db = await getDb();
  const [s] = await db.select().from(schema.students).where(eq(schema.students.id, inv.studentId!));
  const [school] = await db.select().from(schema.schools).where(eq(schema.schools.id, inv.schoolId));
  return { ok: true, school: school.name, childFirstName: s.preferredName ?? s.fullName.split(" ")[0], relationship: inv.relationship };
}

const acceptSchema = z.object({
  code: z.string().min(6),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de nascimento."),
  mode: z.enum(["new", "existing"]),
  name: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Digite um e-mail válido."),
  password: z.string().min(1, "Digite a senha."),
});

export async function acceptInviteAction(input: z.input<typeof acceptSchema>): Promise<{ ok: false; error: string }> {
  const parsed = acceptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (throttled(await clientIp())) return { ok: false, error: "Muitas tentativas. Tente novamente em alguns minutos." };
  const inv = await findInvite(d.code);
  if (!inv) return { ok: false, error: "Convite inválido ou expirado." };
  const db = await getDb();
  const [student] = await db.select().from(schema.students).where(eq(schema.students.id, inv.studentId!));

  // Segundo fator: a data de nascimento da criança, conhecida pela família
  if (!student.birthDate || student.birthDate !== d.birthDate) {
    const failed = inv.failedAttempts + 1;
    await db.update(schema.invitations).set({ failedAttempts: failed, revokedAt: failed >= 5 ? new Date() : null }).where(eq(schema.invitations.id, inv.id));
    await audit({ user: { id: inv.createdById }, school: { id: inv.schoolId } }, "invite.birthdate_mismatch", "invitation", inv.id, { failed });
    return { ok: false, error: failed >= 5 ? "Convite bloqueado por segurança. Peça um novo à escola." : "A data de nascimento não confere. Confira e tente de novo." };
  }

  let userId: string;
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, d.email));
  if (d.mode === "existing") {
    if (!existing || !(await verifyPassword(d.password, existing.passwordHash))) return { ok: false, error: "E-mail ou senha incorretos." };
    userId = existing.id;
  } else {
    if (existing) return { ok: false, error: "Já existe uma conta com este e-mail. Escolha “Já tenho conta”." };
    if (!d.name || d.name.length < 3) return { ok: false, error: "Digite seu nome completo." };
    if (d.password.length < 10 || !/[A-Za-z]/.test(d.password) || !/\d/.test(d.password)) return { ok: false, error: "A senha precisa de 10 caracteres, com letras e números." };
    const [u] = await db.insert(schema.users).values({ name: d.name, email: d.email, passwordHash: await hashPassword(d.password), hue: Math.floor(Math.random() * 360) }).returning();
    userId = u.id;
  }

  const membershipId = await db.transaction(async (tx) => {
    let [m] = await tx
      .select()
      .from(schema.memberships)
      .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.schoolId, inv.schoolId), eq(schema.memberships.role, "guardian")));
    if (!m) [m] = await tx.insert(schema.memberships).values({ userId, schoolId: inv.schoolId, role: "guardian", onboardedAt: new Date() }).returning();
    const [link] = await tx.select().from(schema.guardianLinks).where(and(eq(schema.guardianLinks.userId, userId), eq(schema.guardianLinks.studentId, student.id), isNull(schema.guardianLinks.revokedAt)));
    if (!link)
      await tx.insert(schema.guardianLinks).values({ userId, studentId: student.id, relationship: inv.relationship ?? "Responsável", verifiedAt: new Date(), verifiedById: inv.createdById });
    await tx.update(schema.invitations).set({ acceptedAt: new Date(), acceptedById: userId }).where(eq(schema.invitations.id, inv.id));
    return m.id;
  });
  await audit({ user: { id: userId }, school: { id: inv.schoolId } }, "invite.accept", "invitation", inv.id, { studentId: student.id });
  await createSession(userId, membershipId);
  redirect("/familia");
}
