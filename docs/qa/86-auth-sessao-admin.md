# QA #86 — Autenticação, sessão e administração

Responsáveis: **Ícaro (PO) e Mariana (SQA)**. [Issue #86](https://github.com/Acebmoon/project-teamtalk/issues/86). Requisitos: **RF03–RF07, RF13–RF15; RN01–RN05, RN09, RN10; RNF05–RNF07; SEG01–SEG04, SEG06, SEG07**. Entregas: #71–#73/#75/#81–#83, PRs #89–#91/#93/#100/#103/#106.

## Evidências já disponíveis na base integrada

Referência: `main` pós-PR #110, merge `9bcf20571a2b29605caab2b6e92f3f4d69f82990`, em **20/11/2026**. Estes números são globais; não representam execução dos casos de campo abaixo.

| Evidência | Resultado registrado | Fonte / limite |
|---|---|---|
| CI: typecheck, lint, build e Vitest | APROVADO — **936 testes em 47 arquivos** | [Execução de integração](https://github.com/Acebmoon/project-teamtalk/actions/runs/44663257450). SQL/RLS em PGlite; serviços externos simulados. |
| CI mobile | APROVADO — **12 testes** | Mesma execução; galeria de componentes em Chromium/Android e WebKit/iPhone. Não é E2E autenticado nem aparelho físico. |
| Smoke HTTP do build integrado | APROVADO — **49 checks HTTP** | [PR #110](https://github.com/Acebmoon/project-teamtalk/pull/110) e [relatório](../integracao-mvp.md). Execução local de sessão/dispositivo/headers, não etapa HTTP própria do workflow. |

Cobertura relacionada: `controle-base-main/auth/*.test.ts`, `admin/acesso.test.ts`, `admin/migrations.test.ts`, `admin/liberacao/*.test.ts` e `email/adaptador.test.ts`. Confirmar GoTrue, cookies HTTPS, caixa postal e RPCs no projeto real ainda é obrigatório.

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

## Preparo de A/B sem pular os controles

- [ ] Usar Supabase de homologação com as 12 migrations reconciliadas, autorregistro desabilitado e provedor/remetente real configurados (`EMAIL_PROVIDER=resend`). Credenciais ficam somente no ambiente protegido.
- [ ] Bootstrap de A: criar pelo Auth com e-mail confirmado; em operação administrativa controlada, definir perfil `active/it_admin`. Manter a marca de primeiro acesso, efetuar troca real e novo login. Não publicar credenciais.
- [ ] A cadastra B pelo painel em `/admin`, com e-mail controlado pela equipe. Testar B inicialmente `pending` e depois `active/employee`; repetir as condições negativas antes de cada liberação.
- [ ] Grupo de teste da Fase 1 identificado. Em **20/11/2026**, foi confirmado no projeto **project-teamtalk / pqpjnxymcngrackqrmnn** o grupo **Diretoria - Fase 1**, habilitado e sem membros. O grupo anterior **Diretoria / nível estratégico** permaneceu desabilitado. Isto é preparo do ambiente, não aceite de autenticação; conferir novamente na rodada.
- [ ] Incluir B pelo painel após testar a ausência de grupo. Ter grupo habilitado não ativa a conta nem libera conversa sem participação. A tem exceção de administração sem grupo, mas não de privacidade do chat.
- [ ] Preparar janelas controladas para expiração e falha de provedor em ambiente isolado; nunca alterar parâmetros globais de um piloto em uso. Registrar/restaurar `SESSAO_MAX_HORAS` e prazo inicial.
- [ ] Nas passadas seguintes, reutilizar B em vez de criar uma terceira conta. Alternar A/B entre Android e iPhone.

## Casos e evidências

| Caso | Passos | Resultado esperado | Obtido / status | Aparelho, executor, UTC e evidência |
|---|---|---|---|---|
| 86-01 — Login individual | A/B: credencial correta e incorreta; consultar tela e erros. | Login válido da conta autorizada; erro seguro no inválido; sem sessão compartilhada ou enumeração indevida. | PENDENTE | Pendente |
| 86-02 — Cadastro público | Inspecionar rotas da UI e configuração Auth; tentar autorregistro com endereço de teste em ambiente isolado. | Não há UI/endpoint público de cadastro; Auth recusa signup; somente TI cria conta. | PENDENTE | Pendente |
| 86-03 — Primeiro acesso | B entra com senha provisória válida e tenta /, histórico, leitura e PDF antes da troca. | Somente /primeiro-acesso liberado; APIs protegidas 403, sem conteúdo; nenhum atalho por URL/RLS. | PENDENTE | Pendente |
| 86-04 — Senha nova | Tentar senha igual à inicial, <10 caracteres, >72 bytes UTF-8 e confirmação divergente; depois uma válida. | Inválidas rejeitadas; troca efetiva consome credencial, zera marca pelo trigger, faz logout global e exige novo login. | PENDENTE | Pendente |
| 86-05 — Credencial antiga | Após troca, autenticar com provisória e com definitiva; repetir em segunda sessão da mesma conta. | Provisória falha; definitiva funciona; sessões anteriores à troca encerradas. | PENDENTE | Pendente |
| 86-06 — Persistência e gerenciador | Recarregar/reabrir ambos os navegadores; salvar/preencher login pelo gerenciador do dispositivo. | Sessão válida persiste; formulários compatíveis com autofill; senha não aparece em URL/log. | PENDENTE | Pendente |
| 86-07 — Cookies e HTTPS | Inspecionar armazenamento/rede da sessão no domínio HTTPS, sem copiar tokens. | Cookies Secure em produção e SameSite=Lax; sem tokens em localStorage/URL; seis headers de segurança; sem credenciais em bundle. | PENDENTE | Pendente |
| 86-08 — Expiração absoluta | Em ambiente isolado, usar SESSAO_MAX_HORAS=0.001, reiniciar/deployar e fazer novo login; esperar o prazo, chamar página/API; restaurar 12 e repetir login. | Página solicita login; API 401, inclusive no primeiro acesso; sessão de outro aparelho não reinicia esse prazo. | PENDENTE | Pendente |
| 86-09 — Logout local | Abrir duas sessões da mesma conta; sair em uma e repetir consulta protegida. | Sessão que saiu perde acesso; outra sessão independente permanece válida até sua própria expiração/revogação. | PENDENTE | Pendente |
| 86-10 — RBAC direto | B tenta /admin e APIs de estado/contas/grupos/auditoria; repetir uma mutação e server action capturada de teste; A executa controles positivos. | B recebe 403, inclusive chamada direta, sem mutação; A autorizado obtém respostas válidas. | PENDENTE | Pendente |
| 86-11 — Sem sessão / troca pendente | Repetir APIs administrativas sem cookie, com sessão expirada e com senha provisória de B; testar todos os verbos expostos. | Ausente/vencida: 401; conta negada ou troca pendente: 403. Guard anterior ao uso de service_role e a qualquer operação. | PENDENTE | Pendente |
| 86-12 — Estados de B | A altera pending → active → blocked → reativar → disabled; testar login e consulta com sessão já aberta em cada etapa. | Apenas active autorizado entra; bloqueio/desativação revogam consultas seguintes, sem depender só da validade do JWT. | PENDENTE | Pendente |
| 86-13 — Cadastro e reset TI | A cadastra B na primeira passada; depois redefine senha pelo painel; consultar/listar/filtrar conta e verificar duplicidade. | Dados válidos persistem; inválidos/duplicados não criam outra conta; reset reaplica marca depois do Auth; e-mail individual enviado. | PENDENTE | Pendente |
| 86-14 — Caixa postal | Em cadastro/reset, conferir recebimento por B, destinatário único, prazo UTC e link /login. Registrar apenas metadados sanitizados. | B recebe a mensagem; sem CC/BCC nem senha/token na URL; senha não persiste em logs/auditoria. Aceitação pelo provedor sozinha não comprova recebimento. | PENDENTE | Pendente |
| 86-15 — Prazo da credencial | Preparar reset de B com prazo mínimo de 1h no ambiente isolado e executar após vencimento; tentar login/sessão e troca direta no Auth. | Entrega vencida bloqueia acesso e troca; requer nova redefinição TI. Credencial já consumida não invalida senha definitiva. | PENDENTE | Pendente |
| 86-16 — Falha de envio | Em ambiente isolado, simular provedor indisponível; depois EMAIL_PROVIDER=disabled; observar perfis/entregas/reservas sem expor payloads. | Falha mantém acesso negado; disabled devolve 503 antes de mutação; não há envio/reativação automática; recuperação segue contrato. | PENDENTE | Pendente |
| 86-17 — Gate de grupo | B active sem grupo, em grupo desabilitado, em grupo habilitado; remover último vínculo/desabilitar último grupo com sessão aberta. | Só grupo habilitado libera; remoção/desabilitação revoga consulta seguinte. Nenhuma alteração implícita de papel/estado/participação em conversa. | PENDENTE | Pendente |
| 86-18 — Gestão de grupos | A cria grupo de teste, habilita/desabilita, inclui/remove B e repete estado/vínculo atual; conferir nome duplicado. | Alterações efetivas auditadas; repetição idempotente sem evento duplicado; criação duplicada 409; B não escreve grupos. | PENDENTE | Pendente |
| 86-19 — Auditoria | A consulta /admin/auditoria por ator/alvo/ação/período; correlacionar cadastro/reset/bloqueio/grupos; B tenta a mesma API e SELECT direto com sua sessão. | Ator, alvo, ação e datas corretos; nenhum segredo; B não lê auditoria; logs não editáveis pela UI/cliente. | PENDENTE | Pendente |
| 86-20 — Origem e campos forjados | Com B e depois A, testar mutação de origem externa e campos extras actor_id/papel/identidade em requisições de teste. | Origem não autorizada recusada; validação não permite se promover, forjar ator ou alterar arbitrariamente perfis. | PENDENTE | Pendente |
| 86-21 — Auth e armazenamento de senhas | TI revisa configuração do Auth e logs operacionais, sem consultar/divulgar hashes ou senhas; verificar auditoria/bundle. | Credenciais geridas por Auth com hash/salt; nenhuma senha em texto puro no banco público, console, URL ou auditoria; chave privada só no servidor. | PENDENTE | Pendente |

## Falhas parciais e recuperação

Se Auth/provedor/banco ficarem em estado incerto, marcar BLOQUEADO, manter o acesso negado e seguir [reconciliação administrativa](../contratos-admin.md) e [entrega inicial](../contratos-email-inicial.md). Não apagar reservas, logs ou entregas para “fazer passar”. Auditar metadados sem divulgar conteúdo sensível.

## Critério de aceite e encaminhamento

- [ ] Todos os casos aplicáveis executados nos aparelhos indicados, com resultado obtido e evidência; nenhum PENDENTE/BLOQUEADO tratado como aprovação.
- [ ] Falhas triadas por Mariana (SQA) e aceite registrado por Ícaro (PO), com acompanhamento de Elliot.
- [ ] Configurações temporárias restauradas e somente os dados de teste identificados tratados conforme a política acordada.
- [ ] Evidências vinculadas à [Issue #86](https://github.com/Acebmoon/project-teamtalk/issues/86); decidir seu fechamento apenas após QA em campo.

A entrega documental mantém **#85–#88 abertas**. [Matriz de requisitos](../08-testes-e-rastreabilidade.md) · [Homologação Vercel/Supabase](../homologacao-vercel-supabase.md).
