// Mesmos nomes e tipos dos metadados de UltimaMensagemConversa do PR #99.
// A identidade do remetente é sempre obtida da sessão no servidor.
export type MensagemChat = {
  id: string;
  conversaId: string;
  remetenteId: string;
  criadaEm: string;
  editadaEm: string | null;
} & (
  | { tipo: "text"; conteudo: string; nomeArquivo: null }
  | { tipo: "pdf"; conteudo: null; nomeArquivo: string }
);

export type PaginaMensagens = {
  usuarioId: string;
  conversaId: string;
  mensagens: MensagemChat[];
  paginacao: { limite: number; proximoCursor: string | null };
};

export type EnvioTexto = { conteudo: string };
export type TextoEnviado = { usuarioId: string; mensagem: MensagemChat };
export type ErroMensagens = { erro: string };
