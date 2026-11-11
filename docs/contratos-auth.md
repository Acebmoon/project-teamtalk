# Contratos de autenticação — TeamTalk

## Estados de conta
- `status = pending`: cadastrada, aguardando liberação da TI; não pode entrar.
- `status = active`: liberada, sujeita também à regra de grupo habilitado de `is_active_authorized_user()`.
- `status = blocked` ou `disabled`: acesso negado.
- `must_change_password = true`: com conta autorizada e sessão válida, somente `/primeiro-acesso` é acessível; o chat fica bloqueado por RLS.

## Primeiro acesso
A rota protegida recebe e-mail e ações por props. `trocarSenha` exige ao menos 10 caracteres e confirmação idêntica, usa `auth.updateUser({ password })`, depois `signOut({ scope: "global" })` e leva a `/login?aviso=senha-alterada`. É preciso entrar novamente com a senha nova. O erro `same_password` tem mensagem própria. Nenhuma senha trafega em URL ou logs.

Somente o trigger `on_auth_password_changed` derruba a marca para `false` quando `auth.users.encrypted_password` muda. Não criar RPC ou ação de cliente que altere esse campo. `get_access_state()` devolve `{ authorized, must_change_password }` em uma RPC; `can_access_conversation()`, usada pelo RLS de participantes, conversas e mensagens, exige marca `false` (leituras usam `can_access_message()`).

## Outras frentes
Em código de servidor, usar `criarServidor()` de `controle-base-main/supabase/servidor.ts` e `avaliarSessao(supabase)` de `controle-base-main/auth/verificar-sessao.ts`. A decisão pode ser `login`, `acesso-negado`, `sessao-vencida`, `trocar-senha` ou `seguir`. Não consultar o estado pelo navegador como única autorização.

**Issues 12 e 14:** após uma redefinição de senha feita pela TI, **marcar `public.users.must_change_password = true` depois da redefinição**. O trigger zera a marca em toda alteração real de senha, inclusive redefinições administrativas. A gravação pela TI deve acontecer por fluxo administrativo confiável, não por função RPC chamável pelo cliente.
