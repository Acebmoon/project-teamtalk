# Diagramas UML do TeamTalk

Esta pasta contém quatro diagramas que representam os principais comportamentos do Aplicativo Web de Comunicação Interna. Eles foram elaborados a partir do documento de requisitos, do contrato de autenticação e da divisão técnica do projeto.

## Diagramas

1. [Diagrama de caso de uso](01-caso-de-uso.md) — apresenta os atores e as funcionalidades disponíveis para Funcionário e Administrador da TI.
2. [Diagrama de máquina de estados](02-maquina-de-estados.md) — representa o ciclo de vida de uma mensagem, desde o envio até a visualização, incluindo falha e tentativa de reenvio.
3. **Diagrama de temporização:** [visualização Mermaid no GitHub](03-temporizacao.md) e [código-fonte PlantUML](03-temporizacao.puml) — oferece uma prévia visual diretamente no GitHub e mantém o diagrama UML editável em PlantUML.
4. [Diagrama de atividades](04-atividades.md) — detalha o fluxo de envio de mensagem e arquivo PDF, incluindo validações e caminhos de erro.

## Como visualizar

- Os arquivos .md contêm diagramas Mermaid, renderizados diretamente pelo GitHub.
- O arquivo 03-temporizacao.md apresenta a visão visual simplificada da temporização no próprio GitHub.
- O arquivo 03-temporizacao.puml contém o diagrama UML de temporização em PlantUML. Para renderizá-lo, use uma ferramenta compatível, como a extensão PlantUML do VS Code ou um renderizador PlantUML.

## Critérios de modelagem e limites

- Os atores funcionais são **Funcionário** e **Administrador da TI**, conforme o documento de requisitos.
- O serviço de e-mail aparece como sistema externo apenas no caso de uso de envio de credenciais iniciais.
- O fluxo principal de mensagens considera texto e PDF, os únicos conteúdos previstos para compartilhamento no MVP.
- O status **Visualizada** corresponde ao requisito RF10. O estado **Enviada** representa a confirmação de persistência pelo servidor; não foi criado um status de entrega separado, pois o requisito não o define.
- A temporização usa marcos lógicos para mostrar a ordem dos eventos. O documento RNF08 não estabelece metas quantitativas de tempo; portanto, os marcos não representam segundos nem um SLA.
- O controle de acesso é validado no servidor. A restrição de dispositivo móvel não substitui autenticação, autorização/RBAC e RLS.

## Rastreabilidade principal

| Diagrama | Requisitos e referências |
|---|---|
| Caso de uso | RF03–RF15, RN01–RN10, SEG01–SEG07 |
| Máquina de estados | RF08–RF10, RF14, RNF06, RNF08, SEG03–SEG06 |
| Temporização | RF08–RF10, RNF08, SEG03–SEG04; arquitetura de tempo real descrita em DIVISAO_TAREFAS.md |
| Atividades | RF06, RF08–RF14, RN04–RN08, RNF11–RNF12, SEG04–SEG06 |
