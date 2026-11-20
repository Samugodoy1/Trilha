"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ImagePlus, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { SegmentedControl, Select } from "@/components/ui/fields";
import { Disclosure, Tag } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { PostCard } from "@/components/family/post-card";
import { saveWeeklyAction, suggestWeeklyAction, uploadPhotoAction, type WeeklySuggestion } from "@/server/actions/weekly";
import { addDays, formatDay, formatDayShort, weekStart as weekStartOf, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import { navigateAfterAction } from "@/lib/navigate";

const STANDARD = [
  { key: "trabalhamos", title: "O que trabalhamos" },
  { key: "atividades", title: "Atividades e projetos" },
  { key: "conquistas", title: "Descobertas e conquistas" },
  { key: "casa", title: "Para continuar em casa" },
  { key: "proximos", title: "Próximos passos" },
  { key: "avisos", title: "Avisos" },
];

type Cls = { id: string; name: string; students: { id: string; name: string; hue: number; imageConsent: boolean }[] };
type Section = { key: string; title: string; body: string };

export function WeeklyComposer({
  classes,
  author,
  initial,
}: {
  classes: Cls[];
  author: { name: string; hue: number };
  initial?: {
    id?: string;
    classId?: string;
    studentId?: string | null;
    weekStart?: string;
    title?: string;
    sections?: Section[];
    photos?: { id: string; caption: string | null }[];
  };
}) {
  const router = useRouter();
  const toast = useToast();
  const [id, setId] = useState(initial?.id);
  const [classId, setClassId] = useState(initial?.classId ?? classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState<string | null>(initial?.studentId ?? null);
  const [week, setWeek] = useState(initial?.weekStart ?? weekStartOf(todayISO()));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [sections, setSections] = useState<Section[]>(
    initial?.sections?.length ? initial.sections : STANDARD.filter((s) => ["trabalhamos", "casa"].includes(s.key)).map((s) => ({ ...s, body: "" })),
  );
  const [photos, setPhotos] = useState<{ id: string; caption: string | null }[]>(initial?.photos ?? []);
  const [suggestion, setSuggestion] = useState<WeeklySuggestion | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [suggesting, startSuggest] = useTransition();
  const [saving, startSave] = useTransition();
  const [uploading, setUploading] = useState(false);

  const cls = classes.find((c) => c.id === classId);
  const noConsent = cls?.students.filter((s) => !s.imageConsent) ?? [];
  const missing = STANDARD.filter((s) => !sections.some((x) => x.key === s.key));
  const recipients = studentId ? 1 : cls?.students.length ?? 0;

  const suggest = () =>
    startSuggest(async () => {
      const res = await suggestWeeklyAction(classId, week);
      if ("error" in res) return toast({ title: res.error, tone: "error" });
      setSuggestion(res);
      if (!title) setTitle(res.title);
      setSections((prev) => {
        const merged = res.sections.map((s) => ({ key: s.key, title: s.title, body: prev.find((p) => p.key === s.key)?.body || s.body }));
        return merged;
      });
      toast({ title: res.sources.length ? `Rascunho criado a partir de ${res.sources.length} registros` : "Sem registros da turma nesta semana", tone: res.sources.length ? "success" : "info" });
    });

  const save = (publish: boolean) =>
    startSave(async () => {
      const res = await saveWeeklyAction({
        id,
        classId,
        studentId,
        weekStart: week,
        title,
        sections,
        publish,
        aiAssisted: Boolean(suggestion),
        sourceEntryIds: suggestion?.sources.map((s) => s.id) ?? [],
        mediaIds: photos.map((p) => p.id),
      });
      if (!res.ok) return toast({ title: res.error, tone: "error" });
      setId(res.id);
      toast({ title: publish ? "Publicado" : "Rascunho guardado", description: publish ? `${recipients} ${recipients === 1 ? "família vai" : "famílias vão"} ver no Trilha.` : undefined });
      if (publish) void navigateAfterAction(router, "/semana");
      else router.refresh();
    });

  const preview = useMemo(
    () => ({
      id: "preview",
      title: title || "Sem título",
      authorName: author.name,
      authorHue: author.hue,
      className: cls?.name ?? "",
      dateLabel: `Semana de ${formatDay(week)}`,
      sections: sections.filter((s) => s.body.trim()),
      photos: photos.map((p) => ({ id: p.id, src: `/api/media/${p.id}`, caption: p.caption })),
      personal: Boolean(studentId),
    }),
    [title, author, cls, week, sections, photos, studentId],
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-2">
        {classes.length > 1 && (
          <Menu label="Turma" align="start" items={classes.map((c) => ({ label: c.name, checked: c.id === classId, onSelect: () => (setClassId(c.id), setStudentId(null)) }))}>
            {(p) => (
              <button type="button" {...p} className="press h-8 rounded-full bg-fill px-3 text-subhead font-medium hover:bg-fill-2">
                {cls?.name}
              </button>
            )}
          </Menu>
        )}
        <div className="flex h-8 items-center rounded-full bg-fill">
          <button type="button" aria-label="Semana anterior" onClick={() => setWeek(addDays(week, -7))} className="flex size-8 items-center justify-center rounded-full hover:bg-fill-2">
            <ChevronLeft className="size-4" />
          </button>
          <span className="px-1 text-subhead font-medium tabular">
            {week.slice(5, 7) === addDays(week, 4).slice(5, 7) ? `${Number(week.slice(8))}–${formatDayShort(addDays(week, 4))}` : `${formatDayShort(week)} – ${formatDayShort(addDays(week, 4))}`}
          </span>
          <button type="button" aria-label="Próxima semana" onClick={() => setWeek(addDays(week, 7))} className="flex size-8 items-center justify-center rounded-full hover:bg-fill-2">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <SegmentedControl className="w-full md:ml-auto md:w-auto" label="Modo" value={mode} onChange={setMode} options={[{ value: "edit", label: "Editar" }, { value: "preview", label: "Como a família vê" }]} />
      </div>

      {mode === "preview" ? (
        <div className="mx-auto max-w-lg">
          <PostCard post={preview} />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={suggest}
            disabled={suggesting}
            className="press flex w-full items-center gap-3 rounded-xl bg-surface p-4 text-left shadow-e1 hover:shadow-e2 disabled:opacity-60"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              {suggesting ? <Spinner className="size-5" /> : <Sparkles aria-hidden className="size-5" strokeWidth={2.1} />}
            </span>
            <span className="flex-1">
              <span className="block text-callout font-semibold">Sugerir a partir do diário</span>
              <span className="block text-footnote text-label-2">Usa só conteúdos e atividades da turma nesta semana — nunca observações individuais. Você revisa antes de publicar.</span>
            </span>
          </button>

          {suggestion && (
            <div className="space-y-2 rounded-xl bg-accent-soft/60 p-4">
              <Tag tone="accent" icon={Sparkles}>
                Rascunho sugerido
              </Tag>
              {suggestion.gaps.map((g) => (
                <p key={g} className="text-footnote text-label-2">
                  • {g}
                </p>
              ))}
              {suggestion.sources.length > 0 && (
                <Disclosure summary={`Baseado em ${suggestion.sources.length} registros do diário`}>
                  <ul className="space-y-1.5">
                    {suggestion.sources.map((s) => (
                      <li key={s.key} className="text-footnote text-label-2">
                        <span className="font-semibold text-label">{s.label}</span> — {s.text}
                      </li>
                    ))}
                  </ul>
                </Disclosure>
              )}
            </div>
          )}

          <div className="rounded-xl bg-surface p-5 shadow-e1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da semana"
              aria-label="Título"
              className="w-full bg-transparent text-title-2 font-bold outline-none placeholder:text-label-3"
            />
            <div className="mt-5 space-y-5">
              {sections.map((s, i) => (
                <div key={s.key} className="group">
                  <div className="flex items-center justify-between">
                    <span className={cn("text-footnote font-semibold tracking-[0.03em] uppercase", s.key === "casa" ? "text-family-ink" : "text-label-2")}>{s.title}</span>
                    <button type="button" aria-label={`Remover ${s.title}`} onClick={() => setSections(sections.filter((_, j) => j !== i))} className="rounded-full p-1 text-label-3 opacity-60 hover:text-critical-ink group-hover:opacity-100">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={s.body}
                    onChange={(e) => {
                      setSections(sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)));
                      e.target.style.height = "auto";
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    rows={3}
                    aria-label={s.title}
                    placeholder={s.key === "casa" ? "Uma ideia simples, sem custo, que caiba na rotina de qualquer família." : "Escreva como contaria pessoalmente às famílias."}
                    className="mt-1 w-full resize-none bg-transparent text-body leading-relaxed outline-none placeholder:text-label-3"
                  />
                </div>
              ))}
            </div>
            {missing.length > 0 && (
              <Menu label="Adicionar seção" align="start" items={missing.map((m) => ({ label: m.title, onSelect: () => setSections([...sections, { ...m, body: "" }]) }))}>
                {(p) => (
                  <button type="button" {...p} className="mt-4 flex items-center gap-1 text-subhead font-medium text-accent">
                    <Plus aria-hidden className="size-4" /> Adicionar seção
                  </button>
                )}
              </Menu>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="px-1 font-sans text-footnote font-medium uppercase tracking-[0.04em] text-label-2">Fotografias</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p) => (
                <div key={p.id} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/media/${p.id}`} alt={p.caption ?? ""} className="aspect-square w-full rounded-[12px] object-cover" />
                  <button type="button" aria-label="Remover foto" onClick={() => setPhotos(photos.filter((x) => x.id !== p.id))} className="glass absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full">
                    <X className="size-3.5" strokeWidth={2.6} />
                  </button>
                </div>
              ))}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] bg-fill text-label-2 hover:bg-fill-2">
                {uploading ? <Spinner /> : <ImagePlus aria-hidden className="size-6" strokeWidth={1.8} />}
                <span className="text-caption font-medium">Adicionar</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 8);
                    setUploading(true);
                    for (const f of files) {
                      const fd = new FormData();
                      fd.set("file", f);
                      const res = await uploadPhotoAction(fd);
                      if (res.ok) setPhotos((x) => [...x, { id: res.id, caption: null }]);
                      else toast({ title: res.error, tone: "error" });
                    }
                    setUploading(false);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {noConsent.length > 0 && (
              <p className="px-1 text-footnote text-warning-ink">
                Sem autorização de imagem nesta turma: {noConsent.map((s) => s.name.split(" ")[0]).join(", ")}. Confira se não aparecem nas fotos.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="px-1 font-sans text-footnote font-medium uppercase tracking-[0.04em] text-label-2">Para quem</h3>
            <div className="rounded-xl bg-surface p-4 shadow-e1">
              <SegmentedControl
                label="Público"
                value={studentId ? "one" : "all"}
                onChange={(v) => setStudentId(v === "all" ? null : cls?.students[0]?.id ?? null)}
                options={[
                  { value: "all", label: "Turma toda" },
                  { value: "one", label: "Uma família" },
                ]}
              />
              {studentId && (
                <Select className="mt-3" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="Aluno" wrapClassName="mt-3">
                  {cls?.students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button size="lg" className="min-w-0 sm:flex-1" onClick={() => save(true)} loading={saving} disabled={!title.trim()}>
          Publicar para {recipients} {recipients === 1 ? "família" : "famílias"}
        </Button>
        <Button variant="gray" size="lg" className="min-w-0 sm:flex-1" onClick={() => save(false)} disabled={saving || !title.trim()}>
          Guardar rascunho
        </Button>
      </div>
    </div>
  );
}
