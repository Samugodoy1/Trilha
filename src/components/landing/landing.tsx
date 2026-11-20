import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Clock,
  EyeOff,
  HeartHandshake,
  KeyRound,
  LayoutGrid,
  Lock,
  NotebookPen,
  Printer,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { BrandMark } from "@/components/brand";
import { FamilyHome, MessageThread, Phone, QuickRecordSheet, TeacherToday } from "./mocks";
import { GrowthCard, SondagemDemo } from "./sondagem-demo";

/* Tipografia de página de produto: maior que a do app, mesma família e mesmo tracking. */
const display = "font-display font-bold tracking-[-0.035em] text-balance";

function Eyebrow({ icon: Icon, color, children, center }: { icon: typeof BookOpen; color: string; children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`flex items-center gap-1.5 text-callout font-semibold ${center ? "justify-center" : ""}`} style={{ color }}>
      <Icon aria-hidden className="size-[18px]" strokeWidth={2.2} />
      {children}
    </p>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t-[0.5px] border-separator pt-4">
      <p className="text-headline">{title}</p>
      <p className="mt-1 text-callout text-label-2">{children}</p>
    </div>
  );
}

function Primary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="press inline-flex h-[50px] items-center justify-center gap-1.5 rounded-full bg-accent px-6 text-headline text-on-accent hover:bg-accent-strong">
      {children}
    </Link>
  );
}

