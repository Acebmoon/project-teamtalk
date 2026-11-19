import "server-only";

import type { AcessoAdminTI } from "../auth/exigir-admin-ti";
import type { Conta } from "./contratos";
import { CAMPOS_CONTA } from "./contratos";
import { criarClienteAdmin } from "./cliente";
import { ErroAdmin } from "./erros";
import { validarAlteracao, validarCadastro, validarFiltros, validarId } from "./validacoes";

const BANIMENTO = "876000h";

function falhaBanco(erro: { code?: string } | null) {
  if (!erro) return;
  if (erro.code === "42501") throw new ErroAdmin(403, "permissao", "Área restrita à TI.");
  if (erro.code === "P0002") throw new ErroAdmin(404, "nao-encontrada", "Conta ou operação não encontrada.");
  if (erro.code === "55P03" || erro.code === "23505")
    throw new ErroAdmin(409, "conflito", "Conta já cadastrada ou com uma operação em andamento.");
  if (erro.code === "22023") throw new ErroAdmin(400, "validacao", "Operação de conta inválida.");
  throw new ErroAdmin(503, "banco", "Falha ao persistir a conta e sua auditoria. Consulte o estado antes de tentar novamente.");
}

export function criarServicoContas(acesso: AcessoAdminTI) {
  // A construção deste cliente ocorre somente depois de exigirAdminTI no entrypoint.
  const admin = criarClienteAdmin(acesso);
  const ator = acesso.usuario.id;

  async function auditar(acao: string, alvo: string | null, detalhes: Record<string, unknown>) {
    const { error } = await admin.from("audit_logs").insert({
      actor_id: ator, action: acao, target_user_id: alvo, details: detalhes,
    });
    falhaBanco(error);
  }

  return {
    async listar(entrada: unknown) {
      const filtros = validarFiltros(entrada);
      let consulta = acesso.supabase.from("users").select(CAMPOS_CONTA, { count: "exact" });
      if (filtros.status) consulta = consulta.eq("status", filtros.status);
      if (filtros.busca) {
        const busca = filtros.busca.replace(/_/g, "\\_");
        consulta = consulta.or(`display_name.ilike.%${busca}%,email.ilike.%${busca}%`);
      }
      const inicio = (filtros.pagina - 1) * filtros.limite;
      const { data, count, error } = await consulta.order("display_name").order("id")
        .range(inicio, inicio + filtros.limite - 1);
      falhaBanco(error);
      await auditar("account.listed", null, { pagina: filtros.pagina, limite: filtros.limite, status: filtros.status ?? null });
      return { contas: (data ?? []) as Conta[], total: count ?? 0, pagina: filtros.pagina, limite: filtros.limite };
    },

    async consultar(entrada: unknown): Promise<Conta> {
      const id = validarId(entrada);
      const { data, error } = await acesso.supabase.from("users").select(CAMPOS_CONTA).eq("id", id).maybeSingle();
      falhaBanco(error);
      if (!data) throw new ErroAdmin(404, "nao-encontrada", "Conta não encontrada.");
      await auditar("account.viewed", id, {});
      return data as Conta;
    },

    async cadastrar(entrada: unknown): Promise<Conta> {
      const dados = validarCadastro(entrada);
      await auditar("account.creation_requested", null, { role: dados.papel, status: dados.status });
      const { data, error } = await admin.auth.admin.createUser({
        email: dados.email,
        password: dados.senha,
        email_confirm: true,
        // O perfil nasce pending pelo trigger; não conceder acesso antes do commit auditado.
        ban_duration: dados.status === "active" ? "none" : BANIMENTO,
        user_metadata: { display_name: dados.nome },
      });
      if (error || !data.user) {
        if (error?.code === "email_exists" || error?.code === "email_conflict" || error?.code === "user_already_exists")
          throw new ErroAdmin(409, "duplicada", "Já existe uma conta com esse e-mail.");
        throw new ErroAdmin(502, "auth", "O serviço de autenticação não confirmou o cadastro.");
      }
      const id = data.user.id;
      try {
        const { data: conta, error: erroPerfil } = await admin.rpc("admin_create_account", {
          p_actor_id: ator, p_target_id: id, p_role: dados.papel, p_status: dados.status,
        });
        falhaBanco(erroPerfil);
        if (!conta) throw new ErroAdmin(503, "banco", "Cadastro não confirmado.");
        return conta as Conta;
      } catch {
        // Não apagar o usuário: uma resposta perdida pode esconder um commit já auditado.
        // O perfil nasce pending; o banimento também restringe o Auth em caso de falha parcial.
        await admin.auth.admin.updateUserById(id, { ban_duration: BANIMENTO }).catch(() => undefined);
        await auditar("account.creation_incomplete", id, { verificar_auth: true }).catch(() => undefined);
        throw new ErroAdmin(503, "cadastro-incompleto", "Cadastro não confirmado. Consulte a conta e o Auth antes de reativá-la.");
      }
    },

    async alterar(entradaId: unknown, entrada: unknown): Promise<Conta> {
      const id = validarId(entradaId);
      const dados = validarAlteracao(entrada);
      if (id === ator) throw new ErroAdmin(400, "propria-conta", "Use outra conta Admin TI para administrar sua conta.");
      const { data, error } = await admin.rpc("admin_start_account_operation", {
        p_actor_id: ator, p_target_id: id, p_action: dados.acao,
      });
      falhaBanco(error);
      const operacao = data as { operacao_id: string; conta: Conta } | null;
      if (!operacao) throw new ErroAdmin(503, "banco", "Operação não iniciada.");

      const banimento = dados.acao === "reativar" ||
        (dados.acao === "redefinir-senha" && operacao.conta.status === "active") ? "none" : BANIMENTO;
      const { error: erroAuth } = await admin.auth.admin.updateUserById(id, {
        ban_duration: banimento,
        ...(dados.acao === "redefinir-senha" ? { password: dados.senha } : {}),
      });
      if (erroAuth) {
        // Somente uma rejeição definitiva permite liberar a reserva. Falhas de rede/5xx
        // mantêm a conta bloqueada e a reserva para reconciliação, sem corrida com retries.
        if (erroAuth.status && erroAuth.status >= 400 && erroAuth.status < 500 && erroAuth.status !== 429) {
          const { error: erroFalha } = await admin.rpc("admin_finish_account_operation", {
            p_actor_id: ator, p_operation_id: operacao.operacao_id, p_success: false,
          });
          falhaBanco(erroFalha);
        }
        throw new ErroAdmin(502, "auth", "O Auth não confirmou a alteração. A conta permanece sem acesso; consulte a auditoria.");
      }
      // A finalização repõe must_change_password=true APÓS updateUserById({ password }).
      const { data: conta, error: erroFinal } = await admin.rpc("admin_finish_account_operation", {
        p_actor_id: ator, p_operation_id: operacao.operacao_id, p_success: true,
      });
      falhaBanco(erroFinal);
      if (!conta) throw new ErroAdmin(503, "banco", "Alteração não confirmada.");
      return conta as Conta;
    },
  };
}
