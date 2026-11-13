# 8. Guia de testes e rastreabilidade

## 8.1 Finalidade

Esta matriz liga os **46 requisitos** do documento de origem às **19 Issues #70–#88** do TeamTalk. Os vínculos foram transcritos da matriz de `DIVISAO_TAREFAS.md`; não significam que a Issue esteja concluída. "Vitest" quer dizer que existe um teste de função pura no repositório, **não** que uma execução foi realizada neste trabalho.

## 8.2 Preparação do ambiente

A instalação e os comandos estão no [documento 05](05-arquitetura-e-execucao.md). Para o roteiro de integração, preparar usuários de teste na base local, um funcionário, um Admin TI e um usuário sem grupo autorizado. Não usar credenciais de produção. O bloqueio de dispositivo exige User-Agent móvel nas rotas comuns.

## 8.3 Estratégia recomendada

- **Vitest:** lógica pura de decisão de acesso, rota, senha e dispositivo.
- **Teste manual:** browser Android/iOS, Supabase local, RLS, Auth, sessão, CRUD, chat, PDF e auditoria.
- **Pendente:** função ou infraestrutura ausente, ou sem execução/evidência nas fontes.
- **Critério:** executar ao menos caso positivo e negativo; registrar ambiente, resultado e Issue.
- **Metas sem definição:** tamanho de PDF, latência, disponibilidade, retenção e matriz de versões devem ser acordados com o cliente.

## 8.4 Matriz de rastreabilidade funcional

### RF01–RF15

| Requisito | Issues GitHub | Como é testado / lacuna |
|---|---|---|
| RF01 — Acesso por dispositivos móveis via link | #73, #74, #85 | Vitest: dispositivo; manual Android/iOS pendente |
| RF02 — Interface semelhante a aplicativo mobile | #73, #74, #85 | Teste manual de interface pendente |
| RF03 — Tela de login por usuário e senha | #70, #71, #75, #86 | Vitest: decidirAcesso/decidirRota; login manual pendente |
| RF04 — Cadastro de usuários somente pela TI | #70, #81, #83, #86 | Teste manual do cadastro TI pendente |
| RF05 — Envio seguro de credenciais por e-mail | #83, #86 | Teste manual de e-mail pendente |
| RF06 — Troca obrigatória de senha no primeiro acesso | #72, #75, #86 | Vitest: decidirAcesso/validarNovaSenha; fluxo manual pendente |
| RF07 — Persistência segura de sessão e compatibilidade com gerenciador de senhas | #71, #75, #86 | Vitest: expiração e rotas; cookies/gerenciador manual pendente |
| RF08 — Envio de mensagens de texto | #70, #76, #78, #79, #87 | Teste manual de envio pendente |
| RF09 — Recebimento de mensagens | #76, #78, #79, #87 | Teste manual de recebimento pendente |
| RF10 — Identificação de visualização da mensagem | #76, #80, #87 | Teste manual de leitura pendente |
| RF11 — Envio e recebimento de PDF | #77, #84, #88 | Teste manual de PDF pendente |
| RF12 — Restrição de formatos de arquivos | #77, #84, #88 | Teste manual de formatos falsos pendente |
| RF13 — Gerenciamento de usuários pela TI | #70, #73, #81, #86 | Vitest: bloqueio de rota Admin; CRUD manual pendente |
| RF14 — Controle de acesso a usuários autorizados | #73, #78, #81, #82, #86 | Vitest: decisão/autorização; RLS manual pendente |
| RF15 — Implantação gradual | #70, #82, #86 | Teste manual de habilitar grupo/RLS pendente |

## 8.5 Matrizes de qualidade, regras e segurança

### RNF01–RNF14

| Requisito | Issues GitHub | Como é testado / lacuna |
|---|---|---|
| RNF01 — Responsividade e compatibilidade mobile | #73, #74, #76, #85 | Teste manual em viewports móveis pendente |
| RNF02 — Restrição técnica de acesso por dispositivo | #73, #85 | Vitest: User-Agent e métodos; aparelhos reais pendentes |
| RNF03 — Identidade visual corporativa | #73, #74, #85 | Comparação manual com identidade aprovada pendente |
| RNF04 — Usabilidade simples e intuitiva | #73, #74, #75, #76, #85 | Teste manual de navegação pendente |
| RNF05 — Hash de senha com salt, sem texto puro | #71, #72, #83, #86 | Inspeção manual de Auth e logs pendente |
| RNF06 — HTTPS e proteção/expiração de sessão | #71, #72, #83, #86 | Vitest: expiração; teste HTTPS/cookies pendente |
| RNF07 — Controle de permissões baseado em papéis | #73, #81, #82, #86 | Vitest: decidirRota; abuso de API/Server Action pendente |
| RNF08 — Desempenho adequado de navegação, mensagens e arquivos | #76, #78, #79, #80, #87 | Medição de desempenho pendente; meta a definir |
| RNF09 — Suporte à estimativa de 900 usuários e crescimento | #70, #78, #79, #87 | Teste de carga para ~900 usuários pendente |
| RNF10 — Monitoramento, recuperação e prevenção de falhas | #79, #87 | Teste de recuperação/monitoramento pendente; meta a definir |
| RNF11 — Integridade, validação real e limite de arquivos | #77, #84, #88 | Teste de MIME, bytes e tamanho de PDF pendente |
| RNF12 — Privacidade e acesso restrito conforme LGPD | #76, #77, #78, #79, #80, #84, #87, #88 | Teste manual de isolamento/RLS pendente |
| RNF13 — Arquitetura organizada, documentação e manutenção | #70, #82, #88 | Revisão manual da estrutura e documentação pendente |
| RNF14 — Compatibilidade com Chrome e Safari móveis | #73, #74, #75, #85 | Teste manual Chrome Android/Safari iOS pendente |