export function Landing() {
  return (
    <div className="overflow-x-clip bg-canvas text-label">
      {/* Barra de navegação de vidro */}
      <header className="material-chrome sticky top-0 z-40 pt-safe shadow-[inset_0_-0.5px_0_var(--separator)]">
        <nav aria-label="Principal" className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 text-headline" aria-label="Trilha, início">
            <BrandMark className="size-7" />
            Trilha
          </Link>
          <div className="hidden flex-1 items-center gap-6 text-subhead text-label-2 md:flex">
            <a href="#registros" className="hover:text-label">Professoras</a>
            <a href="#familias" className="hover:text-label">Famílias</a>
            <a href="#coordenacao" className="hover:text-label">Coordenação</a>
            <a href="#privacidade" className="hover:text-label">Privacidade</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/entrar" className="rounded-full px-3 py-1.5 text-subhead font-semibold text-accent hover:bg-accent-soft">
              Entrar
            </Link>
            <Link href="/criar-conta" className="press rounded-full bg-accent px-3.5 py-1.5 text-subhead font-semibold text-on-accent hover:bg-accent-strong">
              Começar
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Abertura */}
        <section className="mx-auto max-w-6xl px-5 pt-14 pb-20 md:px-8 md:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
            <div className="min-w-0 animate-rise">
              <p className="text-callout font-semibold text-accent">Para escolas da Educação Infantil ao Ensino Médio</p>
              <h1 className={`${display} mt-3 text-[clamp(2.5rem,6.4vw,4.5rem)] leading-[1.03] hyphens-manual`}>
                Cada passo da aprendizagem, <span className="text-accent">à vista.</span>
              </h1>
              <p className="mt-6 max-w-[34rem] text-[clamp(1.0625rem,1.6vw,1.3125rem)] leading-[1.45] text-label-2">
                O diário da professora, as sondagens da turma e a conversa com as famílias no mesmo lugar. Feito para o celular, entre uma aula e outra.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Primary href="/criar-conta">
                  Criar a minha turma <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
                </Primary>
                <Link href="/convite" className="inline-flex h-[50px] items-center justify-center rounded-full px-5 text-headline text-accent hover:bg-accent-soft">
                  Tenho um código da escola
                </Link>
              </div>
              <p className="mt-5 text-footnote text-label-3">Grátis para professores. Funciona no navegador e pode ir para a Tela de Início.</p>
            </div>
            <div className="relative mx-auto flex items-start justify-center lg:mx-0">
              <Phone label="Tela Hoje da professora" className="relative z-10">
                <TeacherToday />
              </Phone>
              <Phone label="Tela Início da família" className="mt-20 -ml-32 hidden origin-top-left scale-[0.9] xl:block">
                <FamilyHome />
              </Phone>
            </div>
          </div>
        </section>

        {/* Faixa de fatos — coisas que só existem neste app */}
        <section aria-label="Em números" className="border-y-[0.5px] border-separator bg-surface-2 dark:bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-8 px-5 py-10 md:grid-cols-4 md:px-8">
            {[
              ["10 s", "para registrar uma observação"],
              ["1 tela", "para lançar a sondagem da turma inteira"],
              ["0", "rankings entre crianças ou turmas"],
              ["14 dias", "de validade para cada código de convite"],
            ].map(([n, t]) => (
              <div key={t}>
                <dt className="sr-only">{t}</dt>
                <dd className={`${display} text-[clamp(1.75rem,4vw,2.5rem)] tabular-nums`}>{n}</dd>
                <dd className="mt-1 text-subhead text-label-2">{t}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Registros */}
        <section id="registros" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <div className="grid items-center gap-14 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-20">
            <Phone label="Folha de novo registro" className="mx-auto lg:order-none">
              <QuickRecordSheet />
            </Phone>
            <div className="min-w-0">
              <Eyebrow icon={NotebookPen} color="var(--writing-ink)">Registros</Eyebrow>
              <h2 className={`${display} mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]`}>Dez segundos entre uma atividade e outra.</h2>
              <p className="mt-5 max-w-[32rem] text-body text-label-2">
                Toque no +, escolha as crianças, escreva ou dite. Foto, se quiser. O Trilha organiza tudo na linha do tempo de cada aluno, sem planilha e sem caderno extra.
              </p>
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                <Point title="Privado por padrão">Cada observação começa em “Somente eu”. Compartilhar com a coordenação ou com a família é uma escolha, registro a registro.</Point>
                <Point title="A Nossa semana se escreve sozinha">O assistente sugere um resumo para as famílias a partir dos seus registros. Você revisa e publica.</Point>
              </div>
            </div>
          </div>
        </section>

        {/* Sondagens */}
        <section id="sondagens" className="scroll-mt-20 bg-surface-2 dark:bg-surface/40">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-20">
            <div className="min-w-0">
              <Eyebrow icon={ClipboardList} color="var(--writing-ink)">Sondagens</Eyebrow>
              <h2 className={`${display} mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]`}>A turma inteira numa tela só.</h2>
              <p className="mt-5 max-w-[32rem] text-body text-label-2">
                Hipóteses de escrita, fluência leitora, números e operações — ou o modelo da sua rede. Um toque por criança, salvo na hora, com o nível anterior ao lado para você ver quem avançou.
              </p>
              <p className="mt-3 max-w-[32rem] text-callout text-label-3">Experimente: toque nos níveis ao lado.</p>
              <div className="mt-10 max-w-[26rem]">
                <GrowthCard />
              </div>
            </div>
            <SondagemDemo />
          </div>
        </section>

        {/* Famílias */}
        <section id="familias" className="scroll-mt-20 mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow icon={HeartHandshake} color="var(--family-ink)" center>
              Famílias
            </Eyebrow>
            <h2 className={`${display} mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]`}>As famílias acompanham. A professora descansa.</h2>
            <p className="mx-auto mt-5 max-w-[36rem] text-body text-label-2">
              Em vez do grupo de WhatsApp às dez da noite: o que a turma aprendeu na semana, o que fazer em casa e um canal de recados com horário de atendimento à vista.
            </p>
          </div>
          <div className="mt-16 flex flex-wrap items-start justify-center gap-10">
            <Phone label="Início da família com a Nossa semana">
              <FamilyHome />
            </Phone>
            <Phone label="Conversa com a professora" className="md:mt-16">
              <MessageThread />
            </Phone>
          </div>
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 md:grid-cols-3">
            <Point title="Cada família, só o seu filho">Nada de turma inteira exposta. O responsável vê apenas o que é sobre a própria criança.</Point>
            <Point title="Desenvolvimento sem siglas">“Silábico com valor sonoro” chega em casa como “já usa uma letra por sílaba, ligando letras e sons”.</Point>
            <Point title="Recado tem hora">A família vê quando você lê os recados. O canal não pede resposta imediata.</Point>
          </div>
        </section>

        {/* Coordenação */}
        <section id="coordenacao" className="scroll-mt-20 bg-[#0b0b0c] text-white">
          <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-2 lg:gap-20">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-callout font-semibold text-[#64d2ff]">
                <LayoutGrid aria-hidden className="size-[18px]" strokeWidth={2.2} /> Coordenação
              </p>
              <h2 className={`${display} mt-3 text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]`}>Para apoiar, não para comparar.</h2>
              <p className="mt-5 max-w-[32rem] text-body text-white/65">
                A coordenação vê como cada turma está na última sondagem, sem nomes e sem ranking. E lê só os registros que cada professora decidiu compartilhar.
              </p>
              <ul className="mt-8 space-y-3 text-callout text-white/80">
                {["Distribuição anônima por turma e por modelo", "Orientações para a professora, no tempo dela", "Equipe sob controle: convide, transfira turmas, desative quem saiu"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-[#64d2ff]" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[28px] bg-[#1c1c1e] p-6 shadow-[0_0_0_0.5px_rgb(255_255_255/0.08)]">
              <p className="text-footnote font-semibold text-white/50 uppercase">Hipóteses de escrita · última sondagem</p>
              <div className="mt-5 space-y-5">
                {[
                  ["1º ano A", [9, 6, 5, 2, 1]],
                  ["2º ano A", [2, 3, 6, 7, 6]],
                  ["3º ano A", [0, 2, 3, 5, 13]],
                ].map(([cls, d]) => {
                  const data = d as number[];
                  const total = data.reduce((a, b) => a + b, 0);
                  return (
                    <div key={cls as string}>
                      <div className="flex justify-between text-subhead">
                        <span className="font-semibold">{cls as string}</span>
                        <span className="text-white/50 tabular-nums">{total} crianças</span>
                      </div>
                      <div className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                        {data.map((n, i) => (n ? <span key={i} style={{ flexGrow: n, background: "#ff9f0a", opacity: 0.3 + i * 0.17 }} /> : null))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 text-caption text-white/50">
                        {["PS", "SSV", "SCV", "SA", "A"].map((k, i) => (
                          <span key={k} className="tabular-nums">
                            {k} <span className="font-semibold text-white/80">{data[i]}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-6 text-footnote text-white/45">Turmas em ordem de ano. Nenhuma criança identificada.</p>
            </div>
          </div>
        </section>

        {/* Privacidade — no formato de Ajustes */}
        <section id="privacidade" className="scroll-mt-20 bg-surface-2 dark:bg-canvas">
          <div className="mx-auto max-w-3xl px-5 py-24 md:px-8 md:py-32">
            <div className="text-center">
              <ShieldCheck aria-hidden className="mx-auto size-11 text-positive" strokeWidth={1.8} />
              <h2 className={`${display} mt-4 text-[clamp(2rem,5vw,3.25rem)] leading-[1.05]`}>Dados de crianças pedem mais cuidado.</h2>
              <p className="mx-auto mt-4 max-w-[34rem] text-body text-label-2">O Trilha foi desenhado a partir da LGPD e do princípio do melhor interesse da criança. Na prática:</p>
            </div>
            <ul className="mt-12 overflow-hidden rounded-[14px] bg-surface shadow-e1">
              {[
                [Lock, "#8e8e93", "Somente eu, por padrão", "Observações individuais nascem privadas."],
                [KeyRound, "var(--warning)", "Convite com dois fatores", "Código de uso único + data de nascimento da criança. Saber o nome não basta."],
                [EyeOff, "var(--family)", "Cada família vê o próprio filho", "Fotos e documentos ficam fora de links públicos."],
                [Sparkles, "var(--notes)", "Assistente com nomes ocultados", "Os nomes saem antes de qualquer envio, e nada é publicado sem a sua revisão. Sem diagnósticos."],
                [Clock, "var(--accent)", "Registro de auditoria", "Toda ação sensível fica registrada: quem fez, quando e sobre o quê."],
              ].map(([Icon, tint, t, d], i, a) => {
                const I = Icon as typeof Lock;
                return (
                  <li key={t as string} className="flex items-start gap-3.5 pl-4">
                    <span className="mt-3 flex size-[30px] shrink-0 items-center justify-center rounded-full text-white" style={{ background: tint as string }}>
                      <I aria-hidden className="size-4" strokeWidth={2.4} />
                    </span>
                    <span className={`flex-1 py-3 pr-4 ${i < a.length - 1 ? "shadow-[inset_0_-0.5px_0_var(--separator)]" : ""}`}>
                      <span className="block text-body">{t as string}</span>
                      <span className="block text-subhead text-label-2">{d as string}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Como começar — é uma sequência de verdade, por isso numerada */}
        <section aria-labelledby="comecar-h" className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
          <h2 id="comecar-h" className={`${display} max-w-3xl text-[clamp(2rem,5vw,3.5rem)] leading-[1.05]`}>Segunda-feira, 7h10. Sua turma já está no Trilha.</h2>
          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {[
              [Users, "var(--math)", "Crie a turma", "Escolha a etapa, o ano e o turno. Leva menos de um minuto."],
              [ClipboardList, "var(--writing)", "Cole a lista da secretaria", "Um nome por linha, com a data de nascimento. Direto da planilha."],
              [Printer, "var(--family)", "Mande os bilhetes", "Imprima um convite para cada família e cole na agenda — ou envie pelo WhatsApp."],
            ].map(([Icon, tint, t, d], i) => {
              const I = Icon as typeof Users;
              return (
                <li key={t as string} className="rounded-[20px] bg-surface-2 p-6 dark:bg-surface">
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-[13px] text-white" style={{ background: tint as string }}>
                      <I aria-hidden className="size-[22px]" strokeWidth={2.1} />
                    </span>
                    <span className="font-rounded text-title-2 text-label-3 tabular-nums">{i + 1}</span>
                  </div>
                  <p className="mt-6 text-title-3">{t as string}</p>
                  <p className="mt-1.5 text-callout text-label-2">{d as string}</p>
                </li>
              );
            })}
          </ol>
          <p className="mt-8 text-callout text-label-2">
            Sua escola já usa o Trilha? Peça um código à coordenação — ou a uma colega — e entre direto na equipe.
          </p>
        </section>

        {/* Chamada final */}
        <section className="px-5 pb-24 md:px-8 md:pb-32">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] bg-[linear-gradient(160deg,#4ba3ff_0%,#007aff_55%,#0062e0_100%)] px-6 py-16 text-center text-white md:py-24">
            <BrandMark className="mx-auto size-16 drop-shadow-[0_10px_24px_rgb(0_0_0/0.25)]" />
            <h2 className={`${display} mx-auto mt-6 max-w-3xl text-[clamp(2.1rem,5.5vw,4rem)] leading-[1.04]`}>Sua turma já tem história. Comece a registrar.</h2>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/criar-conta" className="press inline-flex h-[50px] items-center justify-center rounded-full bg-white px-7 text-headline text-[#0062e0] hover:bg-white/90">
                Criar a minha turma
              </Link>
              <Link href="/entrar" className="inline-flex h-[50px] items-center justify-center rounded-full px-6 text-headline text-white hover:bg-white/10">
                Já tenho conta
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t-[0.5px] border-separator">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 pt-8 pb-[max(env(safe-area-inset-bottom),32px)] text-footnote text-label-2 md:flex-row md:items-center md:justify-between md:px-8">
          <span className="flex items-center gap-2">
            <BrandMark className="size-5" /> Trilha · feito para a escola brasileira
          </span>
          <span className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/entrar" className="hover:text-label">Entrar</Link>
            <Link href="/criar-conta" className="hover:text-label">Criar conta</Link>
            <Link href="/convite" className="hover:text-label">Tenho um convite</Link>
            <a href="#privacidade" className="hover:text-label">Privacidade</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

