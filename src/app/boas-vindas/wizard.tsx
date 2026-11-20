"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  CalendarRange,
  Check,
  ChartSpline,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  NotebookPen,
  School,
  Share,
  ShieldCheck,
  SquarePlus,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { SegmentedControl, Select, TextArea, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { createSchoolAction, configureTermsAction, finishOnboardingAction } from "@/server/actions/onboarding";
import { createClassAction, addStudentsAction } from "@/server/actions/classes";
import { saveEntryAction } from "@/server/actions/journal";
import { parseRoster } from "@/components/classes/class-tools";
import { stageLabels, shiftLabels, type Stage } from "@/lib/vocabulary";
import { todayISO } from "@/lib/format";
import { FeatureRow, Group, GroupRow, OnboardingFlow, useCanInstall, type Step } from "./onboarding-ui";
import { TeamInviteSheet } from "@/components/invites/invite-ui";

const BLUE: [string, string] = ["#4BA3FF", "#0062E0"];
const ORANGE: [string, string] = ["#FFB340", "#FF8A00"];
const GREEN: [string, string] = ["#5BE584", "#28B04B"];
const INDIGO: [string, string] = ["#8E8CFF", "#5856D6"];
const TEAL: [string, string] = ["#6AD7F5", "#1EA5D9"];

function Welcome({ firstName }: { firstName: string }) {
  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.05 }}>
      <BrandMark className="mx-auto mb-7 size-[84px] drop-shadow-[0_14px_28px_rgb(0_98_224/0.32)]" />
      <span className="sr-only">Olá, {firstName}</span>
    </motion.div>
  );
}

function InstallSteps() {
  return (
    <Group>
      <GroupRow>
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-fill text-accent">
          <Share aria-hidden className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-body">
          Toque em <span className="font-semibold">Compartilhar</span> na barra do Safari
        </span>
      </GroupRow>
      <GroupRow last>
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[8px] bg-fill text-label">
          <SquarePlus aria-hidden className="size-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-body">
          Escolha <span className="font-semibold">Adicionar à Tela de Início</span>
        </span>
      </GroupRow>
    </Group>
  );
}

function DoneHero() {
  return (
    <motion.span
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
      className="mx-auto mb-6 flex size-[84px] items-center justify-center rounded-full bg-[var(--positive)] text-white shadow-[0_14px_30px_-10px_color-mix(in_oklab,var(--positive)_70%,transparent)]"
    >
      <motion.svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <motion.path d="M5 12.5l4.5 4.5L19 7.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.25, duration: 0.45, ease: "easeOut" }} />
      </motion.svg>
    </motion.span>
  );
}

/** Conclui e abre o app do zero, já com a sessão e os menus do perfil. */
async function finish() {
  const r = await finishOnboardingAction();
  window.location.assign(r.href);
  await new Promise(() => {});
}

function Summary({ items }: { items: string[] }) {
  return (
    <Group>
      {items.map((t, i) => (
        <GroupRow key={t} last={i === items.length - 1}>
          <Check aria-hidden className="size-[18px] shrink-0 text-[var(--positive)]" strokeWidth={2.8} />
          <span className="text-body">{t}</span>
        </GroupRow>
      ))}
    </Group>
  );
}

