# 1. Visão, objetivos e escopo

## 1.1 Contexto do sistema

A comunicação interna da empresa precisa de um canal próprio, acessível por link no navegador do celular. As contas devem ser controladas pela TI e as conversas devem respeitar autorização e privacidade.

## 1.2 Objetivo geral do sistema

Entregar o **TeamTalk**, aplicativo web de comunicação entre funcionários, com visual familiar a mensageiros, identidade corporativa e uso exclusivamente móvel.

## 1.3 Objetivos específicos do sistema

- Autenticar usuários individuais e exigir troca da senha provisória.
- Manter sessão com expiração e permitir saída.
- Permitir conversas e mensagens de texto, com indicação de leitura.
- Compartilhar somente PDFs, com validação no servidor e acesso restrito.
- Dar à TI cadastro, gestão de contas e liberação gradual.
- Impedir acesso normal por computador ou notebook sem tratar User-Agent como defesa suficiente.
- Preservar a separação entre telas, regras de servidor e camada Next.js.

## 1.4 Pessoas e papéis

| Público ou integrante | Papel / responsabilidade |
|---|---|
| Diretoria e nível estratégico | Grupo inicial autorizado, Fase 1. |
| Demais funcionários | Expansão progressiva prevista, com estimativa de cerca de **900 funcionários** no total. |
| Funcionário | Entra, conversa, envia texto/PDF e consulta leitura, quando autorizado. |
| Admin TI | Cria e administra contas; controla grupos e permissões. |
| Ícaro | Product Owner (PO): requisitos, critérios de aceite e rastreabilidade. |
| Elliot | Tech Lead: arquitetura, banco, autenticação e segurança. |
| Luana e Gilson | Design UI/UX: identidade visual, telas e componentes móveis. |
| Pedro, Luan e Diego | Desenvolvimento: chat, integrações e funcionalidades do MVP. |
| Mariana | SQA: planejamento, execução de testes e validação. |

As responsabilidades são compartilhadas entre frentes. Não há definição de uma pessoa dedicada exclusivamente à função DevOps nas fontes atuais.

## 1.5 Escopo da edição atual

O MVP planejado inclui login, controle de sessão, troca obrigatória de senha no primeiro acesso, bloqueio técnico de desktop, permissão por papel, contas administradas pela TI, liberação da Diretoria, mensagens de texto, confirmação de leitura e arquivos PDF.

A **base implementada** comprovada inclui migrations de usuários, grupos, conversas, mensagens, leituras e auditoria; autenticação e decisão de acesso; middleware de dispositivo; RBAC mínimo; página Admin TI mínima; e tela de primeiro acesso. As entregas completas de chat, PDF, cadastro administrativo e auditoria operacional seguem como **pendentes** nas fontes da `main` examinadas.

### O que significa Fase 1

A Diretoria / nível estratégico é o grupo inicial. A migration cria esse grupo **desabilitado**. A TI precisa habilitar o grupo e associar os usuários permitidos; o simples cadastro não libera o funcionário.

## 1.6 Fora do escopo

Chamadas de voz e vídeo, mensagens de áudio, fotos, imagens, arquivos Word e Excel, cadastro público, instalação obrigatória, publicação na Google Play ou App Store e uso da versão para computador/notebook. Recursos não solicitados dependem de nova aprovação.

## 1.7 Premissas e dependências

- A empresa fornece identidade visual e orientações oficiais.
- A empresa define os grupos autorizados e a expansão após validação.
- A TI fornece dados dos usuários e serviço de e-mail corporativo.
- Recuperação de senha, suporte, retenção de mensagens e documentos dependem de política empresarial.
- Limite de tamanho de PDF, metas quantitativas de desempenho/disponibilidade e versões suportadas dos navegadores: **a definir com o cliente**.
- O prazo planejado do MVP é **20/11/2026**. O prazo não equivale à conclusão já comprovada.

## 1.8 Evoluções futuras, sem compromisso de entrega

A expansão gradativa até aproximadamente 900 funcionários integra a visão de adoção. Qualquer recurso extra típico de aplicativos de mensagens, além dos explicitamente descritos, exige validação do cliente.
