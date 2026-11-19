"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { getAuthUser, switchMembership, getSession } from "../session";
import { audit } from "../audit";

const LEVELS = (labels: [string, string, string][]) =>
  labels.map(([label, short, family], i) => ({ key: `${short}${i}`, short, label, description: label, familyDescription: family }));

/** Cria a escola do professor (quando ainda não usa o Trilha pela rede) com calendário e modelos iniciais. */
export async function createSchoolAction(input: { name: string; city: string; state: string }) {
  const auth = await getAuthUser();
  if (!auth) redirect("/entrar");
  const parsed = z.object({ name: z.string().trim().min(3, "Digite o nome da escola."), city: z.string().trim().min(2, "Digite a cidade."), state: z.string().trim().length(2, "Use a sigla do estado.") }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const d = parsed.data;
  const db = await getDb();
  const year = new Date().getFullYear();
  const membershipId = await db.transaction(async (tx) => {
    const [school] = await tx
      .insert(schema.schools)
      .values({
        name: d.name,
        shortName: d.name.replace(/^(EMEF|EMEI|EE|Escola( Municipal| Estadual)?)\s+/i, ""),
        city: d.city,
        state: d.state.toUpperCase(),
        evaluationModel: "concept",
        conceptScale: [
          { key: "ND", label: "Ainda não desenvolvido", description: "A habilidade ainda não aparece nas atividades." },
          { key: "ED", label: "Em desenvolvimento", description: "Aparece com apoio e em algumas situações." },
          { key: "D", label: "Desenvolvido", description: "Aparece com autonomia na maior parte das situações." },
          { key: "PD", label: "Plenamente desenvolvido", description: "Aparece com autonomia e em situações novas." },
        ],
      })
      .returning();
    const [ay] = await tx.insert(schema.academicYears).values({ schoolId: school.id, year, startsOn: `${year}-02-02`, endsOn: `${year}-12-15` }).returning();
    await tx.insert(schema.terms).values([
      { schoolId: school.id, academicYearId: ay.id, ordinal: 1, name: "1º bimestre", startsOn: `${year}-02-02`, endsOn: `${year}-04-17` },
      { schoolId: school.id, academicYearId: ay.id, ordinal: 2, name: "2º bimestre", startsOn: `${year}-04-27`, endsOn: `${year}-07-10` },
      { schoolId: school.id, academicYearId: ay.id, ordinal: 3, name: "3º bimestre", startsOn: `${year}-07-27`, endsOn: `${year}-09-30` },
      { schoolId: school.id, academicYearId: ay.id, ordinal: 4, name: "4º bimestre", startsOn: `${year}-10-01`, endsOn: `${year}-12-15` },
    ]);
    await tx.insert(schema.subjects).values(
      [["Língua Portuguesa", "linguagens"], ["Matemática", "matematica"], ["Ciências", "ciencias_natureza"], ["História", "ciencias_humanas"], ["Geografia", "ciencias_humanas"], ["Arte", "linguagens"]].map(([name, area]) => ({ schoolId: school.id, name, area })),
    );
    await tx.insert(schema.assessmentTemplates).values([
      {
        schoolId: school.id, kind: "escrita", name: "Hipóteses de escrita", createdById: auth.user.id,
        scale: LEVELS([["Pré-silábico", "PS", "Está descobrindo que a escrita representa os sons da fala."], ["Silábico sem valor sonoro", "SSV", "Escreve partes das palavras, ainda sem relacionar letras e sons."], ["Silábico com valor sonoro", "SCV", "Usa uma letra por sílaba, já ligando letras e sons."], ["Silábico-alfabético", "SA", "Às vezes escreve uma letra por sílaba, às vezes a sílaba completa."], ["Alfabético", "A", "Escreve as palavras representando todos os sons."]]),
      },
      {
        schoolId: school.id, kind: "leitura", name: "Fluência leitora", createdById: auth.user.id,
        scale: LEVELS([["Ainda não leitor", "NL", "Está conhecendo as letras."], ["Leitor de sílabas", "LS", "Lê pedacinhos das palavras."], ["Leitor de palavras", "LP", "Lê palavras inteiras."], ["Leitor de frases", "LF", "Lê frases curtas e entende."], ["Leitor de texto sem fluência", "LT", "Lê textos curtos, com pausas."], ["Leitor fluente", "LFL", "Lê com ritmo e entende o que lê."]]),
      },
    ]);
    const [admin] = await tx.insert(schema.memberships).values({ userId: auth.user.id, schoolId: school.id, role: "admin", title: "Gestão" }).returning();
    void admin;
    const [teacher] = await tx.insert(schema.memberships).values({ userId: auth.user.id, schoolId: school.id, role: "teacher", title: "Professor(a)" }).returning();
    return teacher.id;
  });
  await switchMembership(auth.sessionId, membershipId);
  await audit({ user: auth.user }, "onboarding.school", "membership", membershipId);
  return { ok: true as const };
}

/** Ajusta o período letivo: bimestres ou trimestres, com datas de início e fim do ano. */
export async function configureTermsAction(input: { structure: "bimestre" | "trimestre"; startsOn: string; endsOn: string }) {
  const ctx = await getSession();
  if (!ctx) redirect("/entrar");
  const parsed = z.object({ structure: z.enum(["bimestre", "trimestre"]), startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse(input);
  if (!parsed.success || parsed.data.startsOn >= parsed.data.endsOn) return { ok: false, error: "Confira as datas." };
  const db = await getDb();
  const [ay] = await db.select().from(schema.academicYears).where(eq(schema.academicYears.schoolId, ctx.school.id));
  if (!ay) return { ok: false, error: "Ano letivo não encontrado." };
  const terms = await db.select().from(schema.terms).where(eq(schema.terms.academicYearId, ay.id));
  const used = terms.length
    ? await db.select({ id: schema.assessmentRounds.id }).from(schema.assessmentRounds).where(inArray(schema.assessmentRounds.termId, terms.map((t) => t.id))).limit(1)
    : [];
  if (used.length) return { ok: false, error: "Já existem registros neste calendário; ajuste com a gestão." };
  const n = parsed.data.structure === "bimestre" ? 4 : 3;
  const start = new Date(`${parsed.data.startsOn}T12:00:00Z`).getTime();
  const end = new Date(`${parsed.data.endsOn}T12:00:00Z`).getTime();
  const step = (end - start) / n;
  const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
  await db.transaction(async (tx) => {
    await tx.delete(schema.terms).where(eq(schema.terms.academicYearId, ay.id));
    await tx.update(schema.academicYears).set({ startsOn: parsed.data.startsOn, endsOn: parsed.data.endsOn }).where(eq(schema.academicYears.id, ay.id));
    await tx.insert(schema.terms).values(
      Array.from({ length: n }, (_, i) => ({
        schoolId: ctx.school.id,
        academicYearId: ay.id,
        ordinal: i + 1,
        name: `${i + 1}º ${parsed.data.structure}`,
        startsOn: iso(start + step * i + (i ? 86_400_000 : 0)),
        endsOn: iso(start + step * (i + 1)),
      })),
    );
  });
  return { ok: true };
}

export async function finishOnboardingAction() {
  const ctx = await getSession();
  if (!ctx) redirect("/entrar");
  const db = await getDb();
  await db.update(schema.memberships).set({ onboardedAt: new Date() }).where(and(eq(schema.memberships.userId, ctx.user.id), eq(schema.memberships.schoolId, ctx.school.id)));
  await audit(ctx, "onboarding.finish", "membership", ctx.membership.id);
  redirect("/hoje");
}
