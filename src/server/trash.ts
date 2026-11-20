import "server-only";

/**
 * Lixeira de curta duração para "Desfazer" (10 minutos), mantida no servidor:
 * o cliente nunca envia os dados a restaurar, só o identificador.
 * Em várias instâncias serverless, o "Desfazer" funciona quando a mesma instância atende;
 * para garantia total, troque por uma tabela com expiração.
 */
declare global {
  // eslint-disable-next-line no-var
  var __trilhaTrash: Map<string, { at: number; data: unknown }> | undefined;
}
export const trash = (globalThis.__trilhaTrash ??= new Map());
