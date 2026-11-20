# Padrão visual e de navegação — prompt para aplicar em outro app

> Copie tudo abaixo da linha e cole no início do prompt. Troque só o que está entre colchetes.

---

Você vai construir (ou redesenhar) **[NOME DO APP]**, um app de **[NICHO / PARA QUEM]**, seguindo exatamente o padrão visual e de navegação descrito aqui. A referência é a essência dos apps nativos da Apple (Lembretes, Fotos, Saúde, Diário, Ajustes, Mensagens) aplicada a um web app/PWA **mobile-first**. Não imite marcas nem copie ícones proprietários: copie a disciplina — tipografia, ritmo, materiais, hierarquia e comportamento.

## 1. Princípios (valem mais que qualquer token)

1. **Conteúdo primeiro, cromo mínimo.** Fundo branco puro (preto puro no escuro). Nada de gradientes de fundo, bordas decorativas ou sombras pesadas. A cor fica nos ícones/glifos e nas ações, não nas superfícies.
2. **Uma cor de destaque** (azul de sistema) para tudo que é tocável. Cores de categoria só identificam tipos de conteúdo — nunca decoram.
3. **Hierarquia pela tipografia**, não por caixas: título grande → seção → linha. Peso e cinza (label, label-2, label-3) fazem o trabalho.
4. **Mobile-first de verdade:** projetar a 375 pt e 414 pt; tablet e desktop são adaptações. Zero rolagem lateral.
5. **Uma decisão por tela** em fluxos (onboarding, criação). Botão principal sempre no mesmo lugar, junto ao polegar.
6. **Tudo reversível**: ações destrutivas com "Desfazer" (toast) em vez de diálogos de confirmação, exceto quando a ação afeta outra pessoa (aí: sheet de confirmação com consequências explicadas).
7. **Linguagem humana**: frases curtas, verbo no início, sem jargão técnico, sem culpa ("Ainda sem convite", não "Pendente!").
8. **Acessível por padrão**: contraste AA nos textos, alvos de 44 pt, Dynamic Type, "reduzir movimento", "aumentar contraste", foco visível.

## 2. Tokens (CSS variables) — use exatamente estes valores

### Cores — modo claro
```css
:root {
  color-scheme: light;
  --canvas: #ffffff;          /* fundo da página */
  --surface: #ffffff;         /* cartões e células sobre fundo cinza */
  --surface-2: #f2f2f7;       /* fundo agrupado (Ajustes), tiles, campos */
  --label: #000000;           /* texto principal */
  --label-2: #6e6e73;         /* secundário (subtítulos, metadados) */
  --label-3: #8e8e93;         /* terciário (placeholders, chevrons, zeros) */
  --separator: rgb(60 60 67 / 0.22);   /* linhas de 0.5px */
  --separator-strong: rgb(60 60 67 / 0.36);
  --fill: rgb(120 120 128 / 0.12);     /* botões cinza, chips, trilhos */
  --fill-2: rgb(120 120 128 / 0.2);
  --accent: #007aff;  --accent-strong: #0063d1;  --accent-soft: rgb(0 122 255 / 0.1);  --on-accent: #fff;
  --positive: #34c759; --warning: #ff9500; --critical: #ff3b30; --info: #007aff;
  /* "ink" = versão escura da cor para TEXTO (a cor pura fica só em ícones/preenchimentos) */
  --positive-ink: #248a3d; --warning-ink: #c93400; --critical-ink: #d70015;
  /* Paleta de categorias (renomeie para o seu domínio) */
  --cat-indigo: #5856d6; --cat-orange: #ff9500; --cat-cyan: #32ade6; --cat-purple: #af52de;
  --cat-green: #34c759;  --cat-yellow: #ffcc00; --cat-pink: #ff2d55;
  --cat-indigo-ink: #5856d6; --cat-orange-ink: #c93400; --cat-cyan-ink: #0071a4;
  --cat-purple-ink: #8944ab; --cat-yellow-ink: #b25000; --cat-pink-ink: #d30f45;
  /* Materiais */
  --glass-bg: rgb(255 255 255 / 0.7); --glass-border: rgb(255 255 255 / 0.9); --glass-edge: rgb(0 0 0 / 0.07);
  --chrome-bg: rgb(255 255 255 / 0.8); --sidebar-bg: rgb(246 246 248 / 0.88); --scrim: rgb(0 0 0 / 0.25);
  /* Elevação: quase invisível; anel de 0.5px + sombra difusa */
  --shadow-e1: 0 0 0 0.5px rgb(0 0 0 / 0.04), 0 2px 12px rgb(0 0 0 / 0.08);
  --shadow-e2: 0 0 0 0.5px rgb(0 0 0 / 0.05), 0 6px 24px rgb(0 0 0 / 0.12);
  --shadow-e3: 0 0 0 0.5px rgb(0 0 0 / 0.06), 0 24px 60px rgb(0 0 0 / 0.2);
}
```

