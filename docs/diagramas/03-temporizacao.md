# Diagrama de temporização — TeamTalk

Este arquivo oferece uma **visualização renderizada pelo GitHub** da temporização do envio de mensagens. O código PlantUML completo e editável permanece em [03-temporizacao.puml](03-temporizacao.puml).

> **Importante:** os marcos @0 a @60 representam apenas uma ordem temporal lógica. Não são segundos, duração medida nem SLA. O RNF08 não define uma meta quantitativa de tempo.

## Visualização

```mermaid
sequenceDiagram
    autonumber
    participant REM as Aplicativo remetente
    participant SRV as Servidor TeamTalk
    participant DEST as Aplicativo destinatário

    Note over REM,DEST: @0 — Mensagem preparada; destinatário aguardando
    REM->>SRV: @10 — Envia requisição HTTPS
    Note over REM,SRV: @20 — Servidor valida sessão, permissões e conteúdo
    SRV-->>REM: @30 — Confirma persistência da mensagem
    Note over REM,SRV: Mensagem no estado Enviada
    SRV-->>DEST: @40 — Disponibiliza atualização em tempo real
    DEST->>SRV: @50 — Funcionário abre a conversa
    SRV-->>REM: @50 — Registra visualização e atualiza status
    Note over REM,DEST: @60 — Mensagem visualizada; operação concluída
```

## Código-fonte PlantUML

Para obter o diagrama UML de temporização com linhas de estado e marcos temporais, abra o arquivo [03-temporizacao.puml](03-temporizacao.puml) em uma ferramenta compatível com PlantUML, como a extensão PlantUML do VS Code.

A visualização Mermaid acima é uma representação simplificada para leitura rápida no GitHub; o arquivo PlantUML é a versão de referência do diagrama de temporização.
