import type { Metadata } from "next";
import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireRole } from "@/server/session";
import { getClasses, getCurrentTerm } from "@/server/queries/common";
import { getClassDetail } from "@/server/queries/classes";
import { getAttendanceByTerm } from "@/server/queries/student";
import { Page } from "@/components/ui/page";
import { StudentTabs } from "@/components/student/student-actions";

export const metadata: Metadata = { title: "Conselho de classe" };

export default async function CouncilPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const sp = await searchParams;
  const ctx = await requireRole("coordinator", "admin");
  const classes = (await getClasses(ctx)).filter((c) => !c.archived);
  const selected = classes.find((c) => c.id === sp.aba) ?? classes[0];
  if (!selected) return <Page title="Conselho de classe">Nenhuma turma.</Page>;
  const d = await getClassDetail(ctx, selected.id);
  const term = await getCurrentTerm(ctx.school.id);
  const db = await getDb();
  const ids = d.students.map((s) => s.id);
  const reports = ids.length
    ? await db.select({ id: schema.reports.id, studentId: schema.reports.studentId, title: schema.reports.title }).from(schema.reports).where(and(inArray(schema.reports.studentId, ids), eq(schema.reports.status, "approved")))
    : [];
  const attendance = await Promise.all(d.students.map(async (s) => ({ id: s.id, att: (await getAttendanceByTerm(s.id, ctx.school.id)).find((a) => a.termId === term?.id) })));

  return (
    <Page title="Conselho de classe" subtitle={`Síntese por aluno para preparar o conselho do ${term?.name ?? "bimestre"}.`} width="wide">
      <div className="mb-6">
        <StudentTabs value={selected.id} options={classes.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="-mx-4 overflow-x-auto md:mx-0">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="text-footnote text-label-2">
              <th className="px-4 py-2 font-semibold md:pl-0">Aluno</th>
              <th className="px-3 py-2 font-semibold">Escrita</th>
              <th className="px-3 py-2 font-semibold">Leitura</th>
              <th className="px-3 py-2 font-semibold">Presença</th>
              <th className="px-3 py-2 font-semibold">Registros</th>
              <th className="px-3 py-2 font-semibold">Parecer</th>
            </tr>
          </thead>
          <tbody>
            {d.students.map((s) => {
              const a = attendance.find((x) => x.id === s.id)?.att;
              const rate = a?.rate != null ? Math.round(a.rate * 100) : null;
              const rep = reports.find((r) => r.studentId === s.id);
              return (
                <tr key={s.id} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                  <td className="px-4 py-2.5 md:pl-0">
                    <Link href={`/alunos/${s.id}`} className="text-body hover:text-accent">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-subhead">{s.writing ?? "—"}</td>
                  <td className="px-3 py-2.5 text-subhead">{s.reading ?? "—"}</td>
                  <td className={`px-3 py-2.5 text-subhead tabular ${rate !== null && rate < 85 ? "font-semibold text-critical" : ""}`}>{rate !== null ? `${rate}%` : "—"}</td>
                  <td className="px-3 py-2.5 text-subhead tabular">{s.entryCount}</td>
                  <td className="px-3 py-2.5 text-subhead">
                    {rep ? (
                      <Link href={`/relatorios/${rep.id}`} className="text-accent">
                        Ler
                      </Link>
                    ) : (
                      <span className="text-label-2">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-footnote text-label-2">Registros contam apenas o que foi compartilhado com a coordenação. Observações privadas dos professores não aparecem aqui.</p>
    </Page>
  );
}