### Cores — modo escuro (sistema + escolha manual `data-theme="dark"`)
```css
--canvas: #000000; --surface: #1c1c1e; --surface-2: #2c2c2e;
--label: #ffffff; --label-2: #98989f; --label-3: #6c6c70;
--separator: rgb(84 84 88 / 0.6); --fill: rgb(118 118 128 / 0.24); --fill-2: rgb(118 118 128 / 0.36);
--accent: #0a84ff; --accent-strong: #409cff; --accent-soft: rgb(10 132 255 / 0.18);
--positive: #30d158; --warning: #ff9f0a; --critical: #ff453a;
--positive-ink: #30d158; --warning-ink: #ff9f0a; --critical-ink: #ff6961;
--cat-indigo: #5e5ce6; --cat-orange: #ff9f0a; --cat-cyan: #64d2ff; --cat-purple: #bf5af2; --cat-pink: #ff375f;
--cat-indigo-ink: #a5a3ff; --cat-orange-ink: #ffb340; --cat-cyan-ink: #70d7ff; --cat-purple-ink: #da8fff; --cat-pink-ink: #ff6482;
--glass-bg: rgb(44 44 46 / 0.62); --glass-border: rgb(255 255 255 / 0.14); --glass-edge: rgb(0 0 0 / 0.6);
--chrome-bg: rgb(0 0 0 / 0.72); --sidebar-bg: rgb(28 28 30 / 0.88); --scrim: rgb(0 0 0 / 0.5);
--shadow-e1: 0 0 0 0.5px rgb(255 255 255 / 0.04);
--shadow-e2: 0 0 0 0.5px rgb(255 255 255 / 0.08), 0 8px 24px rgb(0 0 0 / 0.5);
```
Com `@media (prefers-contrast: more)` no claro: `--label-2: #3a3a3f; --label-3: #5c5c62; --accent: #0040dd; --separator: rgb(60 60 67 / 0.45)` e as categorias nas versões "ink".

### Tipografia
Fonte: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter Variable", "Segoe UI", Roboto, system-ui, sans-serif` (títulos com "SF Pro Display"; números de destaque com `ui-rounded`; códigos com `ui-monospace`). `-webkit-font-smoothing: antialiased`, `font-optical-sizing: auto`, `text-wrap: balance` em títulos e `pretty` em parágrafos.

| Estilo | Tamanho / altura de linha | Peso | Tracking | Uso |
|---|---|---|---|---|
| large-title | 34 / 40 | 700 | −0.026em | Título da tela |
| title-1 | 28 / 34 | 700 | −0.022em | Título de fluxo/onboarding |
| title-2 | 22 / 28 | 700 | −0.018em | Contadores grandes |
| title-3 | 20 / 25 | 600 | −0.014em | Títulos de cartão |
| headline | 17 / 22 | 600 | −0.011em | Título de seção, botão grande |
| body | 17 / 23 | 400 | −0.011em | Texto e linhas de lista |
| callout | 16 / 21 | 400 | −0.009em | Textos de apoio |
| subhead | 15 / 20 | 400 | −0.006em | Subtítulo de linha, botões pequenos |
| footnote | 13 / 18 | 400 | −0.002em | Rodapés de seção, metadados |
| caption | 12 / 16 | 400–600 | — | Tags |
| caption-2 | 11 / 13 | 400 | +0.01em | Mínimo absoluto |

Cabeçalhos de seção agrupada: footnote, MAIÚSCULAS, cor label-2, peso normal. "Eyebrow" acima do título (ex.: data): footnote 600, maiúsculas, tracking +0.03em.

**Dynamic Type (iPhone):** em `@media (hover:none) and (pointer:coarse)` + `@supports (font: -apple-system-body)`, aplicar `html { font: -apple-system-body }` e redefinir a escala em `rem` (large-title 2rem, title-1 1.647rem, title-2 1.294rem, title-3 1.176rem, headline/body 1rem, callout .941rem, subhead .882rem, footnote .765rem, caption .706rem), mantendo espaçamentos e raios em **px** (o texto cresce, o layout não). Rótulos da barra de abas ficam fixos em 10 px.

