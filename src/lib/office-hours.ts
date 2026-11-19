export function officeHoursText(oh: { days: number[]; start: string; end: string; note?: string } | null, name: string) {
  if (!oh) return `${name} responde em horário escolar. Este canal não exige respostas imediatas.`;
  const names = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  const sorted = [...oh.days].sort();
  const contiguous = sorted.every((d, i) => i === 0 || d === sorted[i - 1] + 1);
  const days = contiguous && sorted.length > 2 ? `de ${names[sorted[0]]} a ${names[sorted.at(-1)!]}` : sorted.map((d) => names[d]).join(", ");
  return `${name} lê os recados ${days}, das ${oh.start.replace(":00", "h")} às ${oh.end.replace(":00", "h").replace(":30", "h30")}. Este canal não exige respostas imediatas.`;
}

