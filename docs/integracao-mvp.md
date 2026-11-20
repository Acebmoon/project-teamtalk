# Integração do MVP — 20/11/2026

O aplicativo autenticado abre a Inbox em `/`. A composição em `controle-base-main/chat/workspace.tsx` liga as telas de apresentação às APIs privadas, mantendo páginas/rotas finas em `base(tempval)/` e React puro em `design-em-react/`.

## Entregas preservadas

Branch criada da `main` em `31be7e74187256f26ff71c6c28830889b28e07c4`. Os merges locais preservam os commits dos PRs abaixo nesta ordem. Não foi mesclada `preview/teamtalk` nem a branch completa de Gilson.

| PR | Head incorporado | Branch |
|---|---|---|
| #95 | `efa0a14e44422110e71d43f89c3efc837ca388b3` | `docs-especificacao` |
| #107 | `dd783b9c762da9ddcb3ac0e8cec97ddc93bb7203` | `feat/issue-74-design-system-mobile` |
| #93 | `4b960ca5cf5eee40dc8039e73122e095b64cc81f` | `feat/telas-auth-mobile` |
| #94 | `15c9b3b91966278af7dda0db0ea348c09b68bf75` | `feat/interface-conversas-mobile` |
| #97 | `4a5409200cd868ede81863cdc2e9b5e03d6a9f46` | `feat/workspace-inbox-linear` |
| #99 | `412627186612f5e31332701277f8053ba7925a63` | `feat/issue-78-listagem-conversas` |
| #101 | `99ea1c21b563126cc71a55e54c58402efa2a5dc7` | `feat/issue-79-mensagens-realtime` |
| #105 | `319b475ba76ceafeedd979b86b8c5a38ad1c2afa` | `feat/issue-80-status-leitura` |
| #109 | `256b0469c40e376e2cdb63c4e97a4dd8c24a1c1c` | `feat/issue-98-persistir-inbox-rls` |
| #102 | `fd1b8f793952497e7ceb87f259dd4713a62fdcc8` | `feat/issue-84-upload-pdf-seguro` |
| #104 | `31a77252c720ddfcdf0f40ebc3abb56dbb1b5488` | `feat/issue-77-seletor-anexo-pdf` |
| #100 | `88408dbe99790a4234995f77a09244ac6aa689ae` | `feat/issue-81-painel-ti-contas` |
| #106 | `44553e1afd76bb20a161f5487eb87ae4cc79d7f4` | `feat/issue-82-grupos-liberacao-auditoria` |
| #103 | `689255b536c0379c15f4f98fc9debff99db2a4fd` | `feat/issue-83-envio-credenciais-email` |
| #108 | `a9acdfc2731e837ff73f9fb3c876e7ad232ace1b` | `feat/issue-92-homologacao-vercel-supabase` |

## Fluxos conectados

| Fluxo | Entrada real |
|---|---|
| Login e primeiro acesso | Server Actions `entrar` e `trocarSenha`; validação `avaliarSessao()` e trigger de senha |
| Inbox e paginação | `GET /api/conversas`; preferências privadas por `GET/PUT/DELETE /api/inbox/preferencias` |
| Histórico e texto | `GET/POST /api/conversas/[conversaId]/mensagens` |
| Realtime | `assinarMensagens()` e `assinarLeituras()`; eventos invalidam snapshots obtidos pelas APIs |
| Leitura efetiva | Ref em cada balão recebido; observador exige visibilidade, foco e 300 ms antes de `POST .../mensagens/[mensagemId]/leituras` |
| Estado por destinatário | `GET .../leituras`; estado agregado só fica lido quando todos os destinatários possuem recibo |
| PDF | `POST .../anexos/pdf` com campo `arquivo`; link de download autenticado `GET .../anexos/[mensagemId]` |
| Admin TI | `/admin`, contas, grupos e auditoria; Server Actions e APIs protegidas por `exigirAdminTI()` |

As conversas são carregadas exclusivamente da participação autorizada. A criação/provisão de conversas continua obedecendo ao modelo de dados existente; esta integração não inventa um diretório público de funcionários ou um endpoint de criação ausente nas entregas.

A UI mantém estados de carregamento, erro, envio pendente/falha, repetição, paginação e confirmação pelo servidor. Respostas atrasadas de outra conversa são descartadas; troca de conta remonta o workspace. 401/403 eliminam o conteúdo carregado e encaminham ao login. Há atualização ao recuperar foco/conexão e consulta periódica para revalidar sessão e revogação.