### Espaço, raios, movimento
- Grade de 4 pt. Margem lateral da página: **20 pt no celular**, 32 pt no tablet/desktop. Entre seções: 32–40 pt. Linhas de lista: 11–12 pt de padding vertical, mínimo 44 pt de altura.
- Raios: 6, 8, 10, **14** (tiles, campos), **20** (cartões), 24, 28 (sheets). Botões e chips: pílula (`rounded-full`). Raios concêntricos: interno = externo − padding.
- Easing padrão `cubic-bezier(0.2, 0, 0, 1)`; ênfase `cubic-bezier(0.3, 0, 0, 1.15)`. Durações 200–360 ms. Sheets e destaques de aba com mola (`stiffness 420–500, damping 40`). Transição entre telas: fade de 260 ms. Tudo desligado com `prefers-reduced-motion`.
- Feedback de toque: `.press:active { transform: scale(0.97) }` com transição de 160 ms (transform, fundo e opacidade).

### Materiais
- **glass** (só em navegação flutuante: barra de abas, botões circulares sobre conteúdo): `background: var(--glass-bg); backdrop-filter: saturate(1.9) blur(22px);` + sombra interna de 0.5px clara no topo e borda externa `--glass-edge`.
- **chrome** (barra superior quando a página rola): `var(--chrome-bg)` + `saturate(1.8) blur(20px)` + linha de 0.5px embaixo.
- **sidebar** (desktop): `var(--sidebar-bg)` + `blur(28px)`.

## 3. Estrutura e navegação

### Celular (padrão)
- **Barra de abas flutuante** em vidro, pílula de 62 pt de altura, a 16 pt das bordas e `max(safe-area-inset-bottom, 12px)` do fundo. **No máximo 5 itens contando "Mais"**; se houver um botão de ação principal ao lado (círculo azul de 62 pt com "+"), use **3 abas + Mais**. Ícone 22 pt (traço 1.9; 2.3 quando ativo) + rótulo de **10 pt semibold**, que precisa caber inteiro. Aba ativa: cor de destaque + pílula `--fill` atrás, animada entre abas (layout animation). "Mais" abre um sheet com o restante, busca, Ajustes, troca de perfil e Sair — e fica ativo quando a tela atual mora dentro dele.
- **Borda de rolagem:** uma faixa de ~84 pt atrás da barra com `backdrop-filter: blur(10px)` e máscara em gradiente (o conteúdo desfoca ao passar por baixo, em vez de aparecer recortado).
- **Telas principais (abas):** título grande de 34 pt com os botões da tela **na mesma linha, à direita** (busca em círculo de vidro de 36 pt, ação em botão "tinted" pílula). Acima do título, opcionalmente um eyebrow. 20 pt de respiro abaixo da área segura. Ao rolar, o título encolhe para 17 pt centralizado numa barra "chrome" de 44 pt, e os botões migram para essa barra.
- **Telas internas:** barra de 44 pt com botão voltar circular de vidro (chevron 22 pt) à esquerda, ações à direita, título pequeno centralizado que aparece ao rolar; título grande abaixo.
- **Gesto de voltar** pela borda esquerda no app instalado (PWA standalone): arrastar a partir de x ≤ 24 pt, limiar de 90 pt.
- **Sheets** para criar/editar: sobem de baixo, cantos de 28 pt, alça (grabber) de 36×5 pt, título centralizado em headline, botão fechar em círculo cinza (X) à direita, rodapé fixo com o botão principal. Fecham arrastando para baixo e com Esc.
- **Busca** acessível de qualquer tela principal (círculo com lupa) e por ⌘K no desktop (paleta de comandos).

### Tablet (≥ 768 px)
Barra superior com abas em texto + mesmas regras de título. Listas de detalhe em duas colunas (lista à esquerda 340 pt, conteúdo à direita), como em Mensagens.

### Desktop (≥ 1024 px)
Barra lateral de 272 pt com material sidebar: logotipo, campo de busca com ⌘K, botão "+" azul, itens de navegação (ícone 18 pt + rótulo 17 pt; ativo com fundo `--fill-2` e ícone na cor de destaque), seção secundária com atalhos (ex.: "Minhas turmas" com bolinha de cor e contagem), e no rodapé o cartão da conta (avatar + nome + papel + seletor). Conteúdo centralizado com largura máxima (narrow 672, default 896, wide 1152).

## 4. Componentes

