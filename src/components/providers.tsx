"use client";

import { useEffect } from "react";
import { MotionConfig } from "motion/react";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeColorSync } from "@/components/theme-color";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return (
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ThemeColorSync />
        {children}
      </ToastProvider>
    </MotionConfig>
  );
}
