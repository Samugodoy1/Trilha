# Trilha

**Cada passo da aprendizagem, compartilhado entre escola e família.**

Plataforma de acompanhamento pedagógico para professores da rede municipal (Fundamental I e II), com área própria para famílias e para a coordenação. Filosofia: *o professor registra uma vez; a plataforma organiza, conecta e transforma os registros em informações úteis.*

> Todos os dados desta versão são fictícios. O uso com dados reais depende de validação técnica, jurídica (LGPD) e institucional.

## Como rodar

```bash
npm install
npm run dev
```

Sem `DATABASE_URL`, o Trilha sobe um PostgreSQL embutido (PGlite) em `.data/`, aplica as migrações e cria os dados de demonstração sozinho. Com PostgreSQL próprio:

```bash
cp .env.example .env.local   # ajuste DATABASE_URL
npm run db:reset             # migra e popula com dados fictícios
npm run build && npm start
```

### Contas de demonstração (senha `trilha2026`)

| Conta | Papel |
|---|---|
| helena@trilha.demo | Professora polivalente — 3º ano A |
| rafael@trilha.demo | Professor de Matemática — 6º A, 6º B, 7º A |
| juliana@familia.demo | Mãe do Lucas (3º A) e da Sofia (6º A) |
| carlos@familia.demo | Pai da Ana Clara (3º A) |
| marta@trilha.demo | Coordenação pedagógica |
| paulo@trilha.demo | Gestão (diretor) |
| beatriz@trilha.demo | Professora de **outra escola** (para testar isolamento) |

Convite de família pendente para testar o fluxo seguro: código `DAVI-2026-AB7K` em `/convite` — a data de nascimento do Davi é **03/09/2017**.

### Testes ponta a ponta

```bash
BASE_URL=http://localhost:3000 node scripts/e2e.cjs
```

Executa o fluxo completo dos critérios de entrega (criar turma → alunos → sondagem → observação → nova sondagem → comparação → Nossa semana → tarefa → convite da família → feedback → família visualiza → recado → resposta → persistência) e **tentativas de acesso indevido** entre famílias, professores, coordenação e escolas. Resultado atual: 22/22.

## O que existe

**Professor** — Hoje (o que fazer hoje, sinais de acompanhamento sem rótulos), turmas (Fund. I polivalente e Fund. II por componente, anos anteriores, importação por planilha, chamada), **perfil do aluno** (destaques no estilo Saúde, linha do tempo, avaliações, portfólio, família), sondagens com modelos próprios e **lançamento coletivo** (atalhos de teclado, nível anterior visível), notas/conceitos/descritivas com pesos, recuperação e BNCC, **comparação entre bimestres**, diário com rascunho automático e visibilidade explícita, Nossa semana (com sugestão a partir do diário), feedback individual, tarefas (links, PDFs, envio de foto pela família), mensagens com horário de atendimento, relatórios com fontes e impressão em PDF, ajustes.

**Família** — início com o que precisa de resposta (autorizações, confirmações), recados da professora, tarefas para marcar como feitas, Nossa semana, agenda com confirmação de leitura, evolução em linguagem simples (“o que isso significa” e “próximo passo”), portfólio, mensagens, “Em casa”. Troca entre filhos, inclusive em escolas diferentes.

**Coordenação** — distribuição anônima das sondagens por turma (sem ranking), alunos que podem precisar de apoio, registros compartilhados, orientações e pauta, síntese para conselho de classe.

**Onboarding** — `/criar-conta` → `/boas-vindas` em 7 etapas (escola, etapa, turma, alunos, período letivo, primeiro registro).

## Arquitetura

- Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript.
- Tailwind CSS 4 com **design system próprio** em `src/app/globals.css` (tokens, tipografia, materiais, movimento, tema claro/escuro e alto contraste) e componentes em `src/components/ui`.
- PostgreSQL com Drizzle ORM (`src/db/schema.ts`, migrações em `drizzle/`). PGlite como alternativa sem configuração.
- PWA instalável (`public/manifest.webmanifest`, `public/sw.js`). O service worker **não** guarda páginas nem dados de alunos em cache.
- Pronto para Vercel: configure `DATABASE_URL` (Neon, Supabase…) e troque o driver de arquivos em `src/lib/storage.ts` por um bucket privado.

### Segurança e privacidade

- Sessões em cookie `httpOnly`; apenas o hash do token é guardado. Senhas com scrypt. Limite de tentativas no login e nos convites.
- **Toda permissão é verificada no servidor** (`src/server/access.ts`): professor vê apenas suas turmas; coordenação vê a escola, nunca registros privados; família vê apenas filhos com vínculo **verificado pela escola**. Isolamento total entre escolas. Recursos negados respondem como inexistentes (404).
- Arquivos privados, servidos só por `/api/media/[id]` após checar o registro dono do arquivo e a autorização de imagem.
- Convite de família: código de uso único, validade de 14 dias, confirmação da data de nascimento da criança e bloqueio após 5 erros.
- Registro de auditoria de ações sensíveis; política de retenção configurável; revogação de acessos.
- Observações individuais são privadas por padrão; a visibilidade de cada registro é sempre explícita na interface.

### Assistente pedagógico

`src/server/ai/`. Dois motores com a mesma interface:

- **Local** (padrão): compõe rascunhos apenas com os registros existentes. Nada sai do servidor.
- **Claude** (opcional): ativado com `ANTHROPIC_API_KEY` **e** com a opção ligada pela gestão em Ajustes. Nomes são substituídos por marcadores antes do envio; datas de nascimento e identificadores nunca saem. Cada parágrafo precisa citar os registros (`r1`, `r2`…) — parágrafos sem fonte válida são descartados. Usa `fallbacks: "default"` para redirecionar automaticamente em caso de recusa.

Nenhum conteúdo gerado é enviado sem aprovação humana; diagnósticos clínicos e rótulos são vedados.

## Limitações conhecidas

- Upload de arquivos usa disco local; em produção serverless é preciso um bucket privado.
- O limite de tentativas de login/convite é em memória (por instância).
- Áreas de **aluno** (perfil `student`) e notificações push ainda não foram implementadas.
- Importação de `.xlsx` não é suportada diretamente — use CSV ou cole da planilha.
