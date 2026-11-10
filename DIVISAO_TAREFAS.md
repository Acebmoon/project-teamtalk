# Projeto A3: Divisão de tarefas e arquitetura

Documento de execução do MVP do Aplicativo Web de Comunicação Interna. Prazo de entrega: **20/11/2026**. Público inicial: grupo autorizado da Diretoria e nível estratégico, com expansão gradual até a estimativa de 900 funcionários.

## 1. Stack sugerida

1. **Framework:** Next.js com App Router, em arquitetura monolítica modular.
2. **Linguagem:** TypeScript no cliente e no servidor.
3. **Banco de dados:** Supabase PostgreSQL para usuários, grupos, conversas, mensagens, leituras e auditoria.
4. **Autenticação:** Supabase Auth, com hash de senha gerenciado pelo serviço, salt individual e política de credenciais iniciais.
5. **Sessão e transporte:** HTTPS, cookies seguros, expiração e encerramento de sessão.
6. **Autorização:** RBAC no servidor e políticas RLS no PostgreSQL.
7. **Tempo real:** Supabase Realtime para mensagens e atualizações de leitura.
8. **Interface:** Tailwind CSS e componentes mobile-first alinhados ao design system corporativo.
9. **Arquivos:** armazenamento privado de PDFs, validação de MIME, magic bytes e tamanho no servidor.
10. **Qualidade e deploy:** Vitest/Jest, Playwright, Vercel e Supabase.

**Decisões de segurança:** User-Agent e sinais do navegador podem ser falsificados. O bloqueio de desktop é uma restrição técnica de acesso e deve ser combinado com autenticação, autorização no servidor e testes, sem ser tratado como mecanismo criptográfico. Não armazenar senha em texto puro nem enviar senha em URL. Definir fluxo seguro de credencial inicial e expiração.

## 2. Estrutura enxuta de pastas

    a3-comunicacao-interna/
    ├── src/
    │   ├── app/
    │   │   ├── login/
    │   │   ├── primeiro-acesso/
    │   │   ├── chat/
    │   │   ├── admin/
    │   │   └── api/
    │   ├── components/
    │   │   ├── ui/
    │   │   ├── chat/
    │   │   └── admin/
    │   ├── lib/
    │   │   ├── auth/
    │   │   ├── supabase/
    │   │   └── security/
    │   └── services/
    ├── supabase/
    │   └── migrations/
    ├── tests/
    │   ├── unit/
    │   └── e2e/
    ├── docs/
    │   └── requirements-matrix.md
    ├── middleware.ts
    ├── README.md
    └── package.json

## 3. Frentes de trabalho

| Frente | Responsável | Responsabilidade |
|---|---|---|
| 1 | Elliot, Tech Lead | Arquitetura, setup, banco, autenticação, sessão, troca de senha, bloqueio desktop e RBAC |
| 2 | Luana | UI/UX, design system, telas mobile, login, primeiro acesso e interface de chat |
| 3 | Pedro | Conversas, mensagens de texto em tempo real e confirmação de leitura |
| 4 | Mariana | Painel Admin TI, gestão de contas, implantação gradual, e-mail, auditoria e upload seguro de PDF |
| 5 | Ícaro | QA, testes de aceitação, validação das regras de negócio, README e matriz de rastreabilidade |

## 4. Quadro de Issues

Cada Issue representa uma entrega verificável, planejada para 1 a 3 dias. As pessoas são identificadas no título e no corpo; os logins GitHub não foram presumidos.

### Frente 1: Elliot, Tech Lead, Arquitetura, Auth e Segurança

#### [ISSUE-01] Configurar repositório, ambiente e modelo inicial do banco (Responsável: Elliot)
- **Frente / Responsável:** Frente 1, Elliot.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF03, RF04, RF08, RF13, RF15, RN01, RN02, RN05, RN09, RN10, RNF09, RNF13, SEG01.
- **O que fazer:** Configurar Next.js, TypeScript, Supabase e variáveis de ambiente. Criar migrations para usuários, grupos de liberação, conversas, participantes, mensagens, leituras e auditoria.
- **Critério de Pronto (DoD):** Ambiente local sobe e migrations criam as tabelas e relacionamentos previstos em banco de desenvolvimento.

#### [ISSUE-02] Implementar autenticação individual e sessão segura (Responsável: Elliot)
- **Frente / Responsável:** Frente 1, Elliot.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF03, RF07, RN03, RNF05, RNF06, SEG01, SEG02, SEG03, SEG06.
- **O que fazer:** Implementar login individual e sessão com HTTPS, cookies/tokens protegidos, expiração e encerramento. Usar hash de senha com salt por meio do mecanismo seguro de autenticação, sem persistir senha em texto puro.
- **Critério de Pronto (DoD):** Testes comprovam login individual, armazenamento não reversível de senha, transporte HTTPS e expiração/encerramento de sessão.

