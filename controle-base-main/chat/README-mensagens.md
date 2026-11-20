# Histórico, envio de texto e recebimento em tempo real

Refs #79. RF08, RF09, RNF08, RNF09, RNF10, RNF12 e SEG04. Os IDs e timestamps preservados neste contrato permitem implementar RN08 e os recibos por destinatário na #80.

## Arquitetura e autorização

`base(tempval)/src/app/api/conversas/[conversaId]/mensagens/route.ts` somente reexporta os handlers de `@controle/chat/mensagens`. Servidor, validação, contratos, transporte HTTP, assinatura Realtime, adaptação e testes ficam em `controle-base-main/chat/`. A apresentação continua recebendo dados e ações por props, sem Supabase em `design-em-react/`.

Toda requisição cria o cliente SSR com `criarServidor()` e executa `avaliarSessao(supabase)`. A decisão HTTP reutiliza `decidirRota()`, incluindo a duração máxima da sessão. A identidade vem de `auth.getUser()`. O servidor exige `can_access_conversation(conversaId)` e confere uma participação cujo `user_id` corresponde ao usuário autenticado. Admin TI também precisa participar.

O INSERT usa o cliente do próprio usuário, sujeito à RLS. A policy verifica novamente `sender_id = auth.uid()` e `can_access_conversation()` no momento da escrita, cobrindo revogação entre a verificação do servidor e a persistência. Não há uso de `service_role`.

## HTTP

As chamadas usam os cookies do mesmo domínio. `conversaId` deve ser UUID. Todas as respostas dos handlers incluem `Cache-Control: private, no-store`. O bloqueio de dispositivo do middleware permanece aplicável conforme `docs/contratos-auth.md`.

| Operação | Entrada | Sucesso |
|---|---|---|
| `GET /api/conversas/:conversaId/mensagens` | `limite` de 1 a 50, padrão 20; `cursor` opcional | 200, `PaginaMensagens` |
| `POST /api/conversas/:conversaId/mensagens` | `Content-Type: application/json`, corpo `{ "conteudo": "Olá" }`, sem parâmetros na URL | 201, `TextoEnviado` |

O envio aceita somente `conteudo`. Campos como `sender_id`, `remetenteId`, `usuarioId`, tipo, IDs, timestamps e anexos são rejeitados. O servidor define `sender_id` pela sessão e persiste `message_type = text`, `attachment_path = null` e `attachment_name = null`, respeitando `messages_payload_matches_type`.

O texto deve ter entre 1 e 4.000 unidades UTF-16 antes de remover espaços nas extremidades, acompanhando `maxLength={4000}` da tela do PR #94. Texto formado apenas por espaços, quebras de linha ou outros espaços Unicode é rejeitado, assim como NUL. Quebras de linha internas são preservadas.

| HTTP | Condição |
|---|---|
| 400 | UUID, parâmetros, JSON, formato do envio ou texto inválidos |
| 401 | Sessão ausente ou vencida |
| 403 | Conta negada, `must_change_password = true`, conversa inexistente/alheia ou participação revogada |
| 415 | Tipo de conteúdo diferente de JSON no envio |
| 500 | Falha interna de autorização, consulta, persistência ou inconsistência no retorno |

Erros usam `{ "erro": "mensagem pública" }`, sem detalhes internos do banco.

## Contratos e paginação

`@controle/chat/contratos-mensagens` exporta `MensagemChat`, `PaginaMensagens`, `EnvioTexto`, `TextoEnviado` e `ErroMensagens`.

```ts
type MensagemChat = {
  id: string;
  conversaId: string;
  remetenteId: string;
  criadaEm: string;
  editadaEm: string | null;
} & (
  | { tipo: "text"; conteudo: string; nomeArquivo: null }
  | { tipo: "pdf"; conteudo: null; nomeArquivo: string }
);
type PaginaMensagens = {
  usuarioId: string;
  conversaId: string;
  mensagens: MensagemChat[];
  paginacao: { limite: number; proximoCursor: string | null };
};
type TextoEnviado = { usuarioId: string; mensagem: MensagemChat };
```

