# Preferências pessoais da Inbox — Issue #98

Prioridade, coluna e favorito pertencem ao usuário autenticado. Não atualizam mensagens, atividade, recibos, participantes nem a organização dos demais usuários. Evolução de UX relacionada a RNF08, RNF12 e SEG04.

## Banco e autorização

Aplicar `base(tempval)/supabase/migrations/20261120120000_inbox_preferences.sql` depois das quatro migrations da `main`. A migration é aditiva e independente da RPC de listagem do PR #99. Não exige service_role, bucket, Realtime ou variável de ambiente nova.

`public.inbox_preferences` usa chave primária `(user_id, conversation_id)` e referências a usuário, conversa e participação. Os campos são:

| Banco | Contrato/UI | Valores |
|---|---|---|
| `user_id` | `usuarioId` da resposta | Derivado da sessão; nunca aceito no corpo/consulta |
| `conversation_id` | `conversaId` | UUID de conversa autorizada |
| `priority` | `prioridade` | `normal`, `alta`, `urgente` |
| `situation` | `situacao` | `acompanhar`, `em-conversa`, `concluida` |
| `is_favorite` | `favorita` | Booleano |
| `created_at`, `updated_at` | Não publicados | Horários mantidos no banco |

RLS habilitado e forçado. As quatro operações exigem simultaneamente `user_id = auth.uid()` e `can_access_conversation(conversation_id)`. UPDATE valida tanto a linha anterior (`USING`) quanto a nova (`WITH CHECK`). A função existente exige participação, conta ativa/liberada e `must_change_password = false`. Admin TI também precisa ser dono e participante. `anon` e `PUBLIC` não recebem acesso. `authenticated` recebe somente SELECT/INSERT/UPDATE/DELETE.

O handler cria um cliente com cookies por `criarServidor()`, chama `avaliarSessao(supabase)` e usa `decidirRota()` antes de ler os parâmetros e executar o serviço. O serviço confirma participação com filtro explícito por usuário sob RLS antes de cada operação, limita a consulta às conversas solicitadas e verifica dono/IDs/valores das linhas recebidas. O cliente da sessão é usado para todas as consultas e gravações.

## Contrato HTTP

Endpoint: `/api/inbox/preferencias`. Cookies de sessão do mesmo domínio. Respostas usam `Cache-Control: private, no-store` e `Vary: Cookie`.

| Método | Entrada | Resultado |
|---|---|---|
| GET | `?conversaId=UUID` repetido de 1 a 50 vezes | Preferências efetivas na ordem solicitada |
| PUT | `{ "preferencias": [PreferenciaConversa] }`, 1 a 50 itens | Cria/substitui os três campos de cada par usuário/conversa e retorna o estado salvo |
| DELETE | `{ "conversaIds": ["UUID"] }`, 1 a 50 IDs | Remove preferências próprias e retorna os padrões; idempotente |

PUT e DELETE aceitam `Content-Type: application/json`, até 16 KiB, sem parâmetros na URL. Origem diferente da URL da requisição é rejeitada; o cliente usa `credentials: same-origin`. Não envie `usuarioId`, `user_id` ou outros campos extras. UUIDs são normalizados; duplicatas, campos ausentes e valores inválidos são rejeitados. Uma operação individual usa um lote com um item.

```json
{
  "preferencias": [
    {
      "conversaId": "00000000-0000-0000-0000-000000000098",
      "prioridade": "alta",
      "situacao": "acompanhar",
      "favorita": true
    }
  ]
}
```

Resposta 200 de todos os métodos:

```json
{
  "usuarioId": "00000000-0000-0000-0000-000000000001",
  "preferencias": [
    {
      "conversaId": "00000000-0000-0000-0000-000000000098",
      "prioridade": "alta",
      "situacao": "acompanhar",
      "favorita": true
    }
  ]
}
```

| Código | Comportamento |
|---|---|
| 400 | IDs, valores, duplicatas, campos ou JSON inválidos |
| 401 | Sessão ausente/vencida |
| 403 | Conta negada, troca de senha pendente ou origem externa |
| 404 | `Conversa indisponível.` para conversa alheia, inexistente ou participação revogada |
| 413 | Corpo maior que 16 KiB |
| 415 | Tipo de conteúdo diferente de JSON |
| 500 | Falha interna com mensagem pública, sem detalhes SQL/credenciais |

Se qualquer ID do lote não estiver autorizado, a operação inteira é recusada sem indicar qual ID falhou. PUT executa um único upsert, portanto uma falha de RLS/constraint reverte o lote inteiro. Não usa leitura seguida de merge no servidor: PUT substitui os três campos. Gravações concorrentes de dois dispositivos do mesmo usuário seguem a última gravação confirmada pelo banco; não há resolução de conflitos entre dispositivos.