- **Botões** (pílula, peso 600): `sm` 32 pt / subhead; `md` 40 pt / callout; `lg` 50 pt / headline, largura total (botão principal de fluxo). Variantes: **filled** (azul, texto branco), **tinted** (`--accent-soft` + texto azul — ações secundárias de cabeçalho), **gray** (`--fill`), **plain** (só texto azul), **destructive** (vermelho a 12% + texto `--critical-ink`), **glass**. Desabilitado: 40% de opacidade. Carregando: spinner no lugar do ícone, mantendo a largura.
- **Listas inset agrupadas** (estilo Ajustes): fundo da página `--surface-2`, grupos `--surface` com raio 12–14; cada linha: ícone em círculo colorido de 30 pt (glifo branco 16 pt) **ou** avatar, título em body, subtítulo em subhead label-2, valor/trailing à direita, chevron 15 pt `label-3`. Separador de 0.5px que começa depois do ícone (inset), nunca na última linha. Cabeçalho e rodapé do grupo em footnote label-2.
- **Linhas de tarefa/lista simples** (estilo Lembretes): sem cartões; separador inset; marcador circular à esquerda; deslizar para a esquerda revela ações (Adiar laranja, Ocultar cinza, Apagar vermelho, 76 pt cada); no desktop as mesmas ações no clique direito.
- **Tiles de contagem** (estilo Lembretes "Hoje"): grade de 2 colunas (3 no desktop), raio 14, fundo `--surface-2` (claro) / `--surface` (escuro), círculo colorido de 32 pt com glifo branco no topo esquerdo, número em 28 pt bold à direita (tabular), rótulo em subhead semibold label-2 embaixo. **Contagem zero = círculo cinza #aeaeb2 e número em label-3.**
- **Cartões de destaque** (estilo Saúde): `--surface` + `--shadow-e1`, raio 20, padding 16–20; topo com ícone + nome da categoria na cor "ink" da categoria (subhead 600) e chevron; frase-resumo em title-3 ("Avançou 3 níveis desde março"); gráfico simples embaixo; metadado em footnote.
- **Gráficos**: degraus/linhas finas (2 pt) na cor da categoria, área com gradiente da cor a 18% → 0, pontos vazados e último ponto cheio maior, eixos só com rótulos footnote label-2, sem grades pesadas. Sempre acompanhados de uma frase que diz o que o gráfico mostra e de uma tabela escondida para leitores de tela (o wrapper `sr-only` vai num `div`, nunca na `<table>`, senão causa rolagem lateral).
- **Campos**: rótulo acima (subhead label-2, recuo de 4 pt), campo de 48 pt, raio 12, fundo `--surface` com anel de 0.5px em `--separator-strong`, foco com anel azul de 2 pt; erro com anel vermelho de 1.5 pt. Erro em footnote `--critical-ink` abaixo. Toggles no estilo iOS (51×31, verde quando ligado). Controle segmentado com indicador branco deslizante sobre trilho `--fill`.
- **Tags/chips**: 22 pt de altura, pílula, caption 600, texto na cor "ink" e fundo da mesma cor a 13%.
- **Avatares**: círculo com iniciais (2 letras) em branco sobre gradiente cinza neutro; tamanhos 24/32/40/56/80.
- **Toasts**: pílula de vidro (glass sobre `--surface-raised` a 84%) que desce do topo, logo abaixo da área segura; ícone de 20 pt + título + descrição curta + ação ("Desfazer"); some em 4–6 s.
- **Estados vazios**: ícone de 40 pt em label-3, frase curta em callout label-2, um botão de ação. Nunca tela em branco.
- **Carregamento**: skeletons com shimmer suave nas formas reais (nunca spinner de tela cheia).
- **Indicadores de progresso**: anel de 22–52 pt (trilho `--fill-2`, progresso na cor do contexto, ponta arredondada).

## 5. Onboarding (estilo Assistente de Configuração)
- Uma tela por decisão: ícone de 76 pt em quadrado arredondado (raio 22) com gradiente vertical de duas tonalidades da mesma cor e glifo branco; título em title-1 bold centralizado; uma frase em body label-2 (máx. ~34 caracteres por linha); conteúdo; **botão principal fixo no rodapé** (50 pt) com "Agora não"/"Fazer depois" em texto azul logo abaixo; "‹ Voltar" em texto azul no topo.
- Primeira tela: logotipo com mola + "Boas-vindas ao [App]" + 3 linhas de recurso (ícone colorido de 30 pt, título headline, descrição subhead) + nota de privacidade com escudo acima do botão.
- Última tela: check verde animado (círculo de 84 pt, traço desenhado), "Tudo pronto, [Nome]" e um resumo em lista agrupada com checks verdes do que foi criado.
- Se o app estiver no navegador do celular, uma tela "Tenha o [App] na Tela de Início" com os 2 passos (Compartilhar → Adicionar à Tela de Início).
- Navegue entre etapas pela **chave** da etapa, não pelo índice (etapas condicionais mudam a lista).

