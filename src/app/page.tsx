import { redirect } from "next/navigation";
import { getAuthUser, getSession, homeFor } from "@/server/session";

export default async function Index() {
  const s = await getSession();
  if (s) redirect(homeFor(s.membership.role));
  const u = await getAuthUser();
  if (u) redirect("/boas-vindas");
  redirect("/entrar");
}
