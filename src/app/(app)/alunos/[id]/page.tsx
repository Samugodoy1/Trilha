import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, Lock, MessageCircle, ShieldCheck, Images, HeartHandshake } from "lucide-react";
import { requireSession } from "@/server/session";
import { pageGuard, isFamily, isTeacher, isUuid } from "@/server/access";
import { getStudentProfile, trendSentence } from "@/server/queries/student";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { ListRow, ListSection } from "@/components/ui/list";
import { EmptyState, SectionTitle, Tag, CategoryLabel, categoryColor } from "@/components/ui/misc";
import { LevelChart } from "@/components/charts/level-chart";
import { HighlightCard, AttendanceCard, seriesMeta, seriesChartData } from "@/components/student/highlights";
import { Timeline } from "@/components/student/timeline";
import { StudentActions, StudentTabs } from "@/components/student/student-actions";
import { RevokeInviteButton, MarkSeen } from "@/components/student/family-bits";
import { formatDay, formatMessageStamp, formatScore, isoFromTimestamp } from "@/lib/format";
import { contributionKinds, conversationCategories, feedbackTones, portfolioKinds } from "@/lib/vocabulary";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  void params;
  return { title: "Aluno" };
}

const TABS = [
  { value: "resumo", label: "Resumo" },
  { value: "linha", label: "Linha do tempo" },
  { value: "avaliacoes", label: "Avaliações" },
  { value: "portfolio", label: "Portfólio" },
  { value: "familia", label: "Família" },
];

