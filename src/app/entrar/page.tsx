import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/server/session";
import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const s = await getSession();
  if (s) redirect(homeFor(s.membership.role));
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(env(safe-area-inset-top),48px)] pb-12 md:justify-center md:pt-12">
      <div className="w-full max-w-[400px] animate-rise">
        <div className="mb-10 flex flex-col items-center text-center">
          <BrandMark className="mb-5 size-16 drop-shadow-[0_8px_20px_rgb(0_98_224/0.25)]" />
          <h1 className="text-title-1">Entrar no Trilha</h1>
          <p className="mt-2 text-callout text-label-2">Cada passo da aprendizagem, compartilhado entre escola e família.</p>
        </div>
        <LoginForm next={next} showDemo={process.env.TRILHA_HIDE_DEMO !== "true"} />
      </div>
    </main>
  );
}
