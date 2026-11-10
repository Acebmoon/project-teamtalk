# TeamTalk — base (tempval)

Fundação isolada do projeto em `base(tempval)/`: Next.js App Router, TypeScript, configuração Supabase local e modelo inicial do banco. Esta entrega prepara a base; não implementa ainda os fluxos de login, administração, chat, upload ou tempo real das Issues seguintes.

## Requisitos

- Node.js 20.9+
- npm
- Docker, para executar Supabase local

## Executar

A partir da raiz do repositório:

```sh
cd 'base(tempval)'
npm install
cp .env.example .env.local
npx supabase start
```

Preencha `.env.local` com a `API URL` e a `anon key` informadas por `supabase start`, depois rode:

```sh
npm run db:reset
npm run dev
```

Abra `http://localhost:3000`. Os comandos Supabase devem ser executados nesta pasta, onde está `supabase/config.toml`.

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon para o cliente do navegador; o acesso aos dados segue protegido por RLS.

Não adicione segredos reais ao Git. Nunca exponha a chave `service_role` no navegador nem em variáveis `NEXT_PUBLIC_*`. O cadastro público está desativado; a criação de identidades deve ocorrer por um fluxo administrativo confiável.

## Cobertura da fundação (Issue 70)

As migrations criam perfis ligados a `auth.users`, grupos e membros de liberação, conversas e participantes, mensagens (texto ou referência a PDF), leituras e auditoria. Incluem chaves estrangeiras, restrições, índices, timestamps, criação automática do perfil e RLS.

A migration `20261110001000_authorized_chat_access.sql` aplica o gate de liberação: operações de leitura de conversas, participantes, mensagens e leituras exigem conta ativa, participação na conversa e, para funcionários, pertencimento a pelo menos um grupo habilitado. O grupo inicial previsto para a Diretoria é criado desabilitado, aguardando autorização explícita. Admins não ganham acesso implícito ao conteúdo privado das conversas.

As escritas via cliente permanecem bloqueadas até que cada fluxo tenha políticas estreitas e validação server-side. O banco contém o modelo de auditoria, mas os endpoints e a gravação efetiva de eventos administrativos ainda não estão implementados.

## O que falta antes de uso real

Esta base, sozinha, não deve ser implantada para usuários. Ainda faltam autenticação e gestão segura de sessão no Next.js, autorização e rotas server-side, cadastro/administração de contas, políticas de escrita, interface de login/troca de senha, chat e Realtime, upload privado de PDF com validação real (incluindo magic bytes e limite acordado), testes automatizados e observabilidade. User-Agent não é uma proteção suficiente para bloquear desktops.

## Próximo passo recomendado

Implementar a **Issue 02 — autenticação individual e sessão segura**: cliente Supabase para servidor integrado ao mecanismo de cookies do Next.js, login/logout, proteção de rotas e verificação server-side de status/grupo autorizado. Não habilitar o chat antes de aplicar o bloqueio de troca obrigatória de senha da Issue 03 e as permissões server-side da Issue 04.

## Scripts

- `npm run dev` — servidor local Next.js.
- `npm run build` — build de produção.
- `npm run lint` — ESLint.
- `npm run typecheck` — verificação TypeScript.
- `npm run supabase:start` / `npm run supabase:stop` — Supabase local.
- `npm run db:reset` — recria o banco local e aplica migrations.