O histórico inclui metadados de PDFs já existentes, sem expor `attachment_path`, URLs assinadas ou implementar upload/download. O endpoint de envio desta entrega aceita somente texto.

A consulta busca as mensagens mais recentes por `(created_at DESC, id DESC)`, com uma linha adicional para detectar continuação. Cada página é devolvida em ordem cronológica crescente para renderizar os balões. `proximoCursor` referencia a mensagem mais antiga da página, com data e ID, e busca mensagens estritamente anteriores. Ele é `null` quando não há mais itens. Datas conservam os microssegundos do PostgreSQL. Parâmetros desconhecidos, duplicados e cursores malformados são rejeitados antes de compor filtros PostgREST.

Na continuação, passar `paginacao.proximoCursor` como `cursor`. Confirmar envios e reconciliar páginas/eventos por ID com `reconciliarMensagens()`; a ordenação desse helper preserva microssegundos e normaliza o fuso.

## Supabase Realtime

`@controle/chat/assinar-mensagens` exporta `assinarMensagens(supabase, { conversaId, aoAtualizar, aoErro })`. Usar um cliente de navegador autenticado criado por `@controle/supabase/navegador`, com a chave pública.

A assinatura escuta somente `INSERT` em `public.messages`, filtrando `conversation_id`. Cada assinatura recebe nome único e retorna uma função assíncrona de encerramento. O recebimento de eventos continua sujeito à policy SELECT existente, baseada em `can_access_conversation()`.

O websocket sinaliza mudanças; `aoAtualizar` recebe a página mais recente de até 50 mensagens buscada pela API. Isso reaplica a autorização de servidor e a expiração de sessão da aplicação, além da RLS. Nenhum payload bruto de mensagem do websocket é repassado à tela. A leitura inicial ocorre depois de `SUBSCRIBED`, fechando a janela entre leitura inicial e inscrição. Eventos durante uma leitura geram outra sincronização, sem consultas concorrentes.

Cada `SUBSCRIBED` após reconexão refaz a primeira página. Interrupções e erros HTTP são repassados a `aoErro`; 401/403 encerram a assinatura. O encerramento aborta a requisição em voo, remove somente o canal criado e impede callbacks posteriores. O SDK do Supabase gerencia a reconexão do canal. A função pode ser usada junto com uma leitura HTTP independente para apresentar histórico mesmo durante uma indisponibilidade do websocket.

`aoAtualizar` fornece uma janela recente, sem apagar páginas anteriores. Reconciliar por ID. Se houver mais de 50 mensagens durante a interrupção, seguir os cursores até alcançar o histórico conhecido, ou conforme o usuário carrega mensagens anteriores. As mensagens permanecem persistidas. Ao trocar de conversa/desmontar, chamar o encerramento e ignorar resultados do contexto anterior. Em 401/403, limpar os dados e encaminhar ao fluxo de acesso correspondente.

Referência técnica: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Integração com PR #99, PR #94 e Issue #80

| Integração | Contrato |
|---|---|
| PR #99 / #78 | Usar `ConversaListada.id` como `conversaId`. Os campos `id`, `remetenteId`, `tipo`, `conteudo`, `nomeArquivo` e `criadaEm` de `MensagemChat` são compatíveis com `UltimaMensagemConversa`. Após envio confirmado ou atualização, refazer a primeira página de conversas para atualizar atividade, preview e `naoLidas`. |
| PR #94 | `adaptarMensagemConversa()` produz o modelo `MensagemConversa`; importar a tela na camada de controle por `@design/telas/conversas`. Fornecer `usuarioId`, mensagens adaptadas e callbacks por props. `enviarMensagemTexto()` confirma o envio somente após 201. |
| #80 | Preservar `id`, `conversaId`, `remetenteId` e `criadaEm`. Registrar visualização efetiva por destinatário em `message_reads`. Esta entrega não escreve recibos e não atribui estado `lida`. |