#### [ISSUE-03] Exigir troca de senha provisória no primeiro acesso (Responsável: Elliot)
- **Frente / Responsável:** Frente 1, Elliot.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF06, RN04, RN03, RNF05, RNF06, SEG01, SEG02, SEG06.
- **O que fazer:** Implementar estado de primeiro acesso e rota protegida de troca de senha. Bloquear consultas e operações do chat enquanto a senha provisória não tiver sido substituída.
- **Critério de Pronto (DoD):** Conta com senha provisória só alcança o chat depois de concluir a troca e renovar a sessão conforme a política.

#### [ISSUE-04] Bloquear acesso desktop e aplicar RBAC no servidor (Responsável: Elliot)
- **Frente / Responsável:** Frente 1, Elliot.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF01, RF02, RF13, RF14, RN05, RNF01, RNF02, RNF03, RNF04, RNF07, RNF14, SEG03, SEG04.
- **O que fazer:** Implementar bloqueio técnico de desktop/notebook e permitir os navegadores móveis definidos. Aplicar autorização server-side para Admin TI e Funcionário em todas as rotas e operações protegidas.
- **Critério de Pronto (DoD):** Chrome Android e Safari iOS passam, desktop é bloqueado e chamadas diretas de funcionário a recursos administrativos retornam acesso negado.

### Frente 2: Luana, UI/UX, Design System e Telas Mobile

#### [ISSUE-05] Criar design system e navegação mobile-first (Responsável: Luana)
- **Frente / Responsável:** Frente 2, Luana.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF01, RF02, RNF01, RNF03, RNF04, RNF14.
- **O que fazer:** Criar tokens de cor, tipografia, espaçamento, botões, campos e navegação conforme a identidade visual fornecida pela empresa. Estruturar layout mobile-first inspirado em aplicativos de mensagens.
- **Critério de Pronto (DoD):** Componentes e layout são navegáveis em viewport de smartphone e seguem os tokens aprovados.

#### [ISSUE-06] Desenvolver telas de login e primeiro acesso (Responsável: Luana)
- **Frente / Responsável:** Frente 2, Luana.
- **Prioridade / Sprint:** Fase 1: Fundação.
- **Requisitos atendidos:** RF03, RF06, RF07, RN03, RN04, RNF04, RNF14, SEG01, SEG06.
- **O que fazer:** Construir telas de login e troca obrigatória de senha, com autocomplete e atributos compatíveis com gerenciadores de senha. Integrar aos estados e rotas de autenticação definidos por Elliot.
- **Critério de Pronto (DoD):** Fluxo visual de login e primeiro acesso funciona em Chrome Android e Safari iOS sem permitir avançar antes da troca obrigatória.

#### [ISSUE-07] Desenvolver interface de conversas e mensagens (Responsável: Luana)
- **Frente / Responsável:** Frente 2, Luana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF08, RF09, RF10, RN08, RNF01, RNF04, RNF08, RNF12.
- **O que fazer:** Construir lista de conversas, cabeçalho, histórico, balões de mensagens, campo de texto e estados visuais de envio/leitura. Integrar aos contratos de serviço publicados por Pedro.
- **Critério de Pronto (DoD):** Dois usuários de teste conseguem operar a interface mobile e visualizar mensagens e estados de leitura.

#### [ISSUE-08] Criar seletor de anexos exclusivamente PDF (Responsável: Luana)
- **Frente / Responsável:** Frente 2, Luana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF11, RF12, RN06, RN07, RNF11, RNF12, SEG05.
- **O que fazer:** Criar controle de seleção de arquivo aceitando PDF e exibindo nome, tamanho e feedback de erro. A validação de interface complementa, mas não substitui, a validação obrigatória do servidor.
- **Critério de Pronto (DoD):** Interface oferece seleção de PDF e bloqueia visualmente formatos não permitidos antes do envio.

### Frente 3: Pedro, Motor de Chat Realtime e Status de Leitura

#### [ISSUE-09] Implementar listagem de conversas autorizadas (Responsável: Pedro)
- **Frente / Responsável:** Frente 3, Pedro.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF08, RF09, RF14, RN05, RNF08, RNF09, RNF12, SEG04.
- **O que fazer:** Criar consulta paginada de conversas do usuário autenticado e participantes autorizados. Restringir leitura no servidor/RLS para impedir acesso a conversas de terceiros.
- **Critério de Pronto (DoD):** Usuários de teste recebem somente as conversas das quais participam, inclusive ao chamar a API diretamente.

