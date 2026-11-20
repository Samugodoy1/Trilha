"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronsUpDown, LogOut, PanelLeft, Plus, Search, Settings, X, Ellipsis } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Wordmark } from "@/components/brand";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { Sheet } from "@/components/ui/sheet";
import { CountBadge } from "@/components/ui/misc";
import { navIcons, type NavItem } from "./icons";
import { logoutAction, switchMembershipAction, setActiveStudentAction } from "@/server/actions/session";
import { QuickRecord } from "@/components/teacher/quick-record";
import { CommandPalette } from "./command-palette";
import { EdgeSwipeBack } from "./edge-swipe-back";

export type ShellProps = {
  variant: "teacher" | "family" | "staff";
  nav: NavItem[];
  tabs: string[];
  user: { name: string; hue: number; roleLabel: string };
  school: { shortName: string };
  memberships: { id: string; label: string; active: boolean }[];
  classLinks?: { href: string; label: string; detail?: string }[];
  family?: { students: { id: string; name: string; hue: number; detail: string }[]; activeId: string | null };
  children: React.ReactNode;
};

function isActive(pathname: string, item: NavItem) {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => (p === "/familia" ? pathname === p : pathname === p || pathname.startsWith(p + "/")));
}

export function AppShell(props: ShellProps) {
  const { variant, nav, tabs, user, school, memberships, classLinks, family, children } = props;
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => setSidebarOpen(false), [pathname]);

  // Busca aberta por botões em qualquer tela (telefone e tablet)
  useEffect(() => {
    const open = () => {
      setMoreOpen(false);
      setPaletteOpen(true);
    };
    window.addEventListener("trilha:search", open);
    return () => window.removeEventListener("trilha:search", open);
  }, []);

  // Atalhos de teclado (computador)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && variant !== "family") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "n" && variant === "teacher") {
        e.preventDefault();
        setComposeOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  const tabItems = tabs.map((h) => nav.find((n) => n.href === h)!).filter(Boolean);
  // Telefone: poucas abas com rótulos que cabem inteiros, + "Mais" (sempre presente:
  // dá acesso ao restante, a Ajustes, à troca de perfil e a Sair). Com o botão de
  // registro ao lado, a professora fica com 3 abas + Mais, como no iOS.
  const phoneOrder =
    variant === "teacher"
      ? ["/hoje", "/turmas", "/mensagens"]
      : variant === "family"
        ? ["/familia", "/familia/agenda", "/familia/desenvolvimento", "/familia/mensagens"]
        : tabs.slice(0, 4);
  const phoneTabs = phoneOrder.map((h) => nav.find((n) => n.href === h)!).filter(Boolean);
  const overflow = nav.filter((n) => !phoneTabs.includes(n));

  return (
    <div className="min-h-dvh">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-e2">
        Pular para o conteúdo
      </a>

      {/* Barra lateral: computador (fixa) e tablet (sobreposta) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-scrim lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
      <aside
        aria-label="Navegação principal"
        className={cn(
          "no-print material-sidebar fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col shadow-[inset_-0.5px_0_0_var(--separator)] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0 shadow-e3" : "-translate-x-full",
        )}
      >
        <div className="flex h-[60px] items-center justify-between px-4 pt-safe">
          <Link href={nav[0]?.href ?? "/"} className="rounded-lg outline-none">
            <Wordmark />
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="flex size-8 items-center justify-center rounded-full text-label-2 hover:bg-fill lg:hidden"
            aria-label="Fechar barra lateral"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {variant === "family" && family && family.students.length > 0 && (
          <div className="px-3 pb-2">
            <ChildSwitcher family={family} />
          </div>
        )}

        {variant !== "family" && (
          <div className="flex gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-9 flex-1 items-center gap-2 rounded-[10px] bg-fill px-2.5 text-left text-subhead text-label-2 hover:bg-fill-2"
            >
              <Search className="size-4" strokeWidth={2.2} aria-hidden />
              <span className="flex-1">Buscar</span>
              <kbd className="font-sans text-caption text-label-3">⌘K</kbd>
            </button>
            {variant === "teacher" && (
              <button
                type="button"
                onClick={() => setComposeOpen(true)}
                aria-label="Novo registro (N)"
                title="Novo registro (N)"
                className="press flex size-9 items-center justify-center rounded-[10px] bg-accent text-on-accent hover:bg-accent-strong"
              >
                <Plus className="size-[19px]" strokeWidth={2.4} />
              </button>
            )}
          </div>
        )}

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {nav.map((item) => {
              const Icon = navIcons[item.icon];
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-callout outline-none transition-colors",
                      active ? "bg-fill-2 font-semibold text-label" : "text-label hover:bg-fill",
                    )}
                  >
                    <Icon aria-hidden className={cn("size-[19px]", active ? "text-accent" : "text-label-2")} strokeWidth={2} />
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? <CountBadge count={item.badge} /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {classLinks && classLinks.length > 0 && (
            <div className="mt-6">
              <h3 className="px-2.5 pb-1 font-sans text-footnote font-semibold text-label-2">Minhas turmas</h3>
              <ul className="space-y-0.5">
                {classLinks.map((c) => {
                  const active = pathname.startsWith(c.href);
                  return (
                    <li key={c.href}>
                      <Link
                        href={c.href}
                        className={cn(
                          "flex h-8 items-center gap-3 rounded-[10px] px-2.5 text-subhead outline-none",
                          active ? "bg-fill-2 font-semibold" : "hover:bg-fill",
                        )}
                      >
                        <span aria-hidden className="size-2 rounded-full bg-accent/70" />
                        <span className="flex-1 truncate">{c.label}</span>
                        {c.detail && <span className="text-footnote text-label-2 tabular">{c.detail}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="px-3 pt-2 pb-[max(env(safe-area-inset-bottom),12px)] hairline-t">
          <AccountMenu user={user} school={school} memberships={memberships} variant={variant} />
        </div>
      </aside>

      {/* Tablet: barra de abas flutuante no topo (iPadOS) */}
      <div className="no-print pointer-events-none fixed inset-x-0 top-0 z-40 hidden pt-[max(env(safe-area-inset-top),10px)] md:block lg:hidden">
        <div className="flex items-center justify-between px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mostrar barra lateral"
            className="glass pointer-events-auto flex size-10 items-center justify-center rounded-full text-label"
          >
            <PanelLeft className="size-[19px]" strokeWidth={2} />
          </button>
          <nav aria-label="Abas" className="glass pointer-events-auto flex h-11 items-center gap-0.5 rounded-full p-1">
            {tabItems.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center rounded-full px-4 text-subhead font-semibold outline-none transition-colors",
                    active ? "text-accent" : "text-label hover:text-label-2",
                  )}
                >
                  {active && (
                    <motion.span layoutId="ipad-tab" className="absolute inset-0 rounded-full bg-fill-2" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <span className="relative max-w-full truncate px-0.5">{item.label}</span>
                  {item.badge ? <CountBadge count={item.badge} className="relative ml-1.5" /> : null}
                </Link>
              );
            })}
          </nav>
          {variant === "teacher" ? (
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              aria-label="Novo registro"
              className="pointer-events-auto flex size-10 items-center justify-center rounded-full bg-accent text-on-accent shadow-e2"
            >
              <Plus className="size-5" strokeWidth={2.4} />
            </button>
          ) : (
            <span className="size-10" />
          )}
        </div>
      </div>

      <div className="md:pt-[56px] lg:pt-0 lg:pl-[272px] print:!p-0">{children}</div>

      {/* Telefone: barra de abas flutuante em vidro + ação de registro */}
      {/* Borda de rolagem: o conteúdo esmaece antes de passar sob a barra */}
      <div aria-hidden className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-30 h-[calc(max(env(safe-area-inset-bottom),12px)+84px)] backdrop-blur-[10px] [mask-image:linear-gradient(to_top,black_55%,transparent)] md:hidden" />
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-0 z-40 flex items-end gap-3 px-4 pb-[max(env(safe-area-inset-bottom),12px)] md:hidden">
        <nav aria-label="Abas" className="glass pointer-events-auto flex h-[62px] min-w-0 flex-1 items-center rounded-full px-1">
          {phoneTabs.map((item) => {
            const Icon = navIcons[item.icon];
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-full text-[10px] leading-none font-semibold tracking-[0.01em] outline-none",
                  active ? "text-accent" : "text-label",
                )}
              >
                {active && (
                  <motion.span layoutId="phone-tab" className="absolute inset-0 rounded-full bg-fill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                )}
                <span className="relative">
                  <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.3 : 1.9} />
                  {item.badge ? <CountBadge count={item.badge} className="absolute -top-1 -right-2.5" /> : null}
                </span>
                <span className="relative max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            );
          })}
          {(
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "relative flex h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-[3px] rounded-full text-[10px] leading-none font-semibold tracking-[0.01em] outline-none",
                overflow.some((o) => isActive(pathname, o)) ? "text-accent" : "text-label",
              )}
            >
              {overflow.some((o) => isActive(pathname, o)) && (
                <motion.span layoutId="phone-tab" className="absolute inset-0 rounded-full bg-fill" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
              )}
              <Ellipsis aria-hidden className="relative size-[22px]" strokeWidth={2} />
              <span className="relative">Mais</span>
            </button>
          )}
        </nav>
        {variant === "teacher" && (
          <button
            type="button"
            onClick={() => setComposeOpen(true)}
            aria-label="Novo registro"
            className="press pointer-events-auto flex size-[62px] shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-[0_10px_30px_color-mix(in_oklab,var(--accent)_45%,transparent),inset_0_0.5px_0_rgb(255_255_255/0.35)]"
          >
            <Plus className="size-7" strokeWidth={2.3} />
          </button>
        )}
      </div>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Mais" size="sm">
        {variant !== "family" && (
          <button
            type="button"
            onClick={() => {
              setMoreOpen(false);
              setTimeout(() => setPaletteOpen(true), 250);
            }}
            className="mb-4 flex h-11 w-full items-center gap-2 rounded-[12px] bg-surface px-3 text-left text-body text-label-2"
          >
            <Search aria-hidden className="size-[18px]" strokeWidth={2.2} />
            Buscar alunos e áreas
          </button>
        )}
        {variant === "family" && family && family.students.length > 1 && (
          <div className="mb-4">
            <ChildSwitcher family={family} />
          </div>
        )}
        <div className="overflow-hidden rounded-xl bg-surface shadow-e1">
          {[...overflow, { href: "/ajustes", label: "Ajustes", icon: "settings" as const }].map((item) => {
            const Icon = navIcons[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 pl-4 hover:bg-fill/60"
              >
                <span className="flex size-[30px] items-center justify-center rounded-[8px] bg-accent-soft text-accent">
                  <Icon aria-hidden className="size-[17px]" strokeWidth={2.1} />
                </span>
                <span className="flex flex-1 items-center py-3 pr-4 text-body [div>a:not(:last-child)>&]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge ? <CountBadge count={item.badge} /> : null}
                </span>
              </Link>
            );
          })}
        </div>
        <div className="mt-4">
          <AccountMenu user={user} school={school} memberships={memberships} variant={variant} />
        </div>
        <LogoutButton />
      </Sheet>

      <EdgeSwipeBack />
      {variant === "teacher" && <QuickRecord open={composeOpen} onClose={() => setComposeOpen(false)} />}
      {variant !== "family" && <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} nav={nav} />}
    </div>
  );
}

