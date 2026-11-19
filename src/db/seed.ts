import { createHash } from "node:crypto";
import type { DB } from "./index";
import * as s from "./schema";
import { hashPassword } from "../lib/password";
import { putObject } from "../lib/storage";
import * as art from "./seed-art";
import { normalizeInviteCode } from "../lib/invite";

/* Todos os dados abaixo são fictícios. Senha de todas as contas: trilha2026 */

export const DEMO_PASSWORD = "trilha2026";
export const DEMO_INVITE_CODE = "DAVI-2026-AB7K";

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sha = (v: string) => createHash("sha256").update(v).digest("hex");
const ts = (iso: string, time = "10:00") => new Date(`${iso}T${time}:00-03:00`);

const HOLIDAYS = new Set([
  "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04", "2026-06-05",
  "2026-09-07", "2026-10-12", "2026-10-15", "2026-11-02", "2026-11-20",
]);

function schoolDays(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6 && !HOLIDAYS.has(iso)) out.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

async function chunkInsert<T extends object>(db: DB, table: Parameters<DB["insert"]>[0], rows: T[], size = 800) {
  for (let i = 0; i < rows.length; i += size) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.insert(table).values(rows.slice(i, i + size) as any);
  }
}

const FIRST = [
  "Alice", "Miguel", "Sophia", "Arthur", "Helena", "Bernardo", "Valentina", "Heitor", "Laura", "Davi", "Isabella",
  "Lorenzo", "Manuela", "Théo", "Júlia", "Pedro", "Lívia", "Gabriel", "Luiza", "Matheus", "Giovanna", "Rafael", "Maria Luísa",
  "Gustavo", "Beatriz", "Nicolas", "Mariana", "Samuel", "Clara", "Benjamin", "Lara", "Joaquim", "Antonella", "Enzo", "Eloá",
  "Caio", "Isadora", "Vicente", "Melissa", "Murilo", "Rebeca", "Otávio", "Agatha", "Benício", "Ayla", "Raul", "Elisa",
];
const LAST = [
  "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira", "Lima", "Gomes", "Costa",
  "Martins", "Araújo", "Carvalho", "Rocha", "Almeida", "Nascimento", "Barbosa", "Cardoso", "Teixeira", "Correia", "Dias",
  "Moreira", "Mendes", "Freitas", "Cavalcanti", "Monteiro", "Pinto", "Ramos", "Vieira", "Campos", "Duarte",
];

