# Grupos de liberação gradual e auditoria — Issue #82

Refs #82

## Autorização e organização

- Rotas, páginas e layout finos em `base(tempval)/src/app/`, com aliases `@controle/*` e `@design/*`.
- Regras, validações, carregadores, server actions e testes em `controle-base-main/admin/liberacao/`.
- Telas em `design-em-react/telas/admin-grupos.tsx`, `admin-grupo.tsx`, `admin-auditoria.tsx` e componentes auxiliares. Recebem dados e ações por props; não importam cliente Supabase nem fazem consultas de rede.
- Cada entrypoint chama primeiro `exigirAdminTI()`, que usa `criarServidor()` e `avaliarSessao()`. Não depende da execução do middleware. A página inicial administrativa já delega primeiro a um carregador protegido; o novo layout também verifica o guard.
- API: 401 para sessão ausente/vencida; 403 para funcionário, conta negada ou senha provisória pendente. Páginas encaminham sessão ausente ao login e funcionário recebe 403. Ações retornam `{ status, erro }` quando negadas; o status nesse objeto integra o protocolo de server actions, não representa o status HTTP do transporte.
- Respostas de API têm `Cache-Control: no-store`. Escritas JSON exigem origem igual à aplicação, quando enviada, não aceitam `Sec-Fetch-Site: cross-site` e limitam o corpo a 16 KiB. Ator, `added_by` e detalhes de auditoria nunca são escolhidos pelo formulário/payload.
- Leituras usam exclusivamente `acesso.supabase`, com RLS. `criarClienteAdmin(acesso)` é `server-only`, lê `SUPABASE_SERVICE_ROLE_KEY` e desliga persistência/renovação/detecção de sessão. Só é construído para uma mutação após o guard.

## Telas

| Caminho | Operações |
| --- | --- |
| `/admin/grupos` | Criar grupo desabilitado; listar por estado com paginação |
| `/admin/grupos/[id]` | Habilitar/desabilitar; listar/remover participantes; buscar usuários por nome/e-mail e incluir na Fase 1 |
| `/admin/auditoria` | Consultar eventos com filtros por ação, ator, alvo e período; expandir detalhes |

A navegação do layout liga essas telas ao painel `/admin` e também serve às páginas de contas do PR #100. Busca de usuários e participantes têm paginações independentes (`paginaUsuarios` e `pagina`). Datas exibidas na auditoria são UTC.

## APIs

| Método e rota | Entrada | Saída |
| --- | --- | --- |
| `GET /api/admin/grupos` | `pagina`, `limite`, `estado=habilitado\|desabilitado` opcionais | `Pagina<Grupo>` |
| `POST /api/admin/grupos` | `{ "nome": "Diretoria", "descricao": "Fase 1" }` | 201 `{ grupo, alterado: true }`; nasce desabilitado |
| `GET /api/admin/grupos/[id]` | UUID na rota | `Grupo`; 404 se ausente |
| `PATCH /api/admin/grupos/[id]` | `{ "acao": "habilitar" }` ou `{ "acao": "desabilitar" }` | `{ grupo, alterado }` |
| `PATCH /api/admin/grupos/[id]` | `{ "acao": "incluir", "usuarioId": "UUID" }` ou `{ "acao": "remover", "usuarioId": "UUID" }` | `{ grupo, alterado }` |
| `GET /api/admin/grupos/[id]/membros` | `pagina`, `limite` opcionais | `Pagina<Membro>`; inclui nome, e-mail e estado do usuário |
| `GET /api/admin/grupos/usuarios` | `pagina`, `limite`, `busca` opcionais | `Pagina<UsuarioGrupo>`; somente id, nome, e-mail, estado |
| `GET /api/admin/auditoria` | `pagina`, `limite`, `acao`, `ator`, `alvo`, `desde`, `ate` opcionais | `Pagina<EventoAuditoria>` |

`Pagina<T> = { itens: T[], total, pagina, limite }`. Padrões: página 1 e limite 20; limite entre 1 e 100, página até 10.000. Parâmetros desconhecidos, repetidos, arrays ou paginação inválida recebem 400. Listas de grupos ordenam por `created_at DESC, id DESC`; usuários por nome/id; participantes por inclusão decrescente e id. Os desempates evitam ordem indefinida; novas escritas ainda podem deslocar páginas de uma consulta por offset.

`Grupo = { id, name, description, is_enabled, created_at, updated_at }`. Nome é obrigatório, entre 1 e 100 caracteres após trim; descrição é opcional, até 500. Campos extras e caracteres de controle são rejeitados. Nomes duplicados conforme a restrição existente do banco recebem 409. Não há exclusão de grupo nesta entrega.

Inclusão não muda estado nem papel da conta. Usuário ausente ou grupo ausente recebe 404. Incluir participação já existente, remover participação já ausente ou solicitar o estado atual são operações idempotentes: `{ alterado: false }`, sem alterar `added_by`/`added_at` e sem produzir evento duplicado. Criar grupo repetido não é idempotente: a restrição de nome retorna 409.

