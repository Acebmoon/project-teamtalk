// IDs de MensagemChat (#101), UltimaMensagemConversa (#99) e MensagemConversa (#94).
export type LeituraDestinatario = {
  usuarioId: string;
  entrouEm: string;
  lidaEm: string | null;
};

export type StatusLeituraMensagem = {
  mensagemId: string;
  remetenteId: string;
  destinatarios: LeituraDestinatario[];
};

export type StatusLeiturasConversa = {
  usuarioId: string;
  conversaId: string;
  mensagens: StatusLeituraMensagem[];
};

export type LeituraRegistrada = {
  usuarioId: string;
  conversaId: string;
  leitura: { mensagemId: string; usuarioId: string; lidaEm: string };
};

export type MensagemParaLeitura = { id: string; conversaId: string; remetenteId: string };
export type ErroLeituras = { erro: string };
