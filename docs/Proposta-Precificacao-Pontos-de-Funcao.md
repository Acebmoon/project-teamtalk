# Proposta Técnica e Comercial — Análise de Pontos de Função (APF)

**Projeto:** TeamTalk — Aplicativo Web de Comunicação Interna  
**Cliente:** Fábio Cerqueira  
**Repositório:** [Acebmoon/project-teamtalk](https://github.com/Acebmoon/project-teamtalk)  
**Documento-base:** [Documento de Especificação de Requisitos](https://github.com/Acebmoon/project-teamtalk/blob/main/docs/Documento-de-Requisitos.md)  
**Versão desta proposta:** 1.0 — estimativa preliminar  
**Data:** 18/11/2026  
**Referência de preço:** R$ 488,00 por Ponto de Função (PF)

---

## 1. Objetivo

Apresentar uma estimativa preliminar do tamanho funcional do TeamTalk, com base nos requisitos documentados a partir das informações fornecidas pelo cliente. A análise identifica funções de dados e funções transacionais, classifica-as como ALI, AIE, EE, SE ou CE, registra premissas, explicita dúvidas e calcula uma referência financeira.

Esta proposta é **preliminar e condicionada à validação dos requisitos**. Não constitui uma contagem oficial certificada nem substitui uma sessão de levantamento funcional com o cliente e a equipe técnica.

## 2. Base documental e entendimento do escopo

Foi analisado o documento `docs/Documento-de-Requisitos.md`, versão 1.0, que registra a entrevista com o cliente e contém:

- finalidade, escopo e perspectiva do produto;
- perfis de administrador (equipe de TI) e funcionário;
- 15 requisitos funcionais (RF01 a RF15);
- 14 requisitos não funcionais (RNF01 a RNF14);
- regras de negócio;
- requisitos de interface e segurança;
- premissas e dependências;
- funcionalidades expressamente fora do escopo inicial.

### 2.1 Escopo funcional considerado

A solução é uma aplicação web mobile-first para comunicação interna, acessada por link e destinada a aproximadamente 900 funcionários. O escopo funcional considerado nesta estimativa contempla:

1. autenticação por usuário e senha;
2. criação e administração de contas exclusivamente pela equipe de TI;
3. envio de credenciais iniciais por e-mail;
4. alteração obrigatória da senha no primeiro acesso;
5. manutenção segura da sessão;
6. envio e recebimento de mensagens de texto;
7. indicação de visualização de mensagens;
8. envio e recebimento de arquivos PDF;
9. validação e restrição de anexos ao formato PDF;
10. controle de acesso e permissões;
11. liberação gradual de usuários.

### 2.2 Itens não incluídos na contagem

Não foram incluídos como funcionalidades contratadas nesta versão:

- chamadas de voz ou vídeo;
- mensagens de áudio;
- envio de imagens ou fotografias;
- compartilhamento de documentos Word ou planilhas Excel;
- publicação em lojas de aplicativos;
- utilização em computadores e notebooks;
- pesquisa avançada, grupos, canais, reações, edição ou exclusão de mensagens, notificações push e outras funções não especificadas.

A existência desses recursos em outros aplicativos de mensagens não significa que façam parte do escopo do TeamTalk.

## 3. Método de contagem e conceitos

A análise utiliza os conceitos de Análise de Pontos de Função (APF), alinhados à terminologia IFPUG:

| Sigla | Tipo | Definição aplicada ao projeto |
|---|---|---|
| **ALI** | Arquivo Lógico Interno | Grupo lógico de dados mantido pela própria aplicação e reconhecido pelo usuário. |
| **AIE** | Arquivo de Interface Externa | Grupo lógico de dados mantido por outra aplicação, mas consultado pela aplicação contada. |
| **EE** | Entrada Externa | Processo elementar que recebe dados ou informações de controle e mantém ALI ou altera o comportamento do sistema. |
| **SE** | Saída Externa | Processo elementar que envia informações para fora da fronteira da aplicação, com processamento ou apresentação derivada. |
| **CE** | Consulta Externa | Processo elementar de consulta que recupera dados sem atualização de ALI e sem processamento característico de SE. |

A contagem definitiva depende da identificação da fronteira da aplicação, dos grupos lógicos de dados, dos DETs (tipos de dados reconhecidos pelo usuário), RETs (subgrupos de dados) e FTRs (arquivos lógicos referenciados por uma transação).

**Importante:** requisitos de qualidade, tecnologia, esforço, telas, endpoints, tabelas físicas, classes, campos de banco de dados ou quantidade de usuários não são convertidos diretamente em PF. A complexidade funcional deve ser determinada pelos critérios da APF, e não por impressão subjetiva.

## 4. Identificação das funções de dados

Os itens abaixo são grupos lógicos candidatos, inferidos dos requisitos. Precisam ser confirmados por modelo de dados, regras de negócio e validação com o cliente.

| ID | Grupo lógico candidato | Tipo proposto | Justificativa e requisitos relacionados |
|---|---|---|---|
| D01 | Usuários e contas | **ALI** | A aplicação mantém dados de funcionários, credenciais/estado da conta e informações necessárias ao controle de acesso. RF04, RF13 e RF14. |
| D02 | Conversas e participantes | **ALI — a confirmar** | Grupo lógico candidato para organizar conversas e seus participantes. A documentação não detalha se haverá conversas individuais, grupos ou outra estrutura. RF08 e RF09. |
| D03 | Mensagens e status de leitura | **ALI** | A aplicação deverá manter mensagens e informação necessária para identificar sua visualização. RF08, RF09 e RF10. |
| D04 | Arquivos e metadados de anexos | **ALI — a confirmar** | A aplicação deverá controlar os PDFs compartilhados e sua associação às conversas/mensagens. RF11 e RF12. |
| D05 | Registros de auditoria administrativa | **ALI — a confirmar** | O requisito SEG07 exige rastreabilidade de operações administrativas. É necessário confirmar quais eventos serão armazenados e consultados como grupo lógico reconhecido pelo usuário. |

### 4.1 AIE identificados

**Nenhum AIE foi confirmado com a documentação atual.**

O serviço de e-mail corporativo é uma dependência externa para envio de credenciais (RF05), mas sua mera utilização para disparar uma mensagem não comprova a existência de um AIE. Um AIE somente deverá ser contado se o TeamTalk consultar e utilizar um grupo lógico de dados mantido por outra aplicação, reconhecível pelo usuário.

Caso exista integração para consultar diretório corporativo, cadastro externo de funcionários ou outro repositório de dados, ela deverá ser analisada separadamente.

## 5. Identificação das funções transacionais

A expressão “funções transicionais” foi interpretada, para fins desta proposta, como **funções transacionais** da APF.

As operações abaixo são candidatas a processos elementares. A separação definitiva depende da finalidade de cada processo, dos dados envolvidos, da autonomia funcional e das regras de negócio.

| ID | Processo elementar candidato | Tipo | Requisitos relacionados | Observação |
|---|---|---|---|---|
| T01 | Cadastrar funcionário | **EE** | RF04 | Entrada e manutenção de dados de nova conta. |
| T02 | Alterar dados de funcionário | **EE** | RF13 | Considerada operação própria, caso seja processo independente. |
| T03 | Bloquear conta | **EE** | RF13, RF14 | Deve alterar o estado de acesso. |
| T04 | Desativar conta | **EE** | RF13, RF14 | Separada de bloqueio apenas se houver regra e resultado funcional distintos. |
| T05 | Autenticar usuário | **EE — a confirmar** | RF03, RF14, SEG01 | Processo de entrada e validação de credenciais; confirmar tratamento da sessão e fronteira. |
| T06 | Alterar senha inicial | **EE** | RF06, SEG02 | Atualiza a senha e conclui a condição de primeiro acesso. |
| T07 | Enviar mensagem de texto | **EE** | RF08 | Recebe conteúdo e destinatário e registra a mensagem. |
| T08 | Enviar arquivo PDF | **EE** | RF11, RF12, SEG05 | Recebe arquivo e dados de associação; valida tipo e tamanho. |
| T09 | Enviar credenciais iniciais por e-mail | **SE — a confirmar** | RF05 | Saída para serviço externo. A classificação depende do processamento e da informação produzida; simples chamada técnica não deve ser contada automaticamente como SE. |
| T10 | Consultar lista de funcionários | **CE** | RF13 | Consulta administrativa sem alteração de dados. |
| T11 | Consultar conversas e histórico de mensagens | **CE** | RF09 | Recupera mensagens e informações da conversa. |
| T12 | Consultar status de visualização | **CE — a confirmar** | RF10 | Só será processo separado se possuir objetivo e execução independentes; se for parte da consulta de mensagens, não deve ser contado novamente. |
| T13 | Baixar/consultar arquivo PDF | **CE — a confirmar** | RF11, SEG05 | Considerada consulta se recuperar arquivo existente sem atualização funcional de ALI. |
| T14 | Liberar usuários por etapas | **EE — a confirmar** | RF15, RN09 | Só será contada separadamente se houver operação de negócio para administrar grupos, lotes ou estados de liberação. |

### 5.1 Observações sobre classificação

- O recebimento de mensagens por um usuário pode ocorrer como parte da consulta do histórico ou por atualização de uma tela em tempo real. O mecanismo técnico de entrega não gera automaticamente uma nova função transacional.
- O status de leitura pode ser atualizado quando o destinatário abre uma conversa. Se essa atualização for um processo elementar independente que mantém dados, poderá ser uma EE; se for apenas parte inseparável de outro processo, não deverá ser contado em duplicidade.
- A confirmação de envio, o indicador de visualização e a notificação por e-mail precisam ser detalhados para distinguir EE, SE e CE.
- Bloquear e desativar uma conta somente devem ser contados separadamente se representarem processos elementares diferentes, com regras e resultados funcionais próprios.
- A validação do formato PDF é regra de processamento da entrada de arquivo, não uma função isolada por si só.

## 6. Estimativa preliminar de tamanho funcional

Como a documentação não apresenta DETs, RETs e FTRs, não é possível determinar a complexidade real das funções. Para fornecer uma referência financeira inicial, foi montado um **cenário provisório de baixa complexidade**, sujeito a revisão.

Pesos de baixa complexidade utilizados como hipótese de trabalho:

| Tipo | Peso baixo adotado |
|---|---:|
| ALI | 7 PF |
| AIE | 5 PF |
| EE | 3 PF |
| SE | 4 PF |
| CE | 3 PF |

### 6.1 Quadro de estimativa

| Categoria | Quantidade provisória | Peso unitário hipotético | Subtotal |
|---|---:|---:|---:|
| ALI | 5 | 7 PF | 35 PF |
| AIE | 0 | 5 PF | 0 PF |
| EE | 8 | 3 PF | 24 PF |
| SE | 1 | 4 PF | 4 PF |
| CE | 4 | 3 PF | 12 PF |
| **Total preliminar** | **18 funções** | — | **75 PF** |

A quantidade representa o cenário de referência, não uma confirmação de que todos os candidatos listados na seção 5 sejam funções independentes. Em particular, a contagem de consultas, o processo de e-mail, a administração de usuários e a liberação gradual precisam de validação para eliminar sobreposições.

### 6.2 Valor estimado

| Indicador | Valor |
|---|---:|
| Pontos de Função preliminares | 75 PF |
| Valor por PF informado | R$ 488,00 |
| **Valor estimado** | **R$ 36.600,00** |

Cálculo:

`75 \, PF \times R\$\ 488,00 = R\$\ 36.600,00`

**Referência comercial preliminar: R$ 36.600,00.**

Esse valor representa a aplicação direta da tarifa informada ao tamanho funcional hipotético. Não inclui automaticamente tributos, infraestrutura, licenças, suporte, manutenção, hospedagem, custos de terceiros ou despesas operacionais, que devem ser negociados separadamente.

### 6.3 Faixa de sensibilidade para planejamento

Considerando que a classificação e a complexidade ainda não foram confirmadas, recomenda-se trabalhar com uma faixa de planejamento, e não tratar os 75 PF como medição fechada.

| Cenário de planejamento | Tamanho ilustrativo | Valor a R$ 488/PF |
|---|---:|---:|
| Inferior | 65 PF | R$ 31.720,00 |
| Referência | 75 PF | R$ 36.600,00 |
| Superior | 90 PF | R$ 43.920,00 |

Os limites de 65 e 90 PF são cenários de sensibilidade para discussão comercial, não resultados de contagem detalhada nem intervalos estatísticos. A faixa deverá ser substituída por uma contagem validada após o esclarecimento das questões deste documento.

## 7. Requisitos não funcionais e impacto na proposta

Os requisitos não funcionais influenciam arquitetura, esforço, risco, prazo, infraestrutura e critérios de aceite, mas não aumentam automaticamente a quantidade de PF.

| Requisito | Consideração para planejamento |
|---|---|
| RNF01 — Responsividade mobile | Trabalho de interface e testes em diferentes dimensões de tela. Não gera PF isoladamente. |
| RNF02 — Restrição a dispositivos móveis | Definir mecanismo, limites e critérios de aceite; não presumir bloqueio infalível por navegador. |
| RNF03 — Identidade visual | Depende do fornecimento do design system e dos ativos da empresa. |
| RNF04 — Usabilidade | Deve orientar prototipação e testes com usuários. |
| RNF05 e SEG02 — Segurança de autenticação | Exige hash seguro, salt, política de senha e proteção contra exposição de credenciais. |
| RNF06 e SEG03/SEG06 — HTTPS e sessões | Exige configuração segura de transporte, sessão, expiração e encerramento. |
| RNF07 e SEG04 — Permissões | Exige autorização no servidor e testes por papel/perfil. |
| RNF08 — Desempenho | Necessita metas quantitativas e testes de carga. |
| RNF09 — Escalabilidade | A referência de 900 usuários deve ser convertida em simultaneidade, volume e crescimento esperado. |
| RNF10 — Disponibilidade | Necessita SLA, monitoramento, recuperação e estratégia de backup. |
| RNF11 e SEG05 — Integridade de arquivos | Necessita limites, validação de conteúdo, armazenamento e verificação de segurança. |
| RNF12 — Privacidade | Exige definição de acesso, retenção, responsabilidades e conformidade com a LGPD. |
| RNF13 — Manutenibilidade | Exige documentação técnica, padrões de código e organização arquitetural. |
| RNF14 — Compatibilidade | Exige matriz de navegadores e versões suportadas, além de testes. |
| SEG07 — Auditoria | Pode gerar ALI e transações contáveis se confirmado um grupo lógico e processos reconhecidos pelo usuário. |

## 8. Premissas adotadas

1. A fronteira da aplicação contada é o sistema TeamTalk de comunicação interna, incluindo a interface de funcionários e a área administrativa da TI.
2. Os perfis de funcionário e administrador pertencem à mesma aplicação, ainda que possuam permissões diferentes.
3. A solução será web e mobile-first, acessada por link.
4. A estimativa considera aproximadamente 900 funcionários cadastrados, sem assumir que todos estarão simultaneamente conectados.
5. O cadastro de funcionários será restrito à equipe de TI.
6. O envio de anexos será limitado a PDF.
7. Mensagens de texto, mensagens recebidas, histórico e status de leitura serão tratados como capacidades funcionais do sistema.
8. O serviço de e-mail é considerado dependência externa. Não foi presumida a existência de um AIE.
9. Os grupos de dados listados como ALI são hipóteses de agrupamento lógico e deverão ser validados com o usuário.
10. A estimativa de 75 PF utiliza pesos hipotéticos de baixa complexidade, pois faltam DETs, RETs e FTRs.
11. As operações de bloquear e desativar foram consideradas distintas apenas para fins de identificação; a contagem final deve verificar se são processos elementares independentes.
12. Não foram incluídas funções não mencionadas pelo cliente, ainda que comuns em aplicativos de mensagens.
13. Os requisitos não funcionais serão tratados no planejamento técnico e nos critérios de aceite, sem conversão arbitrária em PF.
14. O preço de R$ 488,00/PF foi informado como premissa comercial pelo solicitante e não representa pesquisa de mercado ou tarifa oficial.
15. O valor calculado não inclui custos adicionais que não estejam expressamente contemplados na tarifa.

## 9. Informações que precisam ser esclarecidas antes da contagem definitiva

As questões abaixo devem ser respondidas pelo cliente e pela equipe responsável pelo desenvolvimento. Elas podem alterar o número de funções, a complexidade e o preço final.

### 9.1 Dados e cadastros

1. Quais campos compõem o cadastro de funcionário (nome, matrícula, e-mail, setor, cargo, telefone, status etc.)?
2. Existem departamentos, equipes ou grupos que precisam ser mantidos pelo sistema?
3. Conversas serão individuais, em grupo ou ambos?
4. Quais dados identificam uma conversa e seus participantes?
5. Quais informações serão armazenadas para cada mensagem (texto, autor, data/hora, destinatário, estado, identificador etc.)?
6. Os PDFs terão metadados próprios, como nome, tamanho, autor, data, categoria e vínculo com a mensagem?
7. Os registros de auditoria serão consultáveis pela TI? Quais eventos e dados deverão ser registrados?
8. Existe integração com diretório corporativo, RH ou outra base de funcionários?

### 9.2 Processos transacionais

9. A TI poderá apenas cadastrar, editar, bloquear e desativar usuários, ou haverá também reativação, redefinição de senha e exclusão?
10. Bloquear e desativar são ações distintas? Quais regras e efeitos cada uma possui?
11. O funcionário poderá recuperar a senha sem intervenção da TI?
12. O envio de credenciais será por link de ativação, senha temporária ou outro fluxo? A senha será enviada por e-mail ou haverá outro canal?
13. O sistema terá confirmação de entrega, falha de envio ou reenvio de credenciais?
14. O status de visualização será atualizado automaticamente ao abrir a conversa? Haverá estados adicionais, como entregue e pendente?
15. O envio de mensagens terá edição, exclusão, resposta, encaminhamento ou confirmação?
16. O recebimento será apenas em tempo real ou haverá histórico e recuperação de mensagens offline?
17. Haverá consulta, pesquisa ou filtros de mensagens e usuários?
18. O download de PDF será uma operação independente? Haverá pré-visualização?
19. A liberação gradual será feita por setor, lista de usuários, grupo ou lote? Quem executará essa operação?
20. Haverá notificações por e-mail ou push além do envio inicial de credenciais?

### 9.3 Integrações e fronteira

21. Qual serviço de e-mail será utilizado e quais informações serão consultadas nele?
22. Haverá integração com sistemas corporativos externos?
23. Existe algum cadastro externo que o TeamTalk apenas consulte, sem manter seus dados?
24. A aplicação administrativa e a aplicação dos funcionários compartilharão a mesma fronteira funcional?

### 9.4 Requisitos não funcionais e operação

25. Qual é o número esperado de usuários simultâneos, além dos aproximadamente 900 cadastrados?
26. Qual o tamanho máximo permitido por arquivo PDF?
27. Por quanto tempo mensagens e documentos deverão permanecer armazenados?
28. Qual a meta de disponibilidade (por exemplo, percentual mensal) e o horário de suporte?
29. Quais versões mínimas de Android, iOS, Chrome e Safari serão suportadas?
30. Como será implementada e validada a restrição a computadores e notebooks?
31. Quais políticas de backup, recuperação de desastre, auditoria e retenção serão exigidas?
32. Quais metas quantitativas de desempenho deverão ser aceitas pelo cliente?
33. Quem fornecerá a infraestrutura, o domínio, certificados, serviço de e-mail e identidade visual?
34. Quais responsabilidades e controles de privacidade e LGPD serão atribuídos ao cliente e ao fornecedor?

## 10. Riscos e pontos de atenção

| Risco | Consequência possível | Ação recomendada |
|---|---|---|
| Dados lógicos ainda não detalhados | Mudança na quantidade e complexidade dos ALIs/AIEs | Validar modelo lógico e grupos de dados com o cliente. |
| Fluxo de mensagens pouco especificado | Duplicidade ou omissão de EE, SE e CE | Desenhar os processos elementares e seus gatilhos. |
| Integração de e-mail indefinida | Classificação incorreta da saída e custos externos não previstos | Especificar contrato de integração e fluxo de credenciais. |
| Leitura e entrega de mensagens não diferenciadas | Contagem duplicada ou incompleta | Definir estados e momento de atualização. |
| Política de retenção ausente | Impacto em armazenamento, privacidade e operação | Definir prazos e regras de descarte. |
| Desempenho sem metas | Critérios de aceite subjetivos | Estabelecer metas e cenários de carga. |
| Restrição por dispositivo | Falsa sensação de segurança se baseada apenas no navegador | Definir controles no servidor e limites da identificação de dispositivo. |
| Estimativa baseada em baixa complexidade presumida | Diferença entre estimativa e contagem final | Recontar após levantamento de DETs, RETs e FTRs. |

## 11. Recomendação e condições comerciais

Recomenda-se utilizar **75 PF e R$ 36.600,00** como referência inicial de planejamento, e não como preço fechado irrevogável.

Antes da contratação definitiva, recomenda-se:

1. realizar reunião de validação funcional com Fábio Cerqueira e representantes da TI;
2. confirmar a fronteira da aplicação e os grupos lógicos de dados;
3. desenhar os processos elementares, evitando contagem duplicada;
4. levantar DETs, RETs e FTRs de cada função;
5. classificar a complexidade de acordo com as matrizes da APF;
6. aprovar formalmente a contagem e a lista de funcionalidades incluídas;
7. aplicar a tarifa de R$ 488,00/PF ao total validado;
8. negociar separadamente infraestrutura, serviços externos, suporte, manutenção e demais itens não incluídos.

Mudanças de escopo após a aprovação deverão ser avaliadas por análise de impacto e, quando aplicável, por nova contagem de pontos de função.

## 12. Conclusão

Com base no documento de requisitos disponibilizado, o TeamTalk apresenta um conjunto funcional centrado em autenticação, administração de usuários, comunicação por mensagens de texto, compartilhamento de PDFs e identificação de visualização.

A análise preliminar identificou grupos de dados candidatos a ALI, não confirmou AIE e mapeou processos candidatos a EE, SE e CE. Como a documentação ainda não detalha os dados elementares, subgrupos e arquivos referenciados por cada transação, não é tecnicamente adequado declarar a complexidade definitiva.

Para fins de planejamento, o cenário hipotético de **75 PF**, ao valor informado de **R$ 488,00/PF**, resulta em **R$ 36.600,00**. A proposta deverá ser revisada após as respostas às questões pendentes e a validação formal da contagem.

---

## 13. Aprovação

| Responsável | Nome | Assinatura | Data |
|---|---|---|---|
| Cliente | Fábio Cerqueira |  |  |
| Representante do projeto |  |  |  |
| Responsável pela contagem APF |  |  |  |

**Documento elaborado para discussão e validação.** A estimativa não deve ser interpretada como contagem certificada ou compromisso comercial definitivo antes da aprovação das premissas e do escopo.
