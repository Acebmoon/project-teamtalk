import type { AlteracaoConta, CadastroConta, FiltrosContas, StatusConta } from "./contratos";
import { ErroAdmin } from "./erros";

function invalido(mensagem: string): never {
  throw new ErroAdmin(400, "validacao", mensagem);
}

function objeto(entrada: unknown, campos: string[]): Record<string, unknown> {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada))
    return invalido("Dados inválidos.");
  const dados = entrada as Record<string, unknown>;
  if (Object.keys(dados).some((chave) => !campos.includes(chave)))
    return invalido("Campo não permitido.");
  return dados;
}

function texto(entrada: unknown): string {
  return typeof entrada === "string" ? entrada.trim() : "";
}

export function validarId(entrada: unknown): string {
  if (typeof entrada !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entrada))
    return invalido("Identificador de conta inválido.");
  return entrada;
}

export function validarSenhaProvisoria(entrada: unknown): string {
  if (typeof entrada !== "string" || entrada.length < 10 || new TextEncoder().encode(entrada).length > 72)
    return invalido("A senha provisória precisa ter ao menos 10 caracteres e até 72 bytes.");
  return entrada;
}

export function validarCadastro(entrada: unknown): CadastroConta {
  const dados = objeto(entrada, ["nome", "email", "papel", "status", "senha"]);
  const nome = texto(dados.nome);
  const email = texto(dados.email).toLowerCase();
  if (!nome || nome.length > 120 || /[\x00-\x1f\x7f]/.test(nome))
    return invalido("Informe um nome de até 120 caracteres.");
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))
    return invalido("Informe um e-mail válido.");
  const papel = dados.papel ?? "employee";
  const status = dados.status ?? "pending";
  if (papel !== "employee" && papel !== "it_admin") return invalido("Perfil inválido.");
  if (status !== "pending" && status !== "active") return invalido("Estado inicial inválido.");
  return { nome, email, papel, status, senha: validarSenhaProvisoria(dados.senha) };
}

export function validarAlteracao(entrada: unknown): AlteracaoConta {
  const dados = objeto(entrada, ["acao", "senha"]);
  const acao = dados.acao;
  if (acao !== "bloquear" && acao !== "reativar" && acao !== "desativar" && acao !== "redefinir-senha")
    return invalido("Operação inválida.");
  if (acao === "redefinir-senha") return { acao, senha: validarSenhaProvisoria(dados.senha) };
  if (dados.senha !== undefined) return invalido("Senha permitida somente na redefinição.");
  return { acao };
}

export function validarFiltros(entrada: unknown): FiltrosContas {
  const dados = objeto(entrada, ["pagina", "limite", "busca", "status"]);
  function inteiro(valor: unknown, padrao: number, maximo: number) {
    const textoValor = valor === undefined ? String(padrao) : String(valor);
    if (!/^\d{1,5}$/.test(textoValor)) return invalido("Paginação inválida.");
    const numero = Number(textoValor);
    if (numero < 1 || numero > maximo) return invalido("Paginação inválida.");
    return numero;
  }
  if (dados.busca !== undefined && typeof dados.busca !== "string") return invalido("Busca inválida.");
  const busca = texto(dados.busca);
  // A whitelist impede que a busca injete operadores na expressão .or() do PostgREST.
  if (busca.length > 100 || !/^[\p{L}\p{N}\s@._+\-]*$/u.test(busca)) return invalido("Busca inválida.");
  const status = dados.status === "" ? undefined : dados.status;
  if (status !== undefined && (typeof status !== "string" || !["pending", "active", "blocked", "disabled"].includes(status)))
    return invalido("Estado de conta inválido.");
  return {
    pagina: inteiro(dados.pagina, 1, 10000),
    limite: inteiro(dados.limite, 20, 50),
    busca,
    status: status as StatusConta | undefined,
  };
}