function AccountMenu({
  user,
  school,
  memberships,
  variant,
}: Pick<ShellProps, "user" | "school" | "memberships" | "variant">) {
  const [pending, start] = useTransition();
  const items: MenuEntry[] = [
    { label: "Ajustes", icon: Settings, href: "/ajustes" },
    ...(memberships.length > 1
      ? ([
          { separator: true },
          { section: "Entrar como" },
          ...memberships.map((m) => ({
            label: m.label,
            checked: m.active,
            onSelect: () => start(() => switchMembershipAction(m.id)),
          })),
        ] as MenuEntry[])
      : []),
    { separator: true },
    { label: "Sair", icon: LogOut, destructive: true, onSelect: () => start(() => logoutAction()) },
  ];
  void variant;
  return (
    <Menu items={items} label="Conta" align="start">
      {(p) => (
        <button
          type="button"
          {...p}
          disabled={pending}
          className="flex w-full items-center gap-3 rounded-[12px] p-2 text-left outline-none hover:bg-fill"
        >
          <Avatar name={user.name} hue={user.hue} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-subhead font-semibold">{user.name}</span>
            <span className="block truncate text-footnote text-label-2">
              {user.roleLabel} · {school.shortName}
            </span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 text-label-3" />
        </button>
      )}
    </Menu>
  );
}

