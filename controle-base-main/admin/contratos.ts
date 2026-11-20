export type StatusConta = "pending" | "active" | "blocked" | "disabled";
export type PapelConta = "employee" | "it_admin";
export type AcaoConta = "bloquear" | "reativar" | "desativar" | "redefinir-senha";

export type Conta = {
  id: string;
  email: string;
  display_name: string;
  role: PapelConta;
  status: StatusConta;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type CadastroConta = {
  nome: string;
  email: string;
  papel: PapelConta;
  status: "pending" | "active";
  senha: string;
};
export type AlteracaoConta = { acao: AcaoConta; senha?: string };
export type FiltrosContas = { pagina: number; limite: number; busca: string; status?: StatusConta };
export type ListaContas = { contas: Conta[]; total: number; pagina: number; limite: number };
export type EstadoFormulario = { erro?: string; sucesso?: string };

export const CAMPOS_CONTA = "id,email,display_name,role,status,must_change_password,created_at,updated_at";
