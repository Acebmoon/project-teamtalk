# Painel TI — gestão de contas (Refs #81)

O painel permite cadastrar, listar, consultar, bloquear, reativar, desativar e redefinir senhas. A desativação é lógica e preserva histórico. Somente Admin TI ativo, autorizado e com senha definitiva opera o painel. Funcionários não executam gestão por API nem por server actions diretas.

## Estrutura e autorização

- `base(tempval)/src/app/admin/` e `src/app/api/admin/`: páginas e rotas finas usando `@controle/*` e `@design/*`.
- `controle-base-main/admin/`: contratos, validações, serviço servidor, handlers, ações, composição e testes `*.test.ts`.
- `design-em-react/telas/admin*.tsx`: apresentação React. Recebe dados e ações por props, sem Supabase, variáveis de ambiente ou chamadas de rede.

Todo entrypoint inicia por `exigirAdminTI()` (páginas delegam primeiro ao carregador protegido). O guard usa `criarServidor()` e `avaliarSessao()`; a decisão vem do Auth validado e de `get_access_state()`, nunca do papel enviado pelo navegador. O middleware continua aplicando a restrição móvel. As páginas e APIs administrativas são dinâmicas, e as respostas de API usam `Cache-Control: no-store`.

Leituras de contas usam o cliente de sessão, respeitando RLS. O cliente privilegiado vive em módulo `server-only`, é construído apenas após o guard, não persiste sessão e não é passado à interface. Além do guard, as RPCs revalidam o ator no banco. A conta do próprio ator não pode ser bloqueada, reativada, desativada ou ter sua senha redefinida por este painel; é necessário outro Admin TI.

## Preparação do ambiente

1. Na raiz, executar `npm install`.
2. Configurar em `base(tempval)/.env.local` a URL, chave pública e `SUPABASE_SERVICE_ROLE_KEY` conforme `.env.example`. A chave de serviço deve existir apenas no ambiente de servidor, sem prefixo `NEXT_PUBLIC_`.
3. Aplicar a nova migration `20261119000000_admin_accounts.sql`, depois das quatro migrations existentes, no ambiente de desenvolvimento/homologação. Em Supabase local descartável, `npm run db:reset` aplica a sequência completa.
4. Manter `auth.enable_signup = false`, já presente em `supabase/config.toml`; no Supabase hospedado, manter também o cadastro público desabilitado nas configurações de Auth. O aplicativo não contém fluxo de autorregistro.
5. Acessar por Chrome Android ou Safari iPhone com um Admin TI ativo e senha definitiva. A regra mobile também vale para TI.

As migrations anteriores permanecem intactas. Esta entrega não executa alterações em um Supabase remoto. O envio individual após cadastro/redefinição e sua migration/configuração estão em [contratos-email-inicial.md](contratos-email-inicial.md). Ativar um funcionário não o inclui automaticamente em um grupo habilitado.

## API

| Método e caminho | Entrada | Resposta de sucesso |
|---|---|---|
| `GET /api/admin/estado` | Sem corpo | `{ "papel": "it_admin" }` |
| `GET /api/admin/contas` | Query `pagina`, `limite`, `busca`, `status` | `{ contas, total, pagina, limite }` |
| `POST /api/admin/contas` | JSON `{ nome, email, papel?, status?, senha }` | 201 `{ conta }` |
| `GET /api/admin/contas/[id]` | UUID no caminho | `{ conta }` |
| `PATCH /api/admin/contas/[id]` | JSON `{ acao, senha? }` | `{ conta }` |

`Conta` contém somente os campos de `public.users`: `id`, `email`, `display_name`, `role`, `status`, `must_change_password`, `created_at` e `updated_at`. Nunca retorna o usuário bruto do Auth, senha ou chave de serviço.

Cadastro: nome não vazio de até 120 caracteres, e-mail normalizado de até 254 caracteres, `papel = employee | it_admin` (padrão `employee`) e estado inicial `pending | active` (padrão `pending`). A senha provisória tem ao menos 10 caracteres e no máximo 72 bytes UTF-8, sem aparar espaços.

Alterações: `acao = bloquear | reativar | desativar | redefinir-senha`; `senha` é obrigatória somente para a última. Campos extras como `actor_id`, `must_change_password`, IDs e alterações arbitrárias de perfil são recusados. Ator e alvo de auditoria são definidos pelo servidor.

Listagem: página inicial 1, limite padrão 20 e máximo 50; ordenação estável por `display_name` e `id`. `status` aceita `pending`, `active`, `blocked`, `disabled` ou vazio. A busca por nome/e-mail limita caracteres e escapa `_` antes do PostgREST, impedindo injeção em `.or()`.

Erros seguros: `{ erro, codigo }`, com 400 para validação, 401 para sessão ausente/vencida, 403 para falta de autorização/origem, 404 para alvo ausente, 409 para duplicidade/reserva, 413 para corpo acima de 16 KiB, 415 para conteúdo diferente de JSON e 502/503 para falhas externas/persistência. Requisições de mutação com origem externa são recusadas. As server actions usam a proteção de origem do Next.js, revalidam o guard e retornam apenas mensagens de resultado; senhas não entram em URLs, mensagens ou logs.