export function ChildSwitcher({ family }: { family: NonNullable<ShellProps["family"]> }) {
  const [pending, start] = useTransition();
  const active = family.students.find((s) => s.id === family.activeId) ?? family.students[0];
  if (!active) return null;
  if (family.students.length === 1)
    return (
      <div className="flex items-center gap-3 rounded-[14px] bg-surface p-2.5 shadow-e1">
        <Avatar name={active.name} hue={active.hue} size="md" />
        <div className="min-w-0">
          <p className="truncate text-callout font-semibold">{active.name}</p>
          <p className="truncate text-footnote text-label-2">{active.detail}</p>
        </div>
      </div>
    );
  return (
    <Menu
      label="Escolher filho ou filha"
      align="start"
      items={family.students.map((s) => ({
        label: s.name,
        hint: s.detail,
        checked: s.id === active.id,
        onSelect: () => start(() => setActiveStudentAction(s.id)),
      }))}
    >
      {(p) => (
        <button
          type="button"
          {...p}
          className={cn("flex w-full items-center gap-3 rounded-[14px] bg-surface p-2.5 text-left shadow-e1 outline-none hover:bg-surface-2", pending && "opacity-60")}
        >
          <Avatar name={active.name} hue={active.hue} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-callout font-semibold">{active.name}</span>
            <span className="block truncate text-footnote text-label-2">{active.detail}</span>
          </span>
          <ChevronsUpDown aria-hidden className="size-4 text-label-3" />
        </button>
      )}
    </Menu>
  );
}


function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => logoutAction())}
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[12px] bg-surface py-3 text-body text-critical-ink disabled:opacity-50"
    >
      <LogOut aria-hidden className="size-[18px]" />
      Sair
    </button>
  );
}
