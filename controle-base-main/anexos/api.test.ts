import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { criarServidor } from "../supabase/servidor";
import { criarArmazenamentoPdf } from "./armazenamento";
import { criarPdfTeste, CONVERSA, MENSAGEM, OBJETO, USUARIO } from "./fixtures";
import { POST } from "../../base(tempval)/src/app/api/conversas/[conversaId]/anexos/pdf/route";
import { GET } from "../../base(tempval)/src/app/api/conversas/[conversaId]/anexos/[mensagemId]/route";

vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn() }));
vi.mock("./armazenamento", () => ({ criarArmazenamentoPdf: vi.fn() }));

const contextoUpload = () => ({ params: Promise.resolve({ conversaId: CONVERSA }) });
const contextoDownload = () => ({ params: Promise.resolve({ conversaId: CONVERSA, mensagemId: MENSAGEM }) });
const caminho = `${CONVERSA}/${USUARIO}/${OBJETO}.pdf`;
const dataCriacao = "2026-11-19T00:00:00.000Z";

let estado: { logado: boolean; autorizado: boolean; trocarSenha: boolean; expirado: boolean; participante: boolean };
let bytes: Buffer;

const consulta = {
  insert: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), maybeSingle: vi.fn(),
};
const cliente = {
  auth: { getUser: vi.fn(), getClaims: vi.fn() }, rpc: vi.fn(), from: vi.fn(),
};
const storage = { upload: vi.fn(), remove: vi.fn(), download: vi.fn() };

function upload(arquivo = new File([Uint8Array.from(bytes)], "relatório.pdf", { type: "application/pdf" })) {
  const formulario = new FormData();
  formulario.set("arquivo", arquivo);
  return new Request("http://localhost/upload", { method: "POST", body: formulario });
}

beforeEach(async () => {
  vi.resetAllMocks();
  vi.stubEnv("PDF_MAX_BYTES", undefined);
  bytes = await criarPdfTeste();
  estado = { logado: true, autorizado: true, trocarSenha: false, expirado: false, participante: true };
  cliente.auth.getUser.mockImplementation(async () => ({ data: { user: estado.logado ? { id: USUARIO } : null } }));
  cliente.auth.getClaims.mockImplementation(async () => ({ data: { claims: { amr: [
    { method: "password", timestamp: Date.now() / 1000 - (estado.expirado ? 13 * 3600 : 10) },
  ] } } }));
  cliente.rpc.mockImplementation(async (nome: string) => ({ error: null, data: nome === "get_access_state"
    ? { authorized: estado.autorizado, must_change_password: estado.trocarSenha, it_admin: true }
    : estado.participante }));
  cliente.from.mockReturnValue(consulta);
  consulta.insert.mockReturnValue(consulta);
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  consulta.single.mockResolvedValue({ data: { id: MENSAGEM, created_at: dataCriacao }, error: null });
  consulta.maybeSingle.mockResolvedValue({ data: { sender_id: USUARIO, attachment_path: caminho, attachment_name: "relatório.pdf" }, error: null });
  vi.mocked(criarServidor).mockResolvedValue(cliente as unknown as SupabaseClient);
  vi.mocked(criarArmazenamentoPdf).mockReturnValue(storage as unknown as ReturnType<typeof criarArmazenamentoPdf>);
  storage.upload.mockResolvedValue({ error: null });
  storage.remove.mockResolvedValue({ error: null });
  storage.download.mockResolvedValue({ error: null, data: new Blob([Uint8Array.from(bytes)], { type: "application/pdf" }) });
});

afterEach(() => vi.unstubAllEnvs());

