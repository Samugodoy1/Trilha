"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Printer, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/fields";
import { Tag } from "@/components/ui/misc";
import { SaveIndicator, type SaveState } from "@/components/ui/save-indicator";
import { useToast } from "@/components/ui/toast";
import { saveReportAction } from "@/server/actions/reports";
import { formatDay } from "@/lib/format";

type Report = {
  id: string;
  title: string;
  content: string;
  status: "draft" | "approved";
  visibility: "private" | "coordination" | "family";
  aiAssisted: boolean;
  sources: { type: string; id: string; label: string; date: string }[];
};

/** Documento editável com salvamento automático, fontes citadas e impressão em PDF. */
export function ReportEditor({ report, header, readOnly }: { report: Report; header: { school: string; student: string; className: string; period: string; author: string }; readOnly?: boolean }) {
  const [title, setTitle] = useState(report.title);
  const [content, setContent] = useState(report.content);
  const [save, setSave] = useState<SaveState>("idle");
  const [status, setStatus] = useState(report.status);
  const [shared, setShared] = useState(report.visibility === "family");
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const first = useRef(true);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (area.current) {
      area.current.style.height = "auto";
      area.current.style.height = `${area.current.scrollHeight}px`;
    }
  }, [content]);

  useEffect(() => {
    if (readOnly) return;
    if (first.current) {
      first.current = false;
      return;
    }
    setSave("saving");
    const t = setTimeout(async () => {
      const res = await saveReportAction({ id: report.id, title, content });
      setSave(res.ok ? "saved" : "error");
    }, 900);
    return () => clearTimeout(t);
  }, [title, content, report.id, readOnly]);

  const hasPlaceholders = /\[[^\]]{3,}\]/.test(content);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="no-print mb-4 flex flex-wrap items-center gap-2">
          {report.aiAssisted && (
            <Tag tone="accent" icon={Sparkles}>
              Rascunho a partir dos registros
            </Tag>
          )}
          {status === "approved" ? <Tag tone="positive" icon={CheckCircle2}>Aprovado</Tag> : <Tag>Rascunho</Tag>}
          <span className="ml-auto">{!readOnly && <SaveIndicator state={save} savedLabel="Salvo" />}</span>
        </div>

        <article className="print-page rounded-[20px] bg-surface px-6 py-8 shadow-e1 md:px-12 md:py-12">
          <p className="text-footnote font-semibold tracking-[0.03em] text-label-2 uppercase">{header.school}</p>
          {readOnly ? (
            <h1 className="mt-2 text-title-1">{title}</h1>
          ) : (
            <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Título" className="mt-2 w-full bg-transparent text-title-1 font-bold outline-none" />
          )}
          <p className="mt-1 text-callout text-label-2">
            {header.student} · {header.className} · {header.period}
          </p>
          <div className="my-6 h-px bg-separator" />
          {readOnly ? (
            <div className="space-y-4 text-body leading-relaxed whitespace-pre-line">{content}</div>
          ) : (
            <textarea
              ref={area}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              aria-label="Texto do relatório"
              className="w-full resize-none bg-transparent font-serif text-[1.0625rem] leading-[1.7] outline-none [font-family:ui-serif,'New_York','Iowan_Old_Style',Georgia,serif]"
            />
          )}
          <div className="mt-12 hidden print:block">
            <div className="w-64 border-t border-black pt-1 text-footnote">{header.author}</div>
          </div>
        </article>
      </div>

      <aside className="no-print min-w-0 space-y-6">
        {!readOnly && (
          <div className="space-y-3">
            {hasPlaceholders && <p className="text-footnote text-warning-ink">Complete os trechos entre colchetes antes de aprovar.</p>}
            {status === "draft" ? (
              <Button
                size="lg"
                loading={pending}
                disabled={hasPlaceholders}
                onClick={() =>
                  start(async () => {
                    const res = await saveReportAction({ id: report.id, title, content, approve: true });
                    if (!res.ok) return toast({ title: res.error ?? "Erro", tone: "error" });
                    setStatus("approved");
                    toast({ title: "Relatório aprovado" });
                    router.refresh();
                  })
                }
              >
                Aprovar
              </Button>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface-2 px-4 py-3">
                <span>
                  <span className="block text-callout">Compartilhar com a família</span>
                  <span className="block text-footnote text-label-2">Aparece em “Evolução”, com explicações simples</span>
                </span>
                <Toggle
                  checked={shared}
                  label="Compartilhar com a família"
                  onChange={async (v) => {
                    setShared(v);
                    const res = await saveReportAction({ id: report.id, title, content, shareWithFamily: v });
                    if (!res.ok) {
                      setShared(!v);
                      toast({ title: res.error ?? "Erro", tone: "error" });
                    } else toast({ title: v ? "Compartilhado com a família" : "Agora é só para a escola" });
                  }}
                />
              </div>
            )}
          </div>
        )}
        <Button variant="gray" size="lg" icon={Printer} onClick={() => window.print()}>
          Imprimir ou salvar PDF
        </Button>

        <section aria-labelledby="fontes">
          <h2 id="fontes" className="mb-1 font-sans text-headline">
            Fontes
          </h2>
          <p className="mb-3 text-footnote text-label-2">Registros usados para compor este rascunho. Nada além deles foi considerado.</p>
          {report.sources.length === 0 ? (
            <p className="text-subhead text-label-2">Nenhum registro citado.</p>
          ) : (
            <ol className="space-y-2">
              {report.sources.map((s, i) => (
                <li key={`${s.id}-${i}`} className="rounded-[12px] bg-surface-2 px-3 py-2">
                  <p className="text-footnote font-semibold">{s.label}</p>
                  <p className="text-caption text-label-2">{formatDay(s.date)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  );
}
