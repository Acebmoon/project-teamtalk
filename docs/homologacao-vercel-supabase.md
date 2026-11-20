# Homologação TeamTalk — Vercel e Supabase

Refs #92. Preparação reproduzível de um **Preview**, sem implantação em produção. Atualizado para a `main` pós-PR #110, merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em 20/11/2026. Registrar o destino/deployment e os parâmetros operacionais antes dos ensaios. A implantação remota e os testes em aparelhos reais exigem as evidências abaixo e os roteiros [#85](qa/85-mobile-bloqueio-desktop.md), [#86](qa/86-auth-sessao-admin.md), [#87](qa/87-chat-privacidade-leitura.md) e [#88](qa/88-pdf-rastreabilidade.md).

## 1. Registrar o destino

O Tech Lead e a equipe preenchem este registro com dados de configuração não secretos, antes da implantação:

| Decisão | Registro necessário |
| --- | --- |
| Vercel | Equipe e ID do projeto de homologação aprovado |
| Supabase | Organização, project ref e região de um projeto de homologação isolado |
| Código | Branch/SHA exato revisado e PRs efetivamente integrados |
| Endereço | URL HTTPS Preview aprovada; domínio próprio somente se definido pela equipe |
| Acesso | Pessoas autorizadas e configuração de Deployment Protection |
| Recuperação | Deployment anterior compatível, responsável, backup e procedimento de restauração |
| Disponibilidade | Objetivos/alertas RNF10 acordados; capacidade e custo para a estimativa de 900 usuários |

Usar dados sintéticos e contas controladas pela equipe. Não copiar dados/credenciais de produção. Não registrar senhas, chaves, tokens, cookies ou corpos de e-mail em issues, logs, screenshots ou evidências.

## 2. Base atual e dependências consultadas

`base(tempval)/` permanece como workspace Next, com rotas finas. Configuração/validação ficam em `controle-base-main/configuracao/`. `design-em-react/` continua recebendo dados e ações por props, sem Supabase ou variáveis privadas.

Os PRs #99 a #106 foram incorporados pelo #110, junto das telas, design system, Inbox e preferências. A tabela preserva os heads consultados/incorporados e as dependências. A main entrega os fluxos descritos no [relatório de integração](integracao-mvp.md); homologação operacional continua pendente, mesmo com código e CI integrados.

