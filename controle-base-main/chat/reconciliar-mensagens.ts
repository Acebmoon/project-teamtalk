import type { MensagemChat } from "./contratos-mensagens";

function instante(criadaEm: string) {
  const fracao = criadaEm.match(/\.(\d+)/)?.[1] ?? "";
  return `${new Date(criadaEm).toISOString().slice(0, 19)}.${fracao.padEnd(6, "0")}`;
}

// Confirmação HTTP, histórico e reconexão podem entregar o mesmo ID.
export function reconciliarMensagens(atuais: MensagemChat[], recebidas: MensagemChat[]): MensagemChat[] {
  const unicas = new Map(atuais.map((mensagem) => [mensagem.id, mensagem]));
  for (const mensagem of recebidas) unicas.set(mensagem.id, mensagem);
  return [...unicas.values()].sort((a, b) => {
    const primeiro = instante(a.criadaEm);
    const segundo = instante(b.criadaEm);
    if (primeiro !== segundo) return primeiro < segundo ? -1 : 1;
    return a.id === b.id ? 0 : a.id < b.id ? -1 : 1;
  });
}
