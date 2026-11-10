# TeamTalk — execução local e autenticação (Issue 02)

## Estrutura obrigatória

Na raiz do repositório existem três pastas com responsabilidades separadas:

- `base(tempval)/`: workspace Next.js, configurações, migrations e arquivos finos de rota (`src/app/**`, `src/middleware.ts`). Não contém regras de negócio nem componentes de interface.
- `controle-base-main/`: autenticação, sessão, integração Supabase e regras de acesso. `auth/` guarda ações e middleware; `supabase/` guarda clientes SSR por cookies.
- `design-em-react/`: telas React e estilos. As telas recebem dados e ações por props, sem chamadas ao Supabase.

`base(tempval)/tsconfig.json` expõe os aliases `@controle/*` e `@design/*`; `next.config.ts` habilita o acesso ao diretório externo e rastreia os arquivos a partir da raiz. O `package.json` da raiz usa npm workspaces.

## Requisitos

Node.js 20.9+, npm e Docker (Supabase local).

## Instalação e execução

```sh
# A partir da raiz do repositório
npm install
cd 'base(tempval)'
cp .env.example .env.local
npx supabase start
npx supabase status
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com a URL e a anon key mostradas pelo Supabase local. `SESSAO_MAX_HORAS` é o limite de horas de cada sessão iniciada por senha (padrão 12).

```sh
npm run db:reset
npm run typecheck
npm run lint
npm run build
npm test
npm run dev
```

Abra `http://localhost:3000/login`. O Supabase Studio fica em `http://localhost:54323`. Para testar com HTTPS, use um ambiente configurado com TLS; HSTS aplica-se a respostas HTTPS. Não use `service_role` no navegador nem commite `.env.local`.

## Roteiro de teste manual

1. No Supabase Studio local, em **Authentication > Users**, crie uma conta de teste com e-mail e senha, marcando o e-mail como confirmado. A trigger da primeira migration cria automaticamente `public.users` com status `pending`.
2. Execute no **SQL Editor** o script abaixo, substituindo o e-mail pelo da conta criada. Ele ativa a conta, habilita o grupo inicial e inclui o usuário nesse grupo.

```sql
update public.users set status = 'active' where email = 'pessoa@empresa.com';
update public.release_groups set is_enabled = true where name = 'Diretoria / nível estratégico';
insert into public.release_group_members (release_group_id, user_id)
select g.id, u.id from public.release_groups g cross join public.users u
where g.name = 'Diretoria / nível estratégico' and u.email = 'pessoa@empresa.com'
on conflict do nothing;
```

3. Em `/login`, entre com e-mail e senha. Deve abrir `/`, mostrar o nome de exibição e o botão **Sair**.
4. Saia e tente entrar com uma senha incorreta: deve aparecer **Usuário ou senha inválidos.** abaixo do campo Senha.
5. Entre novamente. No SQL Editor, execute `update public.users set status = 'blocked' where email = 'pessoa@empresa.com';`. Ao atualizar `/`, o middleware deve encerrar a sessão e mostrar **Acesso não liberado. Fale com a TI.** em `/login`.
6. Libere novamente a conta com `status = 'active'`, entre, clique **Sair** e confirme o redirecionamento para `/login`. Outra sessão de um segundo navegador não deve ser encerrada pelo logout do primeiro.
7. Para testar expiração rapidamente, defina `SESSAO_MAX_HORAS=0.001` em `.env.local` e reinicie o Next; após alguns segundos do login, uma rota protegida deve redirecionar para `/login?erro=sessao`.

Somente `/login` é pública. A sessão é validada no servidor por `auth.getUser()` e a autorização por `is_active_authorized_user()` a cada acesso protegido. A duração é calculada pelo `amr.password.timestamp` do token daquela sessão; `last_sign_in_at` não é usado. As credenciais persistem em cookies do `@supabase/ssr`, com `Secure` em produção e `SameSite=Lax`, sem gravação de token em `localStorage`. O logout é limitado ao aparelho atual (`scope: local`).

## Escopo desta etapa

A Issue 02 traz apenas o login e a página protegida mínima. Troca obrigatória de senha provisória (Issue 03), bloqueio desktop e RBAC completo (Issue 04), chat, administração e upload ficam para as entregas próprias. As migrations originais não foram alteradas.