| PR | SHA consultado | Dependência de homologação |
| --- | --- | --- |
| [#99](https://github.com/Acebmoon/project-teamtalk/pull/99) | `4126271` | Listagem; `20261119000000_list_authorized_conversations.sql` |
| [#100](https://github.com/Acebmoon/project-teamtalk/pull/100) | `88408db` | Contas TI; `20261119004000_admin_accounts.sql`; chave privada de serviço |
| [#101](https://github.com/Acebmoon/project-teamtalk/pull/101) | `99ea1c2` | Texto/Realtime; `20261119001000_text_messages_realtime.sql`; composição da tela de chat |
| [#102](https://github.com/Acebmoon/project-teamtalk/pull/102) | `fd1b8f7` | PDF privado; `20261119003000_secure_pdf_attachments.sql`; serviço e limite do hosting |
| [#103](https://github.com/Acebmoon/project-teamtalk/pull/103) | `689255b` | Depende de #100; `20261119006000_initial_access_email.sql`; provedor/remetente verificados |
| [#104](https://github.com/Acebmoon/project-teamtalk/pull/104) | `31a7725` | Seletor PDF; callback de #102 e mesmo limite recebido por props |
| [#105](https://github.com/Acebmoon/project-teamtalk/pull/105) | `319b475` | Leituras; `20261119002000_message_reads_realtime.sql`; observação dos balões na tela |
| [#106](https://github.com/Acebmoon/project-teamtalk/pull/106) | `44553e1` | Grupos/auditoria; `20261119005000_release_groups_audit.sql`; chave de serviço |

**Integração consolidada:** versões únicas e ordem final estão em [integração do MVP](integracao-mvp.md). As quatro migrations da main foram preservadas; as novas de PDF, contas, grupos e e-mail receberam versões 20261119003000, 20261119004000, 20261119005000 e 20261119006000. #100 precede #103. Não renumerar migrations aplicadas nem usar `migration repair` para esconder divergências. Reconciliar qualquer histórico existente com a equipe. O teste de contrato desta entrega reprova versões duplicadas no checkout.

As asserções de publicação foram compatibilizadas no #110: a suíte combinada valida `messages` e `message_reads` com todas as migrations. Manter [contratos de autenticação](contratos-auth.md) e os contratos das frentes integradas.

## 3. Instalação e gates locais

Node **24.x** está fixado por major em `.nvmrc` e `engines` nos dois manifests; npm **11.19.1** está indicado em `packageManager`. A Vercel mantém patches da major do Node. O lockfile da raiz fixa as dependências da aplicação.

```sh
# Raiz do repositório, no commit a homologar
nvm use
npm ci
cp 'base(tempval)/.env.example' 'base(tempval)/.env.local'
```

Preencher a chave pública local em `.env.local` com a anon/publishable do Supabase local. O placeholder é rejeitado de propósito. Segredos opcionais ficam vazios enquanto seus recursos não forem usados. Testes unitários não exigem banco nem envio reais.

```sh
npm run typecheck --workspace 'base(tempval)'
npm run lint --workspace 'base(tempval)'
npm test --workspace 'base(tempval)' -- --maxWorkers=2
npm run build --workspace 'base(tempval)'
# Mesmo encadeamento da Vercel:
npm run build:homologacao --workspace 'base(tempval)'
```

`build:homologacao` interrompe no primeiro erro: typecheck → lint das três pastas → testes → build Next. Não aplica migrations nem envia e-mail. Instalar sempre da raiz com `npm ci`; mudanças intencionais de dependências exigem atualizar `package-lock.json`.

## 4. Configurar Vercel Preview

Selecionar equipe/projeto aprovados. Na integração Git com `Acebmoon/project-teamtalk`, revisar antes de qualquer implantação:

| Opção | Valor |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | `base(tempval)` |
| Include source files outside of the Root Directory in the Build Step | Habilitado: controle, design, manifest e lockfile da raiz precisam estar disponíveis |
| Node.js Version | 24.x, alinhado a `engines.node` |
| Install Command | `cd .. && npm ci`, definido em `base(tempval)/vercel.json` |
| Build Command | `npm run build:homologacao`, no workspace, definido no mesmo arquivo |
| Output Directory | Padrão do Next; não selecionar `out` nem exportação estática |
| Target | **Preview**, com variáveis de homologação |
| Skipping unaffected projects / Ignored Build Step | Não ignorar mudanças nas pastas irmãs; conferir novo deploy após alterar controle/design |

`vercel.json` fica no Root Directory escolhido; não tem propriedade `rootDirectory`, que pertence às opções do projeto. `next.config.ts` preserva `experimental.externalDir` e `outputFileTracingRoot` na raiz. Não mover/copiar as três pastas para contornar imports.

Revisar Production Branch e auto-deploy do projeto existente antes de conectar Git. Usar branch diferente da Production Branch com target Preview. Não executar uma implantação inicial identificada como Production. Se o assistente de importação só oferecer Production, configurar o projeto sem essa implantação e fazer o primeiro deploy pela CLI com target Preview. Não modificar o ambiente de produção existente.

Para CLI, a equipe deve escolher uma versão exata revisada de Vercel CLI. Executar **da raiz do monorepo**: `vercel login`, `vercel link`, selecionar equipe/projeto aprovados e conferir o Root Directory remoto. `vercel deploy` sem `--prod` cria Preview. Conferir target e commit no painel. Não usar `--prod`, `vercel promote` ou rollback de Production neste fluxo.

O host `.vercel.app` atribuído ao Preview usa TLS. Utilizar essa URL se aprovada, ou associar domínio de homologação definido pela equipe e aguardar certificado válido. Confirmar redirecionamento HTTP → HTTPS no endereço final. A configuração não inventa domínio nem fixa região sem conhecer o banco.

Deployment Protection precisa permitir acesso ao grupo de testes. Um 401/403 da proteção Vercel não comprova autenticação da aplicação. Atravessar essa proteção com o acesso/bypass autorizado, sem colocá-lo em URL, logs ou evidências compartilhadas.

## 5. Variáveis e segredos

Cadastrar em **Settings → Environment Variables**, somente no escopo **Preview** do projeto aprovado. Restringir à branch de homologação se outros Previews não puderem usar o banco. Chaves privadas devem usar tipo Secret/sensível. Development usa credenciais locais separadas; Production não recebe os valores de homologação.

| Nome | Exposição/obrigatoriedade | Valor esperado |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública; obrigatória | Origem HTTPS do Supabase de homologação, sem credenciais, caminho, query ou fragmento |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública; obrigatória | anon JWT ou `sb_publishable_*` do mesmo projeto; nunca service_role/secret |
| `SESSAO_MAX_HORAS` | Servidor; opcional | Decimal positivo; padrão `12`; `0.001` somente no ensaio temporário de expiração |
| `SUPABASE_SERVICE_ROLE_KEY` | **Segredo do servidor**; necessário em #100/#102/#103/#106 | service_role JWT ou `sb_secret_*` do Supabase de homologação |
| `PDF_MAX_BYTES` | Servidor; definir para #102 na Vercel | **`4000000`**, mesmo limite fornecido ao seletor #104 |
| `EMAIL_PROVIDER` | Servidor; opcional até #103 | `disabled` por padrão; `resend` habilita o adaptador de #103 |
| `EMAIL_FROM` | Servidor; com resend | Um endereço individual de domínio verificado, sem display name/lista |
| `EMAIL_API_KEY` | **Segredo do servidor**; com resend | Chave restrita do provedor; jamais `NEXT_PUBLIC_*` |
| `TEAMTALK_PUBLIC_URL` | Servidor; com resend | Origem HTTPS aprovada da aplicação, sem caminho, credenciais, query ou fragmento |
| `CREDENCIAL_INICIAL_VALIDADE_HORAS` | Servidor; opcional | Inteiro de `1` a `168`, padrão `24`, conforme #103 |

O parser puro valida formato/limites; não verifica assinatura do JWT nem correspondência remota entre projeto e chave. Confirmar essa correspondência pelo login hospedado. A leitura de `process.env` fica em módulo `server-only`, usado por SSR, middleware e duração de sessão. O build valida antes de gerar os bundles. Erros usam nomes fixos de campos, sem os valores recebidos.

Segredos opcionais não são retornados pelo parser nem colocados em `NextConfig.env`. São recusados nomes públicos de segredo, chaves secret/service_role em qualquer `NEXT_PUBLIC_*` e cópias públicas dos segredos conhecidos. O helper do navegador usa somente URL e anon key. O cliente de serviço continua exclusivo do servidor: em administração, **após `exigirAdminTI()`**; em PDFs, após autorização do participante conforme #102. Consultas do chat preservam JWT/RLS de usuário.

`NEXT_PUBLIC_*` é incorporado ao bundle durante `next build`. Mudar projeto ou chave pública exige **novo build**. Após qualquer mudança de variáveis na Vercel, criar novo Preview. `.env*` reais, `.vercel/` e estado da CLI Supabase estão ignorados; não publicar esses arquivos como artifacts.

### Limite de PDFs

O #102 tem padrão de **10 MiB**, mas Functions Vercel limitam payload a **4,5 MB**. Para ativar #102 na Vercel, definir `PDF_MAX_BYTES=4000000`, alinhando aplicação, seletor e Storage. O parser rejeita valor explícito maior nesse hosting; na Vercel, o padrão efetivo também é 4.000.000 bytes. Fora desse hosting, o padrão local permanece 10 MiB. Testar multipart perto do limite e resposta 413 do proxy. O limite também afeta respostas de download e anexos maiores já existentes.

Se forem exigidos 10 MiB no hosting, registrar bloqueio e aprovar arquitetura que mantenha validação real no servidor e bucket privado antes da publicação. Não abrir bucket nem liberar upload direto não validado como contorno.

## 6. Supabase Auth e migrations

1. Comparar organização/project ref/URL com o registro aprovado; usar projeto isolado. Escolher região Vercel próxima ao banco após confirmar regiões disponíveis.
2. Em Auth, manter **autorregistro desabilitado**, autenticação por senha e mínimo de 10 caracteres. `supabase/config.toml` configura o ambiente local, não o projeto hospedado automaticamente.
3. Em **Authentication → URL Configuration**, Site URL recebe a origem HTTPS aprovada. Em Redirect URLs, adicionar somente endereços/caminhos realmente usados, incluindo `/login`. Atualizar ao mudar o Preview; preferir origem estável aprovada ou entradas exatas, sem wildcard aberto para qualquer `.vercel.app`. Login atual por senha usa cookies do domínio e não exige callback OAuth novo.
4. Conferir expiração/refresh do Auth e limite absoluto da aplicação. Preservar primeiro acesso, Secure em build de produção e SameSite=Lax; não usar localStorage para tokens.
5. Conferir backup e histórico antes das migrations. Token da CLI e senha do banco são segredos operacionais, não variáveis Next. Usar login interativo/mecanismo protegido; não colocar segredos em URL/argumentos compartilhados.

Com dependências instaladas pelo lockfile, executar no workspace (flags conferidas na CLI Supabase 2.122.1):

```sh
cd 'base(tempval)'
npx --no-install supabase login
# Preencher o project ref aprovado, que é identificador, não segredo:
read -r TEAMTALK_HML_PROJECT_REF
npx --no-install supabase link --project-ref "$TEAMTALK_HML_PROJECT_REF"
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run
```

Comparar o projeto linkado, histórico local/remoto e dry-run com o commit revisado. Interromper se houver versões repetidas, divergências ou SQL inesperado. Após essa revisão e backup, aplicar **somente em homologação**:

```sh
npx --no-install supabase db push --linked
npx --no-install supabase migration list --linked
npx --no-install supabase db push --linked --dry-run
```

O dry-run final deve ficar sem pendências. Não executar `db reset --linked`, apagar histórico nem editar migrations aplicadas. `npm run db:reset` é exclusivo do **local** com Docker. As quatro migrations da main são preservadas nesta ordem:

1. `20261110000000_initial_schema.sql`
2. `20261110001000_authorized_chat_access.sql`
3. `20261111000000_first_access_password.sql`
4. `20261111001000_access_state_admin.sql`

Ao integrar frentes, aplicar também suas migrations com versões únicas/dependências da seção 2. No SQL Editor **de homologação**, conferir:

```sql
-- Esperado: oito tabelas base, todas com RLS habilitada.
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'release_groups', 'release_group_members',
    'conversations', 'conversation_participants', 'messages', 'message_reads', 'audit_logs')
order by tablename;

select tablename, policyname, roles, cmd from pg_policies
where schemaname = 'public' order by tablename, policyname;

select trigger_name, event_manipulation from information_schema.triggers
where trigger_schema = 'auth'
  and trigger_name in ('on_auth_user_created', 'on_auth_password_changed');

-- Com #101/#105 integrados: conferir messages/message_reads na publicação.
select pubname, schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime';
```

Comparar grants/EXECUTE das RPCs e políticas com as migrations: conversas/mensagens usam `can_access_conversation()`, leituras usam `can_access_message()`. RLS habilitada não comprova isolamento; SQL Editor/cliente de serviço são privilegiados. Confirmar acesso por JWT de usuário comum nos smokes.

Com #102, conferir bucket privado `chat-pdfs`, sem leitura/escrita direta de clientes e com limite compatível. Com #103, conferir metadados/validade de entrega e RPCs privadas de serviço. Não enviar credenciais durante revisão de SQL.

## 7. Implantação e transporte

1. Executar todos os gates no SHA revisado, incluindo frentes integradas. Não conectar banco remoto nem aplicar migrations no Install/Build Command.
2. Definir variáveis Preview, implantar a branch pelo Git ou `vercel deploy` da raiz linkada. Conferir target **Preview**, SHA, Node 24.x, Root Directory, quatro gates e imports das pastas irmãs.
3. Registrar deployment ID, URL HTTPS, SHA e horário UTC. Alinhar Site URL/redirects/Auth e origem de e-mail ao endereço aprovado; alterações de variáveis exigem novo build.
4. Conferir certificado, redirecionamento HTTP → HTTPS e headers em páginas, APIs, redirecionamentos e erros. HSTS recebido em HTTP não substitui o redirecionamento TLS da plataforma.

Headers vêm de `controle-base-main/configuracao/headers.ts` via `next.config.ts`, fonte única para Next local e Vercel. `/:path*` cobre todas as rotas; não duplicar no painel/configuração Vercel.

| Header | Política |
| --- | --- |
| `Strict-Transport-Security` | `max-age=31536000` em build de produção, incluindo Preview; sem preload/includeSubDomains para não assumir controle de outros hosts. O navegador só aceita HSTS por HTTPS; dev não recebe o header. |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Câmera, microfone e geolocalização desabilitados |
| `Content-Security-Policy` | Base/formulários da mesma origem; objetos e enquadramento negados |

A CSP é uma base, **não uma política completa contra execução de scripts**. Não restringe `script-src`/`connect-src`: preservar hidratação/Server Actions e HTTPS/WSS do Supabase em Chrome Android/Safari iOS. Política mais estrita exige nonces/origens e testes próprios. `X-Powered-By` é desabilitado; cookies, cache e CORS das rotas não são sobrescritos.

Smoke sem credenciais no terminal do operador, com o endereço aprovado:

```sh
read -r TEAMTALK_HML_URL
# Certificado válido: não usar curl -k.
curl --silent --show-error --dump-header - --output /dev/null \
  -A 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' \
  "$TEAMTALK_HML_URL/login"
curl --silent --show-error --dump-header - --output /dev/null \
  -A 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36' \
  "$TEAMTALK_HML_URL/api/admin/estado"
curl --silent --show-error --dump-header - --output /dev/null \
  -A 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' \
  "$TEAMTALK_HML_URL/api/admin/estado"
```

Esperado: login acessível, API 401 sem sessão mobile e 403 JSON desktop. Repetir para o mesmo host por HTTP e conferir redirecionamento HTTPS. Atravessar Deployment Protection de forma autorizada antes de avaliar a aplicação. Ocultar Set-Cookie de evidências. Inspecionar os JS em `base(tempval)/.next/static/`: não podem conter valores privados, referências às chaves de serviço/e-mail ou código de serviço administrativo; fazer verificações sem imprimir valores reais.

## 8. Smoke funcional com duas contas

Usar **A = Admin TI**, **B = funcionário**, e-mails controlados pela equipe e senhas individuais. Executar em Chrome Android e Safari iOS **físicos**, com versão de SO/navegador registrada.

Criar apenas a conta inicial A pelo painel Auth (e-mail confirmado); o trigger cria perfil `pending` com `must_change_password=true`. No SQL Editor de homologação, substituir o UUID abaixo pelo ID de A. Não alterar a marca de senha manualmente para pular o primeiro acesso:

```sql
update public.users set status = 'active', role = 'it_admin'
where id = '<UUID_A>'::uuid;
```

Após A trocar a senha e entrar novamente, cadastrar B pelo painel TI para exercitar o e-mail real de primeiro acesso. Executar os testes de conta pending/sem grupo **antes** da liberação correspondente; ativar B e incluí-lo no grupo pelo painel. O [QA #86](qa/86-auth-sessao-admin.md) registra o preparo completo e o grupo `Diretoria - Fase 1` confirmado habilitado e sem membros em 20/11/2026 no projeto `pqpjnxymcngrackqrmnn`. A seed local original usa `Diretoria / nível estratégico`; escolher conscientemente o grupo da rodada, sem habilitar outros grupos por engano. Bootstrap de A continua operação administrativa controlada; não criar cadastro público.

| Ensaio | Resultado esperado |
| --- | --- |
| B pending/blocked/disabled | Acesso negado |
| B active sem grupo habilitado | Continua sem acesso; habilitar grupo e incluir B para prosseguir |
| Primeiro login de A/B | Somente `/primeiro-acesso`; API protegida recebe 403 enquanto a troca estiver pendente |
| Senha nova válida: 10+ caracteres e até 72 bytes | Trigger zera a marca após troca efetiva, logout global e novo login; senha provisória não autentica |
| Reabrir/recarregar navegador | Cookies do domínio Secure em HTTPS e SameSite=Lax; sem tokens em localStorage/URL |
| A/B em `/api/admin/estado` | A: 200 `{"papel":"it_admin"}`; B: 403 inclusive chamada direta; `/admin` também nega funcionário com 403 conforme contrato |
| Expiração com `SESSAO_MAX_HORAS=0.001`, novo deploy/login | Após o prazo, API 401/rota redireciona a login; restaurar `12` e refazer build |
| Sair manualmente | Logout local; outra sessão independente permanece; rota protegida exige login |
| Windows/macOS/Linux/iPad, incluindo TI | Página de bloqueio ou API 403; reduzir viewport não libera desktop |
| Remover B do último grupo/bloqueá-lo durante a sessão | Próxima consulta negada, sem mensagens/PDFs; restaurar somente dados de teste no final |

Para isolamento com duas contas, preparar por operação administrativa controlada uma conversa A↔B e grupos de teste com um único participante, um só de A e outro só de B. B não lê a conversa exclusiva de A; TI não lê a exclusiva de B sem participar. A main já conecta as frentes abaixo; testar no SHA efetivamente implantado:

| Frente | Ensaio adicional |
| --- | --- |
| #99/#101 | A→B e B→A, persistência/histórico/ordem, uma cópia por ID, WSS conectado e reconexão após modo avião; negar conversa alheia com UUID conhecido |
| #105 | Fora do viewport/aba oculta não marca leitura; exibição ativa registra só o destinatário, repetição preserva primeiro horário. Grupo com múltiplos destinatários requer terceira conta adicional |
| #102/#104 | PDF real aceito/baixado até o limite; rejeitar arquivo acima do limite, PDF truncado e imagem/áudio/vídeo/Word/Excel renomeados; remover participação e negar download; bucket permanece privado |
| #100/#103 | Cadastro/reset de B por TI, e-mail individual recebido, validade e troca obrigatória; falha/vencimento nega acesso, sem senha em URL/log/auditoria. Com disabled, cadastro/reset falham antes das mutações |
| #106 | Criar/habilitar grupo e incluir/remover B; revogação vale na próxima consulta; auditar cada mudança efetiva; B não consulta auditoria nem modifica grupos |

## 9. CI, observação e recuperação

O workflow [Qualidade MVP e mobile](../.github/workflows/design-system.yml) está integrado e executa instalação reproduzível, typecheck, lint, Vitest, build e mobile. O [CI final do #110](https://github.com/Acebmoon/project-teamtalk/actions/runs/44663257450) aprovou **936 testes em 47 arquivos e 12 mobile**; os **49 checks HTTP** foram smoke local documentado na integração, não uma etapa própria desse workflow. Mudanças em README/docs também disparam o CI de PR. Verificar os checks no SHA final de cada PR antes de mesclar; a existência do workflow não comprova configuração de proteção de branch. Após conectar Vercel, conferir separadamente o status/link do Preview. Build e emulação não substituem aparelhos físicos, serviços reais, carga ou garantia de disponibilidade.

Após cada Preview, observar erros/latência na Vercel e falhas Auth/PostgREST/Realtime/Storage no Supabase; com #103, conferir entrega no provedor. Correlacionar por horário, deployment e IDs sanitizados, sem payloads pessoais. Acordar responsável, objetivos e alertas RNF10 antes de expandir o piloto; duas contas não comprovam capacidade para 900.

Se houver falha, interromper novos testes/escritas, registrar deployment defeituoso e voltar ao **Preview anterior conhecido e compatível** pelo link imutável aprovado. Atualizar o endereço do grupo de teste, allowlist/Auth e origem de e-mail. Mudanças de env exigem novo Preview do commit anterior. Havendo domínio de homologação, reassociar **somente esse domínio** ao deployment anterior após conferir projeto/target/SHA. Refazer HTTPS e smokes A/B.

Rollback da aplicação **não desfaz migrations, senhas alteradas, e-mails ou efeitos externos**. Manter migrations aditivas retrocompatíveis; preferir migration corretiva nova/revisada. Em corrupção/perda, parar escritas e seguir backup/restauração acordados, validando primeiro em projeto isolado. Não executar reset remoto, apagar histórico nem promover/retroceder Production para recuperar Preview. Rotacionar credenciais afetadas por exposição comprovada pelo mecanismo protegido da equipe.

## 10. Checklist e evidências

- [ ] Projetos/equipes, Supabase isolado, região, URL HTTPS e responsáveis aprovados/registrados.
- [ ] Target Preview, SHA e PRs integrados identificados; nenhum deploy Production.
- [ ] Root Directory/arquivos externos configurados; aliases das três pastas resolvidos.
- [ ] `npm ci`, typecheck, lint, testes e build passam no SHA implantado.
- [ ] Variáveis Preview corretas; segredos ausentes de Git, logs e bundle público.
- [ ] URL/chave pública correspondem ao Supabase de homologação; e-mail configurado ao habilitar cadastro/reset de #103.
- [ ] Migrations únicas, histórico alinhado e dry-run final sem pendências.
- [ ] Oito tabelas base com RLS; políticas/grants/triggers e objetos das frentes integradas conferidos.
- [ ] Autorregistro desabilitado, Site URL/redirects exatos, grupo e duas contas preparados.
- [ ] Certificado/HTTPS, redirecionamento HTTP e seis headers conferidos em página/API/redirecionamento/erro.
- [ ] Chrome Android/Safari iOS físicos: login, troca, cookies, expiração, logout e bloqueio desktop aprovados.
- [ ] Funcionário 403 na API TI; conta bloqueada/sem grupo perde acesso na consulta seguinte.
- [ ] Chat/Realtime/leituras/PDF/e-mail/grupos testados para frentes integradas; demais explicitamente pendentes.
- [ ] Limite PDF alinhado a Vercel/seletor/Storage e bucket privado, com #102.
- [ ] Presença/ausência de checks GitHub registrada e status Preview conferido.
- [ ] Observação/alertas RNF10 acordados; reversão para Preview anterior ensaiada sem reset de banco.

Registrar em revisão técnica: SHA, deployment ID, URL, SO/navegador, horário UTC, esperado/obtido de cada ensaio, migrations aplicadas e pendências, ocultando credenciais/dados pessoais. **Não concluir #92 somente com build local**: os critérios remotos da issue exigem essas evidências.

## Referências

- [Issue #92](https://github.com/Acebmoon/project-teamtalk/issues/92), [divisão de tarefas](../DIVISAO_TAREFAS.md), [contratos auth](contratos-auth.md).
- [Vercel: arquivos fora do Root Directory](https://vercel.com/docs/monorepos/monorepo-faq), [vercel.json](https://vercel.com/docs/project-configuration/vercel-json), [Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [limites de Functions](https://vercel.com/docs/functions/limitations).
- [Next.js: variáveis de ambiente](https://nextjs.org/docs/app/guides/environment-variables).
- [Supabase: ambientes](https://supabase.com/docs/guides/deployment/managing-environments), [CLI db push](https://supabase.com/docs/reference/cli/supabase-db-push), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
