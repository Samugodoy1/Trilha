import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getSession, homeFor } from "@/server/session";
import { Wizard } from "./wizard";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function WelcomePage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/entrar");
  const s = await getSession();
  if (s && (s.membership.onboardedAt || s.membership.role !== "teacher")) redirect(homeFor(s.membership.role));
  return <Wizard firstName={auth.user.name.split(" ")[0]} hasSchool={Boolean(s)} schoolName={s?.school.name} />;
}
