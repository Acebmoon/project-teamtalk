// Contrato do seletor da Issue #77. O remetente vem exclusivamente da sessão.
export type PdfEnviado = {
  usuarioId: string;
  mensagem: {
    id: string;
    conversaId: string;
    remetenteId: string;
    criadaEm: string;
    editadaEm: null;
    tipo: "pdf";
    conteudo: null;
    nomeArquivo: string;
  };
  anexo: { tamanhoBytes: number; downloadUrl: string };
};

export type ArquivoPdf = Pick<File, "name" | "type" | "size" | "arrayBuffer">;
// O middleware de auth/dispositivo existente pode responder apenas { erro }.
export type ErroAnexo = { erro: string; codigo?: string };
