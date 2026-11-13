# 7. Diagramas de fluxos e estados

## 7.1 Estados da conta

`users.status` aceita exatamente `pending`, `active`, `blocked` e `disabled`. A migration estabelece os valores, **não** uma máquina de transições obrigatórias. O diagrama representa as operações planejadas pela TI.

```mermaid
stateDiagram-v2
  [*] --> pending: cadastro no Auth
  pending --> active: TI libera
  active --> blocked: TI bloqueia
  active --> disabled: TI desativa
  blocked --> active: TI reautoriza
  pending --> disabled: TI desativa
  blocked --> disabled: TI desativa
```

- `pending`: perfil criado, aguardando autorização.
- `active`: pode prosseguir **somente** se demais requisitos de liberação estiverem satisfeitos.
- `blocked` e `disabled`: acesso negado.
- A gestão de transições no painel é **pendente**; o enum e as verificações já existem.

## 7.2 Primeiro acesso

```mermaid
stateDiagram-v2
  [*] --> TrocaPendente: must_change_password = true
  TrocaPendente --> TrocaPendente: senha inválida / igual
  TrocaPendente --> SenhaTrocada: Auth altera encrypted_password
  SenhaTrocada --> NovoLogin: trigger define false e sessão global encerrada
  NovoLogin --> AcessoNormal: login novo + autorização
```

A mudança para `false` ocorre por trigger após alteração real da senha no Auth, não por botão do navegador. Quando a TI redefinir senha no futuro, deve tornar a marcar `true` **depois** da redefinição, conforme `docs/contratos-auth.md`. A ação de troca tem validações de mínimo de dez caracteres, máximo de 72 bytes e confirmação idêntica, seguindo o contrato técnico já implementado.

## 7.3 Decisão da sessão

`decidirAcesso` retorna cinco estados. A ordem efetiva é: usuário existente → autorizado → sessão dentro da validade → senha trocada → acesso normal. O limite padrão técnico atual é 12 horas desde o método de login inicial da sessão; `token_refresh` não reinicia esse prazo.

```mermaid
flowchart TD
  I["Requisição em navegador permitido"]
  U{"getUser válido?"}
  A{"get_access_state.authorized?"}
  E{"AMR e prazo válidos?"}
  P{"must_change_password?"}
  I --> U
  U -- Não --> L["login"]
  U -- Sim --> A
  A -- Não --> N["acesso-negado"]
  A -- Sim --> E
  E -- Não --> X["sessao-vencida"]
  E -- Sim --> P
  P -- Sim --> T["trocar-senha"]
  P -- Não --> S["seguir"]
```

`decidirRota` converte esses estados em redirecionamentos web ou erros JSON (`401` por sessão ausente/vencida; `403` por autorização insuficiente ou troca pendente). Para `/admin/**`, funcionário é redirecionado ao início; em `/api/admin/**`, recebe `403`. O middleware de dispositivo precede esse fluxo.

## 7.4 Estados da mensagem

`messages` persiste uma mensagem. `message_reads` guarda um registro por destinatário que leu, com `read_at`. Os rótulos da interface são **estados derivados**, não coluna enum de `messages`. O fluxo de gravação e atualização visual ainda não foi implementado.

```mermaid
stateDiagram-v2
  [*] --> Enviada: texto/PDF persistido
  Enviada --> Lida: destinatário visualiza e grava message_reads
  Lida --> Lida: novas consultas
```

Em conversa com mais de um destinatário, cada leitura é registrada por par `message_id` + `user_id`. Não presumir confirmação de todos os destinatários a partir de um único registro.

## 7.5 Sequências e fronteiras

### Autenticação e primeiro acesso — implementado na base

```mermaid
sequenceDiagram
  actor F as Funcionário
  participant N as Next.js (rota/middleware)
  participant C as controle-base-main
  participant A as Supabase Auth
  participant B as PostgreSQL/RPC
  F->>N: abre /login e envia credenciais
  N->>C: entrar / avaliarSessao
  C->>A: signInWithPassword e getUser
  C->>B: get_access_state()
  B-->>C: authorized, must_change_password, it_admin
  C-->>N: decidirAcesso e decidirRota
  N-->>F: /primeiro-acesso se necessário
  F->>N: envia nova senha
  N->>C: trocarSenha
  C->>A: updateUser(password)
  A->>B: trigger on_auth_password_changed
  B-->>C: must_change_password = false
  C->>A: signOut global
  N-->>F: /login?aviso=senha-alterada
```

### Mensagem e leitura — fluxo previsto, ainda pendente

```mermaid
sequenceDiagram
  actor R as Remetente
  actor D as Destinatário
  participant C as Controle servidor
  participant B as PostgreSQL/RLS
  R->>C: enviar texto
  C->>B: validar participação e persistir messages
  B-->>C: mensagem gravada
  C-->>D: atualização autorizada (Realtime previsto)
  D->>C: visualizar mensagem
  C->>B: registrar message_reads
  B-->>C: read_at
  C-->>R: estado lida (atualização prevista)
```

O fluxo de mensagens é um contrato de implementação futura, não uma evidência de testes já executados.
