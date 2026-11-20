export type PrioridadeInbox = "normal" | "alta" | "urgente";
export type SituacaoInbox = "acompanhar" | "em-conversa" | "concluida";

// Mesmos valores e nomes visuais de TelaConversas (PR #97).
export type PreferenciaInbox = {
  prioridade: PrioridadeInbox;
  situacao: SituacaoInbox;
  favorita: boolean;
};
export type PreferenciaConversa = PreferenciaInbox & { conversaId: string };
export type RespostaPreferenciasInbox = {
  usuarioId: string;
  preferencias: PreferenciaConversa[];
};
export type OrganizacaoInbox = Record<string, PreferenciaInbox>;

export const PREFERENCIA_PADRAO: Readonly<PreferenciaInbox> = Object.freeze({
  prioridade: "normal", situacao: "em-conversa", favorita: false,
});
export const LIMITE_CONVERSAS_INBOX = 50;

export class ErroInbox extends Error {
  constructor(public readonly status: 400 | 404 | 413 | 415 | 500, mensagem: string) {
    super(mensagem);
  }
}
