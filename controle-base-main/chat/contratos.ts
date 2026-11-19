export type ParticipanteConversa = {
  usuarioId: string;
  entrouEm: string;
};

export type UltimaMensagemConversa = {
  id: string;
  remetenteId: string;
  tipo: "text" | "pdf";
  conteudo: string | null;
  nomeArquivo: string | null;
  criadaEm: string;
};

export type ConversaListada = {
  id: string;
  tipo: "direct" | "group";
  titulo: string;
  criadaEm: string;
  atualizadaEm: string;
  atividadeEm: string;
  participantes: ParticipanteConversa[];
  ultimaMensagem: UltimaMensagemConversa | null;
  naoLidas: number;
};

export type PaginaConversas = {
  usuarioId: string;
  conversas: ConversaListada[];
  paginacao: {
    limite: number;
    proximoCursor: string | null;
  };
};

export type ErroListagemConversas = { erro: string };
