"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mantém a barra de status / barra do navegador (meta theme-color) com a mesma cor do topo da tela.
 * Considera o tema do sistema, a escolha manual em Ajustes e telas de fundo agrupado (cinza).
 */
export function ThemeColorSync() {
  const pathname = usePathname();
  useEffect(() => {
    const apply = () => {
      const top = document.querySelector<HTMLElement>("[data-top-surface]") ?? document.body;
      const color = getComputedStyle(top).backgroundColor;
      if (!color || color === "rgba(0, 0, 0, 0)") return;
      // Atualiza (nunca remove) as metas existentes: elas pertencem ao React.
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (!metas.length) {
        const m = document.createElement("meta");
        m.name = "theme-color";
        m.setAttribute("data-sync", "");
        document.head.appendChild(m);
      }
      document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
        m.content = color;
        m.removeAttribute("media");
      });
    };
    apply();
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    const obs = new MutationObserver(apply);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mql.removeEventListener("change", apply);
      obs.disconnect();
    };
  }, [pathname]);
  return null;
}