#### [ISSUE-10] Implementar envio e recebimento de texto em tempo real (Responsável: Pedro)
- **Frente / Responsável:** Frente 3, Pedro.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF08, RF09, RN08, RNF08, RNF09, RNF10, RNF12, SEG04.
- **O que fazer:** Persistir mensagens de texto e publicar atualizações via Supabase Realtime. Validar remetente, destinatários e participação na conversa no servidor.
- **Critério de Pronto (DoD):** Dois usuários autorizados trocam texto, recebem atualização sem recarregar e não conseguem publicar em conversa alheia.

#### [ISSUE-11] Implementar status de leitura por destinatário (Responsável: Pedro)
- **Frente / Responsável:** Frente 3, Pedro.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF10, RN08, RNF08, RNF12, SEG04.
- **O que fazer:** Registrar visualização por mensagem e destinatário, atualizando o estado quando a mensagem for efetivamente exibida na conversa. Emitir atualização em tempo real aos participantes autorizados.
- **Critério de Pronto (DoD):** A mensagem muda de não lida para lida somente para o destinatário que a visualizou.

### Frente 4: Mariana, Upload Seguro de PDF e Painel Admin da TI

#### [ISSUE-12] Criar painel TI para gestão de contas (Responsável: Mariana)
- **Frente / Responsável:** Frente 4, Mariana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF04, RF13, RF14, RN01, RN02, RN05, RN10, RNF07, SEG04, SEG07.
- **O que fazer:** Criar telas e rotas para cadastrar, listar, consultar, bloquear e desativar contas. Impedir autorregistro e exigir perfil Admin TI validado no servidor.
- **Critério de Pronto (DoD):** Admin TI executa as operações e funcionário não consegue executá-las nem por requisição direta.

#### [ISSUE-13] Implementar grupos de liberação gradual e auditoria (Responsável: Mariana)
- **Frente / Responsável:** Frente 4, Mariana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF15, RF14, RN05, RN09, RN10, RNF07, RNF13, SEG04, SEG07.
- **O que fazer:** Permitir à TI incluir/remover usuários dos grupos liberados para a Fase 1 e registrar ações administrativas com ator, ação, alvo e data/hora. Não liberar usuários fora do grupo autorizado.
- **Critério de Pronto (DoD):** Usuário fora do grupo não acessa o sistema e cada alteração administrativa gera evento consultável de auditoria.

#### [ISSUE-14] Enviar credenciais iniciais por e-mail de forma segura (Responsável: Mariana)
- **Frente / Responsável:** Frente 4, Mariana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF05, RF04, RN01, RN03, RN10, RNF05, RNF06, SEG01, SEG02, SEG03, SEG06.
- **O que fazer:** Integrar serviço de e-mail corporativo para disparar instruções/credencial inicial individual após cadastro pela TI. Não gravar segredo em logs nem expor credenciais em URL; aplicar validade/uso inicial conforme política definida.
- **Critério de Pronto (DoD):** Cadastro autorizado dispara e-mail de primeiro acesso e a credencial inicial não aparece em logs ou URLs.

#### [ISSUE-15] Implementar upload com validação real de PDF (Responsável: Mariana)
- **Frente / Responsável:** Frente 4, Mariana.
- **Prioridade / Sprint:** Fase 2: Core Chat & Admin.
- **Requisitos atendidos:** RF11, RF12, RN06, RN07, RNF11, RNF12, SEG05.
- **O que fazer:** Criar endpoint e armazenamento privado com limite de tamanho configurável, validação de MIME e magic bytes e autorização de acesso. Rejeitar imagens, áudio, vídeo, Word, Excel e arquivos com extensão PDF cujo conteúdo real não seja PDF.
- **Critério de Pronto (DoD):** PDF válido dentro do limite é armazenado e disponibilizado apenas aos participantes, enquanto arquivos renomeados/falsificados são rejeitados no servidor.

### Frente 5: Ícaro, QA, Regras de Negócio e Documentação

