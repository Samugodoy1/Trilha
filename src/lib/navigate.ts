"use client";

type Router = { push: (href: string) => void };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Navega logo depois de uma ação no servidor, com garantia de chegada.
 *
 * O roteador do Next às vezes descarta uma navegação iniciada enquanto a resposta da ação
 * ainda está sendo aplicada (a tela fica parada com o botão girando). Aqui esperamos a ação
 * assentar, conferimos se a tela mudou, tentamos de novo e, em último caso, recarregamos.
 */
export async function navigateAfterAction(router: Router, href: string) {
  const target = new URL(href, window.location.href).pathname;
  await wait(80);
  router.push(href);
  for (const ms of [1200, 2000]) {
    await wait(ms);
    if (window.location.pathname === target) return;
    router.push(href);
  }
  await wait(1500);
  if (window.location.pathname !== target) window.location.assign(href);
}
