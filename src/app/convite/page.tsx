import type { Metadata } from "next";
import { BrandMark } from "@/components/brand";
import { InviteFlow } from "./flow";

export const metadata: Metadata = { title: "Convite da escola" };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const { codigo } = await searchParams;
  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pt-[max(env(safe-area-inset-top),48px)] pb-12 md:justify-center">
      <div className="w-full max-w-[420px] animate-rise">
        <BrandMark className="mx-auto mb-6 size-14" />
        <InviteFlow initialCode={codigo ?? ""} />
      </div>
    </main>
  );
}