## Filtros de auditoria

`acao` é uma igualdade exata, até 80 caracteres (`a-z`, números, ponto, sublinhado e hífen), como `release_group.member_added` ou `account.blocked`. `ator` e `alvo` são UUIDs exatos. Os filtros se combinam com AND, sem interpolação de SQL ou sintaxe de filtro recebida do cliente.

`desde`/`ate` aceitam `AAAA-MM-DD` ou um instante ISO UTC como `2026-11-19T10:00:00Z`/`2026-11-19T10:00:00.000Z`. Data inicial começa às 00:00:00 UTC e final termina às 23:59:59.999 UTC; instantes preservam seu horário. Datas impossíveis e intervalos invertidos recebem 400.

Eventos ordenam por `created_at DESC, id DESC`. A projeção `id::text` preserva o bigint como string. Cada evento retorna `{ id, actor_id, action, target_user_id, details, created_at }`, incluindo eventos de outras frentes. `actor_id`/alvo podem ser nulos conforme as chaves estrangeiras existentes. A consulta não cria outro evento de consulta e não expõe operações de edição/exclusão de logs.

## Escrita atômica e eventos

A migration aditiva `20261119001000_release_groups_audit.sql` cria `admin_manage_release_group(...)`, sem depender da migration de contas do PR #100. As quatro migrations anteriores ficam intactas e `is_active_authorized_user()` não é substituída. A RPC é invoker, com `search_path = ''`, EXECUTE revogado de PUBLIC/anon/authenticated e concedido somente a `service_role`. O servidor preenche `p_actor_id` pelo usuário autenticado. O banco revalida papel TI, estado ativo e senha já trocada, mantendo lock compartilhado sobre o ator durante a operação. O grupo recebe lock de atualização, serializando mudanças de estado e composição.

| Alteração efetiva | `action` | `target_user_id` | `details` |
| --- | --- | --- | --- |
| Criar | `release_group.created` | nulo | `group_id`, `group_name`, `is_enabled=false` |
| Habilitar | `release_group.enabled` | nulo | grupo, estado anterior e novo |
| Desabilitar | `release_group.disabled` | nulo | grupo, estado anterior e novo |
| Incluir | `release_group.member_added` | usuário incluído | grupo e estado habilitado |
| Remover | `release_group.member_removed` | usuário removido | grupo e estado habilitado |

`actor_id` e `created_at` são registrados em todos os eventos. Se inserir auditoria falhar, a alteração de grupo/participação é revertida pela mesma transação. Erros internos não são devolvidos ao cliente. Uma resposta de rede perdida pode esconder um commit bem sucedido: o 503 orienta consultar grupo/auditoria antes de repetir. A RPC não registra senha, token ou chave. Grupos, membros e logs não permitem escrita direta de anon/authenticated, e a leitura de auditoria permanece exclusiva de TI por RLS.

## Gate da Fase 1

Funcionário precisa de conta ativa e pelo menos um grupo habilitado. Grupo desabilitado não autoriza mesmo com participação existente; desabilitar o último grupo ou remover a última participação bloqueia as próximas consultas com a sessão já aberta. Outro grupo habilitado preserva o acesso. Contas pending/blocked/disabled continuam negadas, e `can_access_conversation()` continua exigindo participação e `must_change_password = false`. Admin TI mantém a exceção de implantação definida nas migrations existentes, sem acesso implícito a conversas privadas.

## Preparação e validação

1. Aplicar a nova migration pelo fluxo habitual do projeto. Nenhum banco remoto é alterado pela abertura do PR.
2. Definir `SUPABASE_SERVICE_ROLE_KEY` apenas no ambiente do servidor, junto das variáveis Supabase já existentes.
3. Executar em `base(tempval)`: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
4. Homologar em Chrome Android e Safari iPhone com TI e funcionário: criar grupo, incluir usuário ativo, habilitar, acessar com funcionário, desabilitar/remover e confirmar bloqueio; consultar os eventos com filtros e paginação. Contas pendentes e com senha provisória devem continuar bloqueadas.

Os testes `*.test.ts` cobrem validações, chamadas diretas de APIs/páginas/ações com RBAC, cliente de servidor, paginação/filtros e SQL real em memória com as migrations completas. Incluem grants/RLS, usuário fora de grupo, remoção do último grupo, múltiplos grupos, estados de conta, senha provisória, idempotência e rollback nas cinco operações quando auditoria falha. Supabase remoto/GoTrue e navegadores móveis reais ainda requerem homologação.

Rastreabilidade: RF15, RF14, RN05, RN09, RN10, RNF07, RNF13, SEG04 e SEG07. O PR referencia a Issue #82 com `Refs #82`, sem encerramento automático.
