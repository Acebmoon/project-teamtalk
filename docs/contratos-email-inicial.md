# Primeiro acesso por e-mail (Refs #83)

Cadastro e redefinição de senha pela TI enviam uma mensagem individual ao e-mail da conta, com usuário, senha provisória, prazo UTC e instruções de troca pelo celular. A URL contém somente `/login`. O formulário mantém o contrato de senha provisória do PR #100; a senha trafega nos corpos das requisições administrativas HTTPS e no corpo do e-mail, sem persistência em texto puro na aplicação.

## Integração e autorização

A branch foi criada a partir da `main` e incorpora o PR #100, ainda aberto, como dependência do cadastro/redefinição. As rotas existentes `POST /api/admin/contas` e `PATCH /api/admin/contas/[id]` continuam finas, com aliases `@controle/*`. Os handlers e server actions chamam `exigirAdminTI()` antes de ler parâmetros, criar o cliente de serviço ou executar operações. O guard usa `criarServidor()` e `avaliarSessao()`; funcionário recebe 403, sessão ausente/vencida recebe 401. Nenhuma nova API pública de envio ou reenvio foi exposta.

O serviço fica em `controle-base-main/admin/servico.ts`; configuração, adaptador HTTPS e template ficam em `controle-base-main/email/`. Os módulos que leem segredos usam `server-only`. A interface React recebe ações por props e não acessa Supabase. O cliente `service_role` só é construído depois do guard e não persiste sessão. As RPCs de entrega revalidam o Admin TI no banco e têm execução exclusiva de `service_role`.

## Configuração

Definir as variáveis somente no servidor, em `base(tempval)/.env.local` ou no ambiente de implantação. Não usar prefixo `NEXT_PUBLIC_` para chaves de serviço/e-mail.

| Variável | Política |
|---|---|
| `EMAIL_PROVIDER` | `resend` habilita o adaptador; ausente ou `disabled` recusa emissão antes de alterar contas/senhas |
| `EMAIL_FROM` | Um endereço corporativo de remetente, de domínio verificado no provedor |
| `EMAIL_API_KEY` | Chave privada de envio, sem espaços, nunca retornada ao navegador |
| `TEAMTALK_PUBLIC_URL` | Origem HTTPS, sem caminho adicional, credenciais, query ou fragmento; HTTP de loopback somente fora de produção |
| `CREDENCIAL_INICIAL_VALIDADE_HORAS` | Inteiro de 1 a 168; padrão 24 |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave privada do servidor, usada conforme o contrato administrativo |

Imports, build, login e consultas administrativas não exigem configuração de e-mail. Cadastro e redefinição sem configuração retornam 503 `email-configuracao` antes das mutações no Auth. Bloquear, reativar e desativar não dependem do adaptador. Testes usam rede simulada e não enviam mensagens reais.

O adaptador chama somente `POST https://api.resend.com/emails`, com um destinatário, sem CC/BCC, anexos ou recursos remotos no template. Autorização fica no cabeçalho; conteúdo fica no corpo. `Idempotency-Key` usa apenas o UUID operacional da entrega. Há timeout de 10 segundos, cache desabilitado, redirecionamentos recusados e nenhuma repetição automática. Não se usa adaptador de console nem persistência local de mensagens. Configurar o domínio transacional do provedor sem rastreamento de links/aberturas e com acesso corporativo restrito.

## Ordem de emissão e política de uso

Aplicar `20261119002000_initial_access_email.sql` após `20261119000000_admin_accounts.sql` do PR #100. As migrations anteriores permanecem intactas. Nenhuma alteração de banco remoto é executada por esta entrega.

