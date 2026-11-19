import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import * as z from "zod/v4";
import type { SourceRecord } from "./records";
import type { Draft } from "./local";

/**
 * Redação assistida com Claude.
 * - Só é usada quando há ANTHROPIC_API_KEY e a escola habilitou a IA em Ajustes.
 * - Dados mínimos e pseudonimizados: nomes viram marcadores antes do envio; datas de nascimento,
 *   matrículas e identificadores internos nunca saem do servidor.
 * - A resposta precisa citar as chaves dos registros; citações inválidas são descartadas.
 * - Nunca publica nada: o resultado é sempre um rascunho para revisão humana.
 */

const MODEL = "claude-opus-5-5";

const SYSTEM = `Você é uma assistente pedagógica que ajuda professoras e professores da educação básica brasileira a redigir textos a partir dos registros que ELES fizeram.

Regras inegociáveis:
- Use somente as informações dos registros fornecidos. Não invente fatos, falas, notas, níveis ou datas.
- Cada parágrafo deve listar em "sources" as chaves (r1, r2…) dos registros que o fundamentam. Parágrafos sem fundamento não devem existir, exceto marcadores entre colchetes para o professor completar.
- Não faça diagnósticos clínicos, psicológicos ou neuropsicológicos, nem sugira hipóteses de transtorno. Não rotule a criança.
- Não tome decisões pedagógicas: no máximo sugira, como rascunho, em linguagem condicional.
- Refira-se à criança apenas como [ESTUDANTE]. Colegas aparecem como [COLEGA].
- Português do Brasil, tom acolhedor, claro e respeitoso, sem jargão desnecessário.
- Se faltar informação para algo importante, registre em "gaps" em vez de preencher.`;

const OutputSchema = z.object({
  paragraphs: z.array(z.object({ text: z.string(), sources: z.array(z.string()) })),
  gaps: z.array(z.string()),
});

export function claudeAvailable(aiEnabled: boolean) {
  return Boolean(process.env.ANTHROPIC_API_KEY) && aiEnabled;
}

function pseudonymize(text: string, studentNames: string[], otherNames: string[]) {
  let out = text;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const n of studentNames.filter(Boolean).sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`\\b${esc(n)}\\b`, "gi"), "[ESTUDANTE]");
  for (const n of otherNames.filter((x) => x && x.length > 2).sort((a, b) => b.length - a.length)) out = out.replace(new RegExp(`\\b${esc(n)}\\b`, "gi"), "[COLEGA]");
  return out;
}

export async function claudeDraft(args: {
  task: string;
  records: SourceRecord[];
  studentNames: string[];
  otherNames: string[];
  displayFirstName: string;
}): Promise<Draft | null> {
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  const payload = args.records.map((r) => ({
    chave: r.key,
    tipo: r.type,
    data: r.date,
    titulo: pseudonymize(r.label, args.studentNames, args.otherNames),
    texto: pseudonymize(r.text, args.studentNames, args.otherNames),
  }));
  try {
    const res = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 6000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(OutputSchema) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `${args.task}\n\nRegistros (JSON):\n${JSON.stringify(payload, null, 1)}`,
        },
      ],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return null;
    const valid = new Set(args.records.map((r) => r.key));
    const restore = (t: string) => t.replaceAll("[ESTUDANTE]", args.displayFirstName).replaceAll("[COLEGA]", "um colega");
    return {
      paragraphs: res.parsed_output.paragraphs
        .map((p) => ({ text: restore(p.text), sources: p.sources.filter((s) => valid.has(s)) }))
        // descarta parágrafos factuais sem nenhuma fonte válida
        .filter((p) => p.sources.length > 0 || p.text.trim().startsWith("[")),
      gaps: res.parsed_output.gaps.map(restore),
    };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) console.warn("[ai] limite de uso atingido; usando motor local");
    else if (err instanceof Anthropic.APIError) console.warn("[ai] erro da API", err.status);
    else console.warn("[ai] falha inesperada", err);
    return null;
  }
}
