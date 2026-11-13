# 2. Requisitos funcionais e não funcionais

## 2.1 Convenções de leitura

Cada linha reúne o requisito do documento de origem e um **critério de aceite verificável**. O critério não declara conclusão da implementação. Os estados de realização e testes estão no [documento 08](08-testes-e-rastreabilidade.md).

## 2.2 Requisitos funcionais

| Código | Requisito | Critério de aceite testável |
|---|---|---|
| RF01 | Acesso via link em navegador móvel | Abrir o link em smartphone Android/iPhone e alcançar o fluxo de autenticação. |
| RF02 | Interface semelhante a app de mensagens | Em viewport móvel, usuário encontra conversas, leitura e ações principais conforme protótipo aprovado. |
| RF03 | Tela de login por usuário e senha | Credenciais válidas autenticam; credenciais inválidas exibem erro e não criam sessão. |
| RF04 | Cadastro apenas pela TI | Admin TI cadastra conta; funcionário e visitante não conseguem realizar o cadastro. |
| RF05 | Envio seguro de credenciais por e-mail | Cadastro autorizado envia orientação inicial ao endereço do funcionário, sem senha em URL ou logs. |
| RF06 | Troca obrigatória da senha inicial | Conta com `must_change_password=true` só acessa `/primeiro-acesso` até alterar a senha e entrar novamente. |
| RF07 | Sessão persistente e gerenciadores de senha | Reabrir o navegador dentro da validade mantém a sessão; sair/expirar invalida o acesso; campos aceitam gerenciador. |
| RF08 | Envio de texto | Funcionário participante envia texto e ele persiste na conversa autorizada. |
| RF09 | Recebimento de mensagens | Destinatário participante visualiza mensagem recebida, sem acesso às conversas alheias. |
| RF10 | Status de visualização | Ao destinatário visualizar a mensagem, seu registro de leitura é criado e exibido ao remetente autorizado. |
| RF11 | Envio e recebimento de PDF | PDF válido pode ser enviado e obtido somente pelos participantes autorizados. |
| RF12 | Restrição de formatos | Imagem, áudio, Word, Excel e arquivo falso renomeado para .pdf são rejeitados no servidor. |
| RF13 | Gestão de usuários | Admin TI consulta, bloqueia e desativa contas; funcionário não executa essas ações. |
| RF14 | Acesso somente a autorizados | Conta pendente, bloqueada, desativada ou fora de grupo liberado não acessa chat. |
| RF15 | Implantação gradual | TI libera grupo da Diretoria antes dos demais; conta fora de grupo habilitado continua sem acesso. |

## 2.3 Requisitos não funcionais

| Código | Requisito | Critério de aceite testável |
|---|---|---|
| RNF01 | Layout mobile-first | Layout cabe em tamanhos de smartphone acordados, sem perda de ações essenciais. |
| RNF02 | Bloqueio técnico de desktop | Requisições identificadas como desktop recebem bloqueio; tentativa com cabeçalho falsificado é registrada como limitação. |
| RNF03 | Identidade visual corporativa | Cores, tipografia, logo e componentes coincidem com guia aprovado pela empresa. |
| RNF04 | Usabilidade | Funcionários completam login, conversa e envio de PDF em roteiro de navegação validado. |
| RNF05 | Senhas protegidas | Verificar Auth com hash/salt e ausência de senha em logs, URLs e tabelas públicas. |
| RNF06 | HTTPS e sessão segura | Em produção, tráfego usa HTTPS; cookies/tokens expiram e saída remove acesso. |
| RNF07 | Controle por papéis | Chamadas diretas de funcionário a rotas e operações da TI retornam 403 ou acesso negado. |
| RNF08 | Desempenho | Medir navegação, envio, recebimento e upload contra metas **a definir com o cliente**. |
| RNF09 | Escalabilidade | Ensaiar cenário de até cerca de 900 cadastrados, com carga e aceitação acordadas. |
| RNF10 | Disponibilidade | Monitoramento e recuperação são demonstrados diante de falha; meta **a definir com o cliente**. |
| RNF11 | Validação de arquivos | Servidor verifica MIME, assinatura do PDF e limite de tamanho **a definir com o cliente**. |
| RNF12 | Privacidade/LGPD | Usuário não participante não consulta mensagens ou anexos alheios; tratamento segue política aprovada. |
| RNF13 | Manutenibilidade | Estrutura, testes e documentação permitem localizar regra no controle, rota na base e tela no design. |
| RNF14 | Navegadores móveis | Roteiro aprovado passa no Chrome Android e Safari iOS nas versões **a definir com o cliente**. |

## 2.4 Requisitos de segurança

| Código | Requisito | Critério de aceite testável |
|---|---|---|
| SEG01 | Autenticação individual | Cada usuário acessa com credencial própria; anônimo não acessa rotas protegidas. |
| SEG02 | Segredos e senhas protegidos | Verificar hash com salt no Auth; nenhuma senha temporária consta em log ou URL. |
| SEG03 | Transporte HTTPS | Em ambiente publicado, chamadas e cookies autenticados trafegam via HTTPS. |
| SEG04 | Autorização no servidor | API e server action negam operação indevida mesmo ao contornar a tela; RLS isola dados. |
| SEG05 | Proteção de arquivos | Upload rejeita conteúdo inválido e download exige participação autorizada. |
| SEG06 | Gestão de sessão | Sessão ausente, vencida e encerrada não realiza operação protegida. |
| SEG07 | Auditoria de administração | Ação de gestão registra ator, ação, alvo e data/hora em registro protegido. |

**Atenção:** critérios de PDF, desempenho, disponibilidade e retenção não recebem números presumidos. Ver decisões pendentes no [documento 01](01-visao-objetivos-escopo.md).