1. No cadastro, Auth cria a conta como `pending`; no reset, a reserva administrativa coloca a conta em `blocked` antes de alterar a senha.
2. Depois da operação de senha, `admin_prepare_initial_email` grava metadados da entrega como `pending`, define o prazo usando o relógio do banco e reaplica **`public.users.must_change_password = true`**. A conta já fica sem autorização enquanto a entrega estiver pendente. No cadastro, `admin_create_account` confirma o perfil/estado e sua auditoria.
3. O serviço envia o e-mail. `admin_finish_initial_email` confirma `sent` ou `failed`, com evento sanitizado na mesma transação, e mantém a marca de troca obrigatória. `sent` significa aceitação pelo provedor; não comprova chegada à caixa postal.
4. No reset, somente depois da confirmação de envio auditada, `admin_finish_account_operation` restaura o estado anterior e reaplica a marca depois do trigger `on_auth_password_changed`. A reserva é retida durante envio/confirmacão. O estado anterior `pending`, `blocked` ou `disabled` continua sem acesso após um envio bem-sucedido.
5. Antes do prazo, conta e grupo liberados permitem somente o primeiro acesso para troca. O chat continua negado por `can_access_conversation()` e RLS enquanto `must_change_password = true`. A troca efetiva do hash consome a entrega (`used`), zera a marca pelo trigger e segue o logout global/novo login já existente. Depois da troca, a senha provisória foi substituída e sua expiração não revoga a senha definitiva.

O prazo começa no preparo e não é prorrogado por login, ativação de conta, reenvio ou sessão existente. Conta pendente cujo prazo venceu exige nova redefinição pela TI. `is_active_authorized_user()` e `is_active_it_admin()` negam entrega pendente, falha ou vencida; o trigger também recusa troca direta de senha no Auth com essa credencial indisponível. Não há RPC de cliente para marcar entrega como usada ou para liberar a troca obrigatória. Contas legadas sem emissão de e-mail mantêm o fluxo anterior.

## Falhas, auditoria e recuperação

Falha HTTP, timeout, rede ou resposta não confirmada do provedor gera 502 `email-provedor`, evento `initial_access.email_failed` e acesso negado. Na redefinição, a operação finaliza como falha e o perfil fica bloqueado. Na criação, o perfil pode conservar o estado solicitado, mas a entrega `failed` nega sua autorização. A TI deve redefinir a senha novamente para emitir uma nova entrega; reativar isoladamente não remove a restrição. Uma mensagem atrasada de tentativa anterior não libera o acesso.

Se o envio foi aceito, mas a confirmação/auditoria falhou, a API retorna erro seguro de persistência, retém a entrega `pending` e, no reset, a reserva de operação. Não libera acesso nem tenta reenvio. A mudança de estado de entrega e o evento de auditoria sofrem rollback juntos quando a auditoria falha.

Auth, banco e provedor não compartilham uma transação. Para reconciliar um resultado incerto, um Admin TI deve consultar apenas os metadados de `initial_access_deliveries` e `admin_account_operations` por uma conexão administrativa confiável. Depois de garantir que não existe processo de envio/alteração ainda ativo, confirmar a entrega com `admin_finish_initial_email(actor_id, delivery_id, resultado_confirmado)`. Se o resultado for desconhecido, confirmar falha e emitir nova senha. No reset, concluir `admin_finish_account_operation` com o mesmo resultado; depois de uma falha, definir nova credencial e reativar a conta quando autorizado. Em cadastro incompleto, verificar também o banimento no Auth antes de reativar. Não apagar reservas por tempo nem reenviar senha antiga.

`initial_access_deliveries` guarda somente UUID da entrega, alvo, ator, operação, estado e datas; RLS sem policies de cliente. Os eventos `initial_access.email_prepared`, `initial_access.email_sent` e `initial_access.email_failed` contêm ator/alvo e somente `delivery_id`/`expires_at` selecionados pelo servidor. A aplicação não registra senha, token, chave, corpo de mensagem, resposta ou erro bruto do provedor em console, URLs, respostas HTTP ou `audit_logs`.

## Verificação

Em `base(tempval)/`: `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. A suíte cobre guard real e 403 para funcionário, envio individual, configuração ausente, validade configurável, escape do HTML, URLs sem segredos, falhas/timeout do provedor, sanitização de erros/logs/auditoria e ordem Auth → marca → envio → finalização. PostgreSQL em memória executa todas as migrations para verificar grants/RLS, expiração, consumo após troca real, marca após o trigger em todos os estados, reserva concorrente e rollback da auditoria.

Homologação ainda requer Supabase Auth/GoTrue e provedor corporativo reais: conferir um cadastro e um reset em conta de teste móvel, recebimento individual, troca e novo login, expiração e falha de entrega. A suíte não faz envio real e não aplica migrations remotas.

Referências: [API de envio Resend](https://resend.com/docs/api-reference/emails/send-email), [Auth Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) e [Auth Admin updateUserById](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
