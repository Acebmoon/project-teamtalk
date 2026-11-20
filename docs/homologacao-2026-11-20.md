# TeamTalk — registro de homologação de 20/11/2026

Este registro descreve um Preview privado, ainda com pendências de configuração e QA. Não representa aprovação do MVP para uso da empresa.

## Código, destino e validação

- Repositório: Acebmoon/project-teamtalk.
- Main solicitada e preservada: `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, merge do PR #110.
- Código do Preview: `e217ff2aa635863bfe6a2c5e6f494cc6a3aa156c`, baseado nessa main, com alteração apenas em `vitest.config.ts` proposta no [PR #111](https://github.com/Acebmoon/project-teamtalk/pull/111).
- O build da main passou em typecheck/lint, mas falhou em 139 testes porque o Vitest herdava `NODE_ENV=production` e `VERCEL=1`. A correção define `NODE_ENV=test` e `VERCEL=0` somente no runner; o build Next mantém a configuração real da Vercel.
- Build corrigido: typecheck, lint, 936 testes em 47 arquivos e compilação Next aprovados. Nenhum gate removido.
- A conexão GitHub da Vercel não está configurada. A tentativa de conexão retornou: “You need to add a Login Connection to your GitHub account first.” Os arquivos foram obtidos pela integração GitHub e enviados à Vercel. Os 277 blobs originais tiveram hashes Git conferidos; o Preview inclui o ajuste de testes do commit acima.
- Vercel: equipe `team_vzlRTEIxYjfP087s2qK8J7y7`, projeto `prj_HF5obo8qRJlmbsAM7IUDxOICIhAr` (`teamtalk-preview`).
- Workspace `base(tempval)`, fontes das pastas irmãs incluídas, Node 24.x, instalação `cd .. && npm ci`, build `npm run build:homologacao`, conforme `base(tempval)/vercel.json`.
- Endereço estável: https://teamtalk-preview-1272619171-7204.vercel.app
- Deployment final **READY**: `dpl_GdEYmx6nXntHP97UZBHrrsswL6Yr`; URL imutável: https://teamtalk-preview-j17x0u8pc-1272619171-7204.vercel.app
- Ambiente da API Vercel: `staging` (Preview). Proteção Vercel Authentication mantida. O primeiro deployment, classificado automaticamente como Production, foi cancelado antes de concluir; não houve promoção posterior.

## Supabase e migrations

Projeto `project-teamtalk`, ref `pqpjnxymcngrackqrmnn`, organização `uehnszgkwjxscrsgashp`, região `us-west-2`.

As quatro migrations anteriores e as oito aplicadas nesta operação cobrem os 12 arquivos da main. O SQL armazenado no histórico foi comparado byte a byte com os arquivos do repositório. As oito novas foram executadas em ordem; contas precedem e-mail. Nenhum histórico ou arquivo de migration anterior foi editado.

| Arquivo de origem | Versão registrada no Supabase | Estado |
| --- | --- | --- |
| `20261110000000_initial_schema.sql` | `20261113132356` | Pré-existente; SQL idêntico |
| `20261110001000_authorized_chat_access.sql` | `20261113132403` | Pré-existente; SQL idêntico |
| `20261111000000_first_access_password.sql` | `20261113132406` | Pré-existente; SQL idêntico |
| `20261111001000_access_state_admin.sql` | `20261113132409` | Pré-existente; SQL idêntico |
| `20261119000000_list_authorized_conversations.sql` | `20261120151242` | Aplicada nesta implantação; SQL idêntico |
| `20261119001000_text_messages_realtime.sql` | `20261120151256` | Aplicada nesta implantação; SQL idêntico |
| `20261119002000_message_reads_realtime.sql` | `20261120151300` | Aplicada nesta implantação; SQL idêntico |
| `20261119003000_secure_pdf_attachments.sql` | `20261120151305` | Aplicada nesta implantação; SQL idêntico |
| `20261119004000_admin_accounts.sql` | `20261120151720` | Aplicada nesta implantação; SQL idêntico |
| `20261119005000_release_groups_audit.sql` | `20261120151726` | Aplicada nesta implantação; SQL idêntico |
| `20261119006000_initial_access_email.sql` | `20261120151732` | Aplicada nesta implantação; SQL idêntico |
| `20261120120000_inbox_preferences.sql` | `20261120151736` | Aplicada nesta implantação; SQL idêntico |

**Histórico CLI pendente de reconciliação:** as versões remotas diferem dos nomes locais porque o conector registra timestamps próprios. Isso não constitui um dry-run CLI sem pendências. Não executar `db push` às cegas, reaplicar o schema inicial, renumerar arquivos ou usar `migration repair` para ocultar essa diferença. O próximo procedimento de sincronização deve considerar este mapeamento e ser revisado pela equipe.

Conferências remotas:

- 11 tabelas de `public` com RLS habilitada, incluindo preferências, operações administrativas e entregas de primeiro acesso.
- `public.messages` e `public.message_reads` presentes em `supabase_realtime`.
- Triggers Auth `on_auth_user_created` e `on_auth_password_changed` presentes.
- Bucket `chat-pdfs` privado, MIME `application/pdf`, limite `4000000` bytes.
- RLS de `storage.objects` habilitada e policy restritiva `chat_pdfs_server_only` para `anon`/`authenticated`; upload direto de clientes permanece negado.
- Banco sem contas, mensagens ou conversas persistidas; ainda não há Admin TI nem duas contas de QA.

## Variáveis do Preview

Nenhum valor de chave ou segredo consta neste registro.

| Variável | Estado |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Configurada para o projeto identificado acima |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Chave pública correspondente configurada |
| SUPABASE_SERVICE_ROLE_KEY | **Pendente**; não disponível pela integração; necessária para administração e armazenamento |
| PDF_MAX_BYTES | 4000000 |
| SESSAO_MAX_HORAS | 12 |
| EMAIL_PROVIDER | disabled |
| EMAIL_FROM | Ausente; configurar remetente individual verificado ao habilitar e-mail |
| EMAIL_API_KEY | **Pendente** para habilitar e-mail; cadastrar somente como segredo do servidor |
| TEAMTALK_PUBLIC_URL | https://teamtalk-preview-1272619171-7204.vercel.app |
| CREDENCIAL_INICIAL_VALIDADE_HORAS | 24 |

Enquanto `EMAIL_PROVIDER=disabled`, cadastro/redefinição com entrega inicial falham com 503 antes das mutações, conforme contrato. Não é uma entrega de e-mail homologada. A chave de serviço deve ser cadastrada diretamente no ambiente protegido da Vercel, sem prefixo `NEXT_PUBLIC_` e sem envio por chat.

## Auth e testes HTTP

A integração Supabase disponível não oferece leitura/edição da configuração Auth nem recuperação da chave de serviço. O painel apresentou tela de login; não houve sessão autenticada para efetuar as mudanças.

Após obter acesso ao painel:

- Site URL: `https://teamtalk-preview-1272619171-7204.vercel.app`.
- Redirect URLs: origem acima e `https://teamtalk-preview-1272619171-7204.vercel.app/login`; adicionar a origem imutável e seu `/login` apenas se ela for usada nos testes.
- Conferir autorregistro desabilitado, senha mínima de 10 caracteres e políticas de sessão.
- Preparar Admin TI e funcionário controlados pela equipe, preservando a troca real da senha de primeiro acesso.

