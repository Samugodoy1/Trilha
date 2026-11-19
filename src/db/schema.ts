import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* ───────────────────────── Enums ───────────────────────── */

export const roleEnum = pgEnum("role", ["teacher", "coordinator", "admin", "guardian", "student"]);
export const stageEnum = pgEnum("stage", ["infantil", "fundamental_1", "fundamental_2", "medio"]);
export const shiftEnum = pgEnum("shift", ["manha", "tarde", "integral", "noite"]);
export const evaluationModelEnum = pgEnum("evaluation_model", ["numeric", "concept", "descriptive"]);
export const visibilityEnum = pgEnum("visibility", ["private", "coordination", "family"]);
export const entryKindEnum = pgEnum("entry_kind", [
  "observacao",
  "conteudo",
  "atividade",
  "participacao",
  "dificuldade",
  "estrategia",
  "intervencao",
  "conquista",
  "acontecimento",
]);
export const entryScopeEnum = pgEnum("entry_scope", ["student", "students", "class"]);
export const templateKindEnum = pgEnum("template_kind", [
  "leitura",
  "escrita",
  "matematica",
  "diagnostica",
  "habilidades",
  "personalizada",
]);
export const gradeKindEnum = pgEnum("grade_kind", ["numeric", "concept", "descriptive"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["presente", "falta", "atraso", "justificada"]);
export const publishStatusEnum = pgEnum("publish_status", ["draft", "published"]);
export const feedbackToneEnum = pgEnum("feedback_tone", [
  "conquista",
  "evolucao",
  "autonomia",
  "participacao",
  "a_desenvolver",
  "orientacao",
  "em_casa",
]);
export const taskKindEnum = pgEnum("task_kind", ["casa", "complementar", "estudo", "leitura", "material"]);
export const announcementKindEnum = pgEnum("announcement_kind", [
  "recado",
  "comunicado",
  "evento",
  "reuniao",
  "material",
  "lembrete",
  "autorizacao",
]);
export const authorizationEnum = pgEnum("authorization_answer", ["granted", "denied"]);
export const conversationCategoryEnum = pgEnum("conversation_category", [
  "recado",
  "pergunta",
  "observacao",
  "agradecimento",
  "elogio",
  "ausencia",
  "conversa",
]);
export const reportKindEnum = pgEnum("report_kind", [
  "parecer",
  "bimestral",
  "evolucao",
  "reuniao_pais",
  "conselho",
  "intervencoes",
]);
export const reportStatusEnum = pgEnum("report_status", ["draft", "approved"]);
export const portfolioKindEnum = pgEnum("portfolio_kind", ["desenho", "texto", "atividade", "projeto", "foto", "conquista"]);
export const contributionKindEnum = pgEnum("contribution_kind", ["leitura", "atividade", "observacao", "conquista"]);
export const coordinationNoteKindEnum = pgEnum("coordination_note_kind", ["orientacao", "pauta", "conselho", "acompanhamento"]);
export const mediaOwnerEnum = pgEnum("media_owner", [
  "weekly",
  "task",
  "submission",
  "portfolio",
  "assessment",
  "contribution",
  "journal",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

/* ───────────────────────── Instituições ───────────────────────── */

export const networks = pgTable("networks", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export type ConceptLevel = { key: string; label: string; description: string };

export const schools = pgTable("schools", {
  id: id(),
  networkId: uuid("network_id").references(() => networks.id),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  evaluationModel: evaluationModelEnum("evaluation_model").notNull().default("numeric"),
  conceptScale: jsonb("concept_scale").$type<ConceptLevel[]>().notNull().default(sql`'[]'::jsonb`),
  passingScore: numeric("passing_score", { precision: 5, scale: 2 }),
  retentionYears: integer("retention_years").notNull().default(5),
  aiEnabled: boolean("ai_enabled").notNull().default(false),
  imagePolicy: text("image_policy"),
  createdAt: createdAt(),
});

/* ───────────────────────── Pessoas e acesso ───────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    hue: integer("hue").notNull().default(160),
    createdAt: createdAt(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export type OfficeHours = { days: number[]; start: string; end: string; note?: string };

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    title: text("title"),
    officeHours: jsonb("office_hours").$type<OfficeHours>(),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("memberships_unique").on(t.userId, t.schoolId, t.role), index("memberships_school_idx").on(t.schoolId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 do token; o token em si nunca é armazenado
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => memberships.id, { onDelete: "set null" }),
    activeStudentId: uuid("active_student_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/* ───────────────────────── Calendário letivo ───────────────────────── */

export const academicYears = pgTable("academic_years", {
  id: id(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  startsOn: date("starts_on").notNull(),
  endsOn: date("ends_on").notNull(),
  createdAt: createdAt(),
});

export const terms = pgTable(
  "terms",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id, { onDelete: "cascade" }),
    ordinal: integer("ordinal").notNull(),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
  },
  (t) => [index("terms_year_idx").on(t.academicYearId)],
);

/* ───────────────────────── Turmas e alunos ───────────────────────── */

export const classes = pgTable(
  "classes",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    academicYearId: uuid("academic_year_id").notNull().references(() => academicYears.id),
    name: text("name").notNull(),
    stage: stageEnum("stage").notNull(),
    grade: integer("grade").notNull(),
    shift: shiftEnum("shift").notNull().default("manha"),
    room: text("room"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("classes_school_idx").on(t.schoolId)],
);

export const subjects = pgTable(
  "subjects",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    area: text("area").notNull(),
  },
  (t) => [uniqueIndex("subjects_unique").on(t.schoolId, t.name)],
);

export const teachingAssignments = pgTable(
  "teaching_assignments",
  {
    id: id(),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id),
    isHomeroom: boolean("is_homeroom").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("assign_class_idx").on(t.classId), index("assign_user_idx").on(t.userId)],
);

export const students = pgTable(
  "students",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    preferredName: text("preferred_name"),
    birthDate: date("birth_date"),
    enrollmentCode: text("enrollment_code"),
    imageConsent: boolean("image_consent").notNull().default(false),
    hue: integer("hue").notNull().default(200),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("students_school_idx").on(t.schoolId)],
);

