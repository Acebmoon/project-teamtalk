# 3. Regras de negócio

## 3.1 Natureza e catálogo

As regras RN01–RN10 vêm do documento de requisitos. A coluna **Garantia** indica onde o controle deve ser aplicado: tela, servidor ou banco. A coluna **Situação** distingue o que existe do que está planejado.

| Regra | Regra de negócio | Garantia | Situação na base consultada |
|---|---|---|---|
| RN01 | Somente TI autorizada cria contas. | Servidor: `exigirAdminTI()`; banco/Auth para criação. | Guarda de Admin TI existe; cadastro operacional pendente. |
| RN02 | Não há cadastro público ou autorregistro. | Tela: não mostrar cadastro; servidor: não expor endpoint público. | Não há tela pública de cadastro nas rotas existentes; fluxo de cadastro TI pendente. |
| RN03 | Credenciais individuais por funcionário. | Servidor/Auth: identidade; banco: `users.id` e `users.email UNIQUE`. | Estrutura e login individuais implementados. |
| RN04 | Senha provisória deve ser trocada no primeiro acesso. | Servidor: decisão e ação; banco: trigger e RLS. | Implementada na base de autenticação. |
| RN05 | Só cadastrados e autorizados acessam. | Servidor: `avaliarSessao`; banco: status, grupos e RLS. | Acesso e leitura protegida implementados; operações futuras devem reutilizar os guardas. |
| RN06 | Somente arquivos PDF. | Tela: seletor; servidor: MIME/assinatura/tamanho; banco: `message_type='pdf'`. | Tipo e estrutura existem; upload seguro pendente. |
| RN07 | Imagens, fotos e áudio não podem ser enviados. | Tela: sem ações; servidor: rejeitar formato real; banco: `message_type` limitado. | Schema restringe tipos; endpoint de upload pendente. |
| RN08 | Mostrar visualização da mensagem. | Banco: `message_reads`; servidor: registrar leitura; tela: exibir estado. | Tabela existe; fluxo de leitura pendente. |
| RN09 | Liberar acesso gradualmente conforme empresa. | Servidor: decisão; banco: grupo habilitado, vínculo e RLS. | Grupo inicial desabilitado por padrão; controle de leitura implementado. |
| RN10 | TI gerencia contas por todo ciclo de uso. | Servidor: `exigirAdminTI`; banco: `users.status` e auditoria; tela administrativa. | Guarda e painel mínimo existem; gestão completa e escrita de auditoria pendentes. |

## 3.2 Identidade e cadastro

**RN01–RN03.** A interface não autoriza ninguém por si só. Criar contas exige operação confiável da TI, depois de `exigirAdminTI()`. O Supabase Auth mantém a identidade; a migration cria o perfil público com status `pending` e e-mail único. Não há autorregistro planejado.

## 3.3 Senha e autorização

**RN04–RN05.** O campo `must_change_password` nasce `true`. O trigger `on_auth_password_changed` só muda para `false` após alteração real de senha no Auth. `decidirAcesso` prioriza sessão ausente, autorização e expiração antes da troca. RLS impede ler chat sem autorização, participação e troca concluída.

## 3.4 Conteúdo de conversas

**RN06–RN08.** O schema só admite mensagens `text` ou `pdf`, com campos compatíveis. Isso **não** substitui inspeção do conteúdo do arquivo no servidor. `message_reads` representa leitura por destinatário, mas a ação de gravação e exibição ainda precisa ser entregue.

## 3.5 Liberação e gestão

**RN09–RN10.** A migration prevê o grupo "Diretoria / nível estratégico", inicialmente desabilitado. Funcionário deve estar `active` e em grupo habilitado. Admin TI depende de papel `it_admin`, estado `active` e senha alterada. A gestão e a auditoria administrativas completas ainda são entregas do plano.

## 3.6 Pontos que exigem decisão

Limite e política de armazenamento de PDF, prazo de retenção das mensagens, detalhes de envio de credenciais e critérios de ampliação dos grupos: **a definir com o cliente**.
