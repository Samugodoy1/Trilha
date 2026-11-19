import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { requireSession } from "@/server/session";
import { buildShell } from "@/server/queries/shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSession();
  if (ctx.membership.role === "teacher" && !ctx.membership.onboardedAt) redirect("/boas-vindas");
  const shell = await buildShell(ctx);
  return <AppShell {...shell}>{children}</AppShell>;
}
