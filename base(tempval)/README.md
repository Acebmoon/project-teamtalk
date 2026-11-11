# TeamTalk — execução local e autenticação (Issues 02 e 03)

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

3. Em `/login`, entre com a senha provisória (com pelo menos 10 caracteres). Deve abrir somente `/primeiro-acesso`; tentar `/` deve redirecionar de volta, sem encerrar a sessão.
4. Digite uma senha com menos de 10 caracteres e uma confirmação diferente (separadamente): o navegador ou servidor deve rejeitar e mostrar a regra/erro em texto. Tente a própria senha provisória e confirme a mensagem específica.
5. Salve uma senha nova válida, diferente da provisória. Deve ir para `/login?aviso=senha-alterada`, mostrar **Senha alterada. Entre com a nova senha.** e encerrar a sessão globalmente.
6. Entre com a senha nova. Deve abrir `/`, mostrar o nome de exibição e o botão **Sair**. A senha provisória não deve mais autenticar.
7. Saia e tente entrar com senha incorreta: deve aparecer **Usuário ou senha inválidos.** abaixo do campo Senha.
8. No SQL Editor, confira `select email, must_change_password from public.users where email = 'pessoa@empresa.com';`: depois da troca, a marca deve ser `false`. Para forçar novo primeiro acesso em teste, execute `update public.users set must_change_password = true where email = 'pessoa@empresa.com';`. `/primeiro-acesso` deve voltar a ser a única rota acessível e a leitura de conversas ficar bloqueada pelo RLS; redefina a senha via Supabase Auth para testar o trigger e depois marque `true` caso simule uma redefinição pela TI.
9. Execute `update public.users set status = 'blocked' where email = 'pessoa@empresa.com';`. Ao atualizar uma rota, o middleware deve encerrar a sessão e mostrar **Acesso não liberado. Fale com a TI.** em `/login`.
10. Libere a conta novamente com `status = 'active'`, entre, clique **Sair** e confirme o redirecionamento para `/login`. Outra sessão de um segundo navegador não deve ser encerrada pelo logout local.
11. Para testar expiração rapidamente, defina `SESSAO_MAX_HORAS=0.001` em `.env.local` e reinicie o Next; após alguns segundos, uma rota protegida deve redirecionar para `/login?erro=sessao`, inclusive durante o primeiro acesso.

`/login` é a única rota pública. `/primeiro-acesso` exige conta autorizada, marca de troca e sessão válida. A sessão é validada no servidor por `auth.getUser()` e o acesso por `get_access_state()` em uma RPC, sem perder a regra de grupos habilitados. A duração é calculada pelo `amr` do token daquela sessão; `last_sign_in_at` não é usado. As credenciais persistem em cookies do `@supabase/ssr`, com `Secure` em produção e `SameSite=Lax`, sem gravar token em `localStorage`. Sair manualmente usa `scope: local`; concluir a troca usa `scope: global` e exige novo login.

## Escopo desta etapa

As Issues 02 e 03 entregam login, sessão e troca obrigatória da senha provisória. Bloqueio desktop e RBAC completo (Issue 04), chat, administração, e-mail inicial e upload ficam para as entregas próprias. As duas migrations originais permanecem intactas.
