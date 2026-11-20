# Leituras por destinatário — Issue #80

Refs #80. Requisitos RF10, RN08, RNF08, RNF12 e SEG04.

## Contrato HTTP

Os endpoints usam cookies de sessão do mesmo domínio. Cada requisição chama
`criarServidor()` e `avaliarSessao(supabase)`, seguida da decisão de API de
`decidirRota()`. Não há cliente privilegiado nem chave `service_role` no fluxo.
Todas as respostas do handler usam `Cache-Control: private, no-store`.

### Registrar exibição

`POST /api/conversas/:conversaId/mensagens/:mensagemId/leituras`

`Content-Type: application/json`, corpo exato `{ "exibida": true }`. Não aceita
parâmetros na URL nem identidade, horário ou outros campos no corpo. O usuário
vem da sessão e o horário é gerado pelo PostgreSQL.

Resposta 200, inclusive na repetição idempotente:

```ts
type LeituraRegistrada = {
  usuarioId: string;
  conversaId: string;
  leitura: { mensagemId: string; usuarioId: string; lidaEm: string };
};
```

`public.register_message_read()` usa `INSERT ... ON CONFLICT DO NOTHING` sobre
a chave primária `(message_id, user_id)` e devolve o recibo existente. Repetir a
confirmação preserva `read_at` e não produz outro INSERT no Realtime.

Destinatários são os participantes atuais, diferentes do remetente, com acesso
autorizado à mensagem. O histórico do PR #101 pode incluir mensagens anteriores
à entrada na conversa: se `can_access_message()` permite visualizá-las, também
é possível registrar essa visualização. O PR #99 continua contando não lidas
apenas desde `joined_at`; confirmar uma mensagem mais antiga não cria nem reduz
essa contagem. Por isso a Inbox deve ser consultada novamente, sem decremento
local baseado no número de recibos.

### Consultar status

`GET /api/conversas/:conversaId/leituras?mensagemId=UUID&mensagemId=UUID`

Aceita de 1 a 50 IDs únicos, sem outros parâmetros. IDs são normalizados para
minúsculas. Um ID inexistente ou de outra conversa rejeita o lote inteiro com
403, sem resposta parcial. Consultar status jamais grava recibos.

```ts
type StatusLeiturasConversa = {
  usuarioId: string;
  conversaId: string;
  mensagens: {
    mensagemId: string;
    remetenteId: string;
    destinatarios: {
      usuarioId: string;
      entrouEm: string;
      lidaEm: string | null;
    }[];
  }[];
};
```

`lidaEm: null` é a ausência de recibo apenas daquele destinatário. A ordem das
mensagens acompanha os IDs solicitados. O contrato funciona para texto e PDF e
não retorna corpo de mensagem nem caminho de armazenamento privado.

| HTTP | Condição |
|---|---|
| 200 | Consulta ou registro idempotente concluído |
| 400 | UUID, lote, parâmetros ou corpo inválidos |
| 401 | Sessão ausente ou vencida |
| 403 | Conta negada, senha pendente, conversa/mensagem alheia ou registro por quem não é destinatário |
| 415 | POST sem Content-Type application/json |
| 500 | Falha interna, com mensagem pública |

## Banco e autorização

Aplicar a migration aditiva
`20261119002000_message_reads_realtime.sql`. As migrations existentes permanecem
intactas. A migration é independente dos PRs #99 e #101 e convive com ambos.

- O servidor verifica `can_access_conversation()` e a participação explícita.
- As RPCs são `SECURITY INVOKER`, com `search_path` vazio e EXECUTE somente para
  `authenticated`. Elas conferem `can_access_message()` e a conversa solicitada.
- A policy INSERT exige `user_id = auth.uid()`, `can_access_message()` e a
  condição de destinatário. Também protege chamadas diretas à tabela.
- O grant INSERT cobre apenas `message_id` e `user_id`. Clientes não podem
  escolher `read_at`, atualizar ou apagar recibos.
- A policy SELECT existente de `message_reads` aplica `can_access_message()`.
  Ela também restringe a entrega de Postgres Changes aos participantes
  autorizados. Admin TI precisa participar; `must_change_password = true`,
  bloqueio, remoção do grupo ou da conversa revogam acesso pela RLS.
