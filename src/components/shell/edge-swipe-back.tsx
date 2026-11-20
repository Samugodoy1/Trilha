"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * Deslizar a partir da borda esquerda para voltar — no app instalado (tela de início),
 * onde o navegador não oferece esse gesto. Respeita "reduzir movimento".
 */
export function EdgeSwipeBack() {
  const router = useRouter();
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const dxRef = useRef(0);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t.clientX > 24 || window.history.length < 2) return;
      start.current = { x: t.clientX, y: t.clientY, active: true };
    };
    const onMove = (e: TouchEvent) => {
      const s = start.current;
      if (!s?.active) return;
      const t = e.touches[0];
      const x = t.clientX - s.x;
      const y = Math.abs(t.clientY - s.y);
      if (y > 50 && x < 30) {
        start.current = null;
        dxRef.current = 0;
        setDx(0);
        return;
      }
      dxRef.current = Math.max(0, Math.min(140, x));
      setDx(dxRef.current);
    };
    const onEnd = () => {
      const s = start.current;
      start.current = null;
      const d = dxRef.current;
      dxRef.current = 0;
      setDx(0);
      if (s?.active && d > 90) router.back();
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [router]);

  if (dx < 4) return null;
  const ready = dx > 90;
  return (
    <div aria-hidden className="pointer-events-none fixed top-1/2 left-0 z-[90] -translate-y-1/2" style={{ transform: `translate(${dx * 0.45 - 20}px, -50%)` }}>
      <span
        className="glass flex size-10 items-center justify-center rounded-full transition-colors duration-150"
        style={{ background: ready ? "var(--accent)" : undefined, color: ready ? "white" : "var(--label)" }}
      >
        <ChevronLeft className="size-6" strokeWidth={2.4} />
      </span>
    </div>
  );
}
