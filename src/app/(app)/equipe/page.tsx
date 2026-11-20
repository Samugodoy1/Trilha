import type { Metadata } from "next";
import { Clock } from "lucide-react";
import { requireRole } from "@/server/session";
import { getTeam, managerRoles } from "@/server/team";
import { Page } from "@/components/ui/page";
import { ListRow, ListSection } from "@/components/ui/list";
import { RevokeStaffInviteButton, TeamInviteButton } from "@/components/invites/invite-ui";
import { PersonRow, type Person } from "./team-ui";

export const metadata: Metadata = { title: "Equipe" };

const roleName = { teacher: "Professor(a)", coordinator: "Coordenação", admin: "Gestão" } as const;
const H = ({ children }: { children: React.ReactNode }) => <span className="text-footnote font-normal text-label-2 uppercase">{children}</span>;

export default async function TeamPage() {
  const ctx = await requireRole("teacher", "coordinator", "admin");
  const [team, mine] = await Promise.all([getTeam(ctx), managerRoles(ctx)]);
  const manager = mine.length > 0;
  const isAdmin = mine.includes("admin");

  const toPerson = (p: (typeof team.active)[number]): Person => ({
    userId: p.userId,
    name: p.name,
    hue: p.hue,
    email: p.email,
    roleText: p.roles.map((r) => roleName[r]).join(" · "),
    classes: p.classes,
    since: p.since,
    deactivatedAt: p.deactivatedAt,
    isMe: p.userId === ctx.user.id,
    // Coordenação cuida de professores e coordenação; só a gestão mexe na gestão.
    manageable: manager && p.userId !== ctx.user.id && (isAdmin || !p.roles.includes("admin")),
  });

  const leaders = team.active.filter((p) => !p.roles.includes("teacher")).map(toPerson);
  const teachers = team.active.filter((p) => p.roles.includes("teacher")).map(toPerson);
  const off = team.deactivated.map(toPerson);
  const teacherOptions = teachers.map((t) => ({ userId: t.userId, name: t.name }));
  const pending = team.pending;

  return (
    <div data-top-surface className="min-h-dvh bg-surface-2 dark:bg-canvas">
      <Page
        title="Equipe"
        subtitle={ctx.school.name}
        actions={<TeamInviteButton label="Convidar" allowCoordinator={manager} role="teacher" />}
        width="narrow"
      >
        <div className="space-y-8">
          <ListSection variant="inset" header={<H>Coordenação e gestão</H>} footer={leaders.length ? "A coordenação acompanha as turmas da escola, mas só vê os registros que cada professor decidir compartilhar." : manager ? undefined : "Sua escola ainda não tem coordenação no Trilha. Quem cuida da gestão pode convidar."}>
            {leaders.length ? (
              <ul>
                {leaders.map((p, i) => (
                  <PersonRow key={p.userId} p={p} last={i === leaders.length - 1} teachers={teacherOptions} />
                ))}
              </ul>
            ) : (
              <ListRow title="Ninguém ainda" subtitle={manager ? "Convide a coordenação pelo botão Convidar." : undefined} />
            )}
          </ListSection>

          <ListSection
            variant="inset"
            header={<H>Professores · {teachers.length}</H>}
            footer={manager ? "Toque em alguém para ver as turmas, transferi-las ou desativar o acesso de quem saiu da escola." : "Conheceu o Trilha e quer levar para os colegas? Toque em Convidar: cada professor cria as próprias turmas."}
          >
            <ul>
              {teachers.map((p, i) => (
                <PersonRow key={p.userId} p={p} last={i === teachers.length - 1} teachers={teacherOptions} />
              ))}
            </ul>
            <TeamInviteButton variant="row" label="Convidar um colega" allowCoordinator={false} />
          </ListSection>

          {pending.length > 0 && (
            <ListSection variant="inset" header={<H>Convites enviados</H>} footer="Cada código vale uma única vez, por 14 dias.">
              {pending.map((i) => (
                <ListRow
                  key={i.id}
                  icon={Clock}
                  iconTint="var(--warning)"
                  title={i.recipientName ? `${i.recipientName} · ${i.role === "coordinator" ? "coordenação" : "professor(a)"}` : i.role === "coordinator" ? "Convite para a coordenação" : "Convite para professor(a)"}
                  subtitle={`Por ${i.createdById === ctx.user.id ? "você" : i.createdBy.split(" ")[0]} · código terminado em ${i.codeHint} · até ${i.expiresAt.toLocaleDateString("pt-BR")}`}
                  trailing={manager || i.createdById === ctx.user.id ? <RevokeStaffInviteButton id={i.id} /> : undefined}
                  multiline
                />
              ))}
            </ListSection>
          )}

          {manager && off.length > 0 && (
            <ListSection variant="inset" header={<H>Sem acesso</H>} footer="Pessoas que saíram da escola. A conta delas continua existindo; é possível reativar ou transferir as turmas que ficaram.">
              <ul>
                {off.map((p, i) => (
                  <PersonRow key={p.userId} p={p} last={i === off.length - 1} teachers={teacherOptions} />
                ))}
              </ul>
            </ListSection>
          )}
        </div>
      </Page>
    </div>
  );
}