## 6. Voz e conteúdo
- Português do Brasil, frases curtas, verbo primeiro nas ações e nos itens de "fazer": "Responder Juliana", "Publicar a Nossa semana", "Continuar rascunho".
- Datas relativas ("Hoje", "Ontem", "Qua", "13/11"); horas no formato 24 h.
- Números com `font-variant-numeric: tabular-nums`.
- Sem jargão técnico, siglas sem explicação, rankings ou comparações entre pessoas. Avisos explicam a consequência e o que fazer.
- Destrutivo que afeta outra pessoa: sheet com título-pergunta ("Desativar Rafael?"), 2–3 frases do que acontece e do que **não** acontece, botão destrutivo com o nome ("Desativar acesso de Rafael") e "Cancelar" em texto.

## 7. Mobile-first: regras técnicas obrigatórias
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; respeite `env(safe-area-inset-*)` em barras e sheets.
- `meta theme-color` igual ao fundo (branco/preto) e atualizado quando o tema muda, para a barra de status do iPhone combinar com o app.
- **Nenhuma rolagem lateral** a 375 e 414 pt: filhos de grid/flex com `min-w-0`, textos com `truncate`/`break-words`, botões que não cabem lado a lado empilham (`flex-col sm:flex-row`). Teste automatizado: `document.documentElement.scrollWidth <= clientWidth` em todas as telas.
- Conteúdo com `padding-bottom` suficiente para não ficar sob a barra de abas (≈ 144 pt).
- Alvos de toque ≥ 44 pt; `-webkit-tap-highlight-color: transparent`; feedback `.press`.
- PWA: manifest com `display: standalone`, ícones maskable, service worker que **não** cacheia páginas nem dados privados.

## 8. Implementação sugerida
Next.js (App Router) + TypeScript + Tailwind CSS 4 com os tokens acima em `:root`/`@theme` (classes `bg-canvas`, `text-label-2`, `text-large-title`, `shadow-e1`, `rounded-xl`…), `motion` (Framer Motion) para sheets, abas e gestos, e `lucide-react` para ícones (traço 1.9–2.4). Componentes base: `Page` (título grande que recolhe), `AppShell` (barra de abas / sidebar), `Sheet`, `ListSection`/`ListRow`, `Button`, `SegmentedControl`, `Toggle`, `Tag`, `Avatar`, `SwipeRow`, `Toast`, `EmptyState`, `Skeleton`.

## 9. Como adaptar ao novo nicho
- Mantenha o azul de destaque, os neutros, a tipografia, os materiais e a navegação **idênticos**.
- Renomeie a paleta de categorias para os tipos de conteúdo de **[NICHO]** (ex.: [categoria A] = índigo, [categoria B] = laranja, [categoria C] = ciano…), usando a versão "ink" para texto.
- Escolha 3–4 abas principais pelo que o usuário faz todo dia; o resto vai para "Mais". A primeira aba é um "Hoje"/"Início" com tiles de contagem e uma lista do que precisa de atenção, com verbos.

## 10. Checklist de aceite (confira antes de entregar)
- [ ] Fundo branco/preto puro; cor só em glifos, ações e categorias.
- [ ] Título grande de 34 pt com ações na mesma linha nas telas principais; recolhe ao rolar.
- [ ] Barra de abas em vidro com rótulos inteiros a 10 pt, "Mais" sempre presente, borda de rolagem desfocada.
- [ ] Listas inset agrupadas com separadores de 0.5px recuados e chevrons label-3.
- [ ] Contadores zerados em cinza.
- [ ] Deslizar para agir + "Desfazer" em exclusões.
- [ ] Onboarding com uma decisão por tela e botão fixo embaixo.
- [ ] Claro, escuro e alto contraste corretos; textos coloridos usam as cores "ink".
- [ ] Sem rolagem lateral a 375/414 pt; safe areas respeitadas; barra de status na cor do app.
- [ ] Dynamic Type no iPhone sem quebrar layout; reduzir movimento respeitado.