export default async function StudentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const [{ id }, { aba = "resumo" }] = await Promise.all([params, searchParams]);
  const ctx = await requireSession();
  if (isFamily(ctx) || !isUuid(id)) notFound();
  const p = await pageGuard(() => getStudentProfile(ctx, id));
  const { student, current } = p;
  const first = student.preferredName ?? student.fullName.split(" ")[0];
  const tab = TABS.some((t) => t.value === aba) ? aba : "resumo";

  return (
    <Page
      title={student.name}
      back={current ? { href: `/turmas/${current.classId}`, label: current.name } : { href: "/turmas", label: "Turmas" }}
      hideLargeTitle
      width="default"
    >
      <header className="flex flex-col items-center gap-5 pt-1 pb-7 text-center">
        <div className="flex flex-col items-center">
          <Avatar name={student.name} hue={student.hue} size="xl" className="mb-3 size-24 text-[2.25rem]" />
          <div className="min-w-0">
            <h2 className="text-title-1">{student.name}</h2>
            <p className="mt-0.5 text-callout text-label-2">
              {current?.name}
              {current?.number ? ` · nº ${current.number}` : ""}
              {student.age !== null ? ` · ${student.age} anos` : ""}
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {p.guardians.length > 0 ? (
                <Tag tone="positive" icon={ShieldCheck}>
                  {p.guardians.length === 1 ? "1 responsável conectado" : `${p.guardians.length} responsáveis conectados`}
                </Tag>
              ) : (
                <Tag tone="warning">Família ainda não conectada</Tag>
              )}
              {!student.imageConsent && <Tag tone="neutral" icon={Lock}>Sem autorização de imagem</Tag>}
            </div>
          </div>
        </div>
        {isTeacher(ctx) && (
          <StudentActions
            studentId={student.id}
            classId={current?.current ? current.classId : undefined}
            firstName={first}
            guardians={p.guardians.map((g) => g.name)}
            canInvite
            imageConsent={student.imageConsent}
          />
        )}
      </header>

      <div className="mb-7">
        <StudentTabs value={tab} options={TABS} />
      </div>

      {tab === "resumo" && (
        <div className="space-y-10">
          <section aria-labelledby="destaques">
            <SectionTitle
              id="destaques"
              action={
                <Link href={`/alunos/${student.id}/comparar`} className="text-subhead font-medium text-accent hover:underline">
                  Comparar bimestres
                </Link>
              }
            >
              Destaques
            </SectionTitle>
            {p.series.length === 0 && p.attendance.length === 0 ? (
              <div className="rounded-xl bg-surface shadow-e1">
                <EmptyState icon={Images} title="Ainda sem dados" message="As sondagens, a frequência e os registros aparecerão aqui à medida que forem lançados." />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {p.series.map((s) => (
                  <HighlightCard key={s.templateId} series={s} sentence={trendSentence(s)} href={`/alunos/${student.id}?aba=avaliacoes#${s.templateId}`} />
                ))}
                {p.attendance.length > 0 && <AttendanceCard attendance={p.attendance} />}
              </div>
            )}
          </section>

          <GradesSummary grades={p.grades} />

          <section aria-labelledby="recente">
            <SectionTitle
              id="recente"
              action={
                <Link href={`/alunos/${student.id}?aba=linha`} className="text-subhead font-medium text-accent hover:underline">
                  Ver tudo
                </Link>
              }
            >
              Linha do tempo
            </SectionTitle>
            {p.timeline.length ? <Timeline events={p.timeline.slice(0, 5)} /> : <p className="text-callout text-label-2">Sem registros ainda.</p>}
          </section>

          <ListSection header="Histórico escolar">
            {p.history.map((h) => (
              <ListRow
                key={h.classId}
                title={`${h.name} · ${h.year}`}
                subtitle={h.teachers.join(", ")}
                detail={h.current ? "Atual" : undefined}
                href={`/turmas/${h.classId}`}
              />
            ))}
          </ListSection>
        </div>
      )}

      {tab === "linha" && (p.timeline.length ? <Timeline events={p.timeline} /> : <EmptyState icon={Clock} title="Sem registros" message={`Os registros de ${first} aparecerão aqui em ordem cronológica.`} />)}

      {tab === "avaliacoes" && (
        <div className="space-y-10">
          {p.series.map((s) => {
            const meta = seriesMeta[s.kind];
            return (
              <section key={s.templateId} id={s.templateId} aria-label={s.name} className="scroll-mt-28">
                <CategoryLabel icon={meta.icon} category={meta.category}>
                  {s.name}
                </CategoryLabel>
                <p className="mt-1 mb-4 text-title-2">{trendSentence(s)}</p>
                <div className="rounded-xl bg-surface p-4 shadow-e1">
                  <LevelChart data={seriesChartData(s)} levels={s.scale.map((l) => ({ short: l.short, label: l.label }))} color={categoryColor[meta.category]} height={190} title={`Evolução em ${s.name}`} />
                </div>
                <div className="-mx-4 mt-3 md:mx-0" role="list">
                  {[...s.points].reverse().map((pt) => (
                    <ListRow
                      key={pt.roundId}
                      href={`/sondagens/${pt.roundId}`}
                      title={pt.levelLabel}
                      subtitle={`${pt.title} · ${formatDay(pt.appliedOn)}${pt.note ? ` — ${pt.note}` : ""}`}
                      multiline
                      trailing={!pt.sharedWithFamily ? <Lock aria-label="Não compartilhada com a família" className="size-3.5 text-label-3" /> : undefined}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          <GradesTable grades={p.grades} />
        </div>
      )}

      {tab === "portfolio" &&
        (p.portfolio.length ? (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4">
            {p.portfolio.map(({ p: item, mediaId }) => (
              <figure key={item.id} className="group relative overflow-hidden rounded-[6px] bg-fill">
                {mediaId ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/media/${mediaId}`} alt={item.title} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                ) : (
                  <div className="flex aspect-square items-center justify-center p-4 text-center text-subhead text-label-2">{item.title}</div>
                )}
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2.5 pt-8 text-white">
                  <p className="truncate text-footnote font-semibold">{item.title}</p>
                  <p className="flex items-center gap-1 text-caption opacity-90">
                    {portfolioKinds[item.kind]} · {formatDay(item.date)}
                    {item.visibility === "private" && <Lock aria-label="Privado" className="size-3" />}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <EmptyState icon={Images} title="Portfólio vazio" message="Desenhos, textos e projetos ficam guardados aqui, em ordem cronológica." />
        ))}

      {tab === "familia" && (
        <div className="space-y-8">
          <ListSection header="Responsáveis" footer="Somente responsáveis verificados pela escola acessam as informações compartilhadas com a família.">
            {p.guardians.map((g) => (
              <ListRow
                key={g.linkId}
                leading={<Avatar name={g.name} hue={g.hue} size="sm" />}
                title={g.name}
                subtitle={g.relationship}
                trailing={g.verifiedAt ? <Tag tone="positive" icon={Check}>Verificado</Tag> : <Tag tone="warning">Aguardando</Tag>}
              />
            ))}
            {p.pendingInvites.map((i) => (
              <ListRow
                key={i.id}
                icon={Clock}
                iconTint="var(--warning)"
                title={`Convite pendente · ${i.relationship ?? "Responsável"}`}
                subtitle={`Código terminado em ${i.hint} · válido até ${new Date(i.expiresAt).toLocaleDateString("pt-BR")}`}
                trailing={isTeacher(ctx) ? <RevokeInviteButton id={i.id} /> : undefined}
              />
            ))}
            {p.guardians.length === 0 && p.pendingInvites.length === 0 && <ListRow title="Nenhum responsável conectado" subtitle="Use “Convidar responsável” no menu de ações." />}
          </ListSection>

          {p.conversations.length > 0 && (
            <ListSection header="Conversas">
              {p.conversations.map((c) => (
                <ListRow
                  key={c.id}
                  icon={MessageCircle}
                  iconTint="var(--messages)"
                  href={`/mensagens/${c.id}`}
                  title={c.subject}
                  subtitle={`${c.guardian} · ${conversationCategories[c.category].label}`}
                  detail={formatMessageStamp(c.last)}
                />
              ))}
            </ListSection>
          )}

          <ListSection header="Feedbacks enviados">
            {p.feedbacks.length === 0 && <ListRow title="Nenhum feedback ainda" subtitle="Compartilhe uma conquista — a família adora receber boas notícias." />}
            {p.feedbacks.map(({ f }) => (
              <ListRow
                key={f.id}
                title={f.title}
                subtitle={`${feedbackTones[f.tone].label} · ${formatDay(isoFromTimestamp(f.publishedAt ?? f.createdAt))}`}
                trailing={
                  f.status === "draft" ? <Tag>Rascunho</Tag> : f.readAt ? <Tag tone="positive" icon={Check}>Lido</Tag> : <Tag tone="neutral">Enviado</Tag>
                }
              />
            ))}
          </ListSection>

          <section id="em-casa" aria-labelledby="em-casa-h" className="scroll-mt-28">
            <SectionTitle id="em-casa-h">Em casa</SectionTitle>
            {p.unreadContrib > 0 && isTeacher(ctx) && <MarkSeen studentId={student.id} />}
            {p.contributions.length === 0 ? (
              <p className="text-callout text-label-2">A família ainda não compartilhou registros feitos em casa.</p>
            ) : (
              <div className="space-y-3">
                {p.contributions.map(({ c, author }) => (
                  <div key={c.id} className="rounded-xl bg-surface p-4 shadow-e1">
                    <CategoryLabel icon={HeartHandshake} category="family">
                      {contributionKinds[c.kind]}
                    </CategoryLabel>
                    <p className="mt-1 text-body">{c.body}</p>
                    <p className="mt-2 text-footnote text-label-2">
                      {author} · {formatDay(isoFromTimestamp(c.createdAt))}
                      {!c.seenAt && <span className="ml-2 font-semibold text-accent">Novo</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </Page>
  );
}

type Grade = Awaited<ReturnType<typeof getStudentProfile>>["grades"][number];

function termAverage(list: Grade[]) {
  const numeric = list.filter((g) => g.kind === "numeric" && g.score !== null && !g.isRecovery);
  const rec = list.find((g) => g.isRecovery && g.score !== null);
  if (numeric.length) {
    const w = numeric.reduce((a, g) => a + g.weight, 0);
    const avg = numeric.reduce((a, g) => a + (g.score! / (g.maxScore ?? 10)) * 10 * g.weight, 0) / w;
    return formatScore(rec ? Math.max(avg, rec.score!) : avg);
  }
  const concept = list.filter((g) => g.concept).at(-1)?.concept;
  return concept ?? "—";
}

function GradesSummary({ grades }: { grades: Grade[] }) {
  const graded = grades.filter((g) => g.concept || g.score !== null);
  if (!graded.length) return null;
  const lastTerm = graded.at(-1)!.termId;
  const subjects = [...new Set(graded.filter((g) => g.termId === lastTerm).map((g) => g.subject))];
  return (
    <section aria-labelledby="notas">
      <SectionTitle id="notas">Avaliações do {graded.at(-1)!.termName}</SectionTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {subjects.map((s) => (
          <div key={s} className="rounded-xl bg-surface p-4 shadow-e1">
            <p className="text-footnote font-medium text-label-2">{s}</p>
            <p className="mt-1 font-rounded text-title-1 tabular">{termAverage(graded.filter((g) => g.termId === lastTerm && g.subject === s))}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GradesTable({ grades }: { grades: Grade[] }) {
  if (!grades.length) return null;
  const terms = [...new Map(grades.map((g) => [g.termId, { id: g.termId, name: g.termName, ordinal: g.termOrdinal }])).values()];
  const subjects = [...new Set(grades.map((g) => g.subject))];
  return (
    <section aria-labelledby="tabela-notas">
      <SectionTitle id="tabela-notas">Notas e conceitos</SectionTitle>
      <div className="overflow-x-auto rounded-xl bg-surface shadow-e1">
        <table className="w-full min-w-[480px] text-left">
          <thead>
            <tr className="text-footnote text-label-2">
              <th scope="col" className="px-4 py-3 font-medium">Componente</th>
              {terms.map((t) => (
                <th key={t.id} scope="col" className="px-3 py-3 text-center font-medium">
                  {t.ordinal}º bim.
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                <th scope="row" className="px-4 py-3 text-callout font-medium">{s}</th>
                {terms.map((t) => {
                  const list = grades.filter((g) => g.subject === s && g.termId === t.id);
                  return (
                    <td key={t.id} className="px-3 py-3 text-center font-rounded text-headline tabular">
                      {list.length ? termAverage(list) : "—"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 px-1 text-footnote text-label-2">Médias ponderadas pelos pesos definidos em cada avaliação. Recuperações substituem a média quando maiores.</p>
    </section>
  );
}
