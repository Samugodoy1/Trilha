"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, ChevronLeft, GraduationCap, NotebookPen, School, Users } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { SegmentedControl, Select, TextArea, TextField } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { createSchoolAction, configureTermsAction, finishOnboardingAction } from "@/server/actions/onboarding";
import { createClassAction, addStudentsAction } from "@/server/actions/classes";
import { saveEntryAction } from "@/server/actions/journal";
import { parseRoster } from "@/components/classes/class-tools";
import { stageLabels, shiftLabels, type Stage } from "@/lib/vocabulary";
import { todayISO } from "@/lib/format";

const STEPS = ["Boas-vindas", "Escola", "Etapa", "Turma", "Alunos", "Período letivo", "Primeiro registro"];

/**
 * Configuração inicial, no ritmo de configurar um aparelho novo:
 * uma decisão por tela, transições suaves, valor percebido logo no fim.
 */
export function Wizard({ firstName, hasSchool, schoolName }: { firstName: string; hasSchool: boolean; schoolName?: string }) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [pending, start] = useTransition();
  const toast = useToast();
  const [school, setSchool] = useState({ name: "", city: "", state: "SP" });
  const [stage, setStage] = useState<Stage>("fundamental_1");
  const [grade, setGrade] = useState(3);
  const [letter, setLetter] = useState("A");
  const [shift, setShift] = useState<keyof typeof shiftLabels>("manha");
  const [classId, setClassId] = useState<string | null>(null);
  const [roster, setRoster] = useState("");
  const [structure, setStructure] = useState<"bimestre" | "trimestre">("bimestre");
  const year = new Date().getFullYear();
  const [startsOn, setStartsOn] = useState(`${year}-02-02`);
  const [endsOn, setEndsOn] = useState(`${year}-12-15`);
  const [studentsAdded, setStudentsAdded] = useState<string[]>([]);
  const [firstNote, setFirstNote] = useState("");
  const parsed = useMemo(() => parseRoster(roster), [roster]);

  const go = (n: number) => {
    setDir(n > step ? 1 : -1);
    setStep(n);
  };
  const run = (fn: () => Promise<boolean | void>) =>
    start(async () => {
      const ok = await fn();
      if (ok !== false) go(step + 1);
    });
  const fail = (msg: string) => {
    toast({ title: msg, tone: "error" });
    return false;
  };

  const content = [
    // 0
    <div key="0" className="text-center">
      <BrandMark className="mx-auto mb-8 size-20 drop-shadow-[0_10px_24px_rgb(0_98_224/0.3)]" />
      <h1 className="text-large-title">Olá, {firstName}</h1>
      <p className="mx-auto mt-3 max-w-sm text-body text-label-2">Em poucos minutos sua turma estará pronta. Você registra uma vez — o Trilha organiza o histórico de cada aluno e aproxima as famílias.</p>
      <ul className="mx-auto mt-8 max-w-xs space-y-4 text-left">
        {[
          [NotebookPen, "Registros rápidos", "Observações e conquistas em segundos"],
          [GraduationCap, "Histórico de cada aluno", "Sondagens e evolução ao longo do ano"],
          [Users, "Famílias por perto", "Nossa semana, tarefas e recados"],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof NotebookPen;
          return (
            <li key={t as string} className="flex items-start gap-3">
              <I aria-hidden className="mt-0.5 size-6 shrink-0 text-accent" strokeWidth={1.9} />
              <span>
                <span className="block text-callout font-semibold">{t as string}</span>
                <span className="block text-subhead text-label-2">{d as string}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <Button size="lg" className="mt-10" onClick={() => go(hasSchool ? 2 : 1)}>
        Começar
      </Button>
    </div>,
    // 1
    <div key="1">
      <School aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Sua escola</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">Se a sua rede já usa o Trilha, use o convite da coordenação. Caso contrário, cadastre a escola agora.</p>
      <div className="space-y-4">
        <TextField label="Nome da escola" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} placeholder="Ex.: EMEF Jardim das Flores" />
        <div className="grid grid-cols-[1fr_96px] gap-3">
          <TextField label="Cidade" value={school.city} onChange={(e) => setSchool({ ...school, city: e.target.value })} />
          <TextField label="UF" value={school.state} maxLength={2} onChange={(e) => setSchool({ ...school, state: e.target.value.toUpperCase() })} />
        </div>
      </div>
      <Button size="lg" className="mt-8" loading={pending} onClick={() => run(async () => { const r = await createSchoolAction(school); return r.ok ? true : fail(r.error); })}>
        Continuar
      </Button>
    </div>,
    // 2
    <div key="2">
      <GraduationCap aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Com quem você trabalha?</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">{schoolName ? `${schoolName}. ` : ""}A etapa ajusta sondagens e avaliações ao seu contexto.</p>
      <div className="-mx-4 md:mx-0">
        {(Object.keys(stageLabels) as Stage[]).map((s, i, a) => (
          <button key={s} type="button" role="radio" aria-checked={s === stage} onClick={() => { setStage(s); setGrade(s === "fundamental_2" ? 6 : s === "medio" ? 1 : s === "infantil" ? 0 : 3); }} className="flex w-full items-center pl-4 text-left md:pl-0">
            <span className={cn("flex flex-1 items-center py-3.5 pr-4", i < a.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
              <span className="flex-1 text-body">{stageLabels[s]}</span>
              {s === stage && <Check aria-hidden className="size-5 text-accent" strokeWidth={2.6} />}
            </span>
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-8" onClick={() => go(3)}>
        Continuar
      </Button>
    </div>,
    // 3
    <div key="3">
      <Users aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Sua primeira turma</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">Você pode criar outras depois.</p>
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
        <SegmentedControl label="Turno" value={shift} onChange={setShift} options={Object.entries(shiftLabels).map(([value, label]) => ({ value: value as keyof typeof shiftLabels, label }))} />
      </div>
      <Button
        size="lg"
        className="mt-8"
        loading={pending}
        onClick={() =>
          run(async () => {
            const r = await createClassAction({ name: stage === "infantil" ? `Infantil ${letter}` : `${grade}º ano ${letter}`, stage, grade, shift });
            if (!r.ok) return fail(r.error);
            setClassId(r.id);
          })
        }
      >
        Criar turma
      </Button>
    </div>,
    // 4
    <div key="4">
      <Users aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Seus alunos</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">Cole a lista da secretaria ou da planilha — um nome por linha. Datas de nascimento ajudam a verificar as famílias.</p>
      <TextArea value={roster} onChange={(e) => setRoster(e.target.value)} rows={8} placeholder={"Ana Beatriz Souza\t12/03/2017\nBruno Henrique Lima\t02/08/2017"} aria-label="Lista de alunos" />
      <p className="mt-2 text-footnote text-label-2">{parsed.rows.length ? `${parsed.rows.length} alunos reconhecidos` : "Você também pode pular e adicionar depois."}</p>
      <div className="mt-8 flex gap-2">
        <Button variant="gray" size="lg" className="flex-1" onClick={() => go(5)}>
          Pular
        </Button>
        <Button
          size="lg"
          className="flex-1"
          loading={pending}
          disabled={!parsed.rows.length}
          onClick={() =>
            run(async () => {
              const r = await addStudentsAction(classId!, parsed.rows);
              if (!r.ok) return fail(r.error);
              setStudentsAdded(parsed.rows.map((x) => x.fullName));
            })
          }
        >
          Adicionar
        </Button>
      </div>
    </div>,
    // 5
    <div key="5">
      <BookOpen aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Período letivo</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">Como a sua escola divide o ano?</p>
      <div className="space-y-4">
        <SegmentedControl label="Divisão" value={structure} onChange={setStructure} options={[{ value: "bimestre", label: "Bimestres" }, { value: "trimestre", label: "Trimestres" }]} />
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Início das aulas" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <TextField label="Fim das aulas" type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
      </div>
      <Button size="lg" className="mt-8" loading={pending} onClick={() => run(async () => { const r = await configureTermsAction({ structure, startsOn, endsOn }); return r.ok ? true : fail(r.error ?? "Erro"); })}>
        Continuar
      </Button>
    </div>,
    // 6
    <div key="6">
      <NotebookPen aria-hidden className="mb-4 size-10 text-accent" strokeWidth={1.7} />
      <h1 className="text-title-1">Seu primeiro registro</h1>
      <p className="mt-2 mb-6 text-callout text-label-2">O que aconteceu na aula de hoje? Esse registro fica privado — só você vê.</p>
      <TextArea value={firstNote} onChange={(e) => setFirstNote(e.target.value)} rows={5} placeholder="Ex.: A turma conversou sobre as férias e montou um mural com os lugares que visitaram." aria-label="Registro" />
      <Button
        size="lg"
        className="mt-8"
        loading={pending}
        onClick={() =>
          start(async () => {
            if (firstNote.trim() && classId) {
              const r = await saveEntryAction({ classId, studentIds: [], kind: "atividade", title: "", body: firstNote, visibility: "private", occurredOn: todayISO(), isDraft: false });
              if (!r.ok) return void fail(r.error);
            }
            await finishOnboardingAction();
          })
        }
      >
        {firstNote.trim() ? "Salvar e começar" : "Começar a usar"}
      </Button>
      {studentsAdded.length > 0 && <p className="mt-3 text-center text-footnote text-label-2">{studentsAdded.length} alunos já têm um histórico pronto para começar.</p>}
    </div>,
  ];

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(env(safe-area-inset-top),20px)] pb-10">
      <div className="flex h-12 w-full max-w-md items-center justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => go(step === 2 && hasSchool ? 0 : step - 1)} aria-label="Voltar" className="glass flex size-10 items-center justify-center rounded-full">
            <ChevronLeft className="size-[22px]" />
          </button>
        ) : (
          <span />
        )}
        {step > 0 && (
          <div className="flex gap-1.5" aria-label={`Etapa ${step} de ${STEPS.length - 1}: ${STEPS[step]}`}>
            {STEPS.slice(1).map((s, i) => (
              <span key={s} className={cn("h-1.5 rounded-full transition-all duration-300", i + 1 === step ? "w-5 bg-accent" : i + 1 < step ? "w-1.5 bg-accent/60" : "w-1.5 bg-fill-2")} />
            ))}
          </div>
        )}
        <span className="size-10" />
      </div>
      <div className="relative w-full max-w-md flex-1 pt-8 md:pt-16">
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -40 }}
            transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
          >
            {content[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