## Conversas novas, remoção e recarregamento

Sem linha salva, GET retorna `prioridade: normal`, `situacao: em-conversa`, `favorita: false` apenas depois de confirmar autorização. Ler não cria linhas. DELETE restaura esses padrões.

A exclusão da participação apaga a preferência por FK com `ON DELETE CASCADE`; reingressar começa com os padrões. A exclusão de usuário/conversa também cascateia. Bloqueio/desativação, desabilitação de grupo ou troca obrigatória pendente tornam as preferências imediatamente invisíveis e indisponíveis para escrita por RLS, mesmo que as linhas ainda existam. Não se publica uma lista global de IDs ou preferências ocultas.

O cliente carrega novamente ao montar, mudar usuário ou mudar a lista de conversas. Não utiliza localStorage nem cache compartilhado. Respostas de outra conta são recusadas; operações atrasadas são ignoradas após troca da conta/conjunto de conversas. A tela confirma a alteração visual depois de sucesso da API; falhas exibem mensagem e opção de recarregar.

## Integração com PRs #97, #94 e #99

Na base deste PR, os três PRs permanecem abertos e não integram a `main`. Para entregar a integração em branch própria, este PR inclui `TelaConversas` a partir do PR #97, commit `4a5409200cd868ede81863cdc2e9b5e03d6a9f46`, preservando o contrato de mensagens do PR #94. O CSS específico foi colocado em `design-em-react/telas/conversas.css`; os estilos globais existentes não são substituídos.

A organização antes mantida em memória passa a ser controlada por props: `preferenciasInbox`, `aoAtualizarPreferencia`, estados de carregamento/gravação/erro e callback de recarga. O componente continua React puro: não importa Supabase, não faz fetch e não conhece cookies ou autorização.

`@controle/inbox/conversas` exporta `ConversasInbox`, que monta a tela com `@design/telas/conversas` e injeta o hook `usePreferenciasInbox`. A fronteira preserva as props de conversas, mensagens, seleção e envio já usadas no PR #94. O wrapper remonta o conteúdo por `usuarioId`, elimina estado visual de outra conta e divide páginas acumuladas em lotes de 50 IDs. Alterações ficam bloqueadas durante carregamento/gravação e após erro, até recarregar.

Quando a listagem do PR #99 estiver integrada, o consumidor fornece seus dados reais:

```tsx
import { ConversasInbox } from "@controle/inbox/conversas";
import { adaptarConversaResumo } from "@controle/chat/adaptar-conversa";

<ConversasInbox
  usuarioId={pagina.usuarioId}
  conversas={pagina.conversas.map(adaptarConversaResumo)}
  mensagens={mensagens}
  conversaAtivaId={conversaAtivaId}
  aoSelecionarConversa={selecionarConversa}
  aoEnviarMensagem={enviarMensagem}
/>;
```

`pagina` é `PaginaConversas` do PR #99; `mensagens` e callbacks seguem os contratos existentes do chat. O exemplo depende da integração dessas frentes; não adiciona rota/listagem fictícia. A rota inicial autenticada continua com seu comportamento atual. Não há alteração de listagem, envio, Realtime ou recibos neste módulo.

Antes do merge, Elliot e os responsáveis pela interface devem revisar a reconciliação de `TelaConversas`/CSS com #94/#97 e alinhar o uso do wrapper no adaptador real. Não há merge automático.

## Validação reproduzível

Na raiz do repositório:

```sh
npm install
npm test --workspace 'base(tempval)'
npm run typecheck --workspace 'base(tempval)'
npm run lint --workspace 'base(tempval)'
npm run build --workspace 'base(tempval)'
```

Para build local, configure `base(tempval)/.env.local` a partir de `.env.example`, com URL/chave pública do Supabase. Os testes não precisam de Supabase externo, Docker ou credenciais reais. `rls.test.ts` executa todas as migrations em PostgreSQL via PGlite, com infraestrutura Auth mínima e papéis `authenticated`/`anon`; RLS e funções de acesso não são simulados. Testes unitários adicionais cobrem serviço, HTTP, validação, cliente e a interface React em JSDOM.

Checklist de homologação com Supabase real e duas contas, antes do merge/uso:

- Aplicar a migration aditiva e conferir as quatro policies, grants e FKs.
- Usuário A altera prioridade/coluna/favorito, recarrega e encontra os valores salvos; usuário B mantém a própria organização.
- Chamadas diretas com outro `user_id`, conversa alheia e conversa inexistente não retornam metadados.
- Conta com `must_change_password = true` recebe 403 na API e não lê/grava pela API REST do Supabase.
- Remover participação apaga a preferência; reentrada inicia com os padrões.
- Validar controles e erros no Chrome Android e Safari iOS; os testes JSDOM não substituem essa verificação em aparelhos reais.