export async function seed(db: DB) {
  const rnd = mulberry32(2026);
  const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rnd() * arr.length)];
  const pwHash = await hashPassword(DEMO_PASSWORD);

  /* ── Rede e escolas ── */
  const [network] = await db.insert(s.networks).values({ name: "Rede Municipal de Ensino de Vale Serena" }).returning();
  const conceptScale: s.ConceptLevel[] = [
    { key: "ND", label: "Ainda não desenvolvido", description: "A habilidade ainda não aparece nas atividades." },
    { key: "ED", label: "Em desenvolvimento", description: "Aparece com apoio e em algumas situações." },
    { key: "D", label: "Desenvolvido", description: "Aparece com autonomia na maior parte das situações." },
    { key: "PD", label: "Plenamente desenvolvido", description: "Aparece com autonomia e é usada em situações novas." },
  ];
  const [school, school2] = await db
    .insert(s.schools)
    .values([
      {
        networkId: network.id,
        name: "EMEF Jardim das Acácias",
        shortName: "Jardim das Acácias",
        city: "Vale Serena",
        state: "SP",
        evaluationModel: "concept",
        conceptScale,
        passingScore: "6",
        aiEnabled: true,
        imagePolicy: "Fotografias só são publicadas para alunos com autorização de uso de imagem assinada pela família.",
      },
      {
        networkId: network.id,
        name: "EMEF Monte Azul",
        shortName: "Monte Azul",
        city: "Vale Serena",
        state: "SP",
        evaluationModel: "numeric",
        conceptScale,
        passingScore: "6",
      },
    ])
    .returning();

  /* ── Pessoas ── */
  const mkUser = (name: string, email: string, hue: number) => ({ name, email, passwordHash: pwHash, hue });
  const [helena, rafael, marta, paulo, juliana, carlos, beatriz, fernanda] = await db
    .insert(s.users)
    .values([
      mkUser("Helena Prado", "helena@trilha.demo", 162),
      mkUser("Rafael Moura", "rafael@trilha.demo", 214),
      mkUser("Marta Sales", "marta@trilha.demo", 280),
      mkUser("Paulo Andrade", "paulo@trilha.demo", 30),
      mkUser("Juliana Ribeiro", "juliana@familia.demo", 340),
      mkUser("Carlos Nunes", "carlos@familia.demo", 200),
      mkUser("Beatriz Lima", "beatriz@trilha.demo", 120),
      mkUser("Fernanda Costa", "fernanda@familia.demo", 15),
    ])
    .returning();

  const onboarded = ts("2026-02-02");
  await db.insert(s.memberships).values([
    {
      userId: helena.id, schoolId: school.id, role: "teacher", title: "Professora", onboardedAt: onboarded,
      officeHours: { days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00", note: "Respondo os recados em até dois dias úteis." },
    },
    {
      userId: rafael.id, schoolId: school.id, role: "teacher", title: "Professor de Matemática", onboardedAt: onboarded,
      officeHours: { days: [2, 4], start: "14:00", end: "16:30", note: "Leio as mensagens às terças e quintas." },
    },
    { userId: marta.id, schoolId: school.id, role: "coordinator", title: "Coordenadora pedagógica", onboardedAt: onboarded },
    { userId: paulo.id, schoolId: school.id, role: "admin", title: "Diretor", onboardedAt: onboarded },
    { userId: juliana.id, schoolId: school.id, role: "guardian", onboardedAt: onboarded },
    { userId: carlos.id, schoolId: school.id, role: "guardian", onboardedAt: onboarded },
    {
      userId: beatriz.id, schoolId: school2.id, role: "teacher", title: "Professora", onboardedAt: onboarded,
      officeHours: { days: [1, 3, 5], start: "12:30", end: "15:00" },
    },
    { userId: fernanda.id, schoolId: school2.id, role: "guardian", onboardedAt: onboarded },
  ]);

  /* ── Calendário letivo ── */
  const [y2025, y2026, y2026b] = await db
    .insert(s.academicYears)
    .values([
      { schoolId: school.id, year: 2025, startsOn: "2025-02-03", endsOn: "2025-12-12" },
      { schoolId: school.id, year: 2026, startsOn: "2026-02-02", endsOn: "2026-12-15" },
      { schoolId: school2.id, year: 2026, startsOn: "2026-02-02", endsOn: "2026-12-15" },
    ])
    .returning();
  const termDefs = [
    [1, "1º bimestre", "2026-02-02", "2026-04-17"],
    [2, "2º bimestre", "2026-04-27", "2026-07-10"],
    [3, "3º bimestre", "2026-07-27", "2026-09-30"],
    [4, "4º bimestre", "2026-10-01", "2026-12-15"],
  ] as const;
  const terms = await db
    .insert(s.terms)
    .values([
      ...termDefs.map(([ordinal, name, startsOn, endsOn]) => ({ schoolId: school.id, academicYearId: y2026.id, ordinal, name, startsOn, endsOn })),
      { schoolId: school.id, academicYearId: y2025.id, ordinal: 4, name: "4º bimestre", startsOn: "2025-10-01", endsOn: "2025-12-12" },
      ...termDefs.map(([ordinal, name, startsOn, endsOn]) => ({ schoolId: school2.id, academicYearId: y2026b.id, ordinal, name, startsOn, endsOn })),
    ])
    .returning();
  const [t1, t2, t3, t4, t2025] = terms;

  /* ── Componentes curriculares ── */
  const subjectDefs = [
    ["Língua Portuguesa", "linguagens"],
    ["Matemática", "matematica"],
    ["Ciências", "ciencias_natureza"],
    ["História", "ciencias_humanas"],
    ["Geografia", "ciencias_humanas"],
    ["Arte", "linguagens"],
  ] as const;
  const subjects = await db
    .insert(s.subjects)
    .values([
      ...subjectDefs.map(([name, area]) => ({ schoolId: school.id, name, area })),
      ...subjectDefs.map(([name, area]) => ({ schoolId: school2.id, name, area })),
    ])
    .returning();
  const subj = (name: string, sc = school.id) => subjects.find((x) => x.name === name && x.schoolId === sc)!;

  /* ── Turmas ── */
  const [c3a, c6a, c6b, c7a, c2a2025, c3b] = await db
    .insert(s.classes)
    .values([
      { schoolId: school.id, academicYearId: y2026.id, name: "3º ano A", stage: "fundamental_1", grade: 3, shift: "manha", room: "Sala 4" },
      { schoolId: school.id, academicYearId: y2026.id, name: "6º ano A", stage: "fundamental_2", grade: 6, shift: "tarde", room: "Sala 11" },
      { schoolId: school.id, academicYearId: y2026.id, name: "6º ano B", stage: "fundamental_2", grade: 6, shift: "tarde", room: "Sala 12" },
      { schoolId: school.id, academicYearId: y2026.id, name: "7º ano A", stage: "fundamental_2", grade: 7, shift: "tarde", room: "Sala 14" },
      { schoolId: school.id, academicYearId: y2025.id, name: "2º ano A", stage: "fundamental_1", grade: 2, shift: "manha", room: "Sala 3", archivedAt: ts("2025-12-15") },
      { schoolId: school2.id, academicYearId: y2026b.id, name: "3º ano B", stage: "fundamental_1", grade: 3, shift: "manha", room: "Sala 2" },
    ])
    .returning();

  await db.insert(s.teachingAssignments).values([
    { classId: c3a.id, userId: helena.id, isHomeroom: true },
    { classId: c2a2025.id, userId: helena.id, isHomeroom: true },
    { classId: c6a.id, userId: rafael.id, subjectId: subj("Matemática").id },
    { classId: c6b.id, userId: rafael.id, subjectId: subj("Matemática").id },
    { classId: c7a.id, userId: rafael.id, subjectId: subj("Matemática").id },
    { classId: c3b.id, userId: beatriz.id, isHomeroom: true },
  ]);

  /* ── Alunos ── */
  const names3a = [
    "Lucas Ribeiro", "Ana Clara Nunes", "Davi Santos", "Beatriz Alves", "Gabriel Oliveira", "Isabela Martins",
    "Miguel Ferreira", "Laura Gomes", "Arthur Costa", "Valentina Souza", "Heitor Lima", "Manuela Pereira",
    "Théo Carvalho", "Alice Barbosa", "Samuel Araújo", "Lívia Cardoso", "Bernardo Teixeira", "Cecília Moreira",
    "Enzo Batista", "Yasmin Correia", "Pietro Mendes", "Maria Eduarda Silva", "Joaquim Rocha",
  ];
  const genNames = (n: number, fixed: string[] = []) => {
    const set = new Set(fixed);
    while (set.size < n) set.add(`${pick(FIRST)} ${pick(LAST)}`);
    return [...set];
  };
  const preferred: Record<string, string> = { "Ana Clara Nunes": "Ana Clara", "Maria Eduarda Silva": "Duda" };

  type NewStudent = typeof s.students.$inferInsert;
  const mkStudents = (list: string[], schoolId: string, birthYear: number, noConsent: string[] = []): NewStudent[] =>
    list.map((fullName, i) => ({
      schoolId,
      fullName,
      preferredName: preferred[fullName] ?? null,
      birthDate: `${birthYear}-${String((i % 12) + 1).padStart(2, "0")}-${String(((i * 7) % 27) + 1).padStart(2, "0")}`,
      enrollmentCode: `${schoolId === school.id ? "JA" : "MA"}${birthYear % 100}${String(1000 + i * 37)}`,
      imageConsent: !noConsent.includes(fullName),
      hue: Math.floor(rnd() * 360),
    }));

  const st3a = await db
    .insert(s.students)
    .values(mkStudents(names3a, school.id, 2017, ["Heitor Lima", "Yasmin Correia"]).map((x) =>
      x.fullName === "Lucas Ribeiro" ? { ...x, birthDate: "2017-05-14" } : x.fullName === "Davi Santos" ? { ...x, birthDate: "2017-09-03" } : x,
    ))
    .returning();
  const st6a = await db.insert(s.students).values(mkStudents(genNames(25, ["Sofia Ribeiro"]), school.id, 2014)).returning();
  const st6b = await db.insert(s.students).values(mkStudents(genNames(24), school.id, 2014)).returning();
  const st7a = await db.insert(s.students).values(mkStudents(genNames(26), school.id, 2013)).returning();
  const st3b = await db.insert(s.students).values(mkStudents(genNames(18, ["Pedro Costa"]), school2.id, 2017)).returning();

  const byName = (list: typeof st3a, n: string) => list.find((x) => x.fullName === n)!;
  const lucas = byName(st3a, "Lucas Ribeiro");
  const anaClara = byName(st3a, "Ana Clara Nunes");
  const miguel = byName(st3a, "Miguel Ferreira");
  const davi = byName(st3a, "Davi Santos");
  const laura = byName(st3a, "Laura Gomes");
  const sofia = byName(st6a, "Sofia Ribeiro");
  const pedro = byName(st3b, "Pedro Costa");

  const enroll = (list: typeof st3a, classId: string, startedOn: string, endedOn: string | null = null) =>
    [...list]
      .sort((a, b) => a.fullName.localeCompare(b.fullName, "pt-BR"))
      .map((x, i) => ({ studentId: x.id, classId, number: i + 1, startedOn, endedOn }));
  await db.insert(s.enrollments).values([
    ...enroll(st3a, c3a.id, "2026-02-02"),
    ...enroll(st3a.filter((x) => x.id !== davi.id), c2a2025.id, "2025-02-03", "2025-12-12"),
    ...enroll(st6a, c6a.id, "2026-02-02"),
    ...enroll(st6b, c6b.id, "2026-02-02"),
    ...enroll(st7a, c7a.id, "2026-02-02"),
    ...enroll(st3b, c3b.id, "2026-02-02"),
  ]);

  await db.insert(s.guardianLinks).values([
    { userId: juliana.id, studentId: lucas.id, relationship: "Mãe", verifiedAt: ts("2026-02-05"), verifiedById: paulo.id },
    { userId: juliana.id, studentId: sofia.id, relationship: "Mãe", verifiedAt: ts("2026-02-05"), verifiedById: paulo.id },
    { userId: carlos.id, studentId: anaClara.id, relationship: "Pai", verifiedAt: ts("2026-02-06"), verifiedById: paulo.id },
    { userId: fernanda.id, studentId: pedro.id, relationship: "Mãe", verifiedAt: ts("2026-02-06"), verifiedById: beatriz.id },
  ]);

  await db.insert(s.invitations).values({
    schoolId: school.id,
    role: "guardian",
    studentId: davi.id,
    recipientName: "Responsável por Davi",
    relationship: "Responsável",
    tokenHash: sha(normalizeInviteCode(DEMO_INVITE_CODE)),
    codeHint: DEMO_INVITE_CODE.slice(-4),
    expiresAt: ts("2026-12-31"),
    createdById: helena.id,
  });

  /* ── Modelos de sondagem ── */
  const writingScale: s.ScaleLevel[] = [
    { key: "PS", label: "Pré-silábico", short: "PS", description: "Ainda não estabelece relação entre escrita e pauta sonora.", familyDescription: "Está descobrindo que a escrita representa os sons da fala." },
    { key: "SSV", label: "Silábico sem valor sonoro", short: "SSV", description: "Uma marca por sílaba, sem correspondência sonora.", familyDescription: "Já percebe que escrevemos partes das palavras, ainda sem relacionar letras e sons." },
    { key: "SCV", label: "Silábico com valor sonoro", short: "SCV", description: "Uma letra por sílaba, com correspondência sonora.", familyDescription: "Usa uma letra para cada pedacinho da palavra, já ligando letras e sons." },
    { key: "SA", label: "Silábico-alfabético", short: "SA", description: "Oscila entre a escrita silábica e a alfabética.", familyDescription: "Às vezes escreve uma letra por sílaba, às vezes a sílaba completa." },
    { key: "A", label: "Alfabético", short: "A", description: "Compreende o sistema de escrita alfabética.", familyDescription: "Já escreve as palavras representando todos os sons." },
  ];
  const readingScale: s.ScaleLevel[] = [
    { key: "NL", label: "Ainda não leitor", short: "NL", description: "Reconhece algumas letras, sem decodificar.", familyDescription: "Está conhecendo as letras e começando a reconhecê-las." },
    { key: "LS", label: "Leitor de sílabas", short: "LS", description: "Decodifica sílabas isoladas.", familyDescription: "Consegue ler pedacinhos das palavras." },
    { key: "LP", label: "Leitor de palavras", short: "LP", description: "Lê palavras isoladas.", familyDescription: "Consegue ler palavras inteiras." },
    { key: "LF", label: "Leitor de frases", short: "LF", description: "Lê frases curtas com compreensão.", familyDescription: "Consegue ler frases curtas e entender o que leu." },
    { key: "LT", label: "Leitor de texto sem fluência", short: "LT", description: "Lê textos curtos com pausas e compreensão.", familyDescription: "Lê textos curtos, ainda com algumas pausas." },
    { key: "LFL", label: "Leitor fluente", short: "LFL", description: "Lê textos com ritmo, entonação e compreensão.", familyDescription: "Lê textos com ritmo e entende o que lê." },
  ];
  const mathScale: s.ScaleLevel[] = [
    { key: "AN", label: "Ainda não", short: "AN", description: "Não demonstra a habilidade, mesmo com apoio.", familyDescription: "Ainda está começando a aprender este conteúdo." },
    { key: "ED", label: "Em desenvolvimento", short: "ED", description: "Demonstra com apoio ou parcialmente.", familyDescription: "Já consegue com um pouco de ajuda." },
    { key: "D", label: "Desenvolvido", short: "D", description: "Demonstra com autonomia.", familyDescription: "Consegue sozinho." },
    { key: "AM", label: "Ampliado", short: "AM", description: "Demonstra e aplica em situações novas.", familyDescription: "Consegue sozinho e usa em situações novas." },
  ];
  const diagScale: s.ScaleLevel[] = [
    { key: "AB", label: "Abaixo do básico", short: "AB", description: "Domínio insuficiente das habilidades avaliadas.", familyDescription: "Precisa de mais apoio nestes conteúdos." },
    { key: "B", label: "Básico", short: "B", description: "Domínio parcial.", familyDescription: "Já domina uma parte do conteúdo." },
    { key: "AD", label: "Adequado", short: "AD", description: "Domínio esperado para o ano.", familyDescription: "Está aprendendo o esperado para o ano." },
    { key: "AV", label: "Avançado", short: "AV", description: "Domínio além do esperado.", familyDescription: "Está além do esperado para o ano." },
  ];
  const [tplWriting, tplReading, tplMath, tplDiag] = await db
    .insert(s.assessmentTemplates)
    .values([
      { schoolId: school.id, kind: "escrita", name: "Hipóteses de escrita", description: "Ditado de quatro palavras e uma frase, do mesmo campo semântico.", scale: writingScale, createdById: marta.id },
      {
        schoolId: school.id, kind: "leitura", name: "Fluência leitora", description: "Leitura individual de palavras, frases e um texto curto.", scale: readingScale, createdById: marta.id,
        criteria: [
          { key: "decodifica", label: "Decodifica com segurança" },
          { key: "compreende", label: "Compreende o que leu" },
          { key: "entonacao", label: "Lê com entonação" },
        ],
      },
      {
        schoolId: school.id, kind: "matematica", name: "Números e operações", description: "Sondagem de números e cálculo para o Fundamental I.", scale: mathScale, createdById: marta.id,
        criteria: [
          { key: "numeros", label: "Lê e escreve números até 1000" },
          { key: "adicao", label: "Resolve problemas de adição" },
          { key: "subtracao", label: "Resolve problemas de subtração" },
          { key: "multiplicacao", label: "Compreende multiplicação" },
        ],
      },
      {
        schoolId: school.id, kind: "diagnostica", name: "Diagnóstica de Matemática — 6º e 7º anos", description: "Avaliação diagnóstica de entrada e de acompanhamento.", scale: diagScale, createdById: rafael.id,
        criteria: [
          { key: "operacoes", label: "Operações com naturais" },
          { key: "fracoes", label: "Frações e decimais" },
          { key: "problemas", label: "Resolução de problemas" },
        ],
      },
      { schoolId: school2.id, kind: "escrita", name: "Hipóteses de escrita", scale: writingScale, createdById: beatriz.id },
    ])
    .returning();

  /* Trajetórias individuais (índices nas escalas) */
  type Traj = { w: number[]; r: number[]; m: number[] };
  const fixed: Record<string, Traj> = {
    [lucas.id]: { w: [1, 2, 3, 4], r: [1, 2, 3, 4], m: [1, 2] },
    [anaClara.id]: { w: [3, 4, 4, 4], r: [3, 4, 5, 5], m: [2, 3] },
    [miguel.id]: { w: [0, 1, 1, 2], r: [0, 1, 1, 2], m: [0, 1] },
    [laura.id]: { w: [2, 3, 3, 4], r: [2, 2, 3, 4], m: [1, 2] },
  };
  const traj = new Map<string, Traj>();
  for (const st of st3a) {
    if (fixed[st.id]) { traj.set(st.id, fixed[st.id]); continue; }
    const w0 = Math.min(4, Math.floor(rnd() * 3) + 1);
    const w: number[] = [Math.max(0, w0 - 1)];
    for (let i = 0; i < 3; i++) w.push(Math.min(4, w[i] + (rnd() < 0.6 ? 1 : 0)));
    const r: number[] = [Math.min(5, Math.max(0, w0 - 1 + (rnd() < 0.3 ? 1 : 0)))];
    for (let i = 0; i < 3; i++) r.push(Math.min(5, r[i] + (rnd() < 0.55 ? 1 : 0)));
    const m0 = Math.floor(rnd() * 3);
    traj.set(st.id, { w, r, m: [m0, Math.min(3, m0 + (rnd() < 0.6 ? 1 : 0))] });
  }

  const roundDefs: { cls: typeof c3a; tpl: typeof tplWriting; term: typeof t1; title: string; on: string; shared: boolean; author: string; k: "w" | "r" | "m"; i: number }[] = [
    { cls: c2a2025, tpl: tplWriting, term: t2025, title: "Escrita — fim do 2º ano", on: "2025-11-18", shared: true, author: helena.id, k: "w", i: 0 },
    { cls: c3a, tpl: tplWriting, term: t1, title: "Escrita — 1º bimestre", on: "2026-03-10", shared: true, author: helena.id, k: "w", i: 1 },
    { cls: c3a, tpl: tplReading, term: t1, title: "Leitura — 1º bimestre", on: "2026-03-12", shared: true, author: helena.id, k: "r", i: 0 },
    { cls: c3a, tpl: tplMath, term: t1, title: "Matemática — 1º bimestre", on: "2026-03-17", shared: false, author: helena.id, k: "m", i: 0 },
    { cls: c3a, tpl: tplWriting, term: t2, title: "Escrita — 2º bimestre", on: "2026-05-20", shared: true, author: helena.id, k: "w", i: 2 },
    { cls: c3a, tpl: tplReading, term: t2, title: "Leitura — 2º bimestre", on: "2026-05-22", shared: true, author: helena.id, k: "r", i: 1 },
    { cls: c3a, tpl: tplWriting, term: t3, title: "Escrita — 3º bimestre", on: "2026-08-25", shared: true, author: helena.id, k: "w", i: 3 },
    { cls: c3a, tpl: tplReading, term: t3, title: "Leitura — 3º bimestre", on: "2026-08-27", shared: true, author: helena.id, k: "r", i: 2 },
    { cls: c3a, tpl: tplMath, term: t3, title: "Matemática — 3º bimestre", on: "2026-09-01", shared: true, author: helena.id, k: "m", i: 1 },
    { cls: c3a, tpl: tplReading, term: t4, title: "Leitura — 4º bimestre", on: "2026-11-10", shared: false, author: helena.id, k: "r", i: 3 },
  ];
  const critKeys = (tpl: typeof tplWriting) => tpl.criteria.map((c) => c.key);
  for (const def of roundDefs) {
    const [round] = await db
      .insert(s.assessmentRounds)
      .values({ schoolId: school.id, classId: def.cls.id, templateId: def.tpl.id, termId: def.term.id, title: def.title, appliedOn: def.on, sharedWithFamily: def.shared, createdById: def.author })
      .returning();
    const list = def.cls.id === c2a2025.id ? st3a.filter((x) => x.id !== davi.id) : st3a;
    await db.insert(s.assessmentResults).values(
      list.map((st) => {
        const t = traj.get(st.id)!;
        const idx = t[def.k][def.i];
        const level = def.tpl.scale[Math.max(0, Math.min(def.tpl.scale.length - 1, idx))];
        const criteria: s.CriteriaAnswers = {};
        for (const key of critKeys(def.tpl)) {
          const p = idx / (def.tpl.scale.length - 1);
          criteria[key] = p > 0.66 ? "sim" : p > 0.33 ? (rnd() < 0.5 ? "sim" : "parcial") : rnd() < 0.5 ? "parcial" : "nao";
        }
        let note: string | null = null;
        if (st.id === lucas.id && def.k === "w" && def.i === 2) note = "Escreveu MACACO como MAKCO. Já usa a sílaba completa em parte das palavras.";
        if (st.id === lucas.id && def.k === "r" && def.i === 3) note = "Leu o texto do pássaro com pausas, mas recontou a história com detalhes.";
        if (st.id === miguel.id && def.k === "w" && def.i === 3) note = "Avançou após o reforço com alfabeto móvel.";
        return { roundId: round.id, studentId: st.id, levelKey: level.key, criteria, note, updatedById: def.author, updatedAt: ts(def.on) };
      }),
    );
  }

  // Diagnósticas do 6º/7º ano (Rafael)
  for (const [cls, list] of [[c6a, st6a], [c6b, st6b], [c7a, st7a]] as const) {
    for (const [term, on, title] of [[t1, "2026-02-20", "Diagnóstica de entrada"], [t3, "2026-08-20", "Diagnóstica de acompanhamento"]] as const) {
      const [round] = await db
        .insert(s.assessmentRounds)
        .values({ schoolId: school.id, classId: cls.id, templateId: tplDiag.id, termId: term.id, title, appliedOn: on, sharedWithFamily: false, createdById: rafael.id })
        .returning();
      await db.insert(s.assessmentResults).values(
        list.map((st, i) => {
          const base = st.id === sofia.id ? (term === t1 ? 1 : 2) : (i * 7 + (term === t1 ? 0 : 3)) % 4;
          const level = diagScale[Math.min(3, base)];
          return {
            roundId: round.id, studentId: st.id, levelKey: level.key,
            criteria: { operacoes: base >= 2 ? "sim" : "parcial", fracoes: base >= 3 ? "sim" : base >= 1 ? "parcial" : "nao", problemas: base >= 2 ? "sim" : "parcial" } as s.CriteriaAnswers,
            updatedById: rafael.id, updatedAt: ts(on),
          };
        }),
      );
    }
  }

  // Monte Azul
  const [roundMA] = await db
    .insert(s.assessmentRounds)
    .values({ schoolId: school2.id, classId: c3b.id, templateId: (await db.query.assessmentTemplates.findFirst({ where: (t, { eq }) => eq(t.schoolId, school2.id) }))!.id, termId: terms[5].id, title: "Escrita — 1º bimestre", appliedOn: "2026-03-11", sharedWithFamily: true, createdById: beatriz.id })
    .returning();
  await db.insert(s.assessmentResults).values(st3b.map((st, i) => ({ roundId: roundMA.id, studentId: st.id, levelKey: writingScale[(i % 4) + 1].key, updatedById: beatriz.id })));

  /* ── Avaliações e notas ── */
  const conceptOf = (n: number) => ["ND", "ED", "D", "PD"][Math.max(0, Math.min(3, n))];
  const lucasConcepts: Record<string, string[]> = { "Língua Portuguesa": ["ED", "ED", "D"], Matemática: ["D", "D", "D"], Ciências: ["D", "PD", "PD"] };
  for (const sName of ["Língua Portuguesa", "Matemática", "Ciências"]) {
    for (const [ti, term] of [t1, t2, t3].entries()) {
      const [item] = await db
        .insert(s.gradeItems)
        .values({ schoolId: school.id, classId: c3a.id, subjectId: subj(sName).id, termId: term.id, title: `Avaliação do ${term.name}`, kind: "concept", date: addDaysISO(term.endsOn, -10), sharedWithFamily: true, createdById: helena.id, bnccCodes: sName === "Língua Portuguesa" ? ["EF35LP01", "EF03LP01"] : sName === "Matemática" ? ["EF03MA01", "EF03MA03"] : ["EF03CI09"] })
        .returning();
      await db.insert(s.grades).values(
        st3a.map((st) => {
          const t = traj.get(st.id)!;
          let concept = conceptOf(Math.round(((t.w[Math.min(3, ti + 1)] + t.r[ti]) / 9) * 3 + (rnd() < 0.2 ? 1 : 0)));
          if (st.id === lucas.id) concept = lucasConcepts[sName][ti];
          return { gradeItemId: item.id, studentId: st.id, concept };
        }),
      );
    }
    await db.insert(s.gradeItems).values({ schoolId: school.id, classId: c3a.id, subjectId: subj(sName).id, termId: t4.id, title: "Avaliação do 4º bimestre", kind: "concept", date: "2026-12-01", createdById: helena.id });
  }

  for (const [cls, list] of [[c6a, st6a], [c6b, st6b], [c7a, st7a]] as const) {
    for (const term of [t1, t2, t3]) {
      const items = await db
        .insert(s.gradeItems)
        .values([
          { schoolId: school.id, classId: cls.id, subjectId: subj("Matemática").id, termId: term.id, title: "Prova bimestral", kind: "numeric", maxScore: "10", weight: "2", date: addDaysISO(term.endsOn, -14), sharedWithFamily: true, createdById: rafael.id, bnccCodes: ["EF06MA01", "EF06MA03"] },
          { schoolId: school.id, classId: cls.id, subjectId: subj("Matemática").id, termId: term.id, title: "Trabalho em grupo", kind: "numeric", maxScore: "10", weight: "1", date: addDaysISO(term.endsOn, -30), sharedWithFamily: true, createdById: rafael.id },
        ])
        .returning();
      for (const item of items) {
        await db.insert(s.grades).values(
          list.map((st, i) => {
            let score = 4.5 + ((i * 13 + term.ordinal * 7) % 55) / 10;
            if (st.id === sofia.id) score = [6.5, 7.5, 8.5][term.ordinal - 1] + (item.title.startsWith("Trab") ? 0.5 : 0);
            return { gradeItemId: item.id, studentId: st.id, score: Math.min(10, score).toFixed(1) };
          }),
        );
      }
    }
    await db.insert(s.gradeItems).values([
      { schoolId: school.id, classId: cls.id, subjectId: subj("Matemática").id, termId: t4.id, title: "Prova bimestral", kind: "numeric", maxScore: "10", weight: "2", date: "2026-11-26", createdById: rafael.id, bnccCodes: ["EF06MA07"] },
    ]);
  }

  /* ── Frequência ── */
  const days = schoolDays("2026-02-02", "2026-11-18");
  const attendanceRows: (typeof s.attendance.$inferInsert)[] = [];
  for (const [cls, list, teacher] of [[c3a, st3a, helena], [c6a, st6a, rafael], [c6b, st6b, rafael], [c7a, st7a, rafael], [c3b, st3b, beatriz]] as const) {
    for (const day of days) {
      for (const st of list) {
        const r = rnd();
        let status: "presente" | "falta" | "atraso" | "justificada" = r < 0.035 ? "falta" : r < 0.05 ? "justificada" : r < 0.065 ? "atraso" : "presente";
        if (st.id === miguel.id) {
          if (day >= "2026-11-09") status = ["2026-11-10", "2026-11-11", "2026-11-12", "2026-11-17"].includes(day) ? "falta" : "presente";
          else if (rnd() < 0.06) status = "falta";
        }
        if (st.id === lucas.id && status === "falta" && rnd() < 0.6) status = "presente";
        if (st.id === anaClara.id && day === "2026-11-13") status = "justificada";
        attendanceRows.push({ classId: cls.id, studentId: st.id, date: day, status, recordedById: teacher.id });
      }
    }
  }
  await chunkInsert(db, s.attendance, attendanceRows, 1000);

  /* ── Diário pedagógico ── */
  type E = { on: string; kind: s.EntryKindValue; vis: "private" | "coordination" | "family"; title: string; body: string; students?: string[]; cls?: string; draft?: boolean; author?: string };
  const entries: E[] = [
    { on: "2025-11-25", kind: "observacao", vis: "private", title: "Escrita no fim do 2º ano", body: "Lucas ainda escreve uma marca para cada sílaba, sem relação com os sons. Gosta muito de desenhar e conta histórias oralmente com riqueza de detalhes.", students: [lucas.id], cls: c2a2025.id },
    { on: "2026-02-19", kind: "dificuldade", vis: "private", title: "Identificação de sílabas", body: "Na atividade com fichas silábicas, Lucas teve dificuldade para separar e identificar as sílabas de palavras dissílabas. Reconhece todas as vogais com segurança.", students: [lucas.id] },
    { on: "2026-03-05", kind: "estrategia", vis: "private", title: "Jogo de sílabas em dupla", body: "Organizei Lucas em dupla com Ana Clara no jogo de formar palavras com sílabas móveis. Ele participou com entusiasmo e pediu para jogar de novo.", students: [lucas.id, anaClara.id] },
    { on: "2026-04-14", kind: "conquista", vis: "family", title: "Formou palavras sozinho", body: "Lucas formou cinco palavras com sílabas móveis, sem ajuda, e leu todas em voz alta para a turma. Foi muito aplaudido pelos colegas!", students: [lucas.id] },
    { on: "2026-05-28", kind: "observacao", vis: "private", title: "Avanço na formação de palavras", body: "Lucas já escreve palavras dissílabas com a sílaba completa e começa a arriscar trissílabas. Ainda omite letras em sílabas complexas (MAKCO para MACACO).", students: [lucas.id] },
    { on: "2026-06-16", kind: "conquista", vis: "family", title: "Leitura de frases curtas", body: "Lucas leu sozinho as frases do cartaz da horta e explicou para a turma o que cada uma dizia. Mostrou muito mais autonomia na leitura.", students: [lucas.id] },
    { on: "2026-08-20", kind: "observacao", vis: "coordination", title: "Melhora na interpretação", body: "Na leitura compartilhada do conto sobre a semente que queria voar, Lucas respondeu às perguntas sobre o texto e fez inferências simples sobre os sentimentos da personagem.", students: [lucas.id] },
    { on: "2026-09-15", kind: "intervencao", vis: "private", title: "Leitura diária com marcador", body: "Iniciei leitura diária de cinco minutos com marcador de linha para Lucas e outros três alunos. Objetivo: ganhar ritmo sem perder a compreensão.", students: [lucas.id, miguel.id, laura.id] },
    { on: "2026-10-22", kind: "participacao", vis: "family", title: "Apresentação do projeto das sementes", body: "Lucas apresentou para a turma o que aprendeu sobre germinação, usando o cartaz que fez com o grupo. Falou com clareza e respondeu às perguntas dos colegas.", students: [lucas.id] },
    { on: "2026-11-11", kind: "observacao", vis: "private", title: "Leitura de texto com pausas", body: "Na sondagem de leitura, Lucas leu o texto curto com pausas, mas recontou a história com detalhes e na ordem certa. A compreensão está à frente da fluência.", students: [lucas.id] },
    { on: "2026-03-03", kind: "dificuldade", vis: "coordination", title: "Reconhecimento de letras", body: "Miguel ainda confunde letras com traçado parecido (b/d, p/q) e se frustra quando percebe o erro. Conversei com a coordenação sobre apoio no contraturno.", students: [miguel.id] },
    { on: "2026-04-08", kind: "intervencao", vis: "coordination", title: "Alfabeto móvel e reforço", body: "Miguel passou a participar do reforço de terça e quinta. Trabalhamos com alfabeto móvel e palavras do repertório dele (futebol, nomes dos colegas).", students: [miguel.id] },
    { on: "2026-08-26", kind: "conquista", vis: "family", title: "Escreveu o nome dos colegas", body: "Miguel escreveu sozinho o nome de seis colegas para a lista da festa da turma. Ficou orgulhoso e mostrou para todos.", students: [miguel.id] },
    { on: "2026-11-17", kind: "observacao", vis: "private", title: "Faltas nesta e na semana passada", body: "Miguel faltou três dias seguidos na semana passada e de novo hoje. Vou entrar em contato com a família para entender se está tudo bem.", students: [miguel.id] },
    { on: "2026-03-20", kind: "conquista", vis: "family", title: "Leitora da semana", body: "Ana Clara escolheu um livro da biblioteca e leu um trecho para a turma, com ótima entonação.", students: [anaClara.id] },
    { on: "2026-09-10", kind: "estrategia", vis: "private", title: "Desafios de produção textual", body: "Ana Clara termina as atividades rapidamente. Passei a oferecer desafios de reescrita com um final diferente para as histórias.", students: [anaClara.id] },
    { on: "2026-10-06", kind: "participacao", vis: "private", title: "Mais participação nas rodas de conversa", body: "Laura, que costumava falar pouco, contou na roda sobre a visita aos avós no sítio. Os colegas fizeram muitas perguntas.", students: [laura.id] },
    // Registros da turma
    { on: "2026-10-26", kind: "conteudo", vis: "family", title: "Sistema solar", body: "Começamos o estudo do sistema solar: nomes dos planetas, a ordem em relação ao Sol e por que temos dia e noite." },
    { on: "2026-10-28", kind: "atividade", vis: "family", title: "Maquete dos planetas", body: "Em grupos, as crianças montaram uma maquete com bolas de isopor pintadas. Cada grupo apresentou um planeta." },
    { on: "2026-11-03", kind: "conteudo", vis: "family", title: "Gêneros textuais", body: "Conhecemos diferentes gêneros textuais: receita, bilhete, poema e notícia. Conversamos sobre para que serve cada um." },
    { on: "2026-11-05", kind: "atividade", vis: "family", title: "Mural dos gêneros", body: "A turma montou um mural com exemplos de cada gênero trazidos de casa." },
    { on: "2026-11-10", kind: "conteudo", vis: "family", title: "Multiplicação como soma de parcelas iguais", body: "Introduzimos a multiplicação usando agrupamentos com tampinhas: 3 grupos de 4 tampinhas são 12 tampinhas." },
    { on: "2026-11-12", kind: "atividade", vis: "family", title: "Cantinho da leitura", body: "Inauguramos o cantinho da leitura com almofadas e livros doados pelas famílias. Cada criança escolheu um livro para levar para casa." },
    { on: "2026-11-16", kind: "conteudo", vis: "family", title: "Germinação: do que a semente precisa", body: "Conversamos sobre o que uma semente precisa para germinar: água, ar e temperatura adequada. As crianças levantaram hipóteses e registraram no caderno." },
    { on: "2026-11-17", kind: "atividade", vis: "family", title: "Plantio do feijão no algodão", body: "Cada criança plantou um feijão no algodão, dentro de um copinho identificado com seu nome. Vamos observar e registrar o crescimento todos os dias." },
    { on: "2026-11-18", kind: "conteudo", vis: "family", title: "Bilhete: escrever para alguém", body: "Estudamos a estrutura do bilhete (destinatário, mensagem, despedida e assinatura) e cada criança escreveu um bilhete para alguém da escola." },
    { on: "2026-11-18", kind: "acontecimento", vis: "private", title: "Conflito no recreio resolvido em roda", body: "Houve uma discussão no recreio por causa da bola. Resolvemos em roda de conversa, combinando um rodízio para os próximos dias." },
    { on: "2026-11-19", kind: "atividade", vis: "family", title: "Multiplicação com material dourado", body: "Resolvemos problemas de multiplicação usando material dourado e registramos as estratégias no quadro." },
    { on: "2026-11-19", kind: "observacao", vis: "private", title: "", body: "Laura pediu para ler o bilhete dela em voz alta. ", students: [laura.id], draft: true },
    // Rafael
    { on: "2026-11-09", kind: "conteudo", vis: "family", title: "Frações equivalentes", body: "Trabalhamos frações equivalentes com tiras de papel e a reta numérica.", cls: c6a.id, author: rafael.id },
    { on: "2026-11-12", kind: "conquista", vis: "family", title: "Resolveu o desafio da semana", body: "Sofia foi a primeira a explicar, no quadro, por que 2/4 e 1/2 representam a mesma quantidade.", students: [sofia.id], cls: c6a.id, author: rafael.id },
    { on: "2026-09-02", kind: "dificuldade", vis: "private", title: "Divisão com resto", body: "Sofia ainda tem dúvidas para interpretar o resto em problemas de divisão.", students: [sofia.id], cls: c6a.id, author: rafael.id },
  ];
  for (const e of entries) {
    const author = e.author ?? helena.id;
    const classId = e.cls ?? c3a.id;
    const [row] = await db
      .insert(s.journalEntries)
      .values({
        schoolId: school.id, classId, authorId: author, kind: e.kind, visibility: e.vis, title: e.title || null, body: e.body,
        occurredOn: e.on, isDraft: e.draft ?? false,
        scope: !e.students ? "class" : e.students.length === 1 ? "student" : "students",
        createdAt: ts(e.on, "11:30"), updatedAt: ts(e.on, "11:30"),
      })
      .returning();
    if (e.students?.length) await db.insert(s.journalEntryStudents).values(e.students.map((studentId) => ({ entryId: row.id, studentId })));
  }
  await db.insert(s.journalEntries).values({ schoolId: school2.id, classId: c3b.id, authorId: beatriz.id, kind: "observacao", visibility: "private", title: "Registro privado da Monte Azul", body: "Pedro está mais confiante na leitura.", occurredOn: "2026-11-10", scope: "class" });

  await db.insert(s.entryTemplates).values([
    { userId: helena.id, name: "Leitura individual", kind: "observacao", body: "Leu: \nCompreensão: \nPróximo passo: " },
    { userId: helena.id, name: "Conquista do dia", kind: "conquista", body: "Hoje, [nome] conseguiu " },
    { userId: helena.id, name: "Intervenção", kind: "intervencao", body: "Objetivo: \nO que fizemos: \nComo respondeu: " },
  ]);

  /* ── Mídia ── */
  const putSvg = async (svg: string, ownerType: s.MediaOwnerValue, ownerId: string, caption: string, uploaderId = helena.id, schoolId = school.id) => {
    const key = await putObject(schoolId, Buffer.from(svg), "svg");
    await db.insert(s.media).values({ schoolId, uploaderId, ownerType, ownerId, storageKey: key, mime: "image/svg+xml", size: svg.length, caption });
  };

  /* ── Nossa semana ── */
  const posts = [
    {
      week: "2026-10-26", title: "Uma viagem pelo sistema solar", photos: [[art.solarSystem(), "Maquete dos planetas feita em grupo"]],
      sections: [
        { key: "trabalhamos", title: "O que trabalhamos", body: "Começamos a estudar o sistema solar: os nomes dos planetas, a ordem em relação ao Sol e por que temos dia e noite." },
        { key: "atividades", title: "Atividades e projetos", body: "Em grupos, a turma montou uma maquete com bolas de isopor. Cada grupo apresentou um planeta para os colegas." },
        { key: "conquistas", title: "Descobertas e conquistas", body: "As crianças descobriram que Júpiter é tão grande que caberiam mais de mil Terras dentro dele — e não pararam de falar disso!" },
        { key: "casa", title: "Para continuar em casa", body: "Se puderem, olhem o céu juntos à noite e procurem a Lua. Perguntem: em que formato ela está hoje?" },
      ],
    },
    {
      week: "2026-11-02", title: "Textos que servem para muitas coisas", photos: [[art.genreMural(), "Mural dos gêneros textuais"]],
      sections: [
        { key: "trabalhamos", title: "O que trabalhamos", body: "Conhecemos diferentes gêneros textuais — receita, bilhete, poema e notícia — e conversamos sobre para que serve cada um." },
        { key: "atividades", title: "Atividades e projetos", body: "Montamos um mural com exemplos trazidos de casa. Obrigada a todas as famílias que enviaram receitas e recortes de jornal!" },
        { key: "casa", title: "Para continuar em casa", body: "Que tal escrever juntos uma lista de compras ou um bilhete para alguém da família? Pequenos textos do dia a dia ajudam muito." },
        { key: "avisos", title: "Avisos", body: "Na segunda-feira (2) não haverá aula por causa do feriado de Finados." },
      ],
    },
    {
      week: "2026-11-09", title: "Agrupando, contando e lendo juntos", photos: [[art.readingCorner(), "Nosso novo cantinho da leitura"]],
      sections: [
        { key: "trabalhamos", title: "O que trabalhamos", body: "Começamos a multiplicação usando agrupamentos com tampinhas: 3 grupos de 4 tampinhas são 12 tampinhas." },
        { key: "atividades", title: "Atividades e projetos", body: "Inauguramos o cantinho da leitura com almofadas e livros doados pelas famílias. Cada criança escolheu um livro para levar para casa." },
        { key: "conquistas", title: "Descobertas e conquistas", body: "Muitas crianças perceberam sozinhas que 2 × 5 e 5 × 2 dão o mesmo resultado." },
        { key: "casa", title: "Para continuar em casa", body: "Leiam juntos alguns minutos do livro escolhido. Não precisa terminar: o importante é conversar sobre a história." },
        { key: "proximos", title: "Próximos passos", body: "Na próxima semana vamos plantar feijões e observar a germinação." },
      ],
    },
  ];
  for (const p of posts) {
    const [row] = await db
      .insert(s.weeklyPosts)
      .values({ schoolId: school.id, classId: c3a.id, authorId: helena.id, title: p.title, weekStart: p.week, sections: p.sections, status: "published", publishedAt: ts(addDaysISO(p.week, 4), "16:10") })
      .returning();
    for (const [svg, caption] of p.photos) await putSvg(svg, "weekly", row.id, caption);
  }
  const [rafaelPost] = await db
    .insert(s.weeklyPosts)
    .values({
      schoolId: school.id, classId: c6a.id, authorId: rafael.id, title: "Frações por todo lado", weekStart: "2026-11-09", status: "published", publishedAt: ts("2026-11-13", "17:00"),
      sections: [
        { key: "trabalhamos", title: "O que trabalhamos", body: "Frações equivalentes, usando tiras de papel e a reta numérica." },
        { key: "casa", title: "Para continuar em casa", body: "Ao cozinhar, peçam ajuda para medir ½ xícara ou ¼ de colher. Frações aparecem o tempo todo na cozinha!" },
      ],
    })
    .returning();
  void rafaelPost;
  await db.insert(s.weeklyPosts).values({
    schoolId: school2.id, classId: c3b.id, authorId: beatriz.id, title: "Semana das parlendas — Monte Azul", weekStart: "2026-11-09", status: "published", publishedAt: ts("2026-11-13"),
    sections: [{ key: "trabalhamos", title: "O que trabalhamos", body: "Parlendas e rimas." }],
  });

  /* ── Feedback individual ── */
  await db.insert(s.feedbacks).values([
    { schoolId: school.id, studentId: lucas.id, authorId: helena.id, tone: "conquista", title: "Lucas está lendo frases sozinho!", body: "Juliana, queria compartilhar uma alegria: nesta semana o Lucas leu sozinho as frases do cartaz da horta e explicou para a turma o que cada uma dizia. É um avanço muito importante na leitura. Continuem lendo juntos em casa — está fazendo diferença!", status: "published", publishedAt: ts("2026-06-17", "15:20"), readAt: ts("2026-06-17", "19:02") },
    { schoolId: school.id, studentId: lucas.id, authorId: helena.id, tone: "evolucao", title: "Compreensão de textos em evolução", body: "O Lucas tem entendido muito bem as histórias que lemos: reconta na ordem certa e percebe o que as personagens sentem. Agora vamos trabalhar a leitura com mais ritmo. Uma ideia simples: ler a mesma história curta duas ou três vezes durante a semana — a cada leitura ele vai ganhando confiança.", status: "published", publishedAt: ts("2026-11-12", "16:40") },
    { schoolId: school.id, studentId: anaClara.id, authorId: helena.id, tone: "conquista", title: "Leitora da semana", body: "A Ana Clara leu um trecho do livro escolhido para a turma com uma entonação linda. Os colegas ficaram encantados!", status: "published", publishedAt: ts("2026-03-20", "15:00"), readAt: ts("2026-03-20", "18:00") },
    { schoolId: school.id, studentId: miguel.id, authorId: helena.id, tone: "orientacao", title: "Sentimos falta do Miguel", body: "Olá! Percebemos que o Miguel faltou alguns dias nas últimas semanas. Está tudo bem? Ele tem avançado muito na escrita e queremos que continue assim. Se precisarem conversar, estou à disposição.", status: "draft" },
    { schoolId: school.id, studentId: sofia.id, authorId: rafael.id, tone: "conquista", title: "Explicou frações equivalentes para a turma", body: "A Sofia foi a primeira a explicar no quadro por que 2/4 e 1/2 representam a mesma quantidade. Excelente raciocínio!", status: "published", publishedAt: ts("2026-11-12", "18:00") },
  ]);

  /* ── Tarefas ── */
  const taskRows = await db
    .insert(s.tasks)
    .values([
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "casa", title: "Pesquisa: alimentos que vêm de sementes", instructions: "Com a família, faça uma lista de cinco alimentos que vêm de sementes. Pode desenhar ou recortar figuras.", dueOn: "2026-11-12", publishedAt: ts("2026-11-09", "12:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "casa", title: "Tabuada do 3 com desafios", instructions: "Complete a folha da tabuada do 3 e resolva os dois desafios do final.", dueOn: "2026-11-19", publishedAt: ts("2026-11-16", "12:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "leitura", title: "Leitura em família", instructions: "Leiam juntos o livro escolhido no cantinho da leitura. Depois, perguntem: qual foi a parte preferida?", dueOn: "2026-11-23", publishedAt: ts("2026-11-12", "12:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "casa", title: "Diário do feijão", instructions: "Observe o feijão plantado em casa e desenhe como ele está hoje. Se quiser, envie uma foto do desenho.", dueOn: "2026-11-24", acceptsSubmissions: true, publishedAt: ts("2026-11-17", "12:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "material", title: "Caixa de ovos vazia", instructions: "Para a aula de arte de quarta-feira.", dueOn: "2026-11-25", publishedAt: ts("2026-11-18", "12:00") },
      { schoolId: school.id, classId: c6a.id, subjectId: subj("Matemática").id, authorId: rafael.id, kind: "casa", title: "Lista 7 — frações equivalentes", instructions: "Resolva os exercícios 1 a 8. Mostre os cálculos.", dueOn: "2026-11-24", acceptsSubmissions: true, publishedAt: ts("2026-11-16", "17:00") },
      { schoolId: school.id, classId: c6a.id, subjectId: subj("Matemática").id, authorId: rafael.id, kind: "estudo", title: "Revisão para a prova bimestral", instructions: "Revise frações, decimais e porcentagem. O vídeo abaixo ajuda na parte de frações equivalentes.", dueOn: "2026-11-26", links: [{ url: "https://pt.khanacademy.org/math/arithmetic/fraction-arithmetic", title: "Frações — Khan Academy" }], publishedAt: ts("2026-11-18", "17:00") },
    ])
    .returning();
  await db.insert(s.taskCompletions).values([
    { taskId: taskRows[0].id, studentId: lucas.id, completedById: juliana.id, completedAt: ts("2026-11-11", "20:00") },
    { taskId: taskRows[0].id, studentId: anaClara.id, completedById: carlos.id, completedAt: ts("2026-11-11", "19:00") },
  ]);
  await putSvg(art.mathSheet(), "task", taskRows[1].id, "Folha da tabuada do 3");

  /* ── Agenda ── */
  const anns = await db
    .insert(s.announcements)
    .values([
      { schoolId: school.id, authorId: paulo.id, kind: "reuniao", title: "Reunião de pais e responsáveis — 4º bimestre", body: "Vamos conversar sobre o fechamento do ano e o percurso de cada criança. A reunião acontece em cada sala, com a professora ou professor da turma.", important: true, startsAt: ts("2026-12-03", "18:30"), location: "Salas de aula", requiresConfirmation: true, publishedAt: ts("2026-11-16", "09:00") },
      { schoolId: school.id, authorId: paulo.id, kind: "evento", title: "Feira de Ciências 2026", body: "As turmas apresentam os projetos do ano. Famílias são muito bem-vindas!", startsAt: ts("2026-11-28", "09:00"), location: "Quadra coberta", publishedAt: ts("2026-11-04", "09:00") },
      { schoolId: school.id, authorId: paulo.id, kind: "comunicado", title: "Feriado — Dia da Consciência Negra", body: "Não haverá aula na sexta-feira, 20 de novembro.", startsAt: ts("2026-11-20", "07:00"), publishedAt: ts("2026-11-13", "09:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "autorizacao", title: "Passeio ao Jardim Botânico", body: "No dia 26, o 3º ano A fará uma visita ao Jardim Botânico de Vale Serena, como parte do projeto das sementes. Saída às 8h e retorno às 11h30, em ônibus da prefeitura. Não é necessário levar dinheiro.", important: true, startsAt: ts("2026-11-26", "08:00"), location: "Jardim Botânico de Vale Serena", isAuthorization: true, publishedAt: ts("2026-11-17", "13:00") },
      { schoolId: school.id, classId: c3a.id, authorId: helena.id, kind: "recado", title: "Garrafinha de água", body: "Com o calor, peço que as crianças tragam garrafinha de água todos os dias.", publishedAt: ts("2026-11-16", "07:30") },
      { schoolId: school.id, classId: c6a.id, authorId: rafael.id, kind: "comunicado", title: "Olimpíada de Matemática — inscrições abertas", body: "Interessados devem avisar o professor até o dia 27.", publishedAt: ts("2026-11-10", "07:30") },
      { schoolId: school2.id, authorId: beatriz.id, kind: "evento", title: "Festa da primavera — Monte Azul", startsAt: ts("2026-11-27", "10:00"), publishedAt: ts("2026-11-10") },
    ])
    .returning();
  await db.insert(s.announcementResponses).values([
    { announcementId: anns[1].id, studentId: lucas.id, userId: juliana.id, readAt: ts("2026-11-04", "20:00") },
    { announcementId: anns[4].id, studentId: lucas.id, userId: juliana.id, readAt: ts("2026-11-16", "19:00") },
    { announcementId: anns[3].id, studentId: anaClara.id, userId: carlos.id, readAt: ts("2026-11-17", "18:00"), confirmedAt: ts("2026-11-17", "18:00"), authorization: "granted" },
  ]);

  /* ── Mensagens ── */
  const convs = await db
    .insert(s.conversations)
    .values([
      { schoolId: school.id, studentId: lucas.id, teacherId: helena.id, guardianId: juliana.id, category: "pergunta", subject: "Sugestões de leitura para casa", lastMessageAt: ts("2026-11-18", "20:40") },
      { schoolId: school.id, studentId: anaClara.id, teacherId: helena.id, guardianId: carlos.id, category: "ausencia", subject: "Falta na sexta-feira (13)", lastMessageAt: ts("2026-11-13", "14:05") },
      { schoolId: school.id, studentId: sofia.id, teacherId: rafael.id, guardianId: juliana.id, category: "pergunta", subject: "Dúvida na lista de frações", lastMessageAt: ts("2026-11-17", "21:10") },
      { schoolId: school.id, studentId: lucas.id, teacherId: helena.id, guardianId: juliana.id, category: "agradecimento", subject: "Obrigada pelo projeto das sementes", lastMessageAt: ts("2026-10-23", "08:15"), archivedByTeacherAt: ts("2026-10-24") },
      { schoolId: school2.id, studentId: pedro.id, teacherId: beatriz.id, guardianId: fernanda.id, category: "recado", subject: "Atraso na entrada", lastMessageAt: ts("2026-11-12", "07:10") },
    ])
    .returning();
  await db.insert(s.messages).values([
    { conversationId: convs[0].id, senderId: juliana.id, body: "Boa tarde, professora! O Lucas tem pedido para ler antes de dormir. Vocês têm sugestões de livros para a idade dele?", createdAt: ts("2026-11-10", "18:20"), readAt: ts("2026-11-11", "13:05") },
    { conversationId: convs[0].id, senderId: helena.id, body: "Que notícia boa, Juliana! Livros com frases curtas e muitas ilustrações são ótimos agora. No cantinho da leitura ele pode escolher um por semana para levar para casa. Ler a mesma história mais de uma vez também ajuda bastante.", createdAt: ts("2026-11-11", "13:20"), readAt: ts("2026-11-11", "19:00") },
    { conversationId: convs[0].id, senderId: juliana.id, body: "Obrigada! Ele escolheu o livro dos dinossauros. Lemos juntos três páginas ontem e ele leu as legendas sozinho 😊", createdAt: ts("2026-11-18", "20:40") },
    { conversationId: convs[1].id, senderId: carlos.id, body: "Bom dia, professora. A Ana Clara não irá à aula hoje porque tem consulta médica. Enviarei o atestado na segunda.", createdAt: ts("2026-11-13", "07:02"), readAt: ts("2026-11-13", "13:30") },
    { conversationId: convs[1].id, senderId: helena.id, body: "Obrigada por avisar, Carlos. Melhoras para ela! Vou separar as atividades de hoje.", createdAt: ts("2026-11-13", "14:05"), readAt: ts("2026-11-13", "18:00") },
    { conversationId: convs[2].id, senderId: juliana.id, body: "Professor, a Sofia ficou com dúvida no exercício 5 da lista. Ela pode tirar a dúvida na aula antes de entregar?", createdAt: ts("2026-11-17", "21:10") },
    { conversationId: convs[3].id, senderId: juliana.id, body: "Professora, o Lucas chegou em casa contando tudo sobre as sementes. Obrigada pelo cuidado com o projeto!", createdAt: ts("2026-10-23", "08:15"), readAt: ts("2026-10-23", "13:00") },
    { conversationId: convs[4].id, senderId: fernanda.id, body: "Bom dia! O Pedro vai chegar um pouco atrasado hoje.", createdAt: ts("2026-11-12", "07:10") },
  ]);

  /* ── Portfólio ── */
  const portfolio: [string, s.PortfolioKindValue, string, string, string, string, "private" | "family"][] = [
    [lucas.id, "desenho", "Minha família e minha casa", "Desenho feito na primeira semana de aula.", "2026-02-10", art.houseDrawing(), "family"],
    [lucas.id, "texto", "Meu cachorro Bolinha", "Primeira produção textual do ano, escrita com apoio de fichas.", "2026-04-24", art.textProduction("Meu cachorro Bolinha", ["O BOLINHA E MEU CACHORO", "ELE E PRETO E BRAMCO", "ELE GOSTA DE BRICA", "DE BOLA E DE COMER", "EU AMO O BOLINHA"]), "family"],
    [lucas.id, "desenho", "Girassol", "Observação de um girassol do jardim da escola.", "2026-05-15", art.sunflower(), "family"],
    [lucas.id, "projeto", "O Sistema Solar", "Cartaz do grupo para o projeto do espaço.", "2026-10-28", art.solarSystem(), "family"],
    [lucas.id, "atividade", "Problemas de adição e subtração", "Resolveu os quatro problemas e mostrou as estratégias.", "2026-09-12", art.mathSheet(), "family"],
    [lucas.id, "foto", "Germinação do feijão", "Registro do experimento em quatro etapas.", "2026-10-20", art.germination(), "family"],
    [lucas.id, "texto", "Bilhete para a merendeira", "Bilhete escrito sozinho, com destinatário, mensagem e assinatura.", "2026-11-18", art.textProduction("Bilhete", ["Querida tia Rosa,", "obrigado pela comida", "gostosa todo dia.", "O arroz e o melhor!", "Um abraço, Lucas"]), "family"],
    [lucas.id, "desenho", "Colagem de folhas", "Arte com folhas secas coletadas no pátio.", "2026-08-14", art.leafCollage(), "private"],
    [anaClara.id, "texto", "Uma história com final diferente", "Reescrita do conto com um novo final.", "2026-09-18", art.textProduction("Um novo final", ["E então a semente", "descobriu que não precisava", "voar para ir longe:", "o vento levou suas", "sementes pelo mundo todo."]), "family"],
    [anaClara.id, "desenho", "Girassol", "Observação do jardim.", "2026-05-15", art.sunflower(), "family"],
    [sofia.id, "atividade", "Frações na reta numérica", "Atividade de frações equivalentes.", "2026-11-10", art.mathSheet(), "family"],
  ];
  for (const [studentId, kind, title, description, date, svg, visibility] of portfolio) {
    const author = studentId === sofia.id ? rafael.id : helena.id;
    const [row] = await db.insert(s.portfolioItems).values({ schoolId: school.id, studentId, createdById: author, kind, title, description, date, visibility }).returning();
    await putSvg(svg, "portfolio", row.id, title, author);
  }
  const [pedroItem] = await db.insert(s.portfolioItems).values({ schoolId: school2.id, studentId: pedro.id, createdById: beatriz.id, kind: "desenho", title: "Desenho do Pedro", date: "2026-05-02", visibility: "family" }).returning();
  await putSvg(art.houseDrawing(), "portfolio", pedroItem.id, "Desenho do Pedro", beatriz.id, school2.id);

  /* ── Relatórios ── */
  const lucasEntries = await db.query.journalEntries.findMany({ where: (j, { and, eq, gte, lte }) => and(eq(j.authorId, helena.id), gte(j.occurredOn, "2026-07-27"), lte(j.occurredOn, "2026-09-30")) });
  await db.insert(s.reports).values({
    schoolId: school.id, studentId: lucas.id, classId: c3a.id, termId: t3.id, authorId: helena.id, kind: "parecer", status: "approved", visibility: "family",
    approvedAt: ts("2026-10-05", "17:00"), aiAssisted: true,
    title: "Parecer descritivo — 3º bimestre",
    content:
      "Lucas chegou ao 3º bimestre com avanços importantes na leitura e na escrita. Na sondagem de escrita de agosto, passou a escrever de forma alfabética, representando todos os sons das palavras. Na leitura, já lê frases curtas com compreensão.\n\nNa leitura compartilhada, respondeu às perguntas sobre o texto e fez inferências sobre os sentimentos das personagens, o que mostra uma compreensão que está à frente da fluência.\n\nPara o próximo bimestre, seguiremos com a leitura diária de pequenos textos, buscando mais ritmo e segurança. Em casa, ler a mesma história algumas vezes durante a semana pode ajudar muito.",
    sources: lucasEntries.filter((e) => e.title?.includes("interpretação")).map((e) => ({ type: "journal", id: e.id, label: e.title ?? "Registro", date: e.occurredOn })),
  });
  await db.insert(s.reports).values({
    schoolId: school.id, studentId: miguel.id, classId: c3a.id, termId: t4.id, authorId: helena.id, kind: "intervencoes", status: "draft",
    title: "Intervenções pedagógicas — Miguel", content: "Rascunho em elaboração.",
  });

  /* ── Coordenação ── */
  await db.insert(s.coordinationNotes).values([
    { schoolId: school.id, classId: c3a.id, teacherId: helena.id, authorId: marta.id, kind: "orientacao", title: "Leitura diária em pequenos grupos", body: "Sugestão combinada com a Helena: manter a leitura diária de cinco minutos com o grupo de apoio até o fim do ano e registrar a evolução quinzenalmente.", date: "2026-10-07" },
    { schoolId: school.id, authorId: marta.id, kind: "pauta", title: "Conselho de classe do 4º bimestre", body: "1. Leitura e escrita no Fundamental I\n2. Diagnóstica de Matemática no Fundamental II\n3. Alunos com faltas recorrentes: acolhimento e contato com as famílias", date: "2026-12-10" },
    { schoolId: school.id, classId: c6a.id, teacherId: rafael.id, authorId: marta.id, kind: "acompanhamento", title: "Diagnóstica de acompanhamento", body: "A diagnóstica de agosto mostrou avanço em operações. Frações seguem como foco para o 4º bimestre.", date: "2026-09-02" },
  ]);

  await db.insert(s.familyContributions).values([
    { schoolId: school.id, studentId: lucas.id, authorId: juliana.id, kind: "leitura", body: "Lemos juntos o livro dos dinossauros. Ele leu as legendas sozinho e quis contar para o pai depois.", createdAt: ts("2026-11-17", "21:00") },
    { schoolId: school.id, studentId: lucas.id, authorId: juliana.id, kind: "observacao", body: "Ele tem contado os feijões do pacote de 2 em 2 e de 5 em 5. Acho que a multiplicação chegou em casa!", createdAt: ts("2026-11-14", "20:00"), seenAt: ts("2026-11-15") },
  ]);

  /* ── BNCC (descrições resumidas) ── */
  await db.insert(s.bnccSkills).values([
    { code: "EF35LP01", component: "Língua Portuguesa", grade: "3º ao 5º ano", description: "Ler e compreender textos curtos com autonomia e fluência." },
    { code: "EF35LP03", component: "Língua Portuguesa", grade: "3º ao 5º ano", description: "Identificar a ideia central do texto." },
    { code: "EF03LP01", component: "Língua Portuguesa", grade: "3º ano", description: "Ler e escrever palavras com correspondências regulares contextuais entre grafemas e fonemas." },
    { code: "EF03LP14", component: "Língua Portuguesa", grade: "3º ano", description: "Planejar e produzir textos injuntivos, como receitas e instruções." },
    { code: "EF03MA01", component: "Matemática", grade: "3º ano", description: "Ler, escrever e comparar números naturais até a ordem de unidade de milhar." },
    { code: "EF03MA03", component: "Matemática", grade: "3º ano", description: "Construir e utilizar fatos básicos da adição e da multiplicação." },
    { code: "EF03MA07", component: "Matemática", grade: "3º ano", description: "Resolver problemas de multiplicação com diferentes significados." },
    { code: "EF03CI09", component: "Ciências", grade: "3º ano", description: "Comparar diferentes amostras de solo e reconhecer sua importância para a agricultura e a vida." },
    { code: "EF06MA01", component: "Matemática", grade: "6º ano", description: "Comparar, ordenar, ler e escrever números naturais e racionais." },
    { code: "EF06MA03", component: "Matemática", grade: "6º ano", description: "Resolver e elaborar problemas com números naturais." },
    { code: "EF06MA07", component: "Matemática", grade: "6º ano", description: "Compreender, comparar e ordenar frações, incluindo frações equivalentes." },
  ]);

  return { school, school2 };
}

function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