## Ordem de persistência e auditoria

Cadastro registra `account.creation_requested` antes de chamar `auth.admin.createUser()`. O trigger existente cria `public.users` como `pending`. Depois do Auth, a RPC `admin_create_account` define papel/estado e **`must_change_password = true`** junto do evento `account.created`, na mesma transação. Se a confirmação falhar, o servidor tenta banir o usuário no Auth e registra `account.creation_incomplete`, sem apagar o histórico de um possível commit cuja resposta se perdeu.

Para alterações existentes:

1. `admin_start_account_operation` revalida o ator, reserva o alvo, salva o estado anterior e coloca a conta em `blocked`, junto de `account.operation_started`.
2. O servidor chama `auth.admin.updateUserById()`. Bloqueio/desativação aplicam `ban_duration: "876000h"`; reativação remove o banimento com `"none"`. Redefinição envia a senha somente no corpo da chamada servidor→Auth e mantém/remove banimento de acordo com o estado anterior.
3. Na redefinição, preparar e enviar o e-mail de primeiro acesso conforme o [contrato de envio](contratos-email-inicial.md), reaplicando a marca de troca obrigatória após o Auth e mantendo a reserva até confirmar o envio auditado.
4. `admin_finish_account_operation` aplica o estado final e grava `account.blocked`, `account.reactivated`, `account.disabled` ou `account.password_reset`, atomicamente. Na redefinição, preserva o estado anterior e repõe **`must_change_password = true` depois do Auth**, pois o trigger `on_auth_password_changed` zera a marca ao alterar o hash. Enquanto isso ocorre, o estado bloqueado impede acesso inclusive com JWT existente. Falha de envio mantém acesso negado; entrega pendente impede liberação da reserva até reconciliação.

O banimento no Auth restringe novos logins; o estado de `public.users` e as funções de autorização/RLS revogam o acesso aos dados nas consultas seguintes. Não se depende apenas do banimento para controlar sessões já emitidas.

Todos os eventos gravam `actor_id`, `action`, `target_user_id` e `details`. Consultas registram também `account.listed` e `account.viewed`. `details` contém somente dados operacionais selecionados: estado, papel, página/limite, ID da operação e resultado. Senha e payload bruto nunca são enviados à auditoria. Se uma escrita de auditoria falhar na RPC, a mudança de perfil e a liberação da reserva sofrem rollback.

`admin_account_operations` tem RLS sem policies de cliente e uma reserva única por alvo. As quatro funções de gestão têm `EXECUTE` revogado de `PUBLIC`, `anon` e `authenticated`, com grant exclusivo a `service_role`. A reserva impede, por exemplo, uma reativação concorrente durante redefinição de senha.

## Falhas parciais e reconciliação

Auth e PostgreSQL não oferecem uma transação conjunta. Uma rejeição definitiva do Auth (4xx, exceto 429) gera `account.operation_failed`, mantém a conta sem acesso e libera a reserva para nova operação. Falhas incertas de rede, 429/5xx ou erro na finalização mantêm a conta bloqueada e a reserva. A API não tenta restaurar acesso automaticamente nem repetir redefinições de senha.

Em uma falha incerta, um operador TI deve consultar, em conexão administrativa confiável, `public.admin_account_operations`, os eventos por `details.operation_id` e o estado correspondente no Auth. Somente após confirmar que não há chamada pendente, concluir ou desfazer a sincronização com Auth. Em redefinição com entrega de e-mail, seguir primeiro a [reconciliação da entrega](contratos-email-inicial.md); uma entrega pendente impede liberação da reserva. Para uma operação Auth e envio confirmados, chamar `admin_finish_account_operation(actor_id, operation_id, true)` com o mesmo ator ainda autorizado. Para uma rejeição definitiva confirmada, usar `false`; a conta continua sem acesso até nova emissão e reativação pela TI. Não remover reservas automaticamente por tempo e não executar essas RPCs pelo navegador.

## Verificação

Em `base(tempval)/`, executar `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. Os testes cobrem guard real com sessão/RPC simuladas, chamadas diretas às APIs e server actions, validações, paginação, Auth Admin, erros seguros e falhas parciais. A suíte PGlite executa todas as migrations em PostgreSQL em memória e valida grants/RLS, auditoria atômica, reserva por alvo e o trigger real de troca de senha nos quatro estados.

Para homologação integrada, usar um Supabase de teste e dois perfis móveis: cadastrar conta pendente/ativa, consultar, ativar, bloquear, reativar, desativar, redefinir senha e conferir os eventos. Repetir as APIs com funcionário, sessão vencida e senha provisória. O teste em memória simula a tabela `auth.users`; não substitui um teste contra o serviço GoTrue real.

Referências de API: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) e [gestão de dados de usuários](https://supabase.com/docs/guides/auth/managing-user-data).
