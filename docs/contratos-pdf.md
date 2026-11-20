# Contrato de anexos PDF — Issues #84 e #77

## Segurança e configuração

Toda rota usa `criarServidor()` e `avaliarSessao(supabase)` e autoriza a conversa com `can_access_conversation()`. Sessão ausente/vencida recebe **401**; conta negada, senha provisória pendente e não participante recebem **403**. Admin TI também precisa participar. O middleware mantém a restrição de dispositivo definida em `contratos-auth.md`; os handlers verificam autorização independentemente dele.

Aplicar a migration aditiva `20261119003000_secure_pdf_attachments.sql` e configurar no servidor:

| Variável | Valor / finalidade |
|---|---|
| `PDF_MAX_BYTES` | Inteiro positivo em bytes. Padrão local `10485760` (10 MiB); na Vercel `4000000` (inclusive sem variável explícita). Configuração inválida falha com 500. |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave exclusiva do servidor, sem prefixo `NEXT_PUBLIC_`, usada apenas nos bytes de Storage após autorização. |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase existente. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública existente do cliente de sessão; as mensagens continuam sujeitas à RLS. |

O limite do proxy/hosting e o limite global de Storage do projeto precisam comportar `PDF_MAX_BYTES` e, para a requisição, mais 64 KiB de overhead multipart. O bucket não fixa um segundo limite de 10 MiB: o limite configurável é aplicado pelo servidor aos bytes reais, além dos limites de infraestrutura.

O bucket `chat-pdfs` é privado, aceita MIME `application/pdf` e bloqueia acesso direto por `anon` e `authenticated`, inclusive diante de policies genéricas. O navegador não recebe chave privilegiada, caminho de Storage nem URL pública/assinada. Upload direto e geração de signed upload URLs ficam fechados para impedir que um cliente ignore o parser.

## Upload

`POST /api/conversas/{conversaId}/anexos/pdf`

Enviar `multipart/form-data` com **exatamente um campo `arquivo`**, contendo um `File`. Não definir manualmente o cabeçalho `Content-Type`: o navegador fornece o boundary. IDs precisam ser UUIDs. Não enviar remetente, tipo da mensagem, body, caminho ou outros campos; o servidor obtém a identidade da sessão e gera o caminho aleatório.

Validações obrigatórias no servidor:

- Leitura do corpo interrompida acima do limite mais 64 KiB, mesmo sem `Content-Length` ou com tamanho declarado falso.
- Tamanho real do arquivo dentro de `PDF_MAX_BYTES`; MIME exatamente `application/pdf` e nome terminado em `.pdf`, de até 180 bytes UTF-8, sem separadores de caminho ou controles.
- Magic bytes `%PDF-` no início, versão PDF, `startxref` apontando para tabela/stream xref e encerramento `%%EOF` sem dados extras.
- Parser `pdf-lib` em modo de rejeição de objetos inválidos, catálogo e árvore com pelo menos uma página válida. Aceita xref clássico e comprimido. PDFs criptografados, truncados ou sem páginas são rejeitados porque a estrutura não pode ser validada.
- Imagens, áudio, vídeo, Word e Excel renomeados e com MIME forjado são rejeitados. Um PDF legítimo que contenha imagens continua sendo um PDF permitido. A validação estrutural não substitui um serviço de antivírus.

O objeto é salvo como `{conversaId}/{usuarioId}/{uuidAleatorio}.pdf`, com `upsert=false`. A mensagem é inserida usando o JWT do participante em `public.messages`: `message_type='pdf'`, `body=null`, `attachment_path` e `attachment_name`. A RLS revalida participação, remetente e existência do objeto criado pelo servidor; o caminho é único. Se a inserção falhar, o servidor tenta remover o objeto. Se a remoção falhar, o órfão permanece privado e sem rota de download; um evento sem dados do arquivo é registrado para operação.

