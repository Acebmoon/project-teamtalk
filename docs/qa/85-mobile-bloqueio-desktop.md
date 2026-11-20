# QA #85 — Compatibilidade mobile e bloqueio desktop

Responsáveis: **Ícaro (PO) e Mariana (SQA)**. [Issue #85](https://github.com/Acebmoon/project-teamtalk/issues/85). Requisitos: **RF01, RF02, RNF01, RNF02, RNF03, RNF04, RNF14**. Entregas: #73/#74/#75/#76, PRs #91/#107/#93/#94 e integração #110.

## Evidências já disponíveis na base integrada

Referência: `main` pós-PR #110, merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em **20/11/2026**. Estes números são globais; não representam execução dos casos de campo abaixo.

| Evidência | Resultado registrado | Fonte / limite |
|---|---|---|
| CI: typecheck, lint, build e Vitest | APROVADO — **936 testes em 47 arquivos** | [Execução de integração](https://github.com/Acebmoon/project-teamtalk/actions/runs/44663257450). SQL/RLS em PGlite; serviços externos simulados. |
| CI mobile | APROVADO — **12 testes** | Mesma execução; galeria de componentes em Chromium/Android e WebKit/iPhone. Não é E2E autenticado nem aparelho físico. |
| Smoke HTTP do build integrado | APROVADO — **49 checks HTTP** | [PR #110](https://github.com/Acebmoon/project-teamtalk/pull/110) e [relatório](../integracao-mvp.md). Execução local de sessão/dispositivo/headers, não etapa HTTP própria do workflow. |

Cobertura relacionada: `controle-base-main/dispositivo/verificar-dispositivo.test.ts`, `auth/decidir-rota.test.ts` e `design-em-react/testes/mobile.test.ts`. Os testes mobile automatizados verificam toque, foco, rolagem, zoom e movimento reduzido na galeria.

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

## Preparo

- [ ] Aplicação e serviços reais preparados pelo [guia de homologação](../homologacao-vercel-supabase.md), com URL HTTPS aprovada e acesso ao deployment resolvido.
- [ ] Contas A/B liberadas, senhas trocadas e dados de conversa preparados conforme [#86](86-auth-sessao-admin.md) e [#87](87-chat-privacidade-leitura.md).
- [ ] Matriz de versões alvo acordada com PO/TI e preenchida acima; testar navegador normal do smartphone.
- [ ] Desktop disponível para chamadas negativas, inclusive sem sessão. Preservar o User-Agent observado nas evidências, sem cookies.

## Casos e evidências

| Caso | Passos | Resultado esperado | Obtido / status | Aparelho, executor, UTC e evidência |
|---|---|---|---|---|
| 85-01 — Link e HTTPS | Abrir o link aprovado no Chrome Android e Safari iPhone; verificar certificado e entrada por HTTP. | HTTPS válido; HTTP redireciona para HTTPS; login acessível no celular. | PENDENTE | Pendente |
| 85-02 — Navegação real | A/B: login → Inbox → conversa → voltar; navegar Inbox/Equipes/Em foco, Lista/Quadro, filtros e tema; A abre/retorna do painel TI. | Destino e estado ativos coerentes; retorno funciona; conversas autorizadas e navegação utilizáveis em ambos os aparelhos. | PENDENTE | Pendente |
| 85-03 — Tamanho e rotação | Retrato/paisagem, rolagem, safe areas e teclado aberto em login/compositor; testar tela estreita disponível e zoom. | Sem corte de ações, sobreposição impeditiva ou rolagem horizontal da página; quadro pode rolar no seu contêiner; enviar/voltar continuam acessíveis. | PENDENTE | Pendente |
| 85-04 — Toque e acessibilidade | Operar com toque, texto ampliado, leitor de tela e movimento reduzido; usar teclado externo se disponível. | Alvos >= 44 px; labels, erro textual, foco visível e ordem utilizável; estados não dependem só de cor. Registrar medições/limitações. | PENDENTE | Pendente |
| 85-05 — Identidade e estados | Conferir tokens TeamTalk e comparar login, Inbox, conversa, vazio, carregamento e erro; provocar falta de rede. | Identidade consistente, contraste legível, feedback claro e recuperação sem botões inoperantes. | PENDENTE | Pendente |
| 85-06 — Desktop normal | Sem emulação, abrir /, /login, /primeiro-acesso e /admin; reduzir a janela e repetir. | GET/HEAD redirecionam ao bloqueio; viewport pequeno não libera acesso. A TI também é bloqueada. | PENDENTE | Pendente |
| 85-07 — API e métodos desktop | Do desktop, chamar /api/admin/estado e /api/conversas com GET/POST/PUT/PATCH/DELETE/OPTIONS/HEAD; testar POST fora de /api. | APIs: 403 JSON sem redirect (HEAD sem corpo); fora da API, escrita 403. Nenhuma mutação, dado protegido ou segredo retornado. | PENDENTE | Pendente |
| 85-08 — iPad e modo desktop | Se disponível, registrar iPad; no smartphone, solicitar “versão para computador”. Registrar cabeçalhos efetivos. | iPad/Mac/Windows/Linux bloqueados; modo desktop pode bloquear o próprio celular quando este se identifica como desktop. Sem iPad físico, marcar essa variante BLOQUEADA. | PENDENTE | Pendente |
| 85-09 — Cabeçalhos contraditórios | Em cliente controlado, enviar User-Agent iPhone com Sec-CH-UA-Platform Windows; repetir sem User-Agent. | Client Hint prevalece e bloqueia Windows; sem identificação, bloqueia. Não basta mudar o tamanho da tela. | PENDENTE | Pendente |
| 85-10 — Falsificação completa | Em cliente de teste, enviar User-Agent móvel sem Client Hints ou com plataforma Android; consultar API sem sessão, depois repetir cenários de autorização com B. | Falsificação pode passar a restrição de aparelho; sem sessão continua 401 e B não ganha administração/dados alheios. Registrar limitação do contrato, sem declarar detecção infalível. | PENDENTE | Pendente |
| 85-11 — Reabertura | Fechar/reabrir navegador, voltar do segundo plano e alternar rede; navegar novamente. | UI recupera o estado autorizado e sessão válida; expiração/revogação não deixa dados antigos utilizáveis. | PENDENTE | Pendente |

## Critério de aceite e encaminhamento

- [ ] Todos os casos aplicáveis executados nos aparelhos indicados, com resultado obtido e evidência; nenhum PENDENTE/BLOQUEADO tratado como aprovação.
- [ ] Falhas triadas por Mariana (SQA) e aceite registrado por Ícaro (PO), com acompanhamento de Elliot.
- [ ] Configurações temporárias restauradas e somente os dados de teste identificados tratados conforme a política acordada.
- [ ] Evidências vinculadas à [Issue #85](https://github.com/Acebmoon/project-teamtalk/issues/85); decidir seu fechamento apenas após QA em campo.

A entrega documental mantém **#85–#88 abertas**. [Matriz de requisitos](../08-testes-e-rastreabilidade.md) · [Homologação Vercel/Supabase](../homologacao-vercel-supabase.md).
