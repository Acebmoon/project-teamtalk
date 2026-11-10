# project-teamtalk

## Visão geral

Aplicativo Web de Comunicação Interna corporativa, com experiência mobile-first inspirada em aplicativos de mensagens e identidade visual da empresa. O acesso do MVP é exclusivo pelo navegador do celular, por link direto, com suporte planejado a Chrome no Android e Safari no iOS. O acesso por computadores e notebooks deve ser bloqueado tecnicamente.

O produto é uma PWA/web app, sem publicação na Google Play ou App Store. O escopo de comunicação contempla mensagens de texto e compartilhamento exclusivo de arquivos PDF, com validação do conteúdo real no servidor. Imagens, fotos, áudios, vídeos, documentos Word e planilhas Excel não fazem parte do escopo.

A estimativa de escala é de aproximadamente **900 funcionários**. A Fase 1 será liberada somente ao grupo autorizado da **Diretoria / nível estratégico**, para validar segurança e estabilidade antes da expansão gradual aos demais setores. **Prazo do MVP: 20/11/2026.**

## Equipe e frentes de responsabilidade

| Integrante | Frente | Responsabilidade |
|---|---|---|
| Elliot | Frente 1: Tech Lead, Arquitetura, Auth e Segurança | Setup, banco, autenticação, sessão, troca de senha no primeiro acesso, bloqueio desktop e RBAC no servidor |
| Luana | Frente 2: UI/UX, Design System e Telas Mobile | Identidade visual, componentes mobile-first, login, primeiro acesso e interface de chat |
| Pedro | Frente 3: Motor de Chat Realtime e Status de Leitura | Listagem de conversas, envio/recebimento de texto em tempo real e confirmação de leitura |
| Mariana | Frente 4: Upload Seguro de PDF e Painel Admin da TI | Gestão de contas, liberação gradual, e-mail de credenciais iniciais, auditoria e upload validado de PDF |
| Ícaro | Frente 5: Requisitos, QA, Regras de Negócio e Docs | Testes de aceitação, validação de segurança e regras, README e matriz de rastreabilidade |

## Documentação do projeto

- [Documento de Especificação de Requisitos (versão atualmente presente na branch main)](docs/Documento-de-Requisitos.md)
- [Divisão completa de tarefas, stack, estrutura, Issues, dependências e matriz de rastreabilidade](DIVISAO_TAREFAS.md)

**Nota sobre o arquivo DOCX:** a listagem recursiva da branch main consultada durante esta atualização não contém o arquivo `Documento_de_Requisitos_Aplicativo_Comunicacao_Interna.docx`. Para não criar um link quebrado nem substituir qualquer documento, o README aponta para a versão de requisitos que está efetivamente versionada em `docs/Documento-de-Requisitos.md`. O DOCX não foi alterado.

## Escopo e regras principais do MVP

- Acesso por link em navegador de smartphone, sem app de loja.
- Bloqueio de acesso por desktop/notebook.
- Contas criadas e administradas exclusivamente pela equipe de TI, sem cadastro público.
- Login individual, sessão segura e troca obrigatória da senha provisória no primeiro acesso.
- Chat de texto em tempo real e status de leitura.
- Compartilhamento somente de PDF, com validação de MIME, magic bytes e tamanho no servidor.
- Controle de acesso por perfil e implantação gradual, começando pela Diretoria.
- Privacidade das conversas e dos arquivos conforme permissões e legislação aplicável, incluindo LGPD.

## Planejamento

Consulte [DIVISAO_TAREFAS.md](DIVISAO_TAREFAS.md) para as 19 entregas, critérios de pronto, responsáveis, sprints, ordem de execução e rastreabilidade dos requisitos RF01–RF15, RNF01–RNF14, RN01–RN10 e SEG01–SEG07.