No deployment final, o endereço estável e o imutável responderam por HTTPS com validação de certificado habilitada; ambos retornaram 308 de HTTP para HTTPS. Requests desktop e mobile sem sessão Vercel retornaram 302 para `https://vercel.com/sso-api`, confirmando a proteção da plataforma. Isso **não valida** as respostas da aplicação.

Ainda faltam os smokes hospedados: desktop em `/dispositivo-bloqueado`, mobile sem sessão em `/api/admin/estado` com 401, desktop na API com 403 e os seis headers da aplicação em páginas/APIs/redirecionamentos/erros. Os headers observados na página de proteção pertencem à Vercel.

A revisão automática rejeitou a criação de um link temporário que permitiria a qualquer detentor do link abrir o Preview protegido. Nenhum link foi criado e não houve contorno dessa restrição. Para os smokes, usar sessão Vercel autorizada ou obter aprovação explícita para acesso temporário, com validade limitada e revogação ao terminar.

## QA que permanece aberto

| Issue | Validação pendente |
| --- | --- |
| [#85](https://github.com/Acebmoon/project-teamtalk/issues/85) | Chrome Android e Safari iOS físicos; bloqueio desktop/iPad, User-Agent e smokes HTTP hospedados |
| [#86](https://github.com/Acebmoon/project-teamtalk/issues/86) | Auth URLs, bootstrap das contas, primeiro acesso, sessão, RBAC, revogação, Admin TI, grupos/auditoria e envio real de e-mail |
| [#87](https://github.com/Acebmoon/project-teamtalk/issues/87) | Duas ou mais contas: envio/recebimento, WSS e reconexão, histórico, leitura efetiva e isolamento de conversas |
| [#88](https://github.com/Acebmoon/project-teamtalk/issues/88) | PDF real e inválido/renomeado, multipart perto de 4.000.000 bytes, download e revogação; README e rastreabilidade |

Nenhuma dessas quatro issues foi encerrada. Build aprovado e presença de policies/publicações não equivalem à aprovação desses cenários.

## Dependências e observação

O build informou cinco alertas no conjunto total de dependências. Uma auditoria adicional do lockfile, limitada às dependências de produção (`npm audit --omit=dev --json --package-lock-only`), encontrou dois alertas: Next 15.5.29, severidade moderada por PostCSS; PostCSS 8.4.31, severidade alta. O npm propôs atualização principal de Next; não foi executada atualização automática. Revisar aplicabilidade e correção antes de ampliar o piloto.

Advisories de referência:
- https://github.com/advisories/GHSA-qx2v-qp2m-jg93
- https://github.com/advisories/GHSA-6g55-p6wh-862q
- https://github.com/advisories/GHSA-fxqj-rqcc-2cmp
- https://github.com/advisories/GHSA-r28c-9q8g-f849

Health Advisor Supabase não apontou alertas. O Security Advisor sinalizou tabelas de serviço sem policies (negação intencional para clientes) e funções SECURITY DEFINER. Os helpers de autorização fazem parte dos contratos; revisar os grants das funções de trigger `handle_new_auth_user` e `rls_auto_enable` sem ampliar acesso:
https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

Antes de uso real, concluir conexão GitHub → Vercel, revisão do PR #111, chave de serviço, Auth, e-mail, QA, responsáveis/alertas e plano de recuperação. O banco estava vazio; disponibilidade/capacidade para a estimativa de 900 usuários não foi ensaiada.