describe("rotas PDF sem depender do middleware", () => {
  it("publica PDF válido com identidade da sessão, caminho aleatório e contrato para #77", async () => {
    const resposta = await POST(upload(), contextoUpload());
    expect(resposta.status).toBe(201);
    expect(await resposta.json()).toEqual({
      usuarioId: USUARIO,
      mensagem: { id: MENSAGEM, conversaId: CONVERSA, remetenteId: USUARIO, criadaEm: dataCriacao,
        editadaEm: null, tipo: "pdf", conteudo: null, nomeArquivo: "relatório.pdf" },
      anexo: { tamanhoBytes: bytes.length, downloadUrl: `/api/conversas/${CONVERSA}/anexos/${MENSAGEM}` },
    });
    expect(consulta.insert).toHaveBeenCalledWith({
      conversation_id: CONVERSA, sender_id: USUARIO, message_type: "pdf", body: null,
      attachment_path: expect.stringMatching(new RegExp(`^${CONVERSA}/${USUARIO}/[0-9a-f-]{36}\\.pdf$`)),
      attachment_name: "relatório.pdf",
    });
    expect(storage.upload).toHaveBeenCalledWith(expect.any(String), bytes, {
      contentType: "application/pdf", upsert: false, cacheControl: "0",
    });
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
  });

  it.each([
    ["sessão ausente", "logado", false, 401], ["sessão vencida", "expirado", true, 401],
    ["conta negada", "autorizado", false, 403], ["senha provisória", "trocarSenha", true, 403],
    ["não participante, inclusive TI", "participante", false, 403],
  ] as const)("nega upload e download por %s", async (_caso, chave, valor, status) => {
    estado[chave] = valor;
    const request = upload();
    const leitor = vi.spyOn(request.body!, "getReader");
    expect((await POST(request, contextoUpload())).status).toBe(status);
    expect((await GET(new Request("http://localhost/download"), contextoDownload())).status).toBe(status);
    expect(leitor).not.toHaveBeenCalled();
    expect(criarArmazenamentoPdf).not.toHaveBeenCalled();
    expect(consulta.insert).not.toHaveBeenCalled();
  });

  it("revalida participação depois da leitura e antes de usar service_role", async () => {
    let verificacoes = 0;
    cliente.rpc.mockImplementation(async (nome: string) => ({ error: null, data: nome === "get_access_state"
      ? { authorized: true, must_change_password: false } : ++verificacoes === 1 }));
    expect((await POST(upload(), contextoUpload())).status).toBe(403);
    expect(criarArmazenamentoPdf).not.toHaveBeenCalled();
  });

  it("rejeita falsificação e limite do ambiente sem gravar nada", async () => {
    expect((await POST(upload(new File(["PK\x03\x04word/document.xml"], "renomeado.pdf", { type: "application/pdf" })), contextoUpload())).status).toBe(415);
    vi.stubEnv("PDF_MAX_BYTES", String(bytes.length - 1));
    expect((await POST(upload(), contextoUpload())).status).toBe(413);
    expect(criarArmazenamentoPdf).not.toHaveBeenCalled();
    expect(consulta.insert).not.toHaveBeenCalled();
  });

  it("rejeita ID inválido antes de consultar a conversa", async () => {
    expect((await POST(upload(), { params: Promise.resolve({ conversaId: "../outro" }) })).status).toBe(400);
    expect(cliente.rpc).toHaveBeenCalledTimes(1); // Apenas get_access_state.
  });

  it("falha fechada se a verificação de participação estiver indisponível", async () => {
    cliente.rpc.mockImplementation(async (nome: string) => nome === "get_access_state"
      ? { data: { authorized: true }, error: null } : { data: null, error: { message: "interno" } });
    const resposta = await POST(upload(), contextoUpload());
    expect(resposta.status).toBe(500);
    expect(criarArmazenamentoPdf).not.toHaveBeenCalled();
  });

  it("não insere mensagem quando o Storage falha", async () => {
    storage.upload.mockResolvedValue({ error: { message: "segredo-interno" } });
    const resposta = await POST(upload(), contextoUpload());
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("segredo-interno");
    expect(consulta.insert).not.toHaveBeenCalled();
  });

  it.each([["42501", 403], ["XX000", 500]])("compensa o upload se a persistência falhar (%s)", async (code, status) => {
    consulta.single.mockResolvedValue({ data: null, error: { code } });
    const resposta = await POST(upload(), contextoUpload());
    expect(resposta.status).toBe(status);
    const caminhoEnviado = storage.upload.mock.calls[0][0];
    expect(storage.remove).toHaveBeenCalledWith([caminhoEnviado]);
  });

  it("entrega os bytes apenas depois de sessão, participação e leitura RLS da mensagem", async () => {
    const resposta = await GET(new Request("http://localhost/download"), contextoDownload());
    expect(resposta.status).toBe(200);
    expect(Buffer.from(await resposta.arrayBuffer())).toEqual(bytes);
    expect(resposta.headers.get("content-type")).toBe("application/pdf");
    expect(resposta.headers.get("content-disposition")).toContain("filename*=UTF-8''relat%C3%B3rio.pdf");
    expect(resposta.headers.get("cache-control")).toBe("private, no-store");
    expect(consulta.eq).toHaveBeenCalledWith("conversation_id", CONVERSA);
    expect(consulta.eq).toHaveBeenCalledWith("message_type", "pdf");
    expect(storage.download).toHaveBeenCalledWith(caminho);
  });

  it("não consulta Storage para mensagem ausente ou caminho adulterado de outra conversa", async () => {
    consulta.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    expect((await GET(new Request("http://localhost/download"), contextoDownload())).status).toBe(404);
    consulta.maybeSingle.mockResolvedValueOnce({ data: { sender_id: USUARIO, attachment_path: `outra/${OBJETO}.pdf`, attachment_name: "arquivo.pdf" }, error: null });
    expect((await GET(new Request("http://localhost/download"), contextoDownload())).status).toBe(404);
    expect(criarArmazenamentoPdf).not.toHaveBeenCalled();
  });

  it("não expõe mensagens internas em falhas de download", async () => {
    storage.download.mockResolvedValue({ data: null, error: { message: "token-secreto" } });
    const resposta = await GET(new Request("http://localhost/download"), contextoDownload());
    expect(resposta.status).toBe(500);
    expect(await resposta.text()).not.toContain("token-secreto");
  });
});
