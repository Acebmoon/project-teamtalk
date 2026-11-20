import { ErroAdmin } from "../erros";
import type { AlteracaoGrupo, CriacaoGrupo, FiltrosAuditoria, FiltrosGrupos, FiltrosUsuarios } from "./contratos";

function invalido(mensagem = "Dados ou filtros inválidos."): never {
  throw new ErroAdmin(400, "validacao", mensagem);
}
function objeto(entrada: unknown, campos: string[]) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) invalido();
  const dados = entrada as Record<string, unknown>;
  if (Object.keys(dados).some((chave) => !campos.includes(chave))) invalido();
  return dados;
}
function texto(valor: unknown, maximo: number, obrigatorio = false): string | undefined {
  if (valor === undefined) { if (obrigatorio) invalido(); return undefined; }
  if (typeof valor !== "string" || /[\u0000-\u001f\u007f]/.test(valor)) invalido();
  const limpo = valor.trim();
  if (Array.from(limpo).length > maximo || (obrigatorio && !limpo)) invalido();
  return limpo || undefined;
}
function inteiro(valor: unknown, padrao: number, maximo: number) {
  if (valor === undefined || valor === "") return padrao;
  if ((typeof valor !== "string" && typeof valor !== "number") || !/^[1-9]\d*$/.test(String(valor))) invalido();
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero > maximo) invalido();
  return numero;
}
function paginacao(dados: Record<string, unknown>) {
  return { pagina: inteiro(dados.pagina, 1, 10000), limite: inteiro(dados.limite, 20, 100) };
}
export function validarId(entrada: unknown): string {
  if (typeof entrada !== "string" || !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entrada)) invalido("Identificador inválido.");
  return entrada.toLowerCase();
}
export function validarCriacao(entrada: unknown): CriacaoGrupo {
  const dados = objeto(entrada, ["nome", "descricao"]);
  return { nome: texto(dados.nome, 100, true)!, descricao: texto(dados.descricao, 500) };
}
export function validarAlteracao(entrada: unknown): AlteracaoGrupo {
  const dados = objeto(entrada, ["acao", "usuarioId"]);
  if (dados.acao === "habilitar" || dados.acao === "desabilitar") {
    if (dados.usuarioId !== undefined) invalido();
    return { acao: dados.acao };
  }
  if (dados.acao === "incluir" || dados.acao === "remover")
    return { acao: dados.acao, usuarioId: validarId(dados.usuarioId) };
  return invalido();
}
export function validarPaginacao(entrada: unknown) {
  return paginacao(objeto(entrada, ["pagina", "limite"]));
}
export function validarFiltrosGrupos(entrada: unknown): FiltrosGrupos {
  const dados = objeto(entrada, ["pagina", "limite", "estado"]);
  const estado = texto(dados.estado, 20);
  if (estado !== undefined && estado !== "habilitado" && estado !== "desabilitado") invalido();
  return { ...paginacao(dados), estado };
}
export function validarFiltrosUsuarios(entrada: unknown): FiltrosUsuarios {
  const dados = objeto(entrada, ["pagina", "limite", "busca"]);
  const busca = texto(dados.busca, 100);
  // Não aceitar sintaxe de filtros PostgREST na busca por nome/e-mail.
  if (busca && !/^[\p{L}\p{N}@._+ '\-]+$/u.test(busca)) invalido();
  return { ...paginacao(dados), busca };
}
function dataFiltro(valor: unknown, fim: boolean) {
  const valorTexto = texto(valor, 30);
  if (!valorTexto) return undefined;
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(valorTexto);
  if (!dia && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(valorTexto)) invalido("Data inválida; use UTC ou AAAA-MM-DD.");
  const iso = dia ? `${valorTexto}T${fim ? "23:59:59.999" : "00:00:00.000"}Z` : valorTexto;
  const data = new Date(iso);
  if (!Number.isFinite(data.getTime()) || data.toISOString().slice(0, 10) !== valorTexto.slice(0, 10)) invalido("Data inválida.");
  return data.toISOString();
}
export function validarFiltrosAuditoria(entrada: unknown): FiltrosAuditoria {
  const dados = objeto(entrada, ["pagina", "limite", "acao", "ator", "alvo", "desde", "ate"]);
  const acao = texto(dados.acao, 80);
  if (acao && !/^[a-z][a-z0-9_.-]*$/.test(acao)) invalido();
  const ator = texto(dados.ator, 36);
  const alvo = texto(dados.alvo, 36);
  const desde = dataFiltro(dados.desde, false);
  const ate = dataFiltro(dados.ate, true);
  if (desde && ate && desde > ate) invalido("O início deve preceder o fim do período.");
  return { ...paginacao(dados), acao, ator: ator ? validarId(ator) : undefined,
    alvo: alvo ? validarId(alvo) : undefined, desde, ate };
}
export function filtrosURL(url: string) {
  const parametros = new URL(url).searchParams;
  if ([...parametros.keys()].some((chave) => parametros.getAll(chave).length > 1)) invalido();
  return Object.fromEntries(parametros);
}
