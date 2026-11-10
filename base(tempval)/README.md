# TeamTalk — base (tempval)

Fundação isolada do projeto em `base(tempval)/`: Next.js App Router, TypeScript, Supabase local e migration inicial do modelo de dados. A raiz atual do repositório não é alterada por esta etapa.

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

Abra `http://localhost:3000`. Os comandos de Supabase precisam ser executados a partir desta pasta, onde está `supabase/config.toml`.

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: chave pública/anon para o cliente do navegador; o acesso aos dados segue protegido por RLS.

Não adicione segredos reais ao Git. Nunca exponha a chave `service_role` no navegador nem em variáveis `NEXT_PUBLIC_*`. O cadastro público está desativado; criação de identidades deverá ocorrer futuramente em fluxo administrativo confiável.

## Modelo inicial

A migration `supabase/migrations/20261110000000_initial_schema.sql` cria perfis de usuário ligados a `auth.users`, grupos e membros de liberação, conversas e participantes, mensagens, leituras e auditoria. Também inclui enums, chaves estrangeiras, restrições, índices, atualização de timestamps, criação automática de perfil e políticas RLS de leitura. As escritas não estão habilitadas para papéis de cliente nesta etapa.

## Scripts

- `npm run dev` — servidor local Next.js.
- `npm run build` — build de produção.
- `npm run lint` — ESLint.
- `npm run typecheck` — verificação TypeScript.
- `npm run supabase:start` / `npm run supabase:stop` — Supabase local.
- `npm run db:reset` — recria o banco local e aplica migrations.
