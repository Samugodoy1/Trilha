import { and, eq } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "./index";
import * as s from "./schema";
import { hashPassword } from "../lib/password";

/**
 * Contas iniciais definidas fora do código (variável TRILHA_BOOTSTRAP_USERS, JSON).
 * Criadas uma única vez; se o e-mail já existir, nada é alterado (a senha trocada pelo usuário é preservada).
 */
const entry = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(10),
  role: z.enum(["teacher", "coordinator", "admin"]),
  title: z.string().optional(),
  school: z.string().optional(),
  classes: z.array(z.string()).default([]),
});

export async function ensureBootstrapUsers(db: DB, json: string) {
  let list: z.infer<typeof entry>[];
  try {
    list = z.array(entry).parse(JSON.parse(json));
  } catch {
    console.error("[bootstrap] TRILHA_BOOTSTRAP_USERS inválido; ignorado");
    return;
  }
  for (const u of list) {
    const email = u.email.trim().toLowerCase();
    const [exists] = await db.select({ id: s.users.id }).from(s.users).where(eq(s.users.email, email));
    if (exists) continue;
    const schools = await db.select().from(s.schools);
    const school = schools.find((x) => x.shortName === u.school || x.name === u.school) ?? schools.find((x) => x.shortName === "Jardim das Acácias") ?? schools[0];
    if (!school) return;
    const [user] = await db
      .insert(s.users)
      .values({ name: u.name, email, passwordHash: await hashPassword(u.password), hue: Math.floor(Math.random() * 360) })
      .returning();
    await db.insert(s.memberships).values({
      userId: user.id,
      schoolId: school.id,
      role: u.role,
      title: u.title ?? null,
      onboardedAt: new Date(),
      officeHours: u.role === "teacher" ? { days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00" } : null,
    });
    for (const name of u.classes) {
      const [cls] = await db.select().from(s.classes).where(and(eq(s.classes.schoolId, school.id), eq(s.classes.name, name)));
      if (cls) await db.insert(s.teachingAssignments).values({ classId: cls.id, userId: user.id, isHomeroom: true });
    }
    console.log(`[bootstrap] conta criada: ${u.role} (${school.shortName})`);
  }
}
