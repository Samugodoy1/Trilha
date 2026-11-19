import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardList,
  FileText,
  House,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Settings,
  Sparkles,
  Sun,
  Users,
  Images,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

/** Ícones de navegação referenciados por nome (serializável entre servidor e cliente). */
export const navIcons = {
  today: Sun,
  home: House,
  classes: Users,
  journal: NotebookPen,
  week: BookOpen,
  tasks: ListChecks,
  messages: MessageCircle,
  reports: FileText,
  assessments: ClipboardList,
  settings: Settings,
  agenda: CalendarDays,
  growth: ChartNoAxesColumn,
  overview: LayoutGrid,
  portfolio: Images,
  sparkles: Sparkles,
  family: HeartHandshake,
} satisfies Record<string, LucideIcon>;

export type NavIconName = keyof typeof navIcons;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIconName;
  badge?: number;
  /** Prefixos adicionais que mantêm o item ativo */
  match?: string[];
};
