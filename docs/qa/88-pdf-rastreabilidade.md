# QA #88 — Upload PDF, README e rastreabilidade

Responsáveis: **Ícaro (PO) e Mariana (SQA)**. [Issue #88](https://github.com/Acebmoon/project-teamtalk/issues/88). Requisitos: **RF11, RF12, RN06, RN07, RNF11, RNF12, RNF13, SEG05**. Entregas: #77/#84/#92, PRs #104/#102/#108 e integração #110; esta documentação complementa #88 e entrega o backlog #96.

## Evidências já disponíveis na base integrada

Referência: `main` pós-PR #110, merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em **20/11/2026**. Estes números são globais; não representam execução dos casos de campo abaixo.

| Evidência | Resultado registrado | Fonte / limite |
|---|---|---|
| CI: typecheck, lint, build e Vitest | APROVADO — **936 testes em 47 arquivos** | [Execução da main](https://github.com/Acebmoon/project-teamtalk/actions/runs/44664059549). SQL/RLS em PGlite; serviços externos simulados. |
| CI mobile | APROVADO — **12 testes** | Mesma execução; galeria de componentes em Chromium/Android e WebKit/iPhone. Não é E2E autenticado nem aparelho físico. |
| Smoke HTTP do build integrado | APROVADO — **49 checks HTTP** | [PR #110](https://github.com/Acebmoon/project-teamtalk/pull/110) e [relatório](../integracao-mvp.md). Execução local de sessão/dispositivo/headers, não etapa HTTP própria do workflow. |

Cobertura relacionada: `controle-base-main/anexos/validar-pdf.test.ts`, `validar-anexo-pdf.test.ts`, `formulario.test.ts`, `api.test.ts`, `rls.test.ts`, `seletor-anexo-pdf.test.ts` e `chat/workspace.test.ts`. O Storage HTTP é simulado no CI; o bucket e o download real precisam ser confirmados em campo.

## Registro da rodada em campo

**Situação inicial: NÃO EXECUTADO.** Usar somente dados sintéticos e as contas individuais **A = Admin TI** e **B = funcionário**, em ambiente de homologação identificado. Trocar os papéis entre aparelhos numa segunda passada para cobrir ambos os sistemas; não compartilhar senha entre pessoas.

| Campo | Preencher antes da execução |
|---|---|
| Commit realmente implantado / deployment ID | Pendente |
| URL HTTPS e projeto Supabase | Pendente |
| Operador / data e intervalo UTC | Pendente |
| Android físico: modelo / SO / versão Chrome / conta | Pendente |
| iPhone físico: modelo / iOS / versão Safari / conta | Pendente |
| Desktop: SO / navegador / versão | Pendente |
| Conta A / conta B (apelido ou UUID de teste; sem senha) | Pendente |
| Rede / condições / configurações alteradas na rodada | Pendente |

Registrar por caso **resultado obtido, aparelho, executor, horário UTC e link da evidência sanitizada**. Estados: PENDENTE, APROVADO, REPROVADO ou BLOQUEADO (com motivo/dependência). Copiar a linha para cada aparelho/rodada. Não anexar senha provisória, cookie, token, chave, HAR bruto ou e-mail completo. Em defeitos, incluir requisito, SHA, passos, esperado/obtido, severidade e ocorrência na issue correspondente.

## Preparo de arquivos e ambiente

- [ ] A/B e conversas compartilhada/exclusivas preparados conforme [#86](86-auth-sessao-admin.md) e [#87](87-chat-privacidade-leitura.md).
- [ ] Confirmar bucket `chat-pdfs` privado, MIME permitido e restrição de acesso direto; `SUPABASE_SERVICE_ROLE_KEY` somente no servidor.
- [ ] Registrar limite real retornado à UI/servidor: **PDF_MAX_BYTES = ______ bytes**. Na Vercel, usar **4.000.000 bytes**, com margem multipart; padrão local sem configuração é 10 MiB. Não substituir pelo “10 MB” do handoff.
- [ ] Preparar PDFs sintéticos válidos (ao menos uma página, xref clássico e comprimido), inclusive tamanhos no limite e limite+1; usar arquivos realmente válidos, sem acrescentar lixo após EOF para simular o tamanho.
- [ ] Preparar imagem/foto, áudio, vídeo, Word e Excel; duplicar os arquivos com extensão .pdf, preservando o conteúdo real. Preparar também PDF truncado, criptografado e assinatura %PDF- falsa.
- [ ] Medir bytes reais e hash dos fixtures sem conteúdo pessoal; para erro de servidor, contornar o seletor por requisição autenticada de teste com os próprios cookies.
- [ ] Upload: POST /api/conversas/{conversaId}/anexos/pdf, multipart com **um único campo arquivo**; download: GET /api/conversas/{conversaId}/anexos/{mensagemId}. Não fornecer caminho de Storage.

## Casos e evidências

| Caso | Passos | Resultado esperado | Obtido / status | Aparelho, executor, UTC e evidência |
|---|---|---|---|---|
| 88-01 — Seletor mobile | Android/iPhone: escolher PDF, conferir nome/tamanho, remover/substituir, selecionar tipo inválido e arquivo grande. | accept application/pdf,.pdf; feedback acessível antes do envio; um arquivo por vez; ações utilizáveis em ambos os aparelhos. | PENDENTE | Pendente |
| 88-02 — PDF válido A↔B | Enviar PDF real nos dois sentidos e baixar pelo outro aparelho; repetir xref clássico/comprimido. | 201 no upload, mensagem PDF persistida e download 200; nome, MIME application/pdf, bytes e hash preservados. | PENDENTE | Pendente |
| 88-03 — Limite exato | Pela UI e API, enviar PDF válido com tamanho igual ao limite e outro com limite+1; conferir tamanho real e margem multipart. | Dentro do limite aceito; acima recebe 413 no servidor; mensagem/objeto inválido não é criado. Hosting pode recusar antes: registrar camada e testar o parser com excesso mínimo abaixo do teto do proxy. | PENDENTE | Pendente |
| 88-04 — Conteúdo renomeado | Executar cada fixture da tabela abaixo, com nome .pdf e MIME application/pdf forjado, pela API autenticada. | Servidor recusa conteúdo real inválido (415); seletor não é a única defesa; sem mensagem ou objeto público. | PENDENTE | Pendente |
| 88-05 — Estrutura/MIME/nome | PDF truncado, criptografado, sem página, %PDF- falso, EOF/xref inválido; PDF real com MIME incorreto e nome/extensão inválidos. | Estrutura/formato/MIME recusados com erro seguro conforme contrato; sem aceitar só extensão ou magic bytes. | PENDENTE | Pendente |
| 88-06 — Multipart | Enviar zero/dois arquivos, campo extra, nome de campo diferente e corpo acima do limite; testar comprimento declarado incorreto/ausente por cliente controlado. | 400/413 conforme contrato; leitura limitada pelo tamanho real; nenhuma validação é contornada por Content-Length. | PENDENTE | Pendente |
| 88-07 — Falha e repetição | Interromper rede/Storage durante envio em ambiente isolado; observar UI, recuperar e repetir conscientemente. | Sem confirmação falsa; feedback, seleção e tentativa coerentes; órfão eventual permanece privado, sem rota utilizável, conforme contrato. | PENDENTE | Pendente |
| 88-08 — Acesso à conversa | B tenta enviar/baixar no grupo exclusivo A; A tenta o exclusivo B. | 403 sem dados; TI também precisa participar; nenhum objeto/mensagem criado indevidamente. | PENDENTE | Pendente |
| 88-09 — Revogação | Copiar apenas a URL de aplicação de um PDF de teste; remover participação/grupo ou bloquear B e tentar novo download/upload. | Próxima requisição negada; conhecer a URL não autoriza; UI revalida sessão. Arquivo já salvo no dispositivo não pode ser revogado remotamente. | PENDENTE | Pendente |
| 88-10 — Bucket direto | Sem sessão e com JWT próprio de B, tentar URL pública, leitura/upload direto ao Storage e geração de signed upload URL. | Bucket privado e policies/grants negam os acessos diretos; payloads da aplicação não expõem caminho, URL privilegiada ou chave. | PENDENTE | Pendente |
| 88-11 — Sessão e IDs | Repetir com sessão ausente/vencida, troca pendente e UUID inválido; usar mensagem de outra conversa ou de texto como se fosse PDF. | 401 sem sessão; 403 conta negada/troca pendente; ID inválido 400; anexo ausente/outra mensagem na conversa autorizada 404, sem vazamento. | PENDENTE | Pendente |
| 88-12 — Download/headers | Baixar PDF com A/B e conferir resposta/reabertura em Safari/Chrome. | Content-Type application/pdf, Content-Disposition attachment, nosniff e Cache-Control private,no-store; download autenticado funciona nos dois celulares. | PENDENTE | Pendente |
| 88-13 — Desktop | Desktop normal tenta os endpoints de PDF, inclusive com URL conhecida. | 403 pela restrição de dispositivo; API não redireciona nem retorna arquivo. | PENDENTE | Pendente |
| 88-14 — Execução pelo README | Em checkout limpo e ambiente local, outro integrante segue instalação na raiz, configuração e dev/typecheck/lint/test/build no workspace. | Passos reproduzíveis, sem segredo no repositório; aliases e três pastas resolvidos; registrar saídas/SHA e impedimentos reais. | PENDENTE | Pendente |
| 88-15 — Matriz completa | Conferir RF01–RF15, RNF01–RNF14, RN01–RN10 e SEG01–SEG07 na matriz, abrir links de issue/entrega/caso. | 46 requisitos, sem requisito sem issue; vínculos apontam para entregas integradas e pendências de aceite continuam explícitas. | PENDENTE | Pendente |
| 88-16 — Rastreabilidade do upload | Correlacionar hash/bytes do fixture, ID da conversa/mensagem e horário com resultado e tentativa; revisar evidência sanitizada. | É possível reproduzir a validação sem divulgar conteúdo privado; logs/evidências não contêm cookies, senha ou chave. | PENDENTE | Pendente |

### Evidência individual de formatos proibidos

Executar **cada linha** pela API com extensão e MIME forjados, em ambos os celulares nas rodadas A/B. Registrar resposta real, ausência de mensagem/objeto utilizável e evidência; não aceitar uma única captura como prova de todos os formatos.

| Fixture (conteúdo real) | Bytes / hash do arquivo de teste | HTTP / resultado obtido | Status | Aparelho, executor, UTC e evidência |
|---|---|---|---|---|
| Imagem PNG/JPEG renomeada | Pendente | Pendente | PENDENTE | Pendente |
| Foto de teste renomeada | Pendente | Pendente | PENDENTE | Pendente |
| Áudio renomeado | Pendente | Pendente | PENDENTE | Pendente |
| Vídeo renomeado | Pendente | Pendente | PENDENTE | Pendente |
| Word DOC/DOCX renomeado | Pendente | Pendente | PENDENTE | Pendente |
| Excel XLS/XLSX renomeado | Pendente | Pendente | PENDENTE | Pendente |

A validação estrutural de PDF não equivale a antivírus. Um PDF legítimo com imagem em suas páginas continua sendo um PDF permitido. [Contrato completo](../contratos-pdf.md).

## Critério de aceite e encaminhamento

- [ ] Todos os casos aplicáveis executados, com resultado obtido, aparelho, executor, horário UTC e evidência; nenhum PENDENTE/BLOQUEADO tratado como aprovação.
- [ ] Falhas triadas por Mariana (SQA) e aceite registrado por Ícaro (PO), com acompanhamento de Elliot.
- [ ] Configurações temporárias restauradas e dados de teste tratados conforme a política acordada.
- [ ] Evidências vinculadas à [Issue #88](https://github.com/Acebmoon/project-teamtalk/issues/88); decidir seu fechamento apenas após QA em campo.

A entrega documental mantém **#85–#88 abertas**. [Matriz de requisitos](../08-testes-e-rastreabilidade.md) · [Homologação Vercel/Supabase](../homologacao-vercel-supabase.md).
