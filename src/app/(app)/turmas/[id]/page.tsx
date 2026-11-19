import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClipboardList, Lock, Plus, Archive } from "lucide-react";
import { requireRole } from "@/server/session";
import { isTeacher, isUuid, pageGuard } from "@/server/access";
import { getClassDetail } from "@/server/queries/classes";
import { getCurrentTerm } from "@/server/queries/common";
import { Page } from "@/components/ui/page";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list";
import { EmptyState, SectionTitle, Tag } from "@/components/ui/misc";
import { StudentTabs } from "@/components/student/student-actions";
import { AddStudentsButton, AttendanceButton, NewGradeItemButton, StudentList } from "@/components/classes/class-tools";
import { seriesMeta } from "@/components/student/highlights";
import { formatDay } from "@/lib/format";
import { shiftLabels, stageLabels } from "@/lib/vocabulary";
import { categoryColor } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Turma" };

export default async function ClassPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string; filtro?: string }> }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!isUuid(id)) notFound();
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const d = await pageGuard(() => getClassDetail(ctx, id));
  const term = await getCurrentTerm(ctx.school.id);
  const tab = ["alunos", "sondagens", "avaliacoes"].includes(sp.aba ?? "") ? sp.aba! : "alunos";
  const archived = Boolean(d.cls.archivedAt);
  const teacherCanEdit = isTeacher(ctx) && !archived;
  const homeroom = d.teachers.find((t) => t.isHomeroom);

  // Agrupamentos por bimestre
  const roundsByTerm = new Map<string, typeof d.rounds>();
  for (const r of d.rounds) roundsByTerm.set(r.termName, [...(roundsByTerm.get(r.termName) ?? []), r]);
  const itemsByTerm = new Map<string, typeof d.gradeItems>();
  for (const g of d.gradeItems) itemsByTerm.set(g.termName, [...(itemsByTerm.get(g.termName) ?? []), g]);

  return (
    <Page
      title={d.cls.name}
      back={{ href: "/turmas", label: "Turmas" }}
      subtitle={
        <span>
          {stageLabels[d.cls.stage]} · {shiftLabels[d.cls.shift]}
          {d.cls.room ? ` · ${d.cls.room}` : ""} · {d.year}
          {homeroom && !isTeacher(ctx) ? ` · ${homeroom.name}` : ""}
        </span>
      }
      actions={
        teacherCanEdit ? (
          <div className="hidden items-center gap-2 sm:flex">
            <AttendanceButton classId={d.cls.id} students={d.students} today={d.todayAttendance} />
            <AddStudentsButton classId={d.cls.id} />
          </div>
        ) : undefined
      }
      width="wide"
    >
      {archived && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-surface p-4 text-subhead text-label-2 shadow-e1">
          <Archive aria-hidden className="size-5" />
          Turma de um ano letivo encerrado. Os registros ficam disponíveis para consulta.
        </div>
      )}
      {teacherCanEdit && (
        <div className="mb-5 flex gap-2 sm:hidden">
          <AttendanceButton classId={d.cls.id} students={d.students} today={d.todayAttendance} />
          <AddStudentsButton classId={d.cls.id} />
        </div>
      )}

      <div className="mb-6 scrollbar-none overflow-x-auto">
        <StudentTabs
          value={tab}
          options={[
            { value: "alunos", label: `Alunos · ${d.students.length}` },
            { value: "sondagens", label: "Sondagens" },
            { value: "avaliacoes", label: "Avaliações" },
          ]}
        />
      </div>

      {tab === "alunos" &&
        (d.students.length ? (
          <StudentList students={d.students} classId={d.cls.id} termStart={term?.startsOn} initialFilter={sp.filtro} canRecord={teacherCanEdit} />
        ) : (
          <EmptyState icon={Plus} title="Turma sem alunos" message="Adicione os alunos um a um ou cole a lista diretamente da planilha da secretaria." action={teacherCanEdit ? <AddStudentsButton classId={d.cls.id} /> : undefined} />
        ))}

      {tab === "sondagens" && (
        <div className="space-y-8">
          {teacherCanEdit && (
            <div className="flex justify-end">
              <Button size="sm" variant="tinted" icon={Plus} href={`/sondagens/nova?turma=${d.cls.id}`}>
                Nova sondagem
              </Button>
            </div>
          )}
          {d.rounds.length === 0 && <EmptyState icon={ClipboardList} title="Nenhuma sondagem" message="Registre a primeira sondagem para acompanhar a evolução da turma ao longo do ano." />}
          {[...roundsByTerm.entries()].map(([termName, list]) => (
            <section key={termName}>
              <SectionTitle>{termName}</SectionTitle>
              <div className="-mx-5 md:mx-0" role="list">
                {list.map((r) => {
                  const meta = seriesMeta[r.kind];
                  const complete = r.done >= d.students.length;
                  return (
                    <ListRow
                      key={r.id}
                      href={`/sondagens/${r.id}`}
                      icon={meta.icon}
                      iconTint={categoryColor[meta.category]}
                      title={r.title}
                      subtitle={`${r.templateName} · ${formatDay(r.appliedOn)}`}
                      trailing={
                        <span className="flex items-center gap-2">
                          {!r.sharedWithFamily && <Lock aria-label="Não compartilhada com a família" className="size-3.5 text-label-3" />}
                          <Tag tone={complete ? "positive" : "warning"}>
                            {r.done}/{d.students.length}
                          </Tag>
                        </span>
                      }
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "avaliacoes" && (
        <div className="space-y-8">
          {teacherCanEdit && (
            <div className="flex justify-end">
              <NewGradeItemButton
                classId={d.cls.id}
                terms={d.terms}
                subjects={d.subjects}
                defaultSubjectId={d.myAssignment?.subjectId}
                defaultKind={ctx.school.evaluationModel === "concept" && d.cls.stage === "fundamental_1" ? "concept" : "numeric"}
                currentTermId={term?.id}
              />
            </div>
          )}
          {d.gradeItems.length === 0 && <EmptyState icon={ClipboardList} title="Nenhuma avaliação" message="Crie avaliações com nota, conceito ou parecer descritivo, como a escola preferir." />}
          {[...itemsByTerm.entries()].map(([termName, list]) => (
            <section key={termName}>
              <SectionTitle>{termName}</SectionTitle>
              <div className="overflow-hidden rounded-xl bg-surface shadow-e1" role="list">
                {list.map((g) => (
                  <ListRow
                    key={g.id}
                    href={`/avaliacoes/${g.id}`}
                    title={`${g.title}${g.subject ? ` · ${g.subject}` : ""}`}
                    subtitle={`${g.kind === "numeric" ? `Nota até ${Number(g.maxScore)} · peso ${Number(g.weight)}` : g.kind === "concept" ? "Conceito" : "Descritiva"}${g.isRecovery ? " · Recuperação" : ""} · ${formatDay(g.date)}`}
                    trailing={
                      <span className="flex items-center gap-2">
                        {!g.sharedWithFamily && <Lock aria-label="Não compartilhada com a família" className="size-3.5 text-label-3" />}
                        <Tag tone={g.done >= d.students.length ? "positive" : g.done === 0 ? "neutral" : "warning"}>
                          {g.done}/{d.students.length}
                        </Tag>
                      </span>
                    }
                  />
                ))}
              </div>
            </section>
          ))}
          <p className="px-1 text-footnote text-label-2">
            O cadeado indica avaliações ainda não compartilhadas com as famílias. Compartilhe quando estiver pronto, dentro de cada avaliação.{" "}
            <Link href="/sondagens" className="text-accent">
              Ver sondagens
            </Link>
          </p>
        </div>
      )}
    </Page>
  );
}
