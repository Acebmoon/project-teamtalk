# Backlog de melhorias futuras — Issue #96

Consolidação de 20/11/2026 para avaliação de **Ícaro (PO)** e **Elliot (Tech Lead)**, com **Gilson (UI/UX)** como responsável pela origem das propostas visuais. [Issue #96](https://github.com/Acebmoon/project-teamtalk/issues/96). Este documento entrega a organização das ideias; implementar, abrir novas issues ou alterar o escopo depende de decisão posterior do produto.

## Fontes e fronteira de escopo

- Base entregue: [MVP integrado pelo #110](integracao-mvp.md), [requisitos](Documento-de-Requisitos.md), [matriz](08-testes-e-rastreabilidade.md) e [Inbox #97/#109](../controle-base-main/inbox/README.md).
- Sugestões de Gilson: branch [`feature/teamtalk-design-system`](https://github.com/Acebmoon/project-teamtalk/tree/feature/teamtalk-design-system), commit consultado **`80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e`**.
- Referências imutáveis: [guia UI/UX](https://github.com/Acebmoon/project-teamtalk/blob/80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e/design-system/handoff/GUIA_IMPLEMENTACAO_UIUX.md), [decisões](https://github.com/Acebmoon/project-teamtalk/blob/80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e/design-system/handoff/REGISTRO_DE_DECISOES.md), [Lista de Conversas](https://github.com/Acebmoon/project-teamtalk/blob/80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e/design-system/documentation/lista-de-conversas/TeamTalk_Lista_de_Conversas.docx) e [Conversa](https://github.com/Acebmoon/project-teamtalk/blob/80ac4fcf701ac54bc6f9259047ca7e2ee5a5a16e/design-system/documentation/tela-conversa/TeamTalk_Conversa.docx).

O handoff registra aprovações visuais e propostas funcionais mais amplas que a main. Isso não as torna funcionalidades do MVP integrado. Só 16 SVGs desse material foram incorporados no #110; a branch completa não foi integrada.

| Já faz parte do MVP | Fronteira para uma evolução futura |
|---|---|
| Favorito/Em foco, prioridade e situação privados por usuário/conversa (#97/#98, PR #109) | Fixar até cinco conversas no topo é uma regra diferente, ainda sem campo/ordem de fixação. |
| Busca local em título, subtítulo, equipe opcional e prévia da última mensagem carregada (#97) | Busca no histórico completo de mensagens exige consulta/indexação/paginação com RLS. |
| Enviar/receber texto, histórico e leitura real (#78–#80) | Responder, editar, encaminhar e excluir não possuem fluxo operacional entregue. O campo `edited_at` sozinho não comprova edição. |
| Área Equipes e campo visual opcional de equipe (#97) | Cadastro de departamentos, vínculos organizacionais e canais verificados não estão implementados. |
| PDF com limite configurável; na Vercel até 4.000.000 bytes (#77/#84) | O limite de 10 MB citado no handoff não substitui o contrato/limite do hosting integrado. |
| Tokens TeamTalk, fonte do sistema, toque >= 44 px, foco e estados acessíveis (#74) | Nova paleta/fonte ou gestos adicionais dependem de revisão própria; não repetir a entrega do design system. |

## Priorização e decisões

**P0:** defeito ou requisito obrigatório do MVP encontrado em QA; permanece no fluxo #85–#88 e bloqueia aceite quando necessário. **P1:** primeira rodada candidata após o piloto. **P2:** evolução posterior com dependências. **P3:** exploração sem compromisso de entrega. As prioridades P1–P3 abaixo são sugestões, não datas ou aprovação de implementação.

Estados permitidos: **para avaliar**, **aprovada**, **descartada**, **futura**. Todos os itens abaixo começam como **futura**, aguardando avaliação de PO/Tech Lead; não houve nova aprovação de escopo nesta consolidação.

| ID / categoria | Problema percebido | Sugestão e justificativa | Tela / fluxo afetado | Prioridade / dependência | Relação com entrega atual | Estado |
|---|---|---|---|---|---|---|
| MF01 — Organização | Favoritar não mantém uma conversa importante no topo. | Fixar/desafixar até cinco conversas por funcionário; acesso previsível sem mudar a organização dos colegas. | Inbox Lista/Quadro; lista de conversas | P1; decidir ordem entre fixadas, gesto e erro da sexta tentativa. | #97/#98, PR #109: reutilizar autoria/RLS das preferências; não duplicar favorito. Origem Gilson. | futura |
| MF02 — Busca | A busca dos resumos não encontra trechos antigos. | Busca autorizada no conteúdo textual do histórico, com resultados por relevância e salto para a mensagem. | Busca da Inbox → resultado → conversa | P1; definir relevância, acentos, paginação e metas; indexação e revogação com RLS. Busca dentro de PDF não aprovada. | #78/#79; ampliar consultas sem revelar mensagens de terceiros. Origem Gilson. | futura |
| MF03 — Conversa | Respostas ficam sem contexto quando várias mensagens se cruzam. | Responder a uma mensagem específica com referência e acesso à origem; melhora compreensão. | Conversa → menu contextual → compositor → mensagem | P1; decidir visual da referência, paginação e origem inacessível. | #76/#79; falta contrato de referência e validação da mesma conversa. Origem Gilson. | futura |
| MF04 — Conversa | Erros de digitação exigem outra mensagem de correção. | Editar mensagem própria em até 15 minutos e exibir “Editada”, conforme proposta do handoff. | Conversa → editar → salvar / cancelar | P2; definir relógio do servidor, concorrência, histórico de versões e efeito na leitura. | #79/#80; requer autorização do autor, RLS e sincronização; `edited_at` não basta. Origem Gilson. | futura |
| MF05 — Conversa | Repetir informação entre conversas exige copiar manualmente. | Encaminhar a destinatários/conversas autorizadas, com indicação da origem quando permitida. | Conversa → encaminhar → selecionar destino → confirmar | P2; definir múltiplos destinos, autoria, contexto e tratamento de PDF. | #78/#79/#84; verificar origem e destino sem compartilhar caminho/URL privilegiada. Origem Gilson. | futura |
| MF06 — Privacidade | Não há ação para retirar mensagens enviadas por engano. | Propor exclusão com confirmação e feedback sincronizado. | Conversa → excluir → confirmar → histórico | P2; **decisão bloqueante:** somente para mim, para todos ou ambas; prazo, retenção, auditoria e PDFs. | #79/#80/#84; política LGPD/retenção a acordar. Nenhum DELETE operacional novo é autorizado aqui. Origem Gilson. | futura |
| MF07 — Organização | Equipes e avatares não têm cadastro organizacional oficial. | Departamentos administrados pela TI e vínculos de funcionários; agrupamento e avatar consistentes. | Admin TI → departamentos/vínculos → Equipes e cabeçalhos | P2; definir taxonomia, grupos multidepartamentais, mudança de setor e departamentos sem cor. | #81/#82/#97; departamento não substitui grupo de liberação nem participação na conversa. Origem Gilson. | futura |
| MF08 — Confiança | A interface não distingue um canal oficial de uma conversa comum. | Canais verificados com selo ao lado do nome, acessível por texto; reduzir confusão sobre comunicados oficiais. | Lista → cabeçalho do canal → publicação/administração | P2; decidir quem verifica/publica, revogação do selo e membros autorizados. | #73/#78/#82; ícone isolado não comprova oficialidade. Origem Gilson. | futura |
| MF09 — Acessibilidade | Menus por toque prolongado podem ficar difíceis de descobrir. | Menu acessível com opção visível e ação copiar texto; validar leitor de tela, foco e feedback. | Conversa → ações de mensagem | P1 junto de MF03; alternativa ao gesto e alvos >= 44 px. | #74/#76, QA #85; requisitos básicos já são MVP, menus novos são evolução. Origem handoff e revisão de integração. | futura |
| MF10 — Clareza de informação | Contagens grandes e estados podem sobrecarregar a lista. | Avaliar badge `99+` e textos curtos para envio/falha/reconexão sem perder contagem acessível. | Inbox e conversa → estados vazios/erro/envio | P3; observar primeiro as evidências do piloto. | #74/#76/#79; estados reais já existem, não importar contador estático. Origem Gilson. | futura |

## Necessidades do MVP que continuam no QA

| Necessidade / possível duplicidade | Encaminhamento existente | Decisão de escopo |
|---|---|---|
| Navegação, toque, foco, zoom, identidade e compatibilidade física | #74–#76; [QA #85](qa/85-mobile-bloqueio-desktop.md) | Obrigatório do MVP; falha encontrada é correção P0, não nova funcionalidade. |
| Sessão, primeiro acesso, administração, e-mail e auditoria | #71–#73, #81–#83; [QA #86](qa/86-auth-sessao-admin.md) | Obrigatório; confirmar serviços reais sem duplicar as issues de implementação. |
| Persistência, Realtime, leitura e isolamento; desempenho e capacidade | #78–#80, #98; [QA #87](qa/87-chat-privacidade-leitura.md) | Obrigatório; carga para ~900 e metas de disponibilidade seguem pendentes, não são dispensadas como pós-MVP. |
| PDF real, limites e download privado; documentação | #77/#84; [QA #88](qa/88-pdf-rastreabilidade.md) | Obrigatório; manter limite efetivo integrado. Mudar hosting para suportar mais bytes exige proposta separada. |

Não foram criadas novas issues nem alterados tokens, permissões, schema, rotas ou telas a partir dessas propostas. A lista não atribui ao restante do grupo contribuições que não foram verificadas.

## Avaliação de produto e registro posterior

O PR desta documentação apresenta a lista para revisão de Ícaro e Elliot por meio da #96. O fechamento da issue conclui a organização solicitada, não a decisão sobre cada melhoria. Após a avaliação, registrar sem apagar a origem:

| Item | Decisão (para avaliar / aprovada / descartada / futura) | PO / Tech Lead | Data UTC | Motivo e link de decisão / futura issue |
|---|---|---|---|---|
| MF01–MF10 | futura | Pendente | Pendente | Aguardar avaliação; usar uma linha por item quando houver decisão. |

Para aprovar implementação: definir regras pendentes, critérios positivos/negativos, impacto em privacidade e contrato das três pastas; só então desdobrar a melhoria em tarefa própria. Os requisitos relacionados à organização desta entrega são RF02, RNF01, RNF03, RNF04 e RNF13.
