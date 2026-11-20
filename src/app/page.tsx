import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser, getSession, homeFor } from "@/server/session";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: { absolute: "Trilha · o diário de aprendizagem da sua turma" },
  description: "O diário da professora, as sondagens da turma e a conversa com as famílias no mesmo lugar. Feito para o celular, para escolas brasileiras.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Trilha",
    description: "Cada passo da aprendizagem, à vista. Diário, sondagens e famílias no mesmo lugar.",
    type: "website",
    locale: "pt_BR",
  },
};

/** Quem está logado vai direto para o app; quem chega de fora vê a apresentação. */
export default async function Index() {
  const s = await getSession();
  if (s) redirect(homeFor(s.membership.role));
  const u = await getAuthUser();
  if (u) redirect("/boas-vindas");
  return <Landing />;
}
