# TeamTalk — MVP integrado

Aplicativo web de comunicação interna corporativa, acessado por link no **Chrome Android ou Safari iPhone**. A interface mobile combina chat com uma Inbox inspirada no Linear e a identidade visual TeamTalk. Desktop, notebook e iPad recebem bloqueio de dispositivo, inclusive para a TI. Não há publicação em lojas de aplicativos.

Estado de referência: `main` após o [PR #110](https://github.com/Acebmoon/project-teamtalk/pull/110), merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em 20/11/2026. Código integrado e homologação em campo são etapas distintas: [#85](https://github.com/Acebmoon/project-teamtalk/issues/85), [#86](https://github.com/Acebmoon/project-teamtalk/issues/86), [#87](https://github.com/Acebmoon/project-teamtalk/issues/87) e [#88](https://github.com/Acebmoon/project-teamtalk/issues/88) continuam abertas para evidências reais.

## O que está integrado

| Fluxo | Entrega real |
|---|---|
| Acesso | Login individual, sessão por cookies, expiração absoluta, troca obrigatória da senha inicial e logout. Sem cadastro público. |
| Inbox em `/` | Conversas autorizadas por atividade recente; Lista/Quadro, prioridade, situação e favorito privados por usuário, persistidos com RLS. Busca nos resumos já carregados. |
| Conversa | Histórico paginado, envio de texto, atualização Realtime, estados de envio e leitura efetiva por destinatário. |
| PDF | Seletor acessível, validação do conteúdo real no servidor, bucket privado `chat-pdfs` e download autenticado a cada requisição. |
| Administração em `/admin` | Consulta/cadastro/bloqueio/desativação/reativação/reset de contas, e-mail individual de primeiro acesso, grupos de liberação e auditoria. |
| Autorização | Sessão e participação verificadas no servidor e no banco; TI também precisa participar para ler conversa ou PDF. |

O piloto começa pela Diretoria. Cerca de **900 funcionários** é uma estimativa de expansão, ainda dependente de ensaios de capacidade. A identificação por User-Agent/Client Hints tem limitações documentadas; autenticação, RBAC e RLS protegem os dados mesmo quando os cabeçalhos são falsificados. Acesso offline, push, gestão de departamentos/canais oficiais, fixação e ações avançadas de mensagem não são entregas deste MVP. Veja o [backlog pós-MVP](docs/backlog-melhorias-futuras.md).

## Arquitetura de três pastas

| Pasta | Responsabilidade | Exemplos |
|---|---|---|
| `base(tempval)/` | Workspace Next.js; páginas, rotas e middleware finos; configuração e migrations. | `src/app/api/`, `src/app/admin/`, `supabase/migrations/`, `.env.example`, `vercel.json` |
| `controle-base-main/` | Regras, contratos, integração Supabase/Auth/Storage/Realtime, composição dos fluxos e testes. | `auth/`, `chat/`, `inbox/`, `anexos/`, `admin/`, `email/`, `configuracao/` |
| `design-em-react/` | Tokens, estilos, ícones, componentes e telas React que recebem dados e ações por props. Sem acesso ao Supabase. | `estilos/tokens.css`, `componentes/`, `telas/`, `icones/` |

A raiz usa npm workspaces. Os aliases `@controle/*` e `@design/*` estão no `base(tempval)/tsconfig.json`; o Next inclui as pastas externas no build. Operações protegidas usam `criarServidor()` e `avaliarSessao()`. Páginas, APIs e ações administrativas iniciam com `exigirAdminTI()`; clientes privilegiados existem somente no servidor após autorização.

## Instalação e execução local

Pré-requisitos: Git, **Node.js 24.x** (`.nvmrc`), **npm 11.19.1** e Docker em execução para usar o Supabase local. Não é necessário Docker para os testes Vitest/PGlite. Os comandos abaixo partem de um checkout do repositório:

```sh
# Raiz do repositório: instalar todos os workspaces uma única vez.
npm install
cd 'base(tempval)'
cp .env.example .env.local

# Supabase local: primeiro início prepara a base com as migrations versionadas.
npm run supabase:start
npx supabase status
```

Preencha `.env.local` com a URL e a chave **pública anon/publishable do mesmo projeto local**. O valor de exemplo da chave precisa ser substituído. Para testar administração/PDF, configure a chave privada do servidor; para cadastro/reset, configure também o provedor de e-mail. Não versione `.env.local` nem publique a saída com credenciais do `supabase status`.

```sh
# Em base(tempval)/, após configurar o ambiente:
npm run dev
```

Abra `http://localhost:3000/login` com emulação de smartphone e User-Agent correspondente; uma janela desktop apenas estreita continua bloqueada. O Studio local fica em `http://localhost:54323`. Crie a conta inicial de TI pelo Auth/Studio local, confirme o e-mail e ajuste seu papel para `it_admin` e estado para `active` por operação administrativa controlada. Conclua a troca real da senha provisória. Cadastre a conta B pelo painel TI, libere seu grupo e siga o [preparo do QA de autenticação](docs/qa/86-auth-sessao-admin.md). Não zere `must_change_password` manualmente para simular aprovação.

Os comandos de verificação também são executados **em `base(tempval)/`**:

```sh
npm run typecheck
npm run lint
npm test
npm run build
npm run start
```

`start` serve o build de produção; encerre o `dev` se ambos usarem a porta 3000. `npm run build:homologacao` reúne typecheck, lint, testes e build. Para reproduzir a suíte mobile, ainda nesse workspace:

```sh
npx playwright install --with-deps chromium webkit
npm run test:mobile
```

O CI usa `npm ci` na raiz para respeitar o lockfile. Há **12 migrations em ordem de nome**; consulte a sequência em [integração do MVP](docs/integracao-mvp.md). Para preparar um Supabase remoto ou atualizar uma base existente, siga o [guia de homologação Vercel + Supabase](docs/homologacao-vercel-supabase.md), conferindo histórico e destino antes de aplicar migrations.

## Variáveis de ambiente

Fonte: [template](base(tempval)/.env.example) e [validador do servidor](controle-base-main/configuracao/ambiente.ts). Nenhum valor secreto é publicado aqui. Os padrões abaixo são parâmetros de operação, não credenciais.

| Variável | Obrigatoriedade | Uso / regra |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sempre, inclusive build | Origem do projeto; HTTPS remoto ou HTTP de loopback local. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sempre, inclusive build | Chave pública anon/publishable desse projeto; nunca service role. |
| `SUPABASE_SERVICE_ROLE_KEY` | Execução completa de administração e PDF; obrigatória com e-mail habilitado | Segredo exclusivamente do servidor. Login/testes/build com e-mail desabilitado não o exigem. |
| `SESSAO_MAX_HORAS` | Opcional; padrão `12` | Número positivo de horas, contado do login por senha de cada sessão. |
| `PDF_MAX_BYTES` | Opcional; manter explícito para homologação | Template: `4000000` bytes. Na Vercel, padrão e teto de configuração `4000000`; fora dela, padrão do parser `10485760` (10 MiB). UI e servidor usam o mesmo limite. |
| `EMAIL_PROVIDER` | `resend` para cadastro/reset funcionais | Ausente/`disabled`: não envia e-mail; cadastro/reset retornam 503 antes das mutações. |
| `EMAIL_FROM` | Com `resend` | Um remetente corporativo verificado, sem lista de destinatários. |
| `EMAIL_API_KEY` | Com `resend` | Chave privada do provedor, somente no servidor. |
| `TEAMTALK_PUBLIC_URL` | Com `resend` | Origem da aplicação, HTTPS em produção; sem caminho, query ou fragmento. |
| `CREDENCIAL_INICIAL_VALIDADE_HORAS` | Opcional; padrão `24` | Inteiro de `1` a `168`; validade da credencial inicial contada no banco. |

Somente as duas variáveis `NEXT_PUBLIC_SUPABASE_*` da tabela são destinadas ao navegador. Chaves privilegiadas e segredos de e-mail nunca recebem `NEXT_PUBLIC_`. O parser interrompe o build diante de configuração inválida ou exposição de segredo. O template com `EMAIL_PROVIDER=disabled` permite desenvolver sem enviar e-mails; o aceite completo exige provedor real configurado.

## Verificação e QA em campo

| Evidência incorporada à main | Resultado | Fonte e alcance |
|---|---|---|
| CI da main pós-#110 | **936 testes**, 47 arquivos; typecheck, lint e build aprovados | [GitHub Actions da main](https://github.com/Acebmoon/project-teamtalk/actions/runs/44664059549); inclui SQL/RLS com migrations reais em PGlite e transportes externos simulados. |
| CI mobile | **12 testes aprovados** | Mesma execução; Chromium/Android e WebKit/iPhone sobre a galeria de componentes, sem autenticação real. |
| Smoke HTTP da integração | **49 verificações aprovadas** | [Registro do #110](https://github.com/Acebmoon/project-teamtalk/pull/110) e [relatório](docs/integracao-mvp.md): sessão/dispositivo/redirecionamentos/headers no build local. Não é uma etapa HTTP separada do workflow atual. |

Essas evidências validam a base de código integrada. Os quatro roteiros abaixo reservam **A = Admin TI, B = funcionário**, dois smartphones físicos (Chrome Android e Safari iPhone) e um desktop; resultados em campo começam como **PENDENTE**:

| Issue que permanece aberta | Roteiro |
|---|---|
| [#85](https://github.com/Acebmoon/project-teamtalk/issues/85) | [Compatibilidade mobile e bloqueio desktop](docs/qa/85-mobile-bloqueio-desktop.md) |
| [#86](https://github.com/Acebmoon/project-teamtalk/issues/86) | [Autenticação, sessão, e-mail, administração, grupos e auditoria](docs/qa/86-auth-sessao-admin.md) |
| [#87](https://github.com/Acebmoon/project-teamtalk/issues/87) | [Chat, privacidade, leitura, reconexão e desempenho observado](docs/qa/87-chat-privacidade-leitura.md) |
| [#88](https://github.com/Acebmoon/project-teamtalk/issues/88) | [PDF, documentação e rastreabilidade](docs/qa/88-pdf-rastreabilidade.md) |

Os números globais não aprovam automaticamente cada requisito. Capacidade para 900 usuários, disponibilidade/SLO, entrega na caixa postal, HTTPS remoto e compatibilidade com aparelhos reais exigem evidências próprias. O fechamento da #96 entrega a organização do backlog para avaliação de Ícaro e Elliot, sem aprovar ou implementar as propostas.

## Rastreabilidade completa pós-integração

A [matriz dos **46 requisitos**](docs/08-testes-e-rastreabilidade.md) mantém **RF01–RF15, RNF01–RNF14, RN01–RN10 e SEG01–SEG07**, cada um ligado a issues, PRs, arquivos/testes reais e casos de QA. Ela substitui as indicações antigas de funcionalidades ainda ausentes pela situação integrada, preservando as pendências de aceite.

| Entrega | Issues / PRs incorporados | Implementação e contrato |
|---|---|---|
| Fundação, login, senha e RBAC | #70–#73; PRs #89–#91 | `controle-base-main/auth/`, `dispositivo/`, `supabase/`; [auth](docs/contratos-auth.md) |
| Design system e telas | #74–#76; PRs #107, #93, #94 | `design-em-react/`; [guia visual](design-em-react/README.md) |
| Inbox e preferências privadas | #98; PRs #97, #109 | `controle-base-main/inbox/`, `chat/workspace.tsx`; [preferências](controle-base-main/inbox/README.md) |
| Conversas, texto e leitura | #78–#80; PRs #99, #101, #105 | `controle-base-main/chat/`; [listagem](controle-base-main/chat/README.md), [texto](controle-base-main/chat/README-mensagens.md), [leituras](controle-base-main/chat/README-leituras.md) |
| Seletor e upload PDF | #77, #84; PRs #104, #102 | `controle-base-main/anexos/`, `design-em-react/componentes/seletor-anexo-pdf.tsx`; [PDF](docs/contratos-pdf.md) |
| Contas, e-mail, grupos e auditoria | #81–#83; PRs #100, #103, #106 | `controle-base-main/admin/`, `email/`; [contas](docs/contratos-admin.md), [e-mail](docs/contratos-email-inicial.md), [grupos](docs/contratos-grupos-auditoria.md) |
| Homologação e integração | #92; PRs #108, #110 | `controle-base-main/configuracao/`, `.github/workflows/design-system.yml`; [homologação](docs/homologacao-vercel-supabase.md) |

## Equipe e documentação

| Integrante | Papel / frente |
|---|---|
| Ícaro | Product Owner; requisitos e aceite |
| Elliot | Tech Lead; arquitetura, ambiente e segurança |
| Luana e Gilson | UI/UX; identidade, componentes e fluxos |
| Mariana | SQA; testes e homologação |
| Pedro, Luan e Diego | Desenvolvimento e integrações |

- [Índice da especificação](docs/README.md), [requisitos de origem](docs/Documento-de-Requisitos.md) e [divisão de tarefas](DIVISAO_TAREFAS.md).
- [Integração, PRs e migrations](docs/integracao-mvp.md).
- [Homologação Vercel + Supabase](docs/homologacao-vercel-supabase.md).
- [Backlog de melhorias futuras — #96](docs/backlog-melhorias-futuras.md).