O adaptador utiliza `estado = enviada` para mensagens persistidas. Um nome de remetente obtido por fluxo autorizado pode ser fornecido ao adaptador; sem esse dado, ele exibe o rótulo genérico `Participante`. O histórico não amplia as políticas de leitura de perfis.

Exemplo de uso na camada de controle que alimentará a tela:

```ts
import { criarNavegador } from "@controle/supabase/navegador";
import { assinarMensagens } from "@controle/chat/assinar-mensagens";
import { enviarMensagemTexto } from "@controle/chat/mensagens-cliente";
import { reconciliarMensagens } from "@controle/chat/reconciliar-mensagens";

const encerrar = assinarMensagens(criarNavegador(), {
  conversaId,
  aoAtualizar: (pagina) => {
    setMensagens((atuais) => reconciliarMensagens(atuais, pagina.mensagens));
    // Atualizar também a primeira página da Inbox do PR #99.
  },
  aoErro: tratarErroDeAcessoOuConexao,
});

const resultado = await enviarMensagemTexto(conversaId, conteudo);
setMensagens((atuais) => reconciliarMensagens(atuais, [resultado.mensagem]));
// No cleanup do efeito, encerrar() e invalidar callbacks da conversa anterior.
```

Os PRs #99 e #94 estavam abertos nos commits `412627186612f5e31332701277f8053ba7925a63` e `15c9b3b91966278af7dda0db0ea348c09b68bf75`. Esta branch parte de `main` (`31be7e74187256f26ff71c6c28830889b28e07c4`), sem incorporar esses PRs. Os novos módulos usam nomes de arquivo distintos para facilitar a integração.

## Migration e validação

Aplicar `20261119001000_text_messages_realtime.sql` depois das migrations da fundação. Ela não depende da migration da #78. A migration adiciona a policy INSERT de texto, limita os grants de inserção às colunas do envio, cria índice composto para o histórico e inclui `messages` na publicação `supabase_realtime`, preservando tabelas já publicadas. Se a publicação ainda não existir, ela é criada.

O limite adicional do banco é de 4.000 caracteres Unicode com conteúdo não formado apenas por whitespace PostgreSQL. A constraint é `NOT VALID` para preservar conteúdo legado, sendo aplicada a todas as novas escritas. A API mantém a regra UTF-16 mais restrita da interface. As migrations anteriores e a constraint `messages_payload_matches_type` permanecem intactas.

Na raiz, executar `npm ci`. Em `base(tempval)/`, executar `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. Os testes de banco usam PGlite e aplicam os arquivos SQL reais, com roles e contexto de autenticação simulados. Eles não substituem a validação do serviço websocket hospedado.

Verificações desta entrega: 158 testes passaram (106 novos, incluindo 19 cenários de SQL/RLS), além de typecheck, lint e build. Uma cópia isolada com os arquivos dos PRs #99 e #94 nos commits acima passou em 207 testes, typecheck, lint e build; verificações TypeScript adicionais confirmaram a compatibilidade com `UltimaMensagemConversa` e `MensagemConversa`. O build em execução respondeu 401 para GET/POST Android e GET iPhone sem sessão, e 403 para GET/POST desktop.

Para homologar com duas contas: aplicar a migration em ambiente de teste, abrir a mesma conversa em dois celulares autorizados, iniciar a assinatura em ambos, enviar texto em cada sentido e conferir recebimento sem recarregar. Interromper/restaurar a conexão e conferir recuperação sem duplicação por ID. Tentar uma terceira conta, senha pendente e participação revogada; não deve haver leitura nem envio. A integração visual completa depende do PR #94; a listagem da Inbox depende do PR #99. Não foram utilizados usuários ou credenciais reais neste ambiente.
