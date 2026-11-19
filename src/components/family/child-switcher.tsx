"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { setActiveStudentAction } from "@/server/actions/session";

/** Avatar no canto superior, como em Fotos: toque para trocar de filho. */
export function ChildAvatarSwitcher({ students, activeId }: { students: { id: string; name: string; hue: number; detail: string }[]; activeId: string }) {
  const [pending, start] = useTransition();
  const active = students.find((s) => s.id === activeId) ?? students[0];
  if (!active) return null;
  if (students.length < 2) return <Avatar name={active.name} hue={active.hue} size="sm" className="size-9" />;
  return (
    <Menu
      label="Trocar de filho"
      items={students.map((s) => ({ label: s.name, hint: s.detail, checked: s.id === active.id, onSelect: () => start(() => setActiveStudentAction(s.id)) }))}
    >
      {(p) => (
        <button type="button" {...p} aria-label={`${active.name} — trocar de filho`} className={`press rounded-full shadow-e1 ${pending ? "opacity-50" : ""}`}>
          <Avatar name={active.name} hue={active.hue} size="sm" className="size-9" />
        </button>
      )}
    </Menu>
  );
}
