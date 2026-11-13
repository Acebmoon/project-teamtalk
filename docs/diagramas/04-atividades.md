# Diagrama de atividades — envio de mensagem

## Objetivo

Descrever o fluxo realizado por um funcionário para enviar uma mensagem no TeamTalk. O processo contempla texto e anexo PDF opcional, validações de segurança no servidor e os caminhos de sucesso e erro.

## Diagrama

```mermaid
flowchart TD
    A((Início)) --> B["Funcionário abre uma conversa"]
    B --> C["Escreve a mensagem"]
    C --> D["Aciona enviar"]
    D --> E{"Sessão e permissões são válidas?"}

    E -->|Não| F["Recusar operação e informar acesso negado"]
    F --> Z((Fim))

    E -->|Sim| G{"Deseja anexar um arquivo?"}
    G -->|Não| L["Preparar mensagem de texto"]
    G -->|Sim| H["Selecionar arquivo PDF"]
    H --> I["Enviar arquivo ao servidor"]
    I --> J{"Conteúdo é PDF válido e respeita o limite?"}

    J -->|Não| K["Exibir erro de arquivo"]
    K --> H
    J -->|Sim| L

    L --> M["Persistir mensagem no servidor"]
    M --> N{"Persistência concluída?"}

    N -->|Não| O["Informar falha no envio"]
    O --> P{"Funcionário deseja tentar novamente?"}
    P -->|Sim| M
    P -->|Não| Z

    N -->|Sim| Q["Disponibilizar mensagem na conversa"]
    Q --> R["Destinatário abre a conversa"]
    R --> S["Registrar status de visualização"]
    S --> T["Atualizar status para o remetente"]
    T --> Z
```

## Etapas do processo

1. **Composição:** o funcionário abre uma conversa, escreve o conteúdo e aciona o envio.
2. **Autorização:** antes de executar a operação protegida, o servidor valida a sessão e as permissões do usuário.
3. **Anexo opcional:** se houver arquivo, o servidor verifica se o conteúdo é realmente PDF e se respeita o limite de tamanho definido pelo projeto.
4. **Persistência:** a mensagem é armazenada. Em caso de falha, o sistema informa o problema e permite uma nova tentativa.
5. **Disponibilização:** após a confirmação do servidor, a mensagem fica disponível na conversa do destinatário.
6. **Visualização:** quando o destinatário abre a conversa, o sistema registra e atualiza o status de visualização.

## Regras e decisões

- **Anexo opcional:** mensagens podem ser enviadas somente como texto ou com PDF.
- **Arquivo inválido:** formatos diferentes de PDF ou arquivos que não atendam às validações são recusados (RF11, RF12, RNF11 e SEG05).
- **Acesso negado:** uma sessão ausente, vencida ou sem permissão não pode enviar a mensagem (RF14 e SEG04).
- **Falha de persistência:** o usuário é informado e pode optar por tentar novamente.
- **Visualização:** o status só muda para Visualizada quando o destinatário efetivamente abre a conversa, conforme RF10.

## Observação de escopo

O fluxo não representa envio de notificações push, imagens, áudio, chamadas ou documentos em outros formatos, pois esses itens não estão definidos como funcionalidades do MVP.

## Rastreabilidade

RF06, RF08, RF09, RF10, RF11, RF12, RF14, RN04, RN05, RN06, RN08, RNF11, RNF12, SEG03, SEG04, SEG05 e SEG06.
