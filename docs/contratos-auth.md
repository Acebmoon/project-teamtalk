# Contratos de autenticação — TeamTalk

## Estados de conta
- `status = pending`: cadastrada, aguardando liberação da TI; não pode entrar.
- `status = active`: liberada, sujeita também à regra de grupo habilitado de `is_active_authorized_user()`.
- `status = blocked` ou `disabled`: acesso negado.
- `must_change_password = true`: com conta autorizada e sessão válida, somente `/primeiro-acesso` é acessível; o chat fica bloqueado por RLS. `is_active_it_admin()` também exige `false`, inclusive para leitura de usuários, grupos e auditoria como Admin TI.

## Primeiro acesso
A rota protegida recebe e-mail e ações por props. `trocarSenha` exige ao menos 10 caracteres, no máximo 72 bytes (limite do bcrypt/Supabase Auth) e confirmação idêntica, usa `auth.updateUser({ password })`, depois `signOut({ scope: "global" })` e leva a `/login?aviso=senha-alterada`. Se o logout global retornar erro, tenta `scope: "local"` e mantém o aviso de senha alterada, porque a atualização já aconteceu. É preciso entrar novamente com a senha nova. Os erros `same_password` e senha longa têm mensagens próprias. Nenhuma senha trafega em URL ou logs.

Somente o trigger `on_auth_password_changed` derruba a marca para `false` quando `auth.users.encrypted_password` muda. Não criar RPC ou ação de cliente que altere esse campo. `get_access_state()` devolve `{ authorized, must_change_password, it_admin }` em uma RPC; `can_access_conversation()`, usada pelo RLS de participantes, conversas e mensagens, exige marca `false` (leituras usam `can_access_message()`). As funções `get_access_state`, `is_active_authorized_user`, `is_active_it_admin`, `can_access_conversation` e `can_access_message` têm `EXECUTE` revogado de `PUBLIC` e `anon`, e concedido a `authenticated`.

## Outras frentes
Em código de servidor, usar `criarServidor()` de `controle-base-main/supabase/servidor.ts` e `avaliarSessao(supabase)` de `controle-base-main/auth/verificar-sessao.ts`. A decisão pode ser `login`, `acesso-negado`, `sessao-vencida`, `trocar-senha` ou `seguir`. Não consultar o estado pelo navegador como única autorização.

**Issues 12 e 14:** após uma redefinição de senha feita pela TI, **marcar `public.users.must_change_password = true` depois da redefinição**. O trigger zera a marca em toda alteração real de senha, inclusive redefinições administrativas. A gravação pela TI deve acontecer por fluxo administrativo confiável, não por função RPC chamável pelo cliente.

## Dispositivo
O middleware verifica o aparelho **antes** de consultar o Supabase. Se houver `Sec-CH-UA-Platform`, somente `"Android"` é aceito; sem esse cabeçalho, o `User-Agent` deve conter `Android`, `iPhone` ou `iPod`. Sem identificação, Windows, Linux, Mac e iPad são bloqueados, inclusive para Admin TI. GET/HEAD em dispositivo bloqueado redirecionam à página pública `/dispositivo-bloqueado`; outros métodos recebem 403 sem corpo. Um aparelho permitido nessa página volta para `/`.

A identificação é uma **restrição de uso**, não um mecanismo de segurança infalível: quem falsifica User-Agent e Client Hints pode passar. Os dados são protegidos por autenticação, sessão, RBAC server-side e RLS no banco.

## Admin TI
A mesma RPC `get_access_state()` devolve `it_admin`, calculado por `is_active_it_admin()`. `decidirRota()` restringe `/admin/**` e devolve JSON `{ erro }` com 401 para sessão ausente/vencida ou 403 para conta negada, troca pendente e funcionário em `/api/admin/**`. O filtro de dispositivo roda antes da decisão de API, inclusive para GET de API.

**Cada página, server action e rota de API administrativa deve chamar `exigirAdminTI()` antes de qualquer operação.** O middleware não protege sozinho server actions, que podem ser invocadas por POST em outras URLs. A função retorna `{ supabase, usuario }` apenas para sessão válida e admin autorizado, após troca da senha provisória. A chave `service_role` permanece **somente no servidor**, jamais com `NEXT_PUBLIC_`, e só pode ser usada depois de `exigirAdminTI()`. O endpoint de teste `GET /api/admin/estado` devolve `{ "papel": "it_admin" }` para TI; funcionário recebe 403.