Resposta **201** (nomes e tipos da mensagem alinhados ao contrato de chat do PR #101):

```json
{
  "usuarioId": "22222222-2222-4222-8222-222222222222",
  "mensagem": {
    "id": "33333333-3333-4333-8333-333333333333",
    "conversaId": "11111111-1111-4111-8111-111111111111",
    "remetenteId": "22222222-2222-4222-8222-222222222222",
    "criadaEm": "2026-11-19T00:00:00.000Z",
    "editadaEm": null,
    "tipo": "pdf",
    "conteudo": null,
    "nomeArquivo": "relatório.pdf"
  },
  "anexo": {
    "tamanhoBytes": 2048,
    "downloadUrl": "/api/conversas/11111111-1111-4111-8111-111111111111/anexos/33333333-3333-4333-8333-333333333333"
  }
}
```

Tipos exportados por `@controle/anexos/contratos`: `PdfEnviado`, `ErroAnexo` e `ArquivoPdf`. Rotas finas em `base(tempval)`, lógica, validação, Storage e testes em `controle-base-main/anexos`. A UI em `design-em-react` permanece pura, sem Supabase.

## Download autenticado

`GET /api/conversas/{conversaId}/anexos/{mensagemId}`

A URL de aplicação exige a sessão do participante em **cada requisição**. O servidor consulta a mensagem PDF pela conversa com RLS, verifica o caminho e busca os bytes no bucket privado. O cliente não fornece o caminho do objeto. Mensagem de outra conversa, inexistente ou que não seja PDF retorna 404 após autorizar a conversa. Revogação de participação, bloqueio da conta ou troca obrigatória de senha impede o próximo acesso, mesmo para quem já conhece a URL.

Resposta **200** binária: `Content-Type: application/pdf`, `Content-Disposition: attachment` com nome UTF-8, `X-Content-Type-Options: nosniff` e `Cache-Control: private, no-store`. As respostas de upload e erro também usam `no-store`.

## Integração do seletor — Issue #77

A tela React deve receber o limite (`obterLimitePdf()` calculado no servidor) e ações por props. Usar `accept="application/pdf,.pdf"`, mostrar nome/tamanho, permitir um arquivo por envio e apresentar o feedback retornado pelo servidor. O wrapper em `controle-base-main` envia `FormData` com `arquivo` e cookies de sessão, trata a resposta e entrega `PdfEnviado` à tela. A validação visual complementa a validação do servidor.

Enquanto envia, desabilitar o envio duplicado. Em 201, inserir a mensagem retornada no estado do chat e limpar a seleção; em erro, preservar a seleção para correção/tentativa. O balão pode montar a URL de download com os IDs da conversa e da mensagem para anexos vindos do histórico. Não usar `attachment_path` para criar links.

## Erros

Os handlers respondem JSON `{ "erro": "Mensagem legível", "codigo": "CODIGO" }`. O middleware existente pode interromper a requisição com apenas `{ "erro": "Mensagem legível" }`; nesse caso, a interface usa o status HTTP como fallback. Por isso, `ErroAnexo.codigo` é opcional.

| HTTP | Códigos | Tratamento na interface |
|---|---|---|
| 400 | `ID_INVALIDO`, `NOME_INVALIDO`, `FORMULARIO_INVALIDO` | Corrigir arquivo/formulário; enviar um único campo `arquivo`. |
| 401 | `SESSAO_INVALIDA` | Pedir novo login. |
| 403 | `ACESSO_NEGADO` | Impedir acesso e seguir o fluxo de conta/primeiro acesso aplicável. |
| 404 | `ANEXO_NAO_ENCONTRADO` | Informar que o PDF não está disponível nessa conversa. |
| 413 | `PDF_MUITO_GRANDE` | Mostrar o limite recebido por props e pedir arquivo menor. |
| 415 | `MIME_INVALIDO`, `PDF_INVALIDO`, `FORMATO_INVALIDO` | Pedir PDF válido e legível; renomear arquivos não resolve. |
| 500 | `CONFIGURACAO_INVALIDA`, `STORAGE_INDISPONIVEL`, `AUTORIZACAO_INDISPONIVEL`, `UPLOAD_FALHOU`, `MENSAGEM_FALHOU`, `CONSULTA_FALHOU`, `DOWNLOAD_FALHOU`, `ERRO_INTERNO` | Mostrar falha genérica e permitir tentativa posterior; detalhes internos não são expostos. |

## Verificação

Na raiz do repositório:

```sh
npm install
npm run typecheck --workspace 'base(tempval)'
npm run lint --workspace 'base(tempval)'
npm test --workspace 'base(tempval)'
npm run build --workspace 'base(tempval)'
```

Os testes incluem arquivos válidos, xref clássico/comprimido, limite configurável, MIME e conteúdo falsificados, corpo multipart limitado, handlers sem middleware, compensação e RLS real das migrations em PostgreSQL em memória. O teste de banco fornece os schemas de plataforma `auth`/`storage`; chamadas de HTTP ao serviço Supabase Storage são simuladas nos testes de API. A homologação em ambiente Supabase exige aplicar a migration e configurar as chaves acima.
