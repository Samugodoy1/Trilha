/** Vocabulário do produto: um único lugar para rótulos humanos de cada conceito. */

export type Role = "teacher" | "coordinator" | "admin" | "guardian" | "student";
export type Visibility = "private" | "coordination" | "family";

export const roleLabel: Record<Role, string> = {
  teacher: "Professor(a)",
  coordinator: "Coordenação pedagógica",
  admin: "Gestão escolar",
  guardian: "Família",
  student: "Estudante",
};

export const visibilityInfo: Record<Visibility, { label: string; short: string; description: string }> = {
  private: {
    label: "Somente eu",
    short: "Privado",
    description: "Registro pedagógico interno. Ninguém além de você pode ver.",
  },
  coordination: {
    label: "Eu e a coordenação",
    short: "Coordenação",
    description: "A coordenação pedagógica da escola também pode ver. A família, não.",
  },
  family: {
    label: "Família",
    short: "Família",
    description: "Os responsáveis verificados de cada aluno marcado poderão ler.",
  },
};

export const entryKinds = {
  observacao: { label: "Observação", plural: "Observações" },
  conquista: { label: "Conquista", plural: "Conquistas" },
  dificuldade: { label: "Dificuldade observada", plural: "Dificuldades" },
  estrategia: { label: "Estratégia pedagógica", plural: "Estratégias" },
  intervencao: { label: "Intervenção", plural: "Intervenções" },
  participacao: { label: "Participação", plural: "Participação" },
  conteudo: { label: "Conteúdo trabalhado", plural: "Conteúdos" },
  atividade: { label: "Atividade realizada", plural: "Atividades" },
  acontecimento: { label: "Acontecimento", plural: "Acontecimentos" },
} as const;
export type EntryKind = keyof typeof entryKinds;

export const templateKinds = {
  leitura: { label: "Leitura", category: "reading" },
  escrita: { label: "Escrita", category: "writing" },
  matematica: { label: "Matemática", category: "math" },
  diagnostica: { label: "Diagnóstica", category: "diagnostic" },
  habilidades: { label: "Habilidades", category: "skills" },
  personalizada: { label: "Personalizada", category: "custom" },
} as const;
export type TemplateKind = keyof typeof templateKinds;

export const feedbackTones = {
  conquista: { label: "Conquista", prompt: "Algo que vale celebrar" },
  evolucao: { label: "Evolução", prompt: "Um avanço na aprendizagem" },
  autonomia: { label: "Autonomia", prompt: "Mais independência no dia a dia" },
  participacao: { label: "Participação", prompt: "Envolvimento nas atividades" },
  a_desenvolver: { label: "Para desenvolver", prompt: "Algo que podemos trabalhar juntos" },
  orientacao: { label: "Orientação", prompt: "Uma sugestão para a família" },
  em_casa: { label: "Em casa", prompt: "Uma atividade simples para fazer juntos" },
} as const;
export type FeedbackTone = keyof typeof feedbackTones;

export const taskKinds = {
  casa: "Tarefa de casa",
  complementar: "Atividade complementar",
  estudo: "Material de estudo",
  leitura: "Leitura",
  material: "Material necessário",
} as const;

export const announcementKinds = {
  recado: "Recado",
  comunicado: "Comunicado",
  evento: "Evento",
  reuniao: "Reunião",
  material: "Material",
  lembrete: "Lembrete",
  autorizacao: "Autorização",
} as const;
export type AnnouncementKind = keyof typeof announcementKinds;

export const conversationCategories = {
  recado: { label: "Recado", hint: "Um aviso rápido para a professora" },
  pergunta: { label: "Pergunta", hint: "Uma dúvida sobre tarefas, aulas ou rotina" },
  observacao: { label: "Observação", hint: "Algo que vocês perceberam em casa" },
  agradecimento: { label: "Agradecimento", hint: "Para dizer obrigado" },
  elogio: { label: "Elogio", hint: "Para reconhecer algo especial" },
  ausencia: { label: "Justificar ausência", hint: "Avisar ou justificar uma falta" },
  conversa: { label: "Pedir uma conversa", hint: "Marcar um horário para conversar" },
} as const;
export type ConversationCategory = keyof typeof conversationCategories;

export const reportKinds = {
  parecer: { label: "Parecer descritivo", description: "Texto individual sobre o percurso do aluno no bimestre." },
  evolucao: { label: "Relatório de evolução", description: "Comparação entre períodos, com base nas sondagens e registros." },
  reuniao_pais: { label: "Reunião de pais", description: "Resumo acolhedor para conversar com a família." },
  conselho: { label: "Conselho de classe", description: "Síntese objetiva para o conselho, por aluno." },
  intervencoes: { label: "Intervenções pedagógicas", description: "Histórico de estratégias e intervenções realizadas." },
  bimestral: { label: "Relatório bimestral", description: "Visão geral do bimestre: sondagens, avaliações e frequência." },
} as const;
export type ReportKind = keyof typeof reportKinds;

export const portfolioKinds = {
  desenho: "Desenho",
  texto: "Produção textual",
  atividade: "Atividade",
  projeto: "Projeto",
  foto: "Fotografia",
  conquista: "Conquista",
} as const;

export const contributionKinds = {
  leitura: "Lemos juntos",
  atividade: "Fizemos uma atividade",
  observacao: "Percebemos em casa",
  conquista: "Uma conquista",
} as const;

export const stageLabels = {
  infantil: "Educação Infantil",
  fundamental_1: "Ensino Fundamental I",
  fundamental_2: "Ensino Fundamental II",
  medio: "Ensino Médio",
} as const;
export type Stage = keyof typeof stageLabels;

export const shiftLabels = { manha: "Manhã", tarde: "Tarde", integral: "Integral", noite: "Noite" } as const;

export const attendanceLabels = {
  presente: "Presente",
  falta: "Falta",
  atraso: "Atraso",
  justificada: "Falta justificada",
} as const;

/** Glossário para traduzir termos pedagógicos para as famílias. */
export const familyGlossary: Record<string, string> = {
  "pré-silábico": "ainda está descobrindo que a escrita representa os sons da fala",
  "silábico sem valor sonoro": "já entende que escrevemos partes das palavras, ainda sem relacionar as letras aos sons",
  "silábico com valor sonoro": "usa uma letra para cada sílaba, já relacionando as letras aos sons",
  "silábico-alfabético": "às vezes escreve uma letra por sílaba e às vezes escreve a sílaba completa",
  "alfabético": "já escreve as palavras representando todos os sons",
  "sondagem": "uma atividade curta que mostra como a criança está pensando a leitura, a escrita ou a matemática",
  "intervenção": "uma estratégia diferente que a professora usou para apoiar a aprendizagem",
  "fluência leitora": "ler com ritmo, sem precisar parar a cada palavra",
  "consciência fonológica": "perceber os sons que formam as palavras",
  "habilidade": "algo que a criança aprende a fazer",
};