### RN01–RN10

| Requisito | Issues GitHub | Como é testado / lacuna |
|---|---|---|
| RN01 — Somente TI autorizada cria contas | #70, #81, #83, #86 | Guarda exigirAdminTI existe; cadastro negativo pendente |
| RN02 — Não existe cadastro público/autorregistro | #70, #81, #86 | Revisão das rotas atuais; teste negativo pendente |
| RN03 — Cada funcionário possui credencial individual | #71, #72, #75, #83, #86 | Auth e esquema individual existem; teste manual pendente |
| RN04 — Troca obrigatória da senha inicial | #72, #75, #86 | Vitest: primeiro acesso; fluxo completo manual pendente |
| RN05 — Acesso somente a funcionários cadastrados e autorizados | #73, #78, #81, #82, #86 | Vitest: decisão; teste SQL/RLS pendente |
| RN06 — Compartilhamento limitado a PDF | #77, #84, #88 | Teste de upload PDF pendente |
| RN07 — Não permitir imagens, fotografias e áudio | #77, #84, #88 | Teste de recusa de mídia pendente |
| RN08 — Identificar visualização pelo destinatário | #76, #79, #80, #87 | Teste de leitura por destinatário pendente |
| RN09 — Liberação gradual conforme autorização da empresa | #70, #82, #86 | Migração de grupo/RLS; cenário manual pendente |
| RN10 — TI gerencia usuários durante o ciclo de utilização | #70, #81, #82, #83, #86 | Guarda Admin existe; CRUD/auditoria pendentes |

### SEG01–SEG07

| Requisito | Issues GitHub | Como é testado / lacuna |
|---|---|---|
| SEG01 — Autenticação individual | #71, #72, #75, #83, #86 | Vitest: decisão de sessão; login manual pendente |
| SEG02 — Senhas protegidas por hash e salt, sem exposição indevida | #71, #72, #83, #86 | Inspeção Auth/logs e fluxo de credenciais pendente |
| SEG03 — Todo tráfego via HTTPS | #71, #73, #83, #86 | Teste de deploy HTTPS pendente |
| SEG04 — Autorização verificada no servidor | #73, #78, #79, #80, #81, #82, #86, #87 | Vitest: rotas Admin; ataques de API/RLS pendentes |
| SEG05 — Validação e proteção de arquivos | #77, #84, #88 | Teste de PDF e acesso privado pendente |
| SEG06 — Gestão segura, expiração e encerramento de sessão | #71, #72, #75, #83, #86 | Vitest: expiração/rotas; logout manual pendente |
| SEG07 — Auditoria administrativa | #81, #82, #86 | Esquema audit_logs existe; gravação/teste pendentes |

## 8.6 Testes existentes na base consultada

| Arquivo Vitest | Cobertura observável |
|---|---|
| `controle-base-main/auth/decidir-acesso.test.ts` | Ausência de usuário, autorização, expiração AMR, prioridade de primeiro acesso e sessão válida. |
| `controle-base-main/auth/decidir-rota.test.ts` | Redirecionamentos, 401/403 em APIs, acesso Admin TI e distinção GET/POST. |
| `controle-base-main/auth/validar-nova-senha.test.ts` | Mínimo de dez caracteres, máximo de 72 bytes, confirmação e senha válida. |
| `controle-base-main/dispositivo/verificar-dispositivo.test.ts` | Android/iPhone/iPad/desktop, Client Hints, APIs e métodos bloqueados. |

Estes arquivos são **testes unitários existentes**, não testes E2E de chat, PDF ou contas. A matriz não presume aprovação em CI. Os roteiros manuais de autenticação e RBAC estão documentados no README do workspace, mas **não foram executados por esta alteração documental**.

## 8.7 Modelo de caso de teste e ocorrência

**Caso:** ID do requisito; Issue; pré-condição; dados de entrada; passos; resultado esperado; resultado obtido; data/ambiente; evidência.

**Ocorrência:** título, requisito, versão/commit, passos para reproduzir, comportamento atual, comportamento esperado, evidência, severidade e responsável pela triagem.

### Severidade sugerida

- **Crítica:** vazamento, acesso indevido, perda de dados ou falha que impede login geral.
- **Alta:** fluxo central bloqueado sem alternativa.
- **Média:** comportamento incorreto com alternativa.
- **Baixa:** detalhe visual/textual sem bloqueio relevante.

## 8.8 Critérios de conclusão da avaliação

Um requisito só deve ser marcado como aprovado depois de execução documentada, inclusive testes negativos de autorização e arquivo. Os dados de chat não devem ser acessíveis por não participantes; Admin TI não deve ler conversa privada sem participar. Validar a Fase 1 com a Diretoria antes de expansão. **Permanecem pendentes:** chat de texto/realtime, leitura, upload PDF, cadastro/gestão TI, e-mail, auditoria operacional, ensaios reais de dispositivos, privacidade integrada, carga, disponibilidade e metas acordadas com o cliente.
