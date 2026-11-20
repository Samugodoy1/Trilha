import { BookOpen, CalendarDays, ChartNoAxesColumn, ChevronRight, ClipboardList, Clock, Ellipsis, HeartHandshake, House, ListChecks, Lock, MessageCircle, NotebookPen, Plus, Search, Sun, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Telas do próprio app, desenhadas em HTML com os mesmos tokens — nada de captura de tela.
 * Os dados são fictícios.
 */

export function Phone({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  // Tela real de 390 × 844 reduzida para caber no aparelho.
  return (
    <figure aria-label={label} className={cn("relative shrink-0 rounded-[52px] bg-[#0b0b0c] p-[9px] shadow-[0_40px_80px_-30px_rgb(0_0_0/0.45),0_0_0_1px_rgb(255_255_255/0.06)_inset]", className)}>
      <div className="relative h-[606px] w-[280px] overflow-hidden rounded-[44px] bg-canvas">
        <div className="pointer-events-none absolute top-[10px] left-1/2 z-20 h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
        <div className="h-[844px] w-[390px] origin-top-left scale-[0.718]" aria-hidden>
          <StatusBar />
          {children}
        </div>
      </div>
    </figure>
  );
}

function StatusBar() {
  return (
    <div className="flex h-[54px] items-end justify-between px-8 pb-2 text-[17px] font-semibold">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]">
          {[5, 7, 9, 11].map((h) => (
            <span key={h} className="w-[3px] rounded-[1px] bg-label" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-1 h-[12px] w-[24px] rounded-[4px] border border-label/40 p-[1.5px]">
          <span className="block h-full w-[70%] rounded-[2px] bg-label" />
        </span>
      </span>
    </div>
  );
}

function TabBar({ active, items, fab }: { active: number; items: { icon: typeof BookOpen; label: string }[]; fab?: boolean }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 px-4 pb-6">
      <div className="glass flex h-[62px] flex-1 items-center rounded-full px-1">
        {items.map((it, i) => (
          <span key={it.label} className={cn("flex h-[54px] flex-1 flex-col items-center justify-center gap-[3px] rounded-full text-[10px] font-semibold", i === active ? "bg-fill text-accent" : "text-label")}>
            <it.icon className="size-[22px]" strokeWidth={i === active ? 2.3 : 1.9} />
            {it.label}
          </span>
        ))}
      </div>
      {fab && (
        <span className="flex size-[62px] items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_30px_color-mix(in_oklab,var(--accent)_45%,transparent)]">
          <Plus className="size-7" strokeWidth={2.3} />
        </span>
      )}
    </div>
  );
}

function Tile({ icon: Icon, label, count, tint }: { icon: typeof BookOpen; label: string; count: number; tint: string }) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-[14px] bg-surface-2 p-3 dark:bg-surface">
      <div className="flex items-start justify-between">
        <span className="flex size-8 items-center justify-center rounded-full text-white" style={{ background: count ? tint : "#aeaeb2" }}>
          <Icon className="size-[17px]" strokeWidth={2.4} />
        </span>
        <span className={cn("text-[28px] leading-none font-bold tabular-nums", !count && "text-label-3")}>{count}</span>
      </div>
      <span className="text-[15px] font-semibold text-label-2">{label}</span>
    </div>
  );
}

export function TeacherToday() {
  const rows = [
    { icon: MessageCircle, tint: "var(--accent)", title: "Responder Juliana", detail: "Sugestões de leitura para casa" },
    { icon: ClipboardList, tint: "var(--writing)", title: "Lançar sondagem de escrita", detail: "3º ano A · 4º bimestre", warn: "não registrada" },
    { icon: BookOpen, tint: "var(--reading)", title: "Publicar a Nossa semana", detail: "3º ano A", warn: "ainda não publicada" },
    { icon: HeartHandshake, tint: "var(--attendance)", title: "Ver o que Carlos compartilhou", detail: "Ana Clara Nunes" },
  ];
  return (
    <div className="relative h-[790px]">
      <div className="px-5 pt-5">
        <p className="text-[13px] font-semibold tracking-[0.03em] text-label-2 uppercase">Quinta-feira, 12 de março</p>
        <div className="flex items-center justify-between">
          <h3 className="text-[34px] leading-[40px] font-bold tracking-[-0.026em] text-accent">Hoje</h3>
          <span className="glass flex size-9 items-center justify-center rounded-full">
            <Search className="size-[18px]" strokeWidth={2.2} />
          </span>
        </div>
        <p className="mt-1 text-[16px] text-label-2">Bom dia, Helena. 1º bimestre.</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Tile icon={MessageCircle} label="Recados" count={1} tint="var(--accent)" />
          <Tile icon={ClipboardList} label="Sondagens" count={2} tint="var(--writing)" />
          <Tile icon={UserRound} label="Acompanhar" count={3} tint="var(--critical)" />
          <Tile icon={ListChecks} label="Entregas" count={0} tint="var(--reading)" />
        </div>
        <h4 className="mt-7 text-[22px] font-bold tracking-[-0.018em]">Para hoje</h4>
      </div>
      <ul className="mt-1">
        {rows.map((r, i) => (
          <li key={r.title} className="flex items-center gap-3.5 pl-5">
            <span className="flex size-[30px] items-center justify-center rounded-full text-white" style={{ background: r.tint }}>
              <r.icon className="size-4" strokeWidth={2.4} />
            </span>
            <span className={cn("flex flex-1 items-center py-[11px] pr-5", i < rows.length - 1 && "shadow-[inset_0_-0.5px_0_var(--separator)]")}>
              <span className="flex-1">
                <span className="block text-[17px]">{r.title}</span>
                <span className="block text-[15px] text-label-2">
                  {r.detail}
                  {r.warn && <span className="text-critical-ink"> – {r.warn}</span>}
                </span>
              </span>
              <ChevronRight className="size-[15px] text-label-3" strokeWidth={2.6} />
            </span>
          </li>
        ))}
      </ul>
      <TabBar
        active={0}
        fab
        items={[
          { icon: Sun, label: "Hoje" },
          { icon: Users, label: "Turmas" },
          { icon: MessageCircle, label: "Mensagens" },
          { icon: Ellipsis, label: "Mais" },
        ]}
      />
    </div>
  );
}

export function FamilyHome() {
  return (
    <div className="relative h-[790px] bg-surface-2 dark:bg-canvas">
      <div className="px-5 pt-5">
        <p className="text-[13px] font-semibold tracking-[0.03em] text-label-2 uppercase">3º ano A · EMEF Jardim das Acácias</p>
        <div className="flex items-center justify-between">
          <h3 className="text-[34px] leading-[40px] font-bold tracking-[-0.026em]">Lucas</h3>
          <span className="flex size-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#a5abb8,#858994)] text-[13px] font-semibold text-white">LR</span>
        </div>
        <p className="mt-1 text-[16px] text-label-2">Boa noite, Juliana.</p>
      </div>
      <div className="mt-5 space-y-3 px-4">
        <article className="rounded-[20px] bg-surface p-4 shadow-e1">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-reading-ink">
            <BookOpen className="size-4" strokeWidth={2.2} /> Nossa semana
          </p>
          <p className="mt-1.5 text-[20px] leading-[25px] font-semibold tracking-[-0.014em]">Semana das sementes</p>
          <p className="mt-1.5 text-[15px] text-label-2">Plantamos feijão no algodão e registramos o crescimento num diário de observação.</p>
          <div className="mt-3 rounded-[12px] bg-surface-2 p-3 dark:bg-surface-raised">
            <p className="text-[13px] font-semibold text-label-2 uppercase">Para continuar em casa</p>
            <p className="mt-0.5 text-[15px]">Perguntem ao Lucas o que a planta precisa para crescer.</p>
          </div>
        </article>
        <article className="rounded-[20px] bg-surface p-4 shadow-e1">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-writing-ink">
            <NotebookPen className="size-4" strokeWidth={2.2} /> Escrita
          </p>
          <p className="mt-1.5 text-[20px] leading-[25px] font-semibold tracking-[-0.014em]">Avançou para silábico com valor sonoro</p>
          <p className="mt-1.5 text-[15px] text-label-2">Já usa uma letra para cada sílaba, ligando letras e sons.</p>
        </article>
      </div>
      <TabBar
        active={0}
        items={[
          { icon: House, label: "Início" },
          { icon: CalendarDays, label: "Agenda" },
          { icon: ChartNoAxesColumn, label: "Evolução" },
          { icon: MessageCircle, label: "Mensagens" },
          { icon: Ellipsis, label: "Mais" },
        ]}
      />
    </div>
  );
}

/** Folha de registro rápido, como abre ao tocar no +. */
export function QuickRecordSheet() {
  return (
    <div className="relative h-[790px] overflow-hidden">
      <div className="pointer-events-none origin-top scale-[0.94] rounded-[20px] opacity-90">
        <TeacherToday />
      </div>
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-surface-2 px-5 pt-2 pb-10 dark:bg-surface">
        <div className="mx-auto mb-3 h-[5px] w-9 rounded-full bg-label-3/40" />
        <div className="flex items-center justify-between">
          <span className="text-[17px] text-accent">Cancelar</span>
          <span className="text-[17px] font-semibold">Novo registro</span>
          <span className="text-[17px] font-semibold text-accent">Salvar</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {["Ana Clara", "Lucas", "Sofia"].map((n) => (
            <span key={n} className="flex h-9 items-center gap-1.5 rounded-full bg-accent-soft pr-3 pl-1 text-[15px] font-semibold text-accent">
              <span className="flex size-7 items-center justify-center rounded-full bg-[linear-gradient(180deg,#a5abb8,#858994)] text-[11px] text-white">{n.slice(0, 2).toUpperCase()}</span>
              {n}
            </span>
          ))}
          <span className="flex h-9 items-center rounded-full bg-fill px-3 text-[15px] text-label-2">+ alunos</span>
        </div>
        <div className="mt-4 rounded-[14px] bg-surface p-4 dark:bg-surface-raised">
          <p className="text-[17px] leading-[24px]">
            Montaram juntos a lista de palavras do campo semântico “frutas”. A Sofia escreveu MLC para melancia
            <span className="ml-0.5 inline-block h-[20px] w-[2px] translate-y-[3px] animate-pulse bg-accent" />
          </p>
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden">
          {[
            ["Observação", "var(--notes)"],
            ["Conquista", "var(--achievement)"],
            ["Atividade", "var(--writing)"],
          ].map(([l, c], i) => (
            <span key={l} className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[15px] font-semibold", i === 0 ? "bg-label text-canvas" : "bg-fill")}>
              <span className="size-2.5 rounded-full" style={{ background: c }} />
              {l}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[14px] bg-surface px-4 py-3 dark:bg-surface-raised">
          <span className="flex items-center gap-3 text-[17px]">
            <span className="flex size-[30px] items-center justify-center rounded-full bg-[#8e8e93] text-white">
              <Lock className="size-4" strokeWidth={2.4} />
            </span>
            Quem vê
          </span>
          <span className="text-[17px] text-label-2">Somente eu</span>
        </div>
      </div>
    </div>
  );
}

/** Conversa com horário de atendimento visível. */
export function MessageThread() {
  return (
    <div className="relative h-[790px]">
      <div className="flex flex-col items-center border-b border-separator/60 pt-2 pb-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-[linear-gradient(180deg,#a5abb8,#858994)] text-[14px] font-semibold text-white">HP</span>
        <span className="mt-1 text-[13px] font-semibold">Helena Prado</span>
        <span className="text-[12px] text-label-2">Professora do 3º ano A</span>
      </div>
      <div className="mx-6 mt-4 flex items-start justify-center gap-1.5 text-center text-[13px] text-label-2">
        <Clock className="mt-0.5 size-3.5 shrink-0" strokeWidth={2.4} />
        Helena lê os recados de seg. a sex., das 13h às 17h.
      </div>
      <div className="mt-5 space-y-2 px-4 text-[17px]">
        <p className="text-center text-[12px] font-semibold text-label-2">Ontem 19:42</p>
        <p className="mr-14 rounded-[20px] rounded-bl-[6px] bg-fill-2 px-4 py-2.5">Boa noite! A tarefa do desenho da planta é para amanhã?</p>
        <p className="mr-14 rounded-[20px] rounded-bl-[6px] bg-fill-2 px-4 py-2.5">E pode ser feito com lápis de cor?</p>
        <p className="pt-3 text-center text-[12px] font-semibold text-label-2">Hoje 13:05</p>
        <p className="ml-14 rounded-[20px] rounded-br-[6px] bg-accent px-4 py-2.5 text-white">Oi, Juliana! É para sexta. Pode sim, lápis de cor ou giz de cera.</p>
        <p className="pr-1 text-right text-[12px] text-label-2">Lido</p>
        <p className="mr-14 rounded-[20px] rounded-bl-[6px] bg-fill-2 px-4 py-2.5">Obrigada, professora!</p>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 pt-2 pb-8">
        <span className="flex h-10 flex-1 items-center rounded-full px-4 text-[17px] text-label-3 shadow-[0_0_0_0.5px_var(--separator-strong)]">Mensagem</span>
        <span className="flex size-9 items-center justify-center rounded-full bg-accent/40 text-white">
          <ChevronRight className="size-5 -rotate-90" strokeWidth={2.6} />
        </span>
      </div>
    </div>
  );
}