## Migrations consolidadas

As quatro migrations originais da `main` foram preservadas byte a byte. Apenas migrations novas dos PRs receberam versões únicas para eliminar colisões; as referências documentais acompanham os nomes finais.

| Ordem | Migration |
|---|---|
| 1–4 | `20261110000000_initial_schema.sql`, `20261110001000_authorized_chat_access.sql`, `20261111000000_first_access_password.sql`, `20261111001000_access_state_admin.sql` |
| 5 | `20261119000000_list_authorized_conversations.sql` |
| 6 | `20261119001000_text_messages_realtime.sql` |
| 7 | `20261119002000_message_reads_realtime.sql` |
| 8 | `20261119003000_secure_pdf_attachments.sql` |
| 9 | `20261119004000_admin_accounts.sql` |
| 10 | `20261119005000_release_groups_audit.sql` |
| 11 | `20261119006000_initial_access_email.sql` |
| 12 | `20261120120000_inbox_preferences.sql` |

Contas antecedem grupos/e-mail. O guard SQL de grupos chama `admin_assert_actor()`, cuja versão final também verifica a validade da entrega da credencial inicial. Texto e PDF conservam policies distintas; os grants de inserção comportam ambos os tipos. A publicação Realtime conserva `messages`, `message_reads` e tabelas preexistentes.

Aplicar a sequência em um Supabase de homologação pelo procedimento em [homologação Vercel/Supabase](homologacao-vercel-supabase.md). Se alguma versão antiga dos PRs já tiver sido aplicada em um banco remoto, reconciliar seu histórico antes do deploy conjunto; não renumerar arquivos aplicados nem mascarar divergências com repair.

## Identidade visual e SVGs

Os tokens do PR #107 continuam como fonte visual central, com fonte do sistema e cores TeamTalk. O tema inicial é claro; o tema escuro e a organização Lista/Quadro do #97 foram preservados.

Apenas 16 SVGs do commit `80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e` da branch `feature/teamtalk-design-system` foram copiados para `design-em-react/icones/`: Inbox, equipes, arquivos, menu, nova conversa, busca, erro, lista vazia, voltar, anexar PDF, enviar, arquivo PDF, enviada, lida, aguardando e falha. O componente `Icone` usa essas geometrias com `currentColor` e atributos React. Enviada e lida são estados separados, alimentados por confirmação HTTP e recibos reais. Nenhum badge com contador fixo foi importado. PNGs, paleta/fontes externas e ações de editar/excluir/encaminhar/responder ficaram fora da árvore do app.

## Ambiente e execução

```bash
npm install
cd 'base(tempval)'
npm run typecheck
npm run lint
npm test
npm run build
```

Copiar o template de ambiente e substituir a chave pública por uma anon/publishable válida. Para build de CI, podem ser usados valores públicos fictícios com formato válido; eles não dão acesso a um projeto Supabase. Administração, e-mail e PDF exigem configuração real apenas no ambiente de execução.

Na Vercel, `PDF_MAX_BYTES=4000000`. O valor padrão nesse hosting também é 4.000.000; valores maiores são recusados. O seletor recebe do servidor exatamente o limite usado pelo parser. O Storage permanece privado e o download passa novamente pela sessão/participação. `service_role` e segredos de e-mail nunca recebem prefixo `NEXT_PUBLIC_`.

## Verificação e aceite

O workflow executa instalação reproduzível, typecheck, lint, Vitest, build e testes mobile em Chromium/WebKit. As suítes de SQL agora instalam a infraestrutura Auth/Storage/roles do Supabase antes de aplicar **todas** as migrations, sem substituir as policies reais. Testes da composição renderizam a tela completa e verificam as URLs e payloads de listagem, preferências, texto, leitura e PDF, limite, revogação e descarte de respostas atrasadas.

A integração conclui o código e a preparação reproduzível do MVP. Permanecem abertas #85, #86, #87 e #88 para QA e homologação real, incluindo URL HTTPS aprovada, aplicação remota de migrations, duas contas reais, provedor de e-mail e Chrome Android/Safari iOS em aparelhos. #96 continua aberta para melhorias futuras. Nenhum resultado de teste local comprova entrega de e-mail em caixa postal ou configuração de um projeto remoto.
