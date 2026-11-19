import "server-only";
import type { SourceRecord } from "./records";
import { formatDay, formatMonth } from "@/lib/format";
import { familyGlossary } from "@/lib/vocabulary";

/**
 * Motor local: compõe rascunhos exclusivamente a partir dos registros existentes.
 * Não inventa fatos — cada parágrafo carrega as chaves dos registros que o fundamentam,
 * e lacunas viram marcadores explícitos para o professor completar.
 */

export type DraftParagraph = { text: string; sources: string[] };
export type Draft = { paragraphs: DraftParagraph[]; gaps: string[] };

const firstSentence = (t: string) => {
  const s = t.trim().split(/(?<=[.!?])\s+/)[0] ?? t;
  return s.length > 260 ? `${s.slice(0, 257)}…` : s;
};
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const join = (items: string[]) => (items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`);

export function localParecer(name: string, periodLabel: string, records: SourceRecord[]): Draft {
  const paragraphs: DraftParagraph[] = [];
  const gaps: string[] = [];

  // 1. Sondagens: evolução entre o primeiro e o último ponto de cada área
  const byKind = new Map<string, SourceRecord[]>();
  for (const r of records.filter((r) => r.type === "assessment")) byKind.set(r.kind!, [...(byKind.get(r.kind!) ?? []), r]);
  const sentences: string[] = [];
  const srcA: string[] = [];
  for (const [, list] of byKind) {
    const first = list[0];
    const last = list[list.length - 1];
    const area = last.label.replace(/^Sondagem de /, "").replace(/ \(.+\)$/, "");
    const lvl = (r: SourceRecord) => r.text.match(/^Nível: ([^.]+)/)?.[1] ?? "";
    if (list.length >= 2 && lvl(first) !== lvl(last)) {
      sentences.push(`na sondagem de ${area}, passou de ${lvl(first).toLowerCase()} (${formatMonth(first.date).toLowerCase()}) para ${lvl(last).toLowerCase()} (${formatMonth(last.date).toLowerCase()})`);
      srcA.push(first.key, last.key);
    } else if (last) {
      sentences.push(`na sondagem de ${area}, ${list.length >= 2 ? "manteve-se" : "encontra-se"} no nível ${lvl(last).toLowerCase()}`);
      srcA.push(last.key);
    }
    const note = list.filter((r) => r.text.includes("Observação:")).at(-1);
    if (note) {
      sentences.push(`na mesma sondagem, foi registrado: “${note.text.split("Observação: ")[1]}”`);
      srcA.push(note.key);
    }
  }
  if (sentences.length) paragraphs.push({ text: `Durante o ${periodLabel}, ${sentences.join("; ")}.`.replace("Durante o ", "Durante o ").replace(/^(.)/, (m) => m.toUpperCase()), sources: [...new Set(srcA)] });
  else gaps.push("Nenhuma sondagem registrada no período.");

  // 2. Conquistas, observações e participação — nas palavras do próprio professor
  const obs = records.filter((r) => r.type === "journal" && ["conquista", "observacao", "participacao"].includes(r.kind ?? ""));
  if (obs.length) {
    const picked = obs.slice(-3);
    paragraphs.push({
      text: `Entre as observações do período, destaca-se que ${picked.map((r) => lowerFirst(firstSentence(r.text)).replace(/\.$/, "")).join(". Além disso, ")}.`,
      sources: picked.map((r) => r.key),
    });
  } else gaps.push("Não há observações individuais registradas no período.");

  // 3. Dificuldades, estratégias e intervenções
  const diff = records.filter((r) => r.type === "journal" && r.kind === "dificuldade");
  const strat = records.filter((r) => r.type === "journal" && (r.kind === "estrategia" || r.kind === "intervencao"));
  if (diff.length || strat.length) {
    const parts: string[] = [];
    if (diff.length) parts.push(`foi observado que ${lowerFirst(firstSentence(diff.at(-1)!.text)).replace(/\.$/, "")}`);
    if (strat.length) parts.push(`como estratégia, ${lowerFirst(firstSentence(strat.at(-1)!.text)).replace(/\.$/, "")}`);
    paragraphs.push({ text: `${parts.join(". Diante disso, ").replace(/^(.)/, (m) => m.toUpperCase())}.`, sources: [...diff.slice(-1), ...strat.slice(-1)].map((r) => r.key) });
  }

  // 4. Avaliações e frequência
  const grades = records.filter((r) => r.type === "grade");
  const att = records.filter((r) => r.type === "attendance");
  const facts: string[] = [];
  if (grades.length) facts.push(`nas avaliações do período, obteve ${join(grades.slice(-3).map((g) => `${g.text.replace("Conceito: ", "conceito ").replace("Nota: ", "nota ")} em ${g.label.split(" de ")[1]?.split(" (")[0] ?? g.label}`))}`);
  if (att.length) facts.push(`teve ${lowerFirst(att.at(-1)!.text.split(" (")[0])}`);
  if (facts.length) paragraphs.push({ text: `${facts.join("; e ").replace(/^(.)/, (m) => m.toUpperCase())}.`, sources: [...grades.slice(-3), ...att.slice(-1)].map((r) => r.key) });

  paragraphs.push({ text: `[Próximos passos: escreva aqui o que será priorizado com ${name.split(" ")[0]} e como a família pode apoiar.]`, sources: [] });
  if (!records.some((r) => r.type === "journal" && r.kind === "conquista")) gaps.push("Considere registrar uma conquista recente — pareceres equilibrados ajudam a família.");
  return { paragraphs, gaps };
}

export function localFeedback(name: string, guardianFirst: string | null, tone: string, records: SourceRecord[]): Draft {
  const first = name.split(" ")[0];
  const hello = guardianFirst ? `Olá, ${guardianFirst}!` : "Olá, família!";
  const positive = records.filter((r) => r.type === "journal" && ["conquista", "participacao", "observacao"].includes(r.kind ?? "")).slice(-1)[0];
  const progress = records.filter((r) => r.type === "assessment" && (r.delta ?? 0) > 0).slice(-1)[0];
  const difficulty = records.filter((r) => r.type === "journal" && r.kind === "dificuldade").slice(-1)[0];

  if ((tone === "evolucao" || tone === "autonomia") && progress) {
    const lvl = progress.text.match(/^Nível: ([^.]+)/)?.[1]?.toLowerCase();
    return {
      paragraphs: [
        { text: `${hello} Queria compartilhar uma boa notícia: na última ${progress.label.split(" (")[0].toLowerCase()}, ${first} avançou para o nível “${lvl}”.`, sources: [progress.key] },
        ...(positive ? [{ text: `Em sala, também percebemos que ${lowerFirst(firstSentence(positive.text))}`, sources: [positive.key] }] : []),
        { text: "[Sugestão para casa: escreva uma ideia simples para a família apoiar este avanço.]", sources: [] },
      ],
      gaps: [],
    };
  }
  if (tone === "a_desenvolver" && difficulty) {
    return {
      paragraphs: [
        { text: `${hello} Gostaria de compartilhar algo que estamos trabalhando com ${first}: ${lowerFirst(firstSentence(difficulty.text))}`, sources: [difficulty.key] },
        ...(positive ? [{ text: `Ao mesmo tempo, vale celebrar que ${lowerFirst(firstSentence(positive.text))}`, sources: [positive.key] }] : []),
        { text: "[Como a família pode ajudar: descreva uma atividade simples, sem custo, que caiba na rotina.]", sources: [] },
      ],
      gaps: [],
    };
  }
  if (positive) {
    return {
      paragraphs: [
        { text: `${hello} Queria compartilhar um momento especial: ${lowerFirst(firstSentence(positive.text))}`, sources: [positive.key] },
        { text: `Obrigada por acompanharem ${first} de perto — isso faz diferença.`, sources: [] },
      ],
      gaps: [],
    };
  }
  return { paragraphs: [{ text: `${hello} `, sources: [] }], gaps: [`Não encontrei registros recentes de ${first} para fundamentar uma sugestão. Escreva livremente ou registre uma observação antes.`] };
}

export type WeeklyDraft = { title: string; sections: { key: string; title: string; body: string; sources: string[] }[]; gaps: string[] };

export function localWeekly(records: SourceRecord[], upcoming: string[], notices: string[]): WeeklyDraft {
  const content = records.filter((r) => r.kind === "conteudo");
  const activities = records.filter((r) => r.kind === "atividade");
  const wins = records.filter((r) => r.kind === "conquista");
  const sec = (key: string, title: string, list: SourceRecord[]) =>
    list.length ? [{ key, title, body: list.map((r) => r.text.trim()).join("\n\n"), sources: list.map((r) => r.key) }] : [];
  const sections = [
    ...sec("trabalhamos", "O que trabalhamos", content),
    ...sec("atividades", "Atividades e projetos", activities),
    ...sec("conquistas", "Descobertas e conquistas", wins),
    { key: "casa", title: "Para continuar em casa", body: "", sources: [] },
    ...(upcoming.length ? [{ key: "proximos", title: "Próximos passos", body: upcoming.join("\n"), sources: [] }] : []),
    ...(notices.length ? [{ key: "avisos", title: "Avisos", body: notices.join("\n"), sources: [] }] : []),
  ];
  const titleFrom = content[0]?.label.split(" — ")[1]?.replace(/ \(.+\)$/, "");
  return {
    title: titleFrom ? `Nesta semana: ${titleFrom.toLowerCase()}` : "Nossa semana",
    sections,
    gaps: [
      ...(records.length === 0 ? ["Não há registros da turma nesta semana no diário. Registre conteúdos e atividades para que a sugestão fique mais completa."] : []),
      "Escreva uma sugestão simples para casa — algo que caiba na rotina de qualquer família.",
    ],
  };
}

/** Explica termos pedagógicos para a família, sem mudar o texto do professor. */
export function familyFriendly(text: string): { text: string; explained: { term: string; meaning: string }[] } {
  const explained: { term: string; meaning: string }[] = [];
  for (const [term, meaning] of Object.entries(familyGlossary)) {
    if (new RegExp(`\\b${term}\\b`, "i").test(text)) explained.push({ term, meaning });
  }
  return { text, explained };
}

export function describeRange(from: string, to: string) {
  return `${formatDay(from)} a ${formatDay(to)}`;
}
