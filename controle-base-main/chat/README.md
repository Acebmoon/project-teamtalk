# Listagem de conversas autorizadas

Refs #78. Requisitos RF08, RF09, RF14, RN05, RNF08, RNF09, RNF12 e SEG04.

## Entrada HTTP

`GET /api/conversas?limite=20&cursor=<proximoCursor>` usa os cookies de sessão do mesmo domínio. `limite` é inteiro de 1 a 50, com padrão 20. Omitir `cursor` na primeira página. Parâmetros desconhecidos e duplicados recebem 400.

A rota em `base(tempval)/src/app/api/conversas/route.ts` encaminha para `@controle/chat/listar-conversas`. O handler cria o cliente SSR com `criarServidor()` e chama `avaliarSessao(supabase)` em toda requisição. A identidade vem de `auth.getUser()`.

| HTTP | Condição | Corpo |
|---|---|---|
| 200 | Sessão e conta autorizadas, senha já trocada | `PaginaConversas` |
| 400 | Limite ou cursor inválido | `{ "erro": "Paginação inválida. Use limite de 1 a 50 e cursor válido." }` |
| 401 | Sessão ausente ou vencida | `{ "erro": "Sessão ausente ou vencida." }` |
| 403 | Conta negada ou `must_change_password = true` | `{ "erro": "Acesso não autorizado." }` |
| 500 | Falha na consulta ou inconsistência de participação | `{ "erro": "Não foi possível listar as conversas." }` |

Todas as respostas do handler usam `Cache-Control: private, no-store`. O middleware também aplica a restrição de dispositivo e pode responder 403 antes de executar o handler, conforme `docs/contratos-auth.md`.

## Payload e tipos

Os contratos TypeScript são exportados de `@controle/chat/contratos`. As datas são ISO 8601 com fuso e podem conter microssegundos.

```json
{
  "usuarioId": "00000000-0000-0000-0000-000000000001",
  "conversas": [
    {
      "id": "00000000-0000-0000-0000-000000000078",
      "tipo": "direct",
      "titulo": "Conversa direta",
      "criadaEm": "2026-11-18T12:00:00+00:00",
      "atualizadaEm": "2026-11-18T12:00:00+00:00",
      "atividadeEm": "2026-11-19T14:00:00.123456+00:00",
      "participantes": [
        { "usuarioId": "00000000-0000-0000-0000-000000000001", "entrouEm": "2026-11-18T12:00:00+00:00" },
        { "usuarioId": "00000000-0000-0000-0000-000000000002", "entrouEm": "2026-11-18T12:00:00+00:00" }
      ],
      "ultimaMensagem": {
        "id": "00000000-0000-0000-0000-000000000079",
        "remetenteId": "00000000-0000-0000-0000-000000000002",
        "tipo": "text",
        "conteudo": "Olá, equipe",
        "nomeArquivo": null,
        "criadaEm": "2026-11-19T14:00:00.123456+00:00"
      },
      "naoLidas": 1
    }
  ],
  "paginacao": { "limite": 20, "proximoCursor": null }
}
```

`tipo` da conversa aceita `direct` e `group`. `ultimaMensagem` é `null` quando não há mensagem visível. Para texto, a mensagem usa `tipo = text`, `conteudo` preenchido e `nomeArquivo = null`. Para PDF, usa `tipo = pdf`, `conteudo = null` e `nomeArquivo` preenchido. O armazenamento do PDF continua sujeito ao fluxo autorizado de anexos.

`participantes` contém os IDs e datas de entrada visíveis sob a RLS da conversa. A política atual de `public.users` permite ler o próprio perfil ou perfis acessíveis à TI. Este contrato usa somente os campos de `conversation_participants`. O título vem de `conversations.title`, com fallback `Conversa direta` ou `Conversa em grupo` para títulos vazios. Exibir nomes dos demais participantes depende de um contrato de perfis autorizado pela equipe.

`naoLidas` conta mensagens recebidas desde `joined_at` do usuário, incluindo PDFs, sem registro em `message_reads` para esse usuário. Mensagens enviadas pelo próprio usuário e mensagens anteriores à sua entrada ficam fora da contagem. A listagem é somente leitura.

## Paginação e consistência

A ordenação é `atividadeEm DESC, id DESC`. A atividade é a maior data entre `conversations.updated_at` e a última mensagem. Conversas vazias usam `updated_at`. A última mensagem é determinada por `messages.created_at DESC, messages.id DESC`.

O cursor codifica em base64url o par `{ atividadeEm, id }` do último item devolvido. O servidor preserva os microssegundos do banco. A próxima consulta seleciona pares estritamente menores. `proximoCursor = null` indica o fim, inclusive para página vazia ou página com exatamente o limite e sem item adicional.

Cada página é uma leitura atual do banco. Nova mensagem ou alteração na conversa pode movê-la para o início entre requisições. Para atualizar a Inbox após eventos ou voltar a incluir conversas movidas, reiniciar pela primeira página e reconciliar por `id`.

## Consulta SQL e autorização

Aplicar a migration incremental `20261119000000_list_authorized_conversations.sql` após as quatro migrations já existentes. Ela publica `public.list_authorized_conversations(p_limit integer, p_before_activity_at timestamptz, p_before_id uuid)`.

A função é `STABLE`, `SECURITY INVOKER`, com `search_path` vazio e execução concedida a `authenticated`. Ela aplica participação por `auth.uid()`, exige `can_access_conversation()` e lê conversas, participantes, mensagens e recibos sob as políticas RLS existentes. Admin TI também precisa participar. A consulta usa os índices existentes de participantes, mensagens e leituras.

A RPC valida limite e par completo do cursor e retorna até `p_limit + 1` linhas para detectar continuação. O serviço entrega até `p_limit` itens e confere que o usuário autenticado está entre os participantes de todas as linhas recebidas, incluindo a adicional. Os agregados de participantes e não lidas são calculados para essa página no banco.

## Integração com #79, #80 e PR #94

| Consumidor | Contrato |
|---|---|
| Issue #79 | `id` identifica a conversa. Texto persistido em `messages` atualiza automaticamente a última mensagem e a ordem pela data de criação. Após confirmação ou evento realtime, atualizar a primeira página e reconciliar por ID. |
| Issue #80 | `naoLidas` depende da existência de `message_reads(message_id, user_id)`. Após registrar leitura efetiva, atualizar a contagem. A confirmação por destinatário do histórico exige o contrato de leituras da #80. |
| PR #94 | `usuarioId` alimenta a prop homônima. `pagina.conversas.map(adaptarConversaResumo)` produz objetos compatíveis com `ConversaResumo`. O adaptador formata o horário no fuso do aparelho, usa o nome para preview de PDF e gera as iniciais do título. |

O módulo `@controle/chat/adaptar-conversa` pode ser importado pelo cliente e depende apenas dos contratos. Na integração do PR #94, a camada de controle importa a tela por `@design/telas/conversas` e fornece `conversas` por props. A tela continua recebendo callbacks para seleção e envio conforme seu contrato.

## Verificação

Na raiz executar `npm install`. A partir de `base(tempval)/`, executar `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`.

Os testes `*.test.ts` deste diretório exercitam parâmetros e microssegundos do cursor, limite e continuação, sessão real via `avaliarSessao` com cliente simulado, respostas 401/403, troca de senha pendente, validação de participação inclusive para Admin TI e adaptação dos metadados da última mensagem.
