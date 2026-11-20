import type { Metadata } from "next";
import { cookies } from "next/headers";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Eye, KeyRound, Lock, ShieldCheck, Sparkles, Users } from "lucide-react";
import { getDb, schema } from "@/db";
import { requireSession } from "@/server/session";
import { isFamily, isStaff } from "@/server/access";
import { getTeam } from "@/server/team";
import { Page } from "@/components/ui/page";
import { Avatar } from "@/components/ui/avatar";
import { ListRow, ListSection } from "@/components/ui/list";
import { ThemePicker, OfficeHoursForm, SchoolForm, RevokeButton, LogoutRow, PasswordForm, ResetPasswordButton } from "./settings-ui";
import { roleLabel } from "@/lib/vocabulary";
import { formatMessageStamp } from "@/lib/format";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const ctx = await requireSession();
  const theme = ((await cookies()).get("trilha_theme")?.value ?? "system") as "system" | "light" | "dark";
  const db = await getDb();
  const [school] = await db.select().from(schema.schools).where(eq(schema.schools.id, ctx.school.id));
  const staff = isStaff(ctx);
  const family = isFamily(ctx);
  const teamCount = family ? 0 : (await getTeam(ctx)).active.length;
  const members = ctx.membership.role === "admin"
    ? await db
        .select({ id: schema.memberships.id, role: schema.memberships.role, name: schema.users.name, hue: schema.users.hue, userId: schema.users.id })
        .from(schema.memberships)
        .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
        .where(and(eq(schema.memberships.schoolId, ctx.school.id), isNull(schema.memberships.revokedAt)))
        .orderBy(schema.memberships.role, schema.users.name)
    : [];
  const logs = staff
    ? await db
        .select({ l: schema.auditLogs, name: schema.users.name })
        .from(schema.auditLogs)
        .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.userId))
        .where(eq(schema.auditLogs.schoolId, ctx.school.id))
        .orderBy(desc(schema.auditLogs.createdAt))
        .limit(25)
    : [];

  return (
    <div data-top-surface className="min-h-dvh bg-surface-2 dark:bg-canvas">
      <Page title="Ajustes" width="narrow">
        <div className="space-y-8">
          <div className="flex items-center gap-4 rounded-[12px] bg-surface p-4">
            <Avatar name={ctx.user.name} hue={ctx.user.hue} size="lg" />
            <div className="min-w-0">
              <p className="text-title-3">{ctx.user.name}</p>
              <p className="truncate text-subhead text-label-2">
                {ctx.membership.title ?? roleLabel[ctx.membership.role]} · {ctx.school.shortName}
              </p>
              <p className="truncate text-footnote text-label-2">{ctx.user.email}</p>
            </div>
          </div>

          <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Aparência</span>}>
            <div className="p-3">
              <ThemePicker value={theme} />
            </div>
          </ListSection>

          {ctx.membership.role === "teacher" && (
            <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Horário de atendimento</span>} footer="As famílias veem esse horário ao escrever para você. O canal não exige respostas imediatas — proteja seu descanso.">
              <div className="p-4">
                <OfficeHoursForm initial={ctx.membership.officeHours ?? { days: [1, 2, 3, 4, 5], start: "13:00", end: "17:00" }} />
              </div>
            </ListSection>
          )}

          <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Privacidade</span>} footer="Os registros de crianças e adolescentes seguem a LGPD e o princípio do melhor interesse da criança.">
            <ListRow icon={Lock} iconTint="#8e8e93" title="Somente eu" subtitle="Observações individuais são privadas por padrão" multiline />
            <ListRow icon={Users} iconTint="var(--info)" title="Coordenação" subtitle="Só o que você compartilhar explicitamente" multiline />
            <ListRow icon={Eye} iconTint="var(--family)" title="Família" subtitle="Responsáveis verificados veem apenas o próprio filho" multiline />
            <ListRow icon={Sparkles} iconTint="var(--notes)" title="Assistente" subtitle={school.aiEnabled ? "Rascunhos com Claude, nomes ocultados antes do envio, sempre revisados por você" : "Rascunhos compostos localmente — nada sai da escola"} multiline />
          </ListSection>

          {!family && (
            <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Escola</span>}>
              <ListRow icon={Users} iconTint="var(--accent)" title="Equipe da escola" subtitle={`${teamCount} ${teamCount === 1 ? "pessoa" : "pessoas"} · convide colegas`} href="/equipe" chevron />
              <ListRow icon={KeyRound} iconTint="#8e8e93" title="Tenho um código de convite" subtitle="Para entrar na equipe de outra escola" href="/convite" chevron />
            </ListSection>
          )}

          {ctx.membership.role === "admin" && (
            <>
              <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Escola</span>} footer="A IA externa só deve ser ativada após avaliação de privacidade e segurança da rede.">
                <div className="p-4">
                  <SchoolForm initial={{ aiEnabled: school.aiEnabled, retentionYears: school.retentionYears, evaluationModel: school.evaluationModel }} />
                </div>
              </ListSection>
              <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Pessoas com acesso</span>}>
                {members.map((m) => (
                  <ListRow key={m.id} leading={<Avatar name={m.name} hue={m.hue} size="sm" />} title={m.name} subtitle={roleLabel[m.role]} trailing={m.userId !== ctx.user.id ? <span className="flex items-center gap-1"><ResetPasswordButton id={m.id} name={m.name} /><RevokeButton id={m.id} /></span> : undefined} />
                ))}
              </ListSection>
            </>
          )}

          {staff && (
            <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Registro de auditoria</span>} footer="Toda ação sensível é registrada: quem fez, quando e sobre o quê.">
              {logs.map(({ l, name }) => (
                <ListRow key={l.id} icon={ShieldCheck} iconTint="#8e8e93" title={l.action} subtitle={`${name ?? "Sistema"}${l.entityType ? ` · ${l.entityType}` : ""}`} detail={<span className="text-footnote">{formatMessageStamp(l.createdAt)}</span>} />
              ))}
            </ListSection>
          )}

          <ListSection variant="inset" header={<span className="text-footnote font-normal text-label-2 uppercase">Senha</span>}>
            <div className="p-4">
              <PasswordForm />
            </div>
          </ListSection>

          <ListSection variant="inset">
            <LogoutRow />
          </ListSection>
          <p className="pb-6 text-center text-footnote text-label-2">Trilha · versão de demonstração com dados fictícios</p>
        </div>
      </Page>
    </div>
  );
}
