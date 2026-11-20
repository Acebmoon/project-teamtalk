export type Paginacao = { pagina: number; limite: number };
export type Pagina<T> = Paginacao & { itens: T[]; total: number };
export type Grupo = {
  id: string; name: string; description: string | null; is_enabled: boolean;
  created_at: string; updated_at: string;
};
export type UsuarioGrupo = { id: string; email: string; display_name: string; status: string };
export type Membro = {
  user_id: string; added_at: string; added_by: string | null; usuario: UsuarioGrupo;
};
export type EventoAuditoria = {
  id: string; actor_id: string | null; action: string; target_user_id: string | null;
  details: Record<string, unknown>; created_at: string;
};
export type FiltrosGrupos = Paginacao & { estado?: "habilitado" | "desabilitado" };
export type FiltrosUsuarios = Paginacao & { busca?: string };
export type FiltrosAuditoria = Paginacao & {
  acao?: string; ator?: string; alvo?: string; desde?: string; ate?: string;
};
export type CriacaoGrupo = { nome: string; descricao?: string };
export type AlteracaoGrupo =
  | { acao: "habilitar" | "desabilitar" }
  | { acao: "incluir" | "remover"; usuarioId: string };
export type ResultadoGrupo = { grupo: Grupo; alterado: boolean };
export type EstadoLiberacao = { status?: number; erro?: string; sucesso?: string; grupoId?: string };
export type AcaoLiberacao = (estado: EstadoLiberacao, dados: FormData) => Promise<EstadoLiberacao>;
