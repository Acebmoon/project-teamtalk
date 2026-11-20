# Workspace TeamTalk inspirado no Linear — fase 1

## Objetivo
Transformar a tela de conversas em uma Inbox organizada sem transformar o TeamTalk em gerenciador de tarefas. O chat permanece como função principal.
Board de fluxos do Miro: https://miro.com/app/board/uXjVEOOsutU=/

## Componentes deste incremento
- Áreas na navegação inferior: Inbox, Equipes, Em foco.
- Dois modos: Lista (agrupamentos) e Quadro (colunas horizontais).
- Situações por conversa: A acompanhar, Em conversa, Concluídas.
- Prioridades manuais: Normal, Alta, Urgente.
- Marcar/desmarcar conversa em foco.
- Busca por título, subtítulo, equipe e prévia da última mensagem.
- Filtros: Todas, Prioridade, Não lidas.
- Tema claro/escuro e controles mobile-first.
- Interface de mensagens e callback de envio do PR #94 preservados.
- Campo de equipe opcional no tipo visual ConversaResumo.

## Decisões de produto
1. Organização individual por funcionário, não compartilhada.
2. Colunas para acompanhamento visual, não tickets formais.
3. Prioridade definida manualmente.
4. Inbox após login quando o adaptador oficial estiver integrado. A rota inicial não foi alterada nesta fase, pois não existe ainda serviço de conversas integrado.

## Limites explícitos
Este incremento altera apenas a interface React/CSS de TelaConversas. Situações, foco e prioridades ficam em memória no componente e são perdidos ao recarregar. O estado é reiniciado quando muda usuarioId, para não reaproveitar preferências de outra conta.

Não há persistência, sincronização entre dispositivos, novos endpoints, alteração nas tabelas, no middleware, nas regras de autenticação ou integração real de mensagens. Não divulgar como backend concluído.

## Próxima fase: persistência segura por usuário
O backend deverá disponibilizar preferências de Inbox por usuário e conversa, separadas pelo par usuario_id / conversa_id, com RLS:
- SELECT / INSERT / UPDATE / DELETE somente para o dono da preferência.
- Verificação de participação e autorização antes de aceitar um ID de conversa.
- Status privado, sem alterar prioridades de colegas.
- Reaproveitar as regras atuais do chat.
- Evitar vazamento de metadados de conversas nas consultas.
- Tratar preferências órfãs quando a conversa for removida.

Contrato e nomes dos campos devem ser revisados com o responsável pelo backend.

## Validação antes de integrar
- [ ] Typecheck, lint e build.
- [ ] Chrome Android e Safari iOS.
- [ ] Inbox, Equipes, Em foco, lista, quadro, busca e filtros.
- [ ] Prioridade, situação e favorito por usuário.
- [ ] Tela vazia, carregamento, falha de envio e estados de leitura.
- [ ] Bloqueio desktop e regras de RLS permanecem intactos.
- [ ] Revisão com Gilson (Issue #96), Ícaro e Elliot.
- [ ] Integrar com contratos do chat de Pedro.

## Referência
Baseado no PR #94 da Luana sem alterá-lo ou mesclá-lo:
https://github.com/Acebmoon/project-teamtalk/pull/94