/** Configuração inicial da professora: uma decisão por tela, e valor percebido logo no fim. */
export function Wizard({ firstName, hasSchool: hasSchoolAtStart, schoolName }: { firstName: string; hasSchool: boolean; schoolName?: string }) {
  // Congelado na abertura: criar a escola atualiza a página e não deve tirar a etapa do lugar.
  const [hasSchool] = useState(hasSchoolAtStart);
  const [cur, setCur] = useState("welcome");
  const [pending, start] = useTransition();
  const toast = useToast();
  const canInstall = useCanInstall();
  const [school, setSchool] = useState({ name: "", city: "", state: "SP" });
  const [stage, setStage] = useState<Stage>("fundamental_1");
  const [grade, setGrade] = useState(3);
  const [letter, setLetter] = useState("A");
  const [shift, setShift] = useState<keyof typeof shiftLabels>("manha");
  const [classId, setClassId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [roster, setRoster] = useState("");
  const [structure, setStructure] = useState<"bimestre" | "trimestre">("bimestre");
  const year = new Date().getFullYear();
  const [startsOn, setStartsOn] = useState(`${year}-02-02`);
  const [endsOn, setEndsOn] = useState(`${year}-12-15`);
  const [studentsAdded, setStudentsAdded] = useState(0);
  const [firstNote, setFirstNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [invitedCoord, setInvitedCoord] = useState(false);
  const parsed = useMemo(() => parseRoster(roster), [roster]);

  const next = () => setCur((k) => stepsRef.current[stepsRef.current.findIndex((x) => x.key === k) + 1]?.key ?? k);
  const stepsRef = useRef<Step[]>([]);
  const run = (fn: () => Promise<boolean | void>) =>
    start(async () => {
      const ok = await fn();
      if (ok !== false) next();
    });
  const fail = (msg: string) => {
    toast({ title: msg, tone: "error" });
    return false;
  };
  const className_ = stage === "infantil" ? `Infantil ${letter}` : `${grade}º ano ${letter}`;

  const steps: Step[] = [
    {
      key: "welcome",
      noBack: true,
      hero: <Welcome firstName={firstName} />,
      title: <>Boas-vindas ao Trilha</>,
      description: `Olá, ${firstName}. Em poucos minutos sua turma estará pronta.`,
      body: (
        <ul className="mx-auto max-w-sm space-y-6">
          <FeatureRow icon={NotebookPen} color="#FF9500" title="Registros em segundos">
            Anote o que aconteceu na aula, com fotos, do jeito mais rápido possível.
          </FeatureRow>
          <FeatureRow icon={ChartSpline} color="#007AFF" title="A trilha de cada aluno">
            Sondagens, avaliações e conquistas organizadas ao longo do ano.
          </FeatureRow>
          <FeatureRow icon={HeartHandshake} color="#FF2D55" title="Famílias por perto">
            A Nossa semana, tarefas e recados, no tempo da escola.
          </FeatureRow>
        </ul>
      ),
      note: (
        <>
          <ShieldCheck aria-hidden className="mt-px size-4 shrink-0 text-accent" strokeWidth={2.2} />
          <span>Seus registros começam privados. Você decide o que cada família vê.</span>
        </>
      ),
      primary: { label: "Continuar", onClick: next },
    },
    ...(!hasSchool
      ? [
          {
            key: "school",
            icon: School,
            tint: BLUE,
            title: "Sua escola",
            description: "Se a sua rede já usa o Trilha, peça um convite à coordenação. Se não, cadastre a escola agora.",
            body: (
              <div className="space-y-4">
                <TextField label="Nome da escola" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} placeholder="Ex.: EMEF Jardim das Flores" />
                <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                  <TextField label="Cidade" value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} />
                  <TextField
                    label="UF"
                    value={school.state}
                    maxLength={2}
                    onChange={(e) =>
                      setSchool({
                        ...school,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
              </div>
            ),
            primary: {
              label: "Continuar",
              loading: pending,
              disabled: school.name.trim().length < 3 || school.city.trim().length < 2,
              onClick: () =>
                run(async () => {
                  const r = await createSchoolAction(school);
                  return r.ok ? true : fail(r.error);
                }),
            },
          } satisfies Step,
        ]
      : []),
    {
      key: "stage",
      icon: GraduationCap,
      tint: INDIGO,
      title: "Com quem você trabalha?",
      description: `${schoolName ? `${schoolName}. ` : ""}A etapa ajusta sondagens e avaliações ao seu dia a dia.`,
      body: (
        <Group>
          <div role="radiogroup" aria-label="Etapa">
            {(Object.keys(stageLabels) as Stage[]).map((s, k, a) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={s === stage}
                onClick={() => {
                  setStage(s);
                  setGrade(s === "fundamental_2" ? 6 : s === "medio" ? 1 : s === "infantil" ? 0 : 3);
                }}
                className="block w-full text-left outline-none focus-visible:bg-fill"
              >
                <GroupRow last={k === a.length - 1}>
                  <span className="flex-1 text-body">{stageLabels[s]}</span>
                  <Check aria-hidden className={cn("size-5 text-accent transition-opacity", s === stage ? "opacity-100" : "opacity-0")} strokeWidth={2.6} />
                </GroupRow>
              </button>
            ))}
          </div>
        </Group>
      ),
      primary: { label: "Continuar", onClick: next },
    },
    {
      key: "class",
      icon: Users,
      tint: TEAL,
      title: "Sua primeira turma",
      description: "Você pode criar outras depois.",
      body: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {stage !== "infantil" && (
              <Select label="Ano" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
                {(stage === "fundamental_1" ? [1, 2, 3, 4, 5] : stage === "fundamental_2" ? [6, 7, 8, 9] : [1, 2, 3]).map((g) => (
                  <option key={g} value={g}>
                    {g}º ano
                  </option>
                ))}
              </Select>
            )}
            <TextField label="Turma" value={letter} maxLength={3} onChange={(e) => setLetter(e.target.value.toUpperCase())} />
          </div>
          <SegmentedControl
            label="Turno"
            value={shift}
            onChange={setShift}
            options={Object.entries(shiftLabels).map(([value, label]) => ({
              value: value as keyof typeof shiftLabels,
              label,
            }))}
          />
        </div>
      ),
      primary: {
        label: classId ? "Continuar" : `Criar ${className_}`,
        loading: pending,
        disabled: !letter.trim(),
        onClick: () =>
          classId
            ? next()
            : run(async () => {
                const r = await createClassAction({
                  name: className_,
                  stage,
                  grade,
                  shift,
                });
                if (!r.ok) return fail(r.error);
                setClassId(r.id);
                setClassName(className_);
              }),
      },
    },
    {
      key: "students",
      icon: BookOpen,
      tint: ORANGE,
      title: "Seus alunos",
      description: "Cole a lista da secretaria ou da planilha, um nome por linha. A data de nascimento ajuda a confirmar as famílias.",
      body: (
        <div>
          <TextArea
            value={roster}
            onChange={(e) => setRoster(e.target.value)}
            rows={7}
            placeholder={"Ana Beatriz Souza\t12/03/2017\nBruno Henrique Lima\t02/08/2017"}
            aria-label="Lista de alunos"
          />
          <p className="mt-2 px-1 text-footnote text-label-2" aria-live="polite">
            {parsed.rows.length ? `${parsed.rows.length} ${parsed.rows.length === 1 ? "aluno reconhecido" : "alunos reconhecidos"}` : "Nomes com ou sem data de nascimento."}
          </p>
        </div>
      ),
      primary: {
        label: parsed.rows.length ? `Adicionar ${parsed.rows.length} ${parsed.rows.length === 1 ? "aluno" : "alunos"}` : "Adicionar alunos",
        loading: pending,
        disabled: !parsed.rows.length,
        onClick: () =>
          run(async () => {
            const r = await addStudentsAction(classId!, parsed.rows);
            if (!r.ok) return fail(r.error);
            setStudentsAdded((n) => n + parsed.rows.length);
            setRoster("");
          }),
      },
      secondary: {
        label: studentsAdded ? "Continuar" : "Adicionar depois",
        onClick: next,
      },
    },
    // O calendário é da escola: só quem cadastra a escola define. Professor convidado pula.
    ...(!hasSchool
      ? [
          {
            key: "terms",
            icon: CalendarRange,
            tint: GREEN,
            title: "Período letivo",
            description: "Como a sua escola divide o ano?",
            body: (
              <div className="space-y-4">
                <SegmentedControl
                  label="Divisão"
                  value={structure}
                  onChange={setStructure}
                  options={[
                    { value: "bimestre", label: "Bimestres" },
                    { value: "trimestre", label: "Trimestres" },
                  ]}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField label="Início das aulas" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                  <TextField label="Fim das aulas" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
                </div>
              </div>
            ),
            primary: {
              label: "Continuar",
              loading: pending,
              onClick: () =>
                run(async () => {
                  const r = await configureTermsAction({
                    structure,
                    startsOn,
                    endsOn,
                  });
                  return r.ok ? true : fail(r.error ?? "Confira as datas.");
                }),
            },
          } satisfies Step,
        ]
      : []),
    ...(!hasSchool
      ? [
          {
            key: "team",
            icon: Users,
            tint: INDIGO,
            title: "Convide a coordenação",
            description: "Mande um código para a coordenação da sua escola entrar no Trilha. Ela acompanha as turmas, mas só vê o que você compartilhar.",
            body: <Summary items={["Seus registros continuam privados", "Você escolhe o que compartilhar, um a um", "Você pode convidar outros professores depois, em Ajustes"]} />,
            primary: {
              label: invitedCoord ? "Continuar" : "Convidar coordenação",
              onClick: () => (invitedCoord ? next() : setTeamOpen(true)),
            },
            secondary: invitedCoord ? undefined : { label: "Agora não", onClick: next },
          } satisfies Step,
        ]
      : []),
    {
      key: "first-note",
      icon: NotebookPen,
      tint: ORANGE,
      title: "Seu primeiro registro",
      description: "O que aconteceu na aula de hoje? Fica privado: só você vê.",
      body: (
        <TextArea
          value={firstNote}
          onChange={(e) => setFirstNote(e.target.value)}
          rows={5}
          placeholder="Ex.: A turma conversou sobre as férias e montou um mural com os lugares que visitaram."
          aria-label="Registro"
        />
      ),
      primary: {
        label: "Salvar registro",
        loading: pending,
        disabled: !firstNote.trim(),
        onClick: () =>
          run(async () => {
            if (!classId) return true;
            const r = await saveEntryAction({
              classId,
              studentIds: [],
              kind: "atividade",
              title: "",
              body: firstNote,
              visibility: "private",
              occurredOn: todayISO(),
              isDraft: false,
            });
            if (!r.ok) return fail(r.error);
            setNoteSaved(true);
          }),
      },
      secondary: { label: "Agora não", onClick: next },
    },
    ...(canInstall
      ? [
          {
            key: "install",
            icon: SquarePlus,
            tint: BLUE,
            title: "Tenha o Trilha na Tela de Início",
            description: "Ele abre em tela cheia, como um app, e fica a um toque durante a aula.",
            body: <InstallSteps />,
            primary: { label: "Continuar", onClick: next },
          } satisfies Step,
        ]
      : []),
    {
      key: "done",
      noBack: true,
      hero: <DoneHero />,
      title: `Tudo pronto, ${firstName}`,
      description: "Sua turma já tem um lugar para crescer. Comece pela tela Hoje: ela mostra o que precisa da sua atenção.",
      body: (
        <Summary
          items={[
            ...(className ? [`Turma ${className} criada`] : []),
            ...(studentsAdded ? [`${studentsAdded} ${studentsAdded === 1 ? "aluno com histórico pronto" : "alunos com histórico pronto"}`] : []),
            ...(!hasSchool ? [`Ano dividido em ${structure === "bimestre" ? "bimestres" : "trimestres"}`] : []),
            ...(noteSaved ? ["Primeiro registro guardado"] : []),
          ]}
        />
      ),
      primary: {
        label: "Começar a usar o Trilha",
        loading: pending,
        onClick: () => start(finish),
      },
    },
  ];

  stepsRef.current = steps;
  const index = Math.max(
    0,
    steps.findIndex((x) => x.key === cur),
  );
  return (
    <>
      <OnboardingFlow steps={steps} index={index} onBack={() => setCur(steps[Math.max(0, index - 1)].key)} />
      <TeamInviteSheet open={teamOpen} defaultRole="coordinator" onClose={() => setTeamOpen(false)} onCreated={() => setInvitedCoord(true)} />
    </>
  );
}

/** Apresentação para a família no primeiro acesso: o que vai ver, como protegemos, e pronto. */
export function FamilyWelcome({ firstName, childName, schoolName }: { firstName: string; childName: string; schoolName: string }) {
  const [cur, setCur] = useState("welcome");
  const [pending, start] = useTransition();
  const canInstall = useCanInstall();
  const next = () => setCur((k) => stepsRef.current[stepsRef.current.findIndex((x) => x.key === k) + 1]?.key ?? k);
  const stepsRef = useRef<Step[]>([]);
  const child = childName.split(" ")[0];

  const steps: Step[] = [
    {
      key: "welcome",
      noBack: true,
      hero: <Welcome firstName={firstName} />,
      title: `Olá, ${firstName}`,
      description: `${schoolName} usa o Trilha para mostrar como ${child} está aprendendo.`,
      body: (
        <ul className="mx-auto max-w-sm space-y-6">
          <FeatureRow icon={BookOpen} color="#5856D6" title="Nossa semana">
            O que a turma aprendeu e ideias simples para continuar em casa.
          </FeatureRow>
          <FeatureRow icon={ChartSpline} color="#007AFF" title="O desenvolvimento explicado">
            Cada avanço de {child}, em linguagem clara, sem siglas.
          </FeatureRow>
          <FeatureRow icon={MessageCircle} color="#34C759" title="Recados com a escola">
            Converse com a professora, respeitando o horário de atendimento.
          </FeatureRow>
        </ul>
      ),
      primary: { label: "Continuar", onClick: next },
    },
    {
      key: "privacy",
      icon: ShieldCheck,
      tint: GREEN,
      title: "Feito para proteger seu filho",
      description: "A escola escolhe com cuidado o que compartilhar.",
      body: <Summary items={[`Você vê apenas o que é sobre ${child}`, "Nada de rankings ou comparações entre crianças", "Fotos e documentos ficam protegidos e privados"]} />,
      primary: { label: "Continuar", onClick: next },
    },
    ...(canInstall
      ? [
          {
            key: "install",
            icon: SquarePlus,
            tint: BLUE,
            title: "Tenha o Trilha na Tela de Início",
            description: "Assim você abre as novidades da escola com um toque, como um app.",
            body: <InstallSteps />,
            primary: { label: "Continuar", onClick: next },
          } satisfies Step,
        ]
      : []),
    {
      key: "done",
      noBack: true,
      hero: <DoneHero />,
      title: "Tudo pronto",
      description: `Sempre que a escola compartilhar algo sobre ${child}, aparece no Início.`,
      primary: {
        label: `Ver a trilha de ${child}`,
        loading: pending,
        onClick: () => start(finish),
      },
    },
  ];

  stepsRef.current = steps;
  const index = Math.max(
    0,
    steps.findIndex((x) => x.key === cur),
  );
  return <OnboardingFlow steps={steps} index={index} onBack={() => setCur(steps[Math.max(0, index - 1)].key)} />;
}
