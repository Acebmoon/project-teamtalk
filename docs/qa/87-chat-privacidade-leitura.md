# QA #87 — Chat, privacidade e status de leitura

Responsáveis: **Ícaro (PO) e Mariana (SQA)**. [Issue #87](https://github.com/Acebmoon/project-teamtalk/issues/87). Requisitos: **RF08, RF09, RF10, RN08, RNF08, RNF09, RNF10, RNF12, SEG04**. Entregas: #76/#78–#80/#98, PRs #94/#97/#99/#101/#105/#109 e integração #110.

## Evidências já disponíveis na base integrada

Referência: `main` pós-PR #110, merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em **20/11/2026**. Estes números são globais; não representam execução dos casos de campo abaixo.

| Evidência | Resultado registrado | Fonte / limite |
|---|---|---|
| CI: typecheck, lint, build e Vitest | APROVADO — **936 testes em 47 arquivos** | [Execução de integração](https://github.com/Acebmoon/project-teamtalk/actions/runs/44663257450). SQL/RLS em PGlite; serviços externos simulados. |
| CI mobile | APROVADO — **12 testes** | Mesma execução; galeria de componentes em Chromium/Android e WebKit/iPhone. Não é E2E autenticado nem aparelho físico. |
| Smoke HTTP do build integrado | APROVADO — **49 checks HTTP** | [PR #110](https://github.com/Acebmoon/project-teamtalk/pull/110) e [relatório](../integracao-mvp.md). Execução local de sessão/dispositivo/headers, não etapa HTTP própria do workflow. |

Cobertura relacionada: `controle-base-main/chat/mensagens-rls.test.ts`, `leituras-rls.test.ts`, `listar-conversas.test.ts`, `observar-mensagem-exibida.test.ts`, `workspace.test.ts` e `inbox/rls.test.ts`. O CI exercita composição/SQL com infraestrutura de plataforma preparada e transporte simulado; não comprova entrega Realtime remota nem latência em rede móvel.

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

## Preparo com duas contas

- [ ] A/B passaram pelo [primeiro acesso](86-auth-sessao-admin.md). Confirmar conta ativa, grupo de B habilitado e senhas definitivas.
- [ ] Provisionar por operação administrativa controlada **apenas na base de homologação** uma conversa compartilhada A↔B, um grupo de teste somente de A e um grupo somente de B. A UI atual não oferece criação operacional de conversas/diretório público. Não assumir que um ícone cria esses recursos.
- [ ] Os grupos exclusivos podem ter um único participante para testar isolamento com duas contas. Registrar UUIDs no quadro abaixo; nenhum terceiro usuário é necessário para esses testes.
- [ ] Confirmar as migrations e `public.messages`/`public.message_reads` na publicação Realtime; testar assinaturas com o JWT de cada usuário, nunca service role.
- [ ] Preparar histórico suficiente para paginação e uma mensagem recebida fora do viewport. Usar apenas texto sintético.
- [ ] Preparar acesso de inspeção autorizado para chamadas com cookies da própria conta e consultas RLS, sem incluir segredos nas evidências.

| Dado de teste | Identificador / preparo |
|---|---|
| Conversa A↔B / título sintético | Pendente |
| Grupo exclusivo A (B não participa) | Pendente |
| Grupo exclusivo B (A não participa, mesmo sendo TI) | Pendente |
| Mensagem alheia e mensagem fora do viewport | Pendente |
| Quantidade no histórico / paginação | Pendente |
| PDF sintético para recibo de leitura | Pendente; ver [#88](88-pdf-rastreabilidade.md) |

## Casos e evidências

| Caso | Passos | Resultado esperado | Obtido / status | Aparelho, executor, UTC e evidência |
|---|---|---|---|---|
| 87-01 — Listagem autorizada | A/B abrem Inbox, paginam e recarregam; conferir conversas compartilhada e exclusivas. | Só conversas participantes, ordem por atividade e paginação sem vazamento de metadados. TI não vê a exclusiva de B. | PENDENTE | Pendente |
| 87-02 — Texto A→B e B→A | Enviar texto identificável nos dois sentidos; manter destinatário na conversa e registrar horários/IDs. | Mensagem persistida, remetente da sessão, recebimento sem recarregar, ordem coerente; estado de enviada após confirmação do servidor. | PENDENTE | Pendente |
| 87-03 — Persistência e histórico | Reabrir navegador, paginar mensagens antigas e voltar à conversa; alternar rapidamente entre conversas. | Histórico preservado sem duplicação por ID; resposta atrasada de outra conversa não aparece no destino atual. | PENDENTE | Pendente |
| 87-04 — Realtime e reconexão | Com A/B conectados, observar WSS; B vai para segundo plano/modo avião enquanto A envia; B retorna e reconecta. | Eventos apenas de conversas autorizadas; atualização ao recuperar foco/rede; reconciliação sem duplicar o mesmo ID. Registrar tempos e falhas. | PENDENTE | Pendente |
| 87-05 — Falha no envio | Cortar rede durante envio, observar erro e tentar novamente de forma consciente. | Feedback de pendência/falha e tentativa disponível; sucesso só após confirmação; registrar duplicidades se a resposta anterior se perdeu (não presumir idempotência de texto). | PENDENTE | Pendente |
| 87-06 — Leitura efetiva | A envia a B; manter B na Inbox, depois mensagem fora do viewport/aba oculta; então mostrar a mensagem com foco por >=300 ms. | Receber evento/histórico não marca leitura; exibição ativa registra recibo de B; A vê estado atualizado e destinatário correto. | PENDENTE | Pendente |
| 87-07 — Idempotência de recibo | B exibe novamente e repete POST de leitura da mesma mensagem com {"exibida":true}; consultar status. | Um recibo por mensagem/destinatário; primeiro horário preservado; GET de status não grava leitura. | PENDENTE | Pendente |
| 87-08 — Identidade da leitura | Tentar registrar como outro usuário, fornecer horário, ler a própria mensagem enviada ou usar ID de outra conversa. | Payload inválido/ação não autorizada recusados; sem recibo falso ou horário escolhido pelo cliente. | PENDENTE | Pendente |
| 87-09 — Contadores e preferências | A altera favorito/prioridade/situação de A↔B; B compara; A recarrega e consulta em nova sessão; verificar não lidas após exibição. | Preferências de A persistem sem mudar B; contagem vem do servidor e reflete recibos; colunas não mudam a conversa para os colegas. | PENDENTE | Pendente |
| 87-10 — Isolamento por API | B usa UUID do grupo exclusivo A em listagem de mensagens, POST de texto, GET/POST de leituras; A tenta o exclusivo B. | 403 e nenhum corpo de mensagem/metadado protegido; nenhum privilégio de leitura por ser TI. | PENDENTE | Pendente |
| 87-11 — RLS e eventos diretos | Com JWT próprio de A/B, tentar SELECT/INSERT nas tabelas e assinatura Postgres Changes da conversa exclusiva do outro. | RLS/grants negam escrita/leitura/evento alheio; não basta ocultar a conversa na UI. Registrar resposta sem tokens. | PENDENTE | Pendente |
| 87-12 — Sessão e revogação | B aberto na conversa: remover sua participação, bloquear conta ou remover último grupo (uma variante por vez); depois restaurar os dados de teste. | Próximas consultas/leituras/envios negados; UI limpa dados ao revalidar e não continua exibindo conteúdo novo; evento não autorizado não vaza. | PENDENTE | Pendente |
| 87-13 — Payloads | Testar texto vazio, UUID inválido, remetente/campos extras forjados e origem não autorizada na API controlada. | Validação segura, sem mensagem indevida nem alteração de identidade. Erros não expõem SQL/chaves/conteúdo de terceiros. | PENDENTE | Pendente |
| 87-14 — PDF e leitura | Repetir 87-06/07 com balão PDF sintético; abrir link autenticado. | Recibo por exibição segue o mesmo contrato; download é operação autorizada separada; não se inventa prova de leitura do conteúdo interno do arquivo. | PENDENTE | Pendente |
| 87-15 — Troca de conta | Sair de A e entrar com B no mesmo navegador de teste; voltar pelo histórico e alternar área/conversa. | Workspace, preferências e snapshots não reaproveitam dados privados de A. | PENDENTE | Pendente |

## Desempenho, disponibilidade e limites de aceite

Duas contas verificam o fluxo funcional, não capacidade para ~900 usuários. Antes de expandir o piloto, acordar metas de RNF08–RNF10 e plano de carga; ausência de meta fica PENDENTE, sem inventar SLA. Grupo com vários destinatários exige uma conta adicional em rodada específica; com A/B só se confirma um destinatário por mensagem.

| Medição / ensaio | Meta aprovada / condições | Obtido (amostras, unidade e falhas) | Status / evidência |
|---|---|---|---|
| 87-16 — Login/Inbox/histórico em rede móvel | A definir; registrar rede e volume do histórico | Pendente | PENDENTE |
| 87-17 — Envio → recebimento / recibo → remetente | A definir; relógios alinhados e direção A→B/B→A | Pendente | PENDENTE |
| 87-18 — Download PDF / troca de conversa | A definir; tamanho, rede e aparelho registrados | Pendente | PENDENTE |
| 87-19 — Queda/retorno de rede e serviço | Registrar falhas, tempo de recuperação, logs sanitizados, responsável/alerta e ensaio de reversão do guia | Pendente | PENDENTE |
| 87-20 — Capacidade ~900 e disponibilidade | Plano de carga, simultaneidade, duração, SLO e monitoramento a aprovar; execução separada do smoke A/B | Pendente | PENDENTE |
| 87-21 — Leitura com múltiplos destinatários | Conta adicional autorizada em rodada própria; estado agregado só lido após todos | Pendente | PENDENTE — requer terceira conta |

## Critério de aceite e encaminhamento

- [ ] Todos os casos aplicáveis executados, com resultado obtido, aparelho, executor, horário UTC e evidência; nenhum PENDENTE/BLOQUEADO tratado como aprovação.
- [ ] Falhas triadas por Mariana (SQA) e aceite registrado por Ícaro (PO), com acompanhamento de Elliot.
- [ ] Configurações temporárias restauradas e dados de teste tratados conforme a política acordada.
- [ ] Evidências vinculadas à [Issue #87](https://github.com/Acebmoon/project-teamtalk/issues/87); decidir seu fechamento apenas após QA em campo.

A entrega documental mantém **#85–#88 abertas**. [Matriz de requisitos](../08-testes-e-rastreabilidade.md) · [Homologação Vercel/Supabase](../homologacao-vercel-supabase.md).
