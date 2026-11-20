import { type PreferenciaConversa, type RespostaPreferenciasInbox } from "./contratos";
import { objeto, validarConversaIds, validarPreferencia } from "./validacao";

export class ErroClienteInbox extends Error {
  constructor(public readonly status: number, mensagem: string) { super(mensagem); }
}

// HTTP do mesmo domínio; nenhuma chave ou dependência do Supabase no cliente.
export function criarClienteInbox(usuarioId: string, buscar: typeof fetch = fetch) {
  async function executar(metodo: "GET" | "PUT" | "DELETE", ids: string[], corpo?: unknown, signal?: AbortSignal) {
    const conversaIds = validarConversaIds(ids);
    const consulta = new URLSearchParams();
    if (metodo === "GET") conversaIds.forEach((id) => consulta.append("conversaId", id));
    const resposta = await buscar(`/api/inbox/preferencias${metodo === "GET" ? `?${consulta}` : ""}`, {
      method: metodo, credentials: "same-origin", cache: "no-store", signal,
      ...(corpo === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) }),
    });
    if (!resposta.ok) throw new ErroClienteInbox(resposta.status, "Não foi possível acessar sua organização.");
    const dados: unknown = await resposta.json();
    if (!objeto(dados) || dados.usuarioId !== usuarioId || !Array.isArray(dados.preferencias)
      || dados.preferencias.length !== conversaIds.length || !dados.preferencias.every(validarPreferencia))
      throw new ErroClienteInbox(500, "Resposta de organização inválida.");
    const recebidos = dados.preferencias.map((pref) => (pref as PreferenciaConversa).conversaId);
    if (new Set(recebidos).size !== conversaIds.length || conversaIds.some((id) => !recebidos.includes(id)))
      throw new ErroClienteInbox(500, "Resposta de organização inválida.");
    return dados as RespostaPreferenciasInbox;
  }
  return {
    listar: (ids: string[], signal?: AbortSignal) => executar("GET", ids, undefined, signal),
    salvar: (preferencias: PreferenciaConversa[]) => executar("PUT", preferencias.map((pref) => pref.conversaId), { preferencias }),
    excluir: (conversaIds: string[]) => executar("DELETE", conversaIds, { conversaIds }),
  };
}
