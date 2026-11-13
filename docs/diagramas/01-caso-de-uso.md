# Diagrama de caso de uso — TeamTalk

## Objetivo

Apresentar, de forma geral, o que cada perfil pode realizar no TeamTalk. O sistema possui dois atores principais: **Funcionário** e **Administrador da TI**. O serviço de e-mail é representado como ator externo porque participa do envio das credenciais iniciais.

## Diagrama

```mermaid
flowchart LR
    F["👤 Funcionário"]
    TI["🛡️ Administrador da TI"]
    EMAIL["✉️ Serviço de e-mail"]

    subgraph TT["TeamTalk — Aplicativo Web de Comunicação Interna"]
        UC1(["Autenticar-se"])
        UC2(["Alterar senha no primeiro acesso"])
        UC3(["Consultar conversas"])
        UC4(["Enviar mensagem de texto"])
        UC5(["Receber mensagens"])
        UC6(["Compartilhar arquivo PDF"])
        UC7(["Consultar status de visualização"])
        UC8(["Gerenciar contas de funcionários"])
        UC9(["Cadastrar funcionário"])
        UC10(["Bloquear ou desativar conta"])
        UC11(["Controlar liberação gradual"])
        UC12(["Encaminhar credenciais iniciais"])
    end

    F --- UC1
    F --- UC2
    F --- UC3
    F --- UC4
    F --- UC5
    F --- UC6
    F --- UC7

    TI --- UC1
    TI --- UC8
    TI --- UC9
    TI --- UC10
    TI --- UC11
    TI --- UC12
    EMAIL --- UC12

    UC9 -.->|inclui| UC12
    UC8 -.->|administra| UC10
```

## Descrição dos atores

| Ator | Responsabilidade |
|---|---|
| **Funcionário** | Acessa a plataforma com credenciais individuais, conversa com usuários autorizados, compartilha PDFs e consulta o status de visualização das mensagens. |
| **Administrador da TI** | Cadastra e administra contas, controla bloqueios e desativações e coordena a liberação gradual dos usuários. Também utiliza a autenticação como usuário autorizado. |
| **Serviço de e-mail** | Sistema externo utilizado para encaminhar as informações iniciais de acesso ao funcionário. |

## Observações

- O cadastro público não existe: a criação de contas é exclusiva da equipe de TI (RF04, RN01 e RN02).
- No primeiro acesso, o funcionário precisa trocar a senha antes de utilizar as funcionalidades de comunicação (RF06 e RN04).
- O compartilhamento de arquivos é limitado a PDF (RF11 e RF12).
- O diagrama não inclui chamadas, áudio, imagens ou outros recursos fora do escopo inicial.
- A administração de contas deve ser protegida por autorização no servidor, e não apenas pela ocultação de opções na interface (SEG04).