#### [ISSUE-16] Validar compatibilidade mobile e bloqueio desktop (Responsável: Ícaro)
- **Frente / Responsável:** Frente 5, Ícaro.
- **Prioridade / Sprint:** Fase 3: Segurança & Homologação Diretoria.
- **Requisitos atendidos:** RF01, RF02, RNF01, RNF02, RNF03, RNF04, RNF14.
- **O que fazer:** Executar testes em Chrome Mobile Android e Safari iOS nas versões acordadas, além de tentativas de acesso via desktop/notebook e falsificação de User-Agent.
- **Critério de Pronto (DoD):** Matriz registra navegadores/dispositivos testados, resultados e evidência de bloqueio desktop e acesso mobile.

#### [ISSUE-17] Testar autenticação, sessão e administração (Responsável: Ícaro)
- **Frente / Responsável:** Frente 5, Ícaro.
- **Prioridade / Sprint:** Fase 3: Segurança & Homologação Diretoria.
- **Requisitos atendidos:** RF03, RF04, RF05, RF06, RF07, RF13, RF14, RF15, RN01, RN02, RN03, RN04, RN05, RN09, RN10, RNF05, RNF06, RNF07, SEG01, SEG02, SEG03, SEG04, SEG06, SEG07.
- **O que fazer:** Testar login, senha provisória, expiração de sessão, permissões Admin TI/Funcionário, bloqueio/desativação, e-mail inicial, grupos liberados e auditoria.
- **Critério de Pronto (DoD):** Casos positivos e negativos passam, com evidências de que operações administrativas e dados de outros usuários não são acessíveis indevidamente.

#### [ISSUE-18] Testar chat, privacidade e status de leitura (Responsável: Ícaro)
- **Frente / Responsável:** Frente 5, Ícaro.
- **Prioridade / Sprint:** Fase 3: Segurança & Homologação Diretoria.
- **Requisitos atendidos:** RF08, RF09, RF10, RN08, RNF08, RNF09, RNF10, RNF12, SEG04.
- **O que fazer:** Testar conversas entre usuários autorizados, persistência, atualização realtime, status lido/não lido e tentativas de consultar conversas de terceiros. Registrar falhas de desempenho ou disponibilidade observadas.
- **Critério de Pronto (DoD):** Cenários de envio, recebimento, leitura e isolamento de dados são aprovados por dois ou mais usuários de teste.

#### [ISSUE-19] Testar upload PDF e concluir README/rastreabilidade (Responsável: Ícaro)
- **Frente / Responsável:** Frente 5, Ícaro.
- **Prioridade / Sprint:** Fase 3: Segurança & Homologação Diretoria.
- **Requisitos atendidos:** RF11, RF12, RN06, RN07, RNF11, RNF13, RNF12, SEG05.
- **O que fazer:** Tentar enviar imagem, foto, áudio, vídeo, Word e Excel renomeados para PDF, além de PDF acima do limite. Finalizar README, instruções de execução e matriz de rastreabilidade completa.
- **Critério de Pronto (DoD):** Arquivos inválidos e acima do limite são rejeitados no servidor, documentação permite reproduzir o ambiente e a matriz não contém requisito sem Issue vinculada.

## 5. Ordem de execução e dependências

1. **Fundação:** Elliot publica estrutura, migrations e variáveis de ambiente; Luana inicia tokens e componentes com os contratos visuais disponíveis.
2. **Acesso:** Elliot entrega autenticação, sessão, primeiro acesso e middleware; Luana integra as telas aos fluxos reais.
3. **Contratos:** Elliot documenta tabelas, permissões, endpoints e eventos; Pedro e Mariana desenvolvem em paralelo contra esses contratos.
4. **Core paralelo:** Pedro entrega conversas, texto e leitura; Mariana entrega Admin, grupos, e-mail e PDF; Luana integra chat e seletor.
5. **Homologação:** Ícaro executa testes integrados; Elliot corrige bloqueios críticos e o grupo inicial da Diretoria valida o MVP até 20/11/2026.

**Regra de integração:** publicar nomes de campos, contratos de API/eventos e exemplos de payload antes de depender da implementação de outra frente. Não presumir logins GitHub dos integrantes; atribuições nominais ficam no título/corpo até os usernames serem confirmados.

## 6. Matriz de rastreabilidade

Cada requisito abaixo está vinculado a pelo menos uma Issue do quadro. Os códigos e descrições seguem o Documento de Especificação v1.0 versionado no repositório.

### Requisitos funcionais

