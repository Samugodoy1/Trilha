/**
 * Teste ponta a ponta do Trilha (fluxo completo + tentativas de acesso indevido).
 * Uso: BASE_URL=http://localhost:3000 node scripts/e2e.cjs
 * Requer o banco de demonstração (npm run db:reset) e o servidor rodando.
 */
const { chromium } = require("playwright");
const { execSync } = require("node:child_process");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DATABASE_URL ?? "postgresql://trilha:trilha@localhost:5432/trilha";
const sql = (q) => execSync(`psql "${DB}" -At -c "${q.replace(/"/g, '\\"')}"`).toString().trim();
const results = [];
const step = async (name, fn) => {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: String(e.message ?? e).split("\n")[0] });
    if (global.__shotPage && process.env.SHOTS) await global.__shotPage.screenshot({ path: `${process.env.SHOTS}/fail-${results.length}.png` }).catch(() => {});
    console.log(`✗ ${name}\n  ${String(e.message ?? e).split("\n").slice(0, 3).join("\n  ")}`);
  }
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

async function login(browser, email, viewport = { width: 1280, height: 860 }) {
  const ctx = await browser.newContext({ viewport, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE}/entrar`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "trilha2026");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/entrar")), page.click('button[type="submit"]')]);
  return { ctx, page };
}

(async () => {
  const browser = await chromium.launch();
  const stamp = Date.now().toString().slice(-6);
  const className = `5º ano Z${stamp.slice(-2)}`;
  const kid = `Clara Teste${stamp} Fictícia`;
  let classId, studentId, inviteCode, guardianEmail = `familia${stamp}@exemplo.test`;

  const { page: t } = await login(browser, "helena@trilha.demo");
  global.__shotPage = t;
  if (process.env.DEBUG_NET) {
    const T0 = Date.now();
    t.on("request", (r) => r.method() === "POST" && console.log(`   [${Date.now() - T0}ms] → POST ${r.url().replace(BASE, "")}`));
    t.on("requestfinished", async (r) => r.method() === "POST" && console.log(`   [${Date.now() - T0}ms] ← ${(await r.response())?.status()} ${r.url().replace(BASE, "")} ${JSON.stringify((await r.response())?.headers()["x-action-revalidated"] ?? "")}`));
    t.on("requestfailed", (r) => console.log(`   [${Date.now() - T0}ms] ✗ ${r.method()} ${r.url().replace(BASE, "")} ${r.failure()?.errorText}`));
    t.on("pageerror", (e) => console.log("   pageerror", e.message.slice(0, 200)));
    t.on("console", (m) => m.type() === "error" && console.log("   console", m.text().slice(0, 200)));
  }

  await step("1. Professora cria uma turma", async () => {
    await t.goto(`${BASE}/turmas/nova`, { waitUntil: "networkidle" });
    await t.getByRole("button", { name: "Fundamental I", exact: true }).click();
    await t.getByLabel("Ano").selectOption("5");
    await t.getByRole("textbox", { name: "Turma" }).fill(`Z${stamp.slice(-2)}`);
    await Promise.all([t.waitForURL(/\/turmas\/[0-9a-f-]{36}$/), t.getByRole("button", { name: "Criar turma" }).click()]);
    classId = t.url().split("/").pop();
    await t.getByRole("heading", { name: className, level: 1 }).waitFor();
  });

  await step("2. Adiciona alunos (colando a lista da planilha)", async () => {
    await t.getByRole("button", { name: "Adicionar alunos" }).first().click();
    await t.getByLabel("Lista de alunos").fill(`${kid}\t10/05/2016\nBento Exemplo Silva\t02/03/2016\nIris Exemplo Souza\t21/09/2016`);
    await t.getByRole("button", { name: "Adicionar 3 alunos" }).click();
    await t.getByText("3 alunos adicionados").waitFor();
    studentId = sql(`select id from students where full_name='${kid}'`);
    expect(studentId.length === 36, "aluno não criado");
  });

  const term = (ordinal) => sql(`select t.id from terms t join schools s on s.id=t.school_id where s.short_name='Jardim das Acácias' and t.ordinal=${ordinal} and t.starts_on::text like '2026%'`);

  const launchRound = async (termOrdinal, date, level) => {
    await t.goto(`${BASE}/sondagens/nova?turma=${classId}`, { waitUntil: "networkidle" });
    await t.getByRole("radio", { name: /Hipóteses de escrita/ }).click();
    await t.getByLabel("Bimestre").selectOption(term(termOrdinal));
    await t.getByLabel("Aplicada em").fill(date);
    await t.getByRole("button", { name: "Começar lançamento" }).click();
    const group = t.getByRole("radiogroup", { name: `Nível de ${kid}` });
    await group.waitFor({ timeout: 45000 });
    await group.getByRole("radio", { name: level, exact: true }).click();
    await t.getByText("Salvo").first().waitFor();
  };

  await step("3. Registra uma sondagem (1º bimestre)", async () => {
    await launchRound(1, "2026-03-10", "SSV");
    const n = sql(`select count(*) from assessment_results r join students s on s.id=r.student_id where s.full_name='${kid}'`);
    expect(n === "1", `esperava 1 resultado, veio ${n}`);
  });

  await step("4. Adiciona uma observação pedagógica individual (privada)", async () => {
    await t.goto(`${BASE}/alunos/${studentId}`, { waitUntil: "networkidle" });
    await t.getByRole("button", { name: "Registrar" }).click();
    await t.getByLabel("Registro", { exact: true }).fill("Reconheceu as letras do próprio nome e começou a relacionar sons às letras iniciais.");
    await t.getByRole("button", { name: "Salvar registro" }).click();
    await t.getByText("Registro salvo").waitFor();
    const v = sql(`select e.visibility from journal_entries e join journal_entry_students j on j.entry_id=e.id where j.student_id='${studentId}' and not e.is_draft`);
    expect(v === "private", `visibilidade padrão deveria ser privada, veio ${v}`);
  });

  await step("5. Registra nova sondagem em outro bimestre (4º)", async () => {
    await launchRound(4, "2026-11-12", "A");
  });

  await step("6. Compara a evolução entre bimestres", async () => {
    await t.goto(`${BASE}/alunos/${studentId}/comparar?a=${term(1)}&b=${term(4)}`, { waitUntil: "networkidle" });
    await t.getByText(/Avançou em escrita/).waitFor();
  });

  await step("Convite seguro para a família (código + data de nascimento)", async () => {
    await t.goto(`${BASE}/alunos/${studentId}`, { waitUntil: "networkidle" });
    await t.getByRole("button", { name: "Mais" }).click();
    await t.getByRole("menuitem", { name: "Convidar responsável" }).click();
    await t.getByRole("button", { name: "Gerar convite" }).click();
    inviteCode = (await t.locator("p.font-mono").innerText()).trim();
    expect(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(inviteCode), `código inválido: ${inviteCode}`);
  });

  await step("7. Publica um resumo semanal (Nossa semana)", async () => {
    await t.goto(`${BASE}/semana/nova?turma=${classId}`, { waitUntil: "networkidle" });
    await t.getByLabel("Título").fill(`Semana das descobertas ${stamp}`);
    await t.getByRole("textbox", { name: "O que trabalhamos" }).fill("Estudamos os estados da água com experimentos simples.");
    await t.getByRole("textbox", { name: "Para continuar em casa" }).fill("Observem juntos o gelo derretendo em um copo.");
    await Promise.all([t.waitForURL(`${BASE}/semana`), t.getByRole("button", { name: /Publicar para/ }).click()]);
  });

  await step("8. Adiciona uma tarefa de casa", async () => {
    await t.goto(`${BASE}/tarefas?nova=1`, { waitUntil: "networkidle" });
    await t.getByRole("textbox", { name: "Título" }).fill(`Desenhar a água ${stamp}`);
    await t.getByRole("combobox", { name: "Turma" }).selectOption(classId);
    await t.getByRole("button", { name: "Publicar" }).click();
    await t.getByText("Tarefa publicada").waitFor();
  });

  // Família aceita o convite
  const fctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const f = await fctx.newPage();
  f.setDefaultTimeout(30000);

  await step("Convite: data de nascimento errada é recusada", async () => {
    await f.goto(`${BASE}/convite?codigo=${inviteCode}`, { waitUntil: "networkidle" });
    await f.getByRole("button", { name: "Continuar" }).click();
    await f.getByLabel(/Data de nascimento de Clara/).fill("2016-01-01");
    await f.getByLabel("Seu nome").fill("Rita Exemplo");
    await f.getByLabel("E-mail").fill(guardianEmail);
    await f.getByLabel("Senha").fill("familia2026abc");
    await f.getByRole("button", { name: "Confirmar e entrar" }).click();
    await f.getByText("A data de nascimento não confere").waitFor();
  });

  await step("Convite aceito com a data correta", async () => {
    await f.getByLabel(/Data de nascimento de Clara/).fill("2016-05-10");
    await Promise.all([f.waitForURL(`${BASE}/boas-vindas`), f.getByRole("button", { name: "Confirmar e entrar" }).click()]);
  });

  await step("Boas-vindas da família (primeiro acesso)", async () => {
    await f.getByRole("heading", { name: "Olá, Rita" }).waitFor();
    for (let n = 0; n < 4 && !(await f.getByRole("button", { name: "Ver a trilha de Clara" }).isVisible()); n++) {
      await f.getByRole("button", { name: "Continuar" }).click();
      await f.waitForTimeout(450);
    }
    await Promise.all([f.waitForURL(`${BASE}/familia`), f.getByRole("button", { name: "Ver a trilha de Clara" }).click()]);
  });

  await step("9. Professora compartilha um feedback individual", async () => {
    await t.goto(`${BASE}/alunos/${studentId}`, { waitUntil: "networkidle" });
    await t.getByRole("button", { name: "Feedback" }).click();
    await t.getByLabel("Título").fill("Clara reconheceu as letras do nome!");
    await t.getByLabel("Mensagem").fill("Olá, Rita! Hoje a Clara reconheceu todas as letras do próprio nome. Que alegria!");
    await t.getByRole("button", { name: "Enviar", exact: true }).click();
    await t.getByText("Feedback enviado", { exact: true }).waitFor();
  });

  await step("10. Responsável vê somente as informações autorizadas", async () => {
    await f.goto(`${BASE}/familia`, { waitUntil: "networkidle" });
    await f.getByRole("heading", { name: "Clara", level: 1 }).waitFor();
    await f.getByText("Clara reconheceu as letras do nome!").waitFor();
    await f.getByText(`Desenhar a água ${stamp}`).waitFor();
    await f.getByText(`Semana das descobertas ${stamp}`).waitFor();
    const html = await f.content();
    expect(!html.includes("relacionar sons às letras iniciais"), "observação privada vazou para a família");
    // Sondagem não compartilhada não aparece
    await f.goto(`${BASE}/familia/desenvolvimento`, { waitUntil: "networkidle" });
    expect(!(await f.content()).includes("Hipóteses de escrita"), "sondagem não compartilhada vazou para a família");
  });

  await step("11. Responsável envia um recado", async () => {
    await f.goto(`${BASE}/familia/mensagens`, { waitUntil: "networkidle" });
    await f.getByRole("button", { name: "Nova mensagem" }).click();
    await f.getByLabel("Assunto").fill(`Dúvida sobre a tarefa ${stamp}`);
    await f.getByRole("textbox", { name: "Mensagem" }).fill("Professora, o desenho pode ser feito com lápis de cor?");
    await Promise.all([f.waitForURL(/\/familia\/mensagens\/[0-9a-f-]{36}$/), f.getByRole("button", { name: "Enviar", exact: true }).click()]);
  });

  await step("12. Professora recebe e responde", async () => {
    await t.goto(`${BASE}/mensagens`, { waitUntil: "networkidle" });
    await t.getByText(`Dúvida sobre a tarefa ${stamp}`).click();
    await t.locator("#msg").fill("Pode sim, Rita! Lápis de cor ou giz de cera.");
    await t.getByRole("button", { name: "Enviar" }).click();
    await t.getByText("Pode sim, Rita! Lápis de cor ou giz de cera.", { exact: true }).last().waitFor();
    await f.reload({ waitUntil: "networkidle" });
    await f.getByText("Pode sim, Rita! Lápis de cor ou giz de cera.", { exact: true }).last().waitFor();
  });

  await step("13. Dados persistidos e corretamente vinculados", async () => {
    const r = sql(
      `select (select count(*) from enrollments where class_id='${classId}')||','||(select count(*) from assessment_results where student_id='${studentId}')||','||(select count(*) from guardian_links where student_id='${studentId}' and verified_at is not null)||','||(select count(*) from messages m join conversations c on c.id=m.conversation_id where c.student_id='${studentId}')||','||(select count(*) from feedbacks where student_id='${studentId}' and status='published')`,
    );
    expect(r === "3,2,1,2,1", `contagens inesperadas: ${r}`);
  });

  /* ───────── Tentativas de acesso indevido ───────── */
  const ids = {
    lucas: sql("select id from students where full_name='Lucas Ribeiro'"),
    sofia: sql("select id from students where full_name='Sofia Ribeiro'"),
    c3a: sql("select id from classes where name='3º ano A'"),
    pedroMedia: sql("select m.id from media m join portfolio_items p on p.id=m.owner_id where p.title='Desenho do Pedro'"),
    lucasPublicMedia: sql("select m.id from media m join portfolio_items p on p.id=m.owner_id where p.title='Girassol' and p.student_id=(select id from students where full_name='Lucas Ribeiro')"),
    lucasPrivateMedia: sql("select m.id from media m join portfolio_items p on p.id=m.owner_id where p.title='Colagem de folhas'"),
    julianaConv: sql("select c.id from conversations c where c.subject='Sugestões de leitura para casa'"),
    privateEntry: sql("select id from journal_entries where title='Faltas nesta e na semana passada'"),
    coordEntry: sql("select id from journal_entries where title='Melhora na interpretação'"),
    round: sql("select id from assessment_rounds where title='Leitura — 4º bimestre'"),
  };
  // Páginas transmitidas (streaming) mostram a tela 404 com status 200; por isso verificamos o conteúdo.
  const status = async (page, path) => {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    if (path.startsWith("/api/")) return res.status();
    if (res.status() === 404) return 404;
    const denied = await page.getByRole("heading", { name: "Não encontrado" }).isVisible().catch(() => false);
    return denied ? 404 : res.status();
  };

  const { page: jul } = await login(browser, "juliana@familia.demo");
  await step("Família não acessa área de professor nem outros alunos", async () => {
    expect((await status(jul, `/alunos/${ids.lucas}`)) === 404, "família abriu perfil pedagógico");
    expect((await status(jul, `/api/media/${ids.pedroMedia}`)) === 404, "família viu foto de aluno de outra família/escola");
    expect((await status(jul, `/api/media/${ids.lucasPrivateMedia}`)) === 404, "família viu item privado do portfólio");
    expect((await status(jul, `/api/media/${ids.lucasPublicMedia}`)) === 200, "família não viu item autorizado do próprio filho");
    expect((await status(jul, `/familia/mensagens/${sql("select c.id from conversations c where c.subject='Falta na sexta-feira (13)'")}`)) === 404, "família abriu conversa de outra família");
  });

  const { page: carlos } = await login(browser, "carlos@familia.demo");
  await step("Outra família não abre conversas nem fotos da Juliana", async () => {
    expect((await status(carlos, `/familia/mensagens/${ids.julianaConv}`)) === 404, "família abriu conversa alheia");
    expect((await status(carlos, `/api/media/${ids.lucasPublicMedia}`)) === 404, "família viu portfólio de outro aluno");
  });

  const { page: bea } = await login(browser, "beatriz@trilha.demo");
  await step("Professora de outra escola não acessa dados desta escola", async () => {
    expect((await status(bea, `/alunos/${ids.lucas}`)) === 404, "outra escola abriu aluno");
    expect((await status(bea, `/turmas/${ids.c3a}`)) === 404, "outra escola abriu turma");
    expect((await status(bea, `/sondagens/${ids.round}`)) === 404, "outra escola abriu sondagem");
    expect((await status(bea, `/api/media/${ids.lucasPublicMedia}`)) === 404, "outra escola viu mídia");
  });

  const { page: raf } = await login(browser, "rafael@trilha.demo");
  await step("Professor só acessa alunos das próprias turmas", async () => {
    expect((await status(raf, `/alunos/${ids.lucas}`)) === 404, "professor abriu aluno de outra turma");
    expect((await status(raf, `/alunos/${ids.sofia}`)) === 200, "professor não abriu a própria aluna");
    expect((await status(raf, `/diario/${ids.privateEntry}`)) === 404, "professor leu registro privado de colega");
  });

  const { page: marta } = await login(browser, "marta@trilha.demo");
  await step("Coordenação vê o compartilhado, nunca o privado", async () => {
    expect((await status(marta, `/diario/${ids.privateEntry}`)) === 404, "coordenação leu registro privado");
    expect((await status(marta, `/diario/${ids.coordEntry}`)) === 200, "coordenação não leu registro compartilhado");
    expect((await status(marta, `/alunos/${ids.lucas}`)) === 200, "coordenação não abriu aluno da escola");
  });

  await step("Onboarding: nova professora configura escola, turma e alunos", async () => {
    const o = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: "pt-BR", timezoneId: "America/Sao_Paulo" })).newPage();
    o.setDefaultTimeout(30000);
    await o.goto(`${BASE}/criar-conta`, { waitUntil: "networkidle" });
    await o.getByLabel("Nome completo").fill("Laura Exemplo Teste");
    await o.getByLabel("E-mail").fill(`prof${stamp}@exemplo.test`);
    await o.getByLabel("Senha").fill("professora2026x");
    await Promise.all([o.waitForURL(`${BASE}/boas-vindas`), o.getByRole("button", { name: "Continuar" }).click()]);
    await o.getByRole("heading", { name: "Boas-vindas ao Trilha" }).waitFor();
    await o.getByRole("button", { name: "Continuar" }).click();
    await o.getByLabel("Nome da escola").fill(`EMEF Exemplo ${stamp}`);
    await o.getByLabel("Cidade").fill("Campinas");
    await o.getByRole("button", { name: "Continuar" }).click();
    await o.getByRole("heading", { name: "Com quem você trabalha?" }).waitFor();
    await o.getByRole("button", { name: "Continuar" }).click();
    await o.getByRole("button", { name: "Criar 3º ano A" }).click();
    await o.getByRole("heading", { name: "Seus alunos" }).waitFor();
    await o.getByLabel("Lista de alunos").fill("Davi Exemplo Rocha\t04/04/2017\nEla Exemplo Prado\t11/11/2017");
    await o.getByRole("button", { name: "Adicionar 2 alunos" }).click();
    await o.getByRole("heading", { name: "Período letivo" }).waitFor();
    await o.getByRole("button", { name: "Continuar" }).click();
    await o.getByRole("textbox", { name: "Registro", exact: true }).fill("Primeiro dia: a turma desenhou o caminho de casa até a escola.");
    await o.getByRole("button", { name: "Salvar registro" }).click();
    for (let n = 0; n < 2 && !(await o.getByRole("heading", { name: "Tudo pronto, Laura" }).isVisible()); n++) {
      await o.waitForTimeout(450);
      if (await o.getByRole("button", { name: "Continuar" }).isVisible()) await o.getByRole("button", { name: "Continuar" }).click();
    }
    await o.getByText("2 alunos com histórico pronto").waitFor();
    await Promise.all([o.waitForURL(`${BASE}/hoje`), o.getByRole("button", { name: "Começar a usar o Trilha" }).click()]);
  });

  await step("Sem sessão: redireciona para entrar e bloqueia arquivos", async () => {
    const anon = await (await browser.newContext()).newPage();
    await anon.goto(`${BASE}/hoje`, { waitUntil: "networkidle" });
    expect(new URL(anon.url()).pathname === "/entrar", "página protegida abriu sem sessão");
    expect((await status(anon, `/api/media/${ids.lucasPublicMedia}`)) === 401, "arquivo servido sem sessão");
  });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificações passaram.`);
  process.exit(failed.length ? 1 : 0);
})();
