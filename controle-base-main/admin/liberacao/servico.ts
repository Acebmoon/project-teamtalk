import "server-only";

import type { AcessoAdminTI } from "../../auth/exigir-admin-ti";
import { criarClienteAdmin } from "../cliente";
import { ErroAdmin } from "../erros";
import type { EventoAuditoria, Grupo, Membro, Pagina, Paginacao, ResultadoGrupo, UsuarioGrupo } from "./contratos";
import { validarAlteracao, validarCriacao, validarFiltrosAuditoria, validarFiltrosGrupos,
  validarFiltrosUsuarios, validarId, validarPaginacao } from "./validacoes";

const CAMPOS_GRUPO = "id,name,description,is_enabled,created_at,updated_at";
function falhaBanco(erro: { code?: string } | null) {
  if (!erro) return;
  if (erro.code === "42501") throw new ErroAdmin(403, "permissao", "Área restrita à TI.");
  if (erro.code === "P0002") throw new ErroAdmin(404, "nao-encontrado", "Grupo ou usuário não encontrado.");
  if (erro.code === "23505") throw new ErroAdmin(409, "duplicado", "Já existe um grupo com esse nome.");
  if (erro.code === "22023") throw new ErroAdmin(400, "validacao", "Operação de grupo inválida.");
  throw new ErroAdmin(503, "banco", "Operação não confirmada. Atualize o grupo e consulte a auditoria antes de tentar novamente.");
}
function intervalo(filtros: Paginacao): [number, number] {
  const inicio = (filtros.pagina - 1) * filtros.limite;
  return [inicio, inicio + filtros.limite - 1];
}
function pagina<T>(itens: unknown, total: number | null, filtros: Paginacao): Pagina<T> {
  return { itens: (itens ?? []) as T[], total: total ?? 0, pagina: filtros.pagina, limite: filtros.limite };
}

// Contexto obtido exclusivamente por exigirAdminTI() nos entrypoints.
export function criarServicoLiberacao(acesso: AcessoAdminTI) {
  return {
    async listarGrupos(entrada: unknown) {
      const filtros = validarFiltrosGrupos(entrada);
      let consulta = acesso.supabase.from("release_groups").select(CAMPOS_GRUPO, { count: "exact" });
      if (filtros.estado) consulta = consulta.eq("is_enabled", filtros.estado === "habilitado");
      const { data, count, error } = await consulta.order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(...intervalo(filtros));
      falhaBanco(error);
      return pagina<Grupo>(data, count, filtros);
    },
    async consultarGrupo(entradaId: unknown): Promise<Grupo> {
      const id = validarId(entradaId);
      const { data, error } = await acesso.supabase.from("release_groups").select(CAMPOS_GRUPO).eq("id", id).maybeSingle();
      falhaBanco(error);
      if (!data) throw new ErroAdmin(404, "nao-encontrado", "Grupo não encontrado.");
      return data as Grupo;
    },
    async listarMembros(entradaId: unknown, entrada: unknown) {
      const id = validarId(entradaId);
      const filtros = validarPaginacao(entrada);
      await this.consultarGrupo(id);
      const { data, count, error } = await acesso.supabase.from("release_group_members")
        .select("user_id,added_at,added_by,usuario:users!release_group_members_user_id_fkey(id,email,display_name,status)", { count: "exact" })
        .eq("release_group_id", id).order("added_at", { ascending: false }).order("user_id")
        .range(...intervalo(filtros));
      falhaBanco(error);
      return pagina<Membro>(data, count, filtros);
    },
    async listarUsuarios(entrada: unknown) {
      const filtros = validarFiltrosUsuarios(entrada);
      let consulta = acesso.supabase.from("users").select("id,email,display_name,status", { count: "exact" });
      if (filtros.busca) {
        const busca = filtros.busca.replace(/_/g, "\\_");
        consulta = consulta.or(`display_name.ilike.%${busca}%,email.ilike.%${busca}%`);
      }
      const { data, count, error } = await consulta.order("display_name").order("id").range(...intervalo(filtros));
      falhaBanco(error);
      return pagina<UsuarioGrupo>(data, count, filtros);
    },
    async criarGrupo(entrada: unknown): Promise<ResultadoGrupo> {
      const dados = validarCriacao(entrada);
      const { data, error } = await criarClienteAdmin(acesso).rpc("admin_manage_release_group", {
        p_actor_id: acesso.usuario.id, p_action: "criar", p_name: dados.nome, p_description: dados.descricao ?? null,
      });
      falhaBanco(error);
      if (!data) throw new ErroAdmin(503, "banco", "Criação do grupo não confirmada.");
      return data as ResultadoGrupo;
    },
    async alterarGrupo(entradaId: unknown, entrada: unknown): Promise<ResultadoGrupo> {
      const id = validarId(entradaId);
      const dados = validarAlteracao(entrada);
      const { data, error } = await criarClienteAdmin(acesso).rpc("admin_manage_release_group", {
        p_actor_id: acesso.usuario.id, p_action: dados.acao, p_group_id: id,
        p_user_id: "usuarioId" in dados ? dados.usuarioId : null,
      });
      falhaBanco(error);
      if (!data) throw new ErroAdmin(503, "banco", "Alteração do grupo não confirmada.");
      return data as ResultadoGrupo;
    },
    async listarAuditoria(entrada: unknown) {
      const filtros = validarFiltrosAuditoria(entrada);
      // Cast no PostgREST preserva o bigint como string, inclusive acima de 2^53.
      let consulta = acesso.supabase.from("audit_logs")
        .select("id::text,actor_id,action,target_user_id,details,created_at", { count: "exact" });
      if (filtros.acao) consulta = consulta.eq("action", filtros.acao);
      if (filtros.ator) consulta = consulta.eq("actor_id", filtros.ator);
      if (filtros.alvo) consulta = consulta.eq("target_user_id", filtros.alvo);
      if (filtros.desde) consulta = consulta.gte("created_at", filtros.desde);
      if (filtros.ate) consulta = consulta.lte("created_at", filtros.ate);
      const { data, count, error } = await consulta.order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(...intervalo(filtros));
      falhaBanco(error);
      return pagina<EventoAuditoria>(data, count, filtros);
    },
  };
}