| Código | Descrição resumida | Issues |
|---|---|---|
| RF01 | Acesso por dispositivos móveis via link | 04, 05, 16 |
| RF02 | Interface semelhante a aplicativo mobile | 04, 05, 16 |
| RF03 | Tela de login por usuário e senha | 01, 02, 06, 17 |
| RF04 | Cadastro de usuários somente pela TI | 01, 12, 14, 17 |
| RF05 | Envio seguro de credenciais por e-mail | 14, 17 |
| RF06 | Troca obrigatória de senha no primeiro acesso | 03, 06, 17 |
| RF07 | Persistência segura de sessão e compatibilidade com gerenciador de senhas | 02, 06, 17 |
| RF08 | Envio de mensagens de texto | 01, 07, 09, 10, 18 |
| RF09 | Recebimento de mensagens | 07, 09, 10, 18 |
| RF10 | Identificação de visualização da mensagem | 07, 11, 18 |
| RF11 | Envio e recebimento de PDF | 08, 15, 19 |
| RF12 | Restrição de formatos de arquivos | 08, 15, 19 |
| RF13 | Gerenciamento de usuários pela TI | 01, 04, 12, 17 |
| RF14 | Controle de acesso a usuários autorizados | 04, 09, 12, 13, 17 |
| RF15 | Implantação gradual | 01, 13, 17 |

### Requisitos não funcionais

| Código | Descrição resumida | Issues |
|---|---|---|
| RNF01 | Responsividade e compatibilidade mobile | 04, 05, 07, 16 |
| RNF02 | Restrição técnica de acesso por dispositivo | 04, 16 |
| RNF03 | Identidade visual corporativa | 04, 05, 16 |
| RNF04 | Usabilidade simples e intuitiva | 04, 05, 06, 07, 16 |
| RNF05 | Hash de senha com salt, sem texto puro | 02, 03, 14, 17 |
| RNF06 | HTTPS e proteção/expiração de sessão | 02, 03, 14, 17 |
| RNF07 | Controle de permissões baseado em papéis | 04, 12, 13, 17 |
| RNF08 | Desempenho adequado de navegação, mensagens e arquivos | 07, 09, 10, 11, 18 |
| RNF09 | Suporte à estimativa de 900 usuários e crescimento | 01, 09, 10, 18 |
| RNF10 | Monitoramento, recuperação e prevenção de falhas | 10, 18 |
| RNF11 | Integridade, validação real e limite de arquivos | 08, 15, 19 |
| RNF12 | Privacidade e acesso restrito conforme LGPD | 07, 08, 09, 10, 11, 15, 18, 19 |
| RNF13 | Arquitetura organizada, documentação e manutenção | 01, 13, 19 |
| RNF14 | Compatibilidade com Chrome e Safari móveis | 04, 05, 06, 16 |

### Regras de negócio

| Código | Descrição resumida | Issues |
|---|---|---|
| RN01 | Somente TI autorizada cria contas | 01, 12, 14, 17 |
| RN02 | Não existe cadastro público/autorregistro | 01, 12, 17 |
| RN03 | Cada funcionário possui credencial individual | 02, 03, 06, 14, 17 |
| RN04 | Troca obrigatória da senha inicial | 03, 06, 17 |
| RN05 | Acesso somente a funcionários cadastrados e autorizados | 04, 09, 12, 13, 17 |
| RN06 | Compartilhamento limitado a PDF | 08, 15, 19 |
| RN07 | Não permitir imagens, fotografias e áudio | 08, 15, 19 |
| RN08 | Identificar visualização pelo destinatário | 07, 10, 11, 18 |
| RN09 | Liberação gradual conforme autorização da empresa | 01, 13, 17 |
| RN10 | TI gerencia usuários durante o ciclo de utilização | 01, 12, 13, 14, 17 |

### Requisitos de segurança

| Código | Descrição resumida | Issues |
|---|---|---|
| SEG01 | Autenticação individual | 02, 03, 06, 14, 17 |
| SEG02 | Senhas protegidas por hash e salt, sem exposição indevida | 02, 03, 14, 17 |
| SEG03 | Todo tráfego via HTTPS | 02, 04, 14, 17 |
| SEG04 | Autorização verificada no servidor | 04, 09, 10, 11, 12, 13, 17, 18 |
| SEG05 | Validação e proteção de arquivos | 08, 15, 19 |
| SEG06 | Gestão segura, expiração e encerramento de sessão | 02, 03, 06, 14, 17 |
| SEG07 | Auditoria administrativa | 12, 13, 17 |

## 7. Fora do escopo do MVP

Não criar Issues nem implementar chamadas de voz/vídeo, mensagens de áudio, fotos/imagens, arquivos Word/Excel, versão desktop para funcionários, cadastro público ou publicação em lojas de aplicativos. O produto é acessado por link no navegador móvel. O limite de tamanho de PDF e as metas quantitativas de desempenho/disponibilidade precisam ser definidos com o cliente antes da homologação.
