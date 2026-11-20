import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getSession, homeFor } from "@/server/session";
import { familyStudents } from "@/server/queries/shell";
import { FamilyWelcome, Wizard } from "./wizard";

export const metadata: Metadata = { title: "Boas-vindas" };

export default async function WelcomePage() {
  const auth = await getAuthUser();
  if (!auth) redirect("/entrar");
  const s = await getSession();
  const firstName = auth.user.name.split(" ")[0];
  if (s && !s.membership.onboardedAt && s.membership.role === "guardian") {
    const kids = await familyStudents(s);
    const child = kids.find((k) => k.id === s.activeStudentId) ?? kids[0];
    return <FamilyWelcome firstName={firstName} childName={child ? (child.preferredName ?? child.fullName) : "seu filho"} schoolName={s.school.name} />;
  }
  if (s && (s.membership.onboardedAt || s.membership.role !== "teacher")) redirect(homeFor(s.membership.role));
  return <Wizard firstName={firstName} hasSchool={Boolean(s)} schoolName={s?.school.name} />;
}