export const enrollments = pgTable(
  "enrollments",
  {
    id: id(),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    number: integer("number"),
    startedOn: date("started_on").notNull(),
    endedOn: date("ended_on"),
  },
  (t) => [index("enroll_student_idx").on(t.studentId), index("enroll_class_idx").on(t.classId)],
);

export const guardianLinks = pgTable(
  "guardian_links",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    verifiedById: uuid("verified_by_id").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("guardian_user_idx").on(t.userId), index("guardian_student_idx").on(t.studentId)],
);

export const invitations = pgTable("invitations", {
  id: id(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  role: roleEnum("role").notNull(),
  studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name"),
  relationship: text("relationship"),
  tokenHash: text("token_hash").notNull().unique(),
  codeHint: text("code_hint").notNull(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  acceptedById: uuid("accepted_by_id").references(() => users.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdById: uuid("created_by_id").notNull().references(() => users.id),
  createdAt: createdAt(),
});

/* ───────────────────────── Sondagens ───────────────────────── */

export type ScaleLevel = {
  key: string;
  label: string;
  short: string;
  description: string;
  familyDescription: string;
};
export type Criterion = { key: string; label: string };

export const assessmentTemplates = pgTable("assessment_templates", {
  id: id(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  kind: templateKindEnum("kind").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  scale: jsonb("scale").$type<ScaleLevel[]>().notNull(),
  criteria: jsonb("criteria").$type<Criterion[]>().notNull().default(sql`'[]'::jsonb`),
  createdById: uuid("created_by_id").references(() => users.id),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const assessmentRounds = pgTable(
  "assessment_rounds",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    templateId: uuid("template_id").notNull().references(() => assessmentTemplates.id),
    termId: uuid("term_id").notNull().references(() => terms.id),
    title: text("title").notNull(),
    appliedOn: date("applied_on").notNull(),
    sharedWithFamily: boolean("shared_with_family").notNull().default(false),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("rounds_class_idx").on(t.classId)],
);

export type CriteriaAnswers = Record<string, "sim" | "parcial" | "nao">;

export const assessmentResults = pgTable(
  "assessment_results",
  {
    id: id(),
    roundId: uuid("round_id").notNull().references(() => assessmentRounds.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    levelKey: text("level_key"),
    criteria: jsonb("criteria").$type<CriteriaAnswers>().notNull().default(sql`'{}'::jsonb`),
    note: text("note"),
    absent: boolean("absent").notNull().default(false),
    updatedById: uuid("updated_by_id").references(() => users.id),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("results_unique").on(t.roundId, t.studentId), index("results_student_idx").on(t.studentId)],
);

/* ───────────────────────── Avaliações e notas ───────────────────────── */

export const gradeItems = pgTable(
  "grade_items",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id),
    termId: uuid("term_id").notNull().references(() => terms.id),
    title: text("title").notNull(),
    kind: gradeKindEnum("kind").notNull(),
    maxScore: numeric("max_score", { precision: 5, scale: 2 }),
    weight: numeric("weight", { precision: 5, scale: 2 }).notNull().default("1"),
    isRecovery: boolean("is_recovery").notNull().default(false),
    date: date("date").notNull(),
    bnccCodes: jsonb("bncc_codes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sharedWithFamily: boolean("shared_with_family").notNull().default(false),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("grade_items_class_idx").on(t.classId)],
);

export const grades = pgTable(
  "grades",
  {
    id: id(),
    gradeItemId: uuid("grade_item_id").notNull().references(() => gradeItems.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 5, scale: 2 }),
    concept: text("concept"),
    comment: text("comment"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("grades_unique").on(t.gradeItemId, t.studentId), index("grades_student_idx").on(t.studentId)],
);

export const attendance = pgTable(
  "attendance",
  {
    id: id(),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    status: attendanceStatusEnum("status").notNull(),
    note: text("note"),
    recordedById: uuid("recorded_by_id").references(() => users.id),
  },
  (t) => [uniqueIndex("attendance_unique").on(t.classId, t.studentId, t.date), index("attendance_student_idx").on(t.studentId)],
);

export const bnccSkills = pgTable("bncc_skills", {
  code: text("code").primaryKey(),
  component: text("component").notNull(),
  grade: text("grade").notNull(),
  description: text("description").notNull(),
});

/* ───────────────────────── Diário pedagógico ───────────────────────── */

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: entryKindEnum("kind").notNull().default("observacao"),
    scope: entryScopeEnum("scope").notNull().default("student"),
    title: text("title"),
    body: text("body").notNull().default(""),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    occurredOn: date("occurred_on").notNull(),
    isDraft: boolean("is_draft").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("journal_class_idx").on(t.classId), index("journal_author_idx").on(t.authorId)],
);

export const journalEntryStudents = pgTable(
  "journal_entry_students",
  {
    entryId: uuid("entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.entryId, t.studentId] }), index("jes_student_idx").on(t.studentId)],
);

export const entryTemplates = pgTable("entry_templates", {
  id: id(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  kind: entryKindEnum("kind").notNull(),
  body: text("body").notNull(),
  createdAt: createdAt(),
});

/* ───────────────────────── Família ───────────────────────── */

export type PostSection = { key: string; title: string; body: string };

export const weeklyPosts = pgTable(
  "weekly_posts",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    weekStart: date("week_start").notNull(),
    sections: jsonb("sections").$type<PostSection[]>().notNull().default(sql`'[]'::jsonb`),
    status: publishStatusEnum("status").notNull().default("draft"),
    aiAssisted: boolean("ai_assisted").notNull().default(false),
    sourceEntryIds: jsonb("source_entry_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("weekly_class_idx").on(t.classId)],
);

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    tone: feedbackToneEnum("tone").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    status: publishStatusEnum("status").notNull().default("draft"),
    aiAssisted: boolean("ai_assisted").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("feedback_student_idx").on(t.studentId)],
);

export type TaskLink = { url: string; title: string };

export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => subjects.id),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: taskKindEnum("kind").notNull().default("casa"),
    title: text("title").notNull(),
    instructions: text("instructions"),
    dueOn: date("due_on"),
    links: jsonb("links").$type<TaskLink[]>().notNull().default(sql`'[]'::jsonb`),
    acceptsSubmissions: boolean("accepts_submissions").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_class_idx").on(t.classId)],
);

export const taskCompletions = pgTable(
  "task_completions",
  {
    id: id(),
    taskId: uuid("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    completedById: uuid("completed_by_id").notNull().references(() => users.id),
    note: text("note"),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("task_completion_unique").on(t.taskId, t.studentId)],
);

export const announcements = pgTable(
  "announcements",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: announcementKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    important: boolean("important").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    location: text("location"),
    requiresConfirmation: boolean("requires_confirmation").notNull().default(false),
    isAuthorization: boolean("is_authorization").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("ann_class_idx").on(t.classId), index("ann_school_idx").on(t.schoolId)],
);

export const announcementResponses = pgTable(
  "announcement_responses",
  {
    id: id(),
    announcementId: uuid("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    authorization: authorizationEnum("authorization"),
  },
  (t) => [uniqueIndex("ann_resp_unique").on(t.announcementId, t.studentId, t.userId)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").notNull().references(() => users.id),
    guardianId: uuid("guardian_id").notNull().references(() => users.id),
    category: conversationCategoryEnum("category").notNull().default("recado"),
    subject: text("subject").notNull(),
    archivedByTeacherAt: timestamp("archived_by_teacher_at", { withTimezone: true }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [index("conv_teacher_idx").on(t.teacherId), index("conv_guardian_idx").on(t.guardianId)],
);

export const messages = pgTable(
  "messages",
  {
    id: id(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId)],
);

export const portfolioItems = pgTable(
  "portfolio_items",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    createdById: uuid("created_by_id").notNull().references(() => users.id),
    kind: portfolioKindEnum("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    date: date("date").notNull(),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    createdAt: createdAt(),
  },
  (t) => [index("portfolio_student_idx").on(t.studentId)],
);

export const familyContributions = pgTable(
  "family_contributions",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: contributionKindEnum("kind").notNull(),
    body: text("body").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("contrib_student_idx").on(t.studentId)],
);

/* ───────────────────────── Arquivos (privados) ───────────────────────── */

export const media = pgTable(
  "media",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    uploaderId: uuid("uploader_id").notNull().references(() => users.id),
    ownerType: mediaOwnerEnum("owner_type"),
    ownerId: uuid("owner_id"),
    storageKey: text("storage_key").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    originalName: text("original_name"),
    caption: text("caption"),
    createdAt: createdAt(),
  },
  (t) => [index("media_owner_idx").on(t.ownerType, t.ownerId)],
);

/* ───────────────────────── Relatórios e coordenação ───────────────────────── */

export type ReportSource = { type: string; id: string; label: string; date: string };

export const reports = pgTable(
  "reports",
  {
    id: id(),
    schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").references(() => students.id, { onDelete: "cascade" }),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    termId: uuid("term_id").references(() => terms.id),
    authorId: uuid("author_id").notNull().references(() => users.id),
    kind: reportKindEnum("kind").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    sources: jsonb("sources").$type<ReportSource[]>().notNull().default(sql`'[]'::jsonb`),
    status: reportStatusEnum("status").notNull().default("draft"),
    aiAssisted: boolean("ai_assisted").notNull().default(false),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("reports_student_idx").on(t.studentId)],
);

export const coordinationNotes = pgTable("coordination_notes", {
  id: id(),
  schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
  classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
  teacherId: uuid("teacher_id").references(() => users.id),
  authorId: uuid("author_id").notNull().references(() => users.id),
  kind: coordinationNoteKindEnum("kind").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  date: date("date").notNull(),
  createdAt: createdAt(),
});

/* ───────────────────────── Auditoria ───────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    schoolId: uuid("school_id").references(() => schools.id, { onDelete: "set null" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ip: text("ip"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_school_idx").on(t.schoolId, t.createdAt)],
);

/* ───────────────────────── Relações ───────────────────────── */

export const studentsRelations = relations(students, ({ many }) => ({
  enrollments: many(enrollments),
}));
export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, { fields: [enrollments.studentId], references: [students.id] }),
  class: one(classes, { fields: [enrollments.classId], references: [classes.id] }),
}));

export type EntryKindValue = (typeof entryKindEnum.enumValues)[number];
export type MediaOwnerValue = (typeof mediaOwnerEnum.enumValues)[number];
export type PortfolioKindValue = (typeof portfolioKindEnum.enumValues)[number];