- A publicação `supabase_realtime` recebe `message_reads`, preservando todas
  as tabelas já publicadas. Não há Broadcast aberto nem canal com conteúdo sem
  autorização.

## Exibição e integração com a interface

`observarMensagemExibida(elemento, opcoes)` observa o elemento de uma mensagem
recebida na conversa ativa. Exige interseção com a área visível por 300 ms,
documento visível, janela em foco, elemento conectado e CSS visível, inclusive
nos ancestrais. Uma mensagem maior que o viewport pode ser parcialmente exibida.
Nem montar o balão nem receber histórico ou evento Realtime marca leitura.

`useMensagemExibida(opcoes)` adapta esse ciclo a React e retorna um ref para o
elemento da mensagem. A camada de controle pode passá-lo por props ao componente
visual. Os callbacks devem ser estáveis. Desmontar o balão ou trocar a conversa
remove a observação, cancela o temporizador e aborta uma requisição em voo.
Sem IntersectionObserver, nenhuma leitura é inventada.

A tela do PR #94 continua em sua branch própria. Na composição dessa tela,
ligar o ref ao `<article>` de cada mensagem recebida em um componente filho;
hooks não devem ser chamados dentro do `map`. O componente visual recebe apenas
o ref, dados e ações, sem importar Supabase. O cliente Supabase e a assinatura
ficam em `controle-base-main/chat/`.

| Origem | Compatibilidade e ação |
|---|---|
| PR #101 — `MensagemChat` | `id`, `conversaId` e `remetenteId` satisfazem `MensagemParaLeitura`. Observar apenas mensagens persistidas que estejam exibidas. |
| PR #99 — `ConversaListada` | Recibo usa a mesma chave de `message_reads` considerada por `naoLidas`. Após confirmação ou atualização, consultar novamente a primeira página da Inbox; não decrementar localmente a cada POST repetido. |
| PR #94 — `MensagemConversa` | `adaptarEstadoLeitura()` recebe o modelo visual produzido pelo adaptador do #101. Preserva `enviando`/`falha` e todos os demais campos. |

`estadoLeituraDestinatario(status, usuarioId)` e o terceiro parâmetro de
`adaptarEstadoLeitura(mensagem, status, destinatarioId)` fornecem o estado de um
destinatário específico. Sem esse parâmetro, o estado agregado de um grupo só
vira `lida` quando todos os destinatários têm recibo. A leitura de A
não altera a de B. Uma lista vazia de destinatários não confirma leitura.

## Realtime

`assinarLeituras(supabase, { conversaId, mensagemIds, aoAtualizar, aoErro })`
assina INSERTs de `message_reads` por um filtro de até 50 IDs da página atual.
Os IDs devem vir do histórico autorizado do #101. Ao mudar a conversa ou os
IDs da página, encerrar a assinatura anterior e criar outra. Lote vazio não
cria assinatura. Cada chamada devolve uma função de cleanup assíncrona.

O evento invalida o snapshot; o payload bruto não é usado como confirmação.
`listarLeituras()` consulta a API novamente, reaplicando inclusive a duração
absoluta da sessão da aplicação. Há sincronização após SUBSCRIBED e reconexão,
agrupamento de eventos concorrentes, reporte de falhas e encerramento em
401/403. O cleanup aborta HTTP, remove o canal uma única vez e ignora retornos
atrasados. Ler status por Realtime não chama o POST de exibição.

Após falha de rede ao confirmar exibição, o observador permite nova tentativa
quando a mensagem volta a ficar visível, a aba recupera foco ou o navegador
volta a ficar online. O estado visual só é confirmado após resposta do servidor.

## Validação e homologação

Os testes `*.test.ts` exercitam API, contratos, assinatura, exibição e migrations
reais em PostgreSQL em memória com PGlite. Executar na raiz `npm ci` e, em
`base(tempval)/`, `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.

No Supabase de homologação, aplicar a migration e validar com Chrome Android e
Safari iOS: usar duas contas em conversa direta e três em grupo; deixar uma
mensagem fora do viewport; exibi-la com apenas um destinatário; verificar o
estado individual nos demais aparelhos e a contagem de não lidas. Repetir a
exibição, testar aba em segundo plano, reconexão, senha pendente e remoção da
participação. A troca pelo websocket hospedado e os aparelhos reais exigem essa
homologação; os testes locais não aplicam SQL nem usam contas do ambiente remoto.
