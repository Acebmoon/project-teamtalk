# PROPOSTA TÉCNICA E COMERCIAL

## Análise, Precificação e Estimativa de Serviços por Pontos de Função

**PROJETO:** TeamTalk  
**CLIENTE:** Fábio Cerqueira  
**DATA:** 18 de novembro de 2026  
**VERSÃO:** 1.1 — Para análise e aprovação  
**VALOR UNITÁRIO:** R$ 488,00 por Ponto de Função

---

# 1. Visão executiva

Esta proposta apresenta o dimensionamento funcional preliminar, a estimativa de esforço e as condições comerciais para o desenvolvimento e a implantação do TeamTalk, uma aplicação web de comunicação interna.

A análise considera os requisitos funcionais e não funcionais documentados, as funções de dados, os processos transacionais e as necessidades de implantação.

## Resumo comercial

| Indicador | Estimativa |
|---|---:|
| Tamanho funcional preliminar | 75 PF |
| Valor por Ponto de Função | R$ 488,00 |
| Valor funcional estimado | **R$ 36.600,00** |
| Esforço de desenvolvimento e implantação | 600 horas |
| Suporte opcional | 40 horas |
| Prazo para contratação do suporte opcional | Até 90 dias após a implantação |

**Importante:** as 600 horas representam uma estimativa de esforço de trabalho da equipe. As 40 horas de suporte são uma opção de serviço adicional e não estão incluídas no valor funcional de R$ 36.600,00.

# 2. Identificação do projeto

| Informação | Descrição |
|---|---|
| Sistema | TeamTalk |
| Cliente | Fábio Cerqueira |
| Tipo de solução | Aplicação web de comunicação interna |
| Público estimado | Aproximadamente 900 colaboradores |
| Plataforma | Web com foco em dispositivos móveis |
| Objetivo | Comunicação interna e compartilhamento de documentos |
| Técnica de mensuração | Análise de Pontos de Função |
| Referência comercial | R$ 488,00/PF |

# 3. Metodologia de mensuração

A Análise de Pontos de Função (APF) mensura o tamanho funcional do software a partir das funcionalidades percebidas pelo usuário.

| Sigla | Classificação | Descrição |
|---|---|---|
| ALI | Arquivo Lógico Interno | Grupo lógico de dados mantido pela aplicação. |
| AIE | Arquivo de Interface Externa | Grupo lógico de dados mantido por outra aplicação e consultado pelo sistema. |
| EE | Entrada Externa | Processo que recebe dados para manter informações ou alterar o comportamento do sistema. |
| SE | Saída Externa | Processo que apresenta informações com processamento adicional ou geração de dados derivados. |
| CE | Consulta Externa | Processo de consulta que recupera informações sem processamento adicional significativo. |

A classificação definitiva dependerá da validação dos grupos lógicos de dados e dos processos elementares.

# 4. Análise das funções de dados

## 4.1 Arquivos Lógicos Internos — ALI

| ID | Grupo de dados | Classificação | Situação |
|---|---|---|---|
| D01 | Usuários e contas | ALI | Candidato identificado |
| D02 | Conversas e participantes | ALI | Depende de confirmação |
| D03 | Mensagens e estados de leitura | ALI | Candidato identificado |
| D04 | Metadados de arquivos anexados | ALI | Depende de confirmação |
| D05 | Registros de auditoria administrativa | ALI | Depende de confirmação |

Os grupos são candidatos funcionais. A existência de cinco ALIs independentes ainda precisa ser comprovada pela análise dos dados e das regras de identificação da APF.

## 4.2 Arquivos de Interface Externa — AIE

Até o momento, não foi confirmado nenhum AIE.

A utilização de um serviço de e-mail externo, por exemplo, não caracteriza automaticamente um AIE. É necessário identificar um grupo lógico de dados externo, mantido por outra aplicação e referenciado pelo TeamTalk.

# 5. Análise das funções transacionais

## 5.1 Entradas Externas — EE

| ID | Processo | Descrição |
|---|---|---|
| T01 | Cadastrar colaborador | Inclusão de uma conta pelo administrador de TI. |
| T02 | Editar colaborador | Atualização dos dados de um usuário. |
| T03 | Bloquear conta | Impedir o acesso de um colaborador. |
| T04 | Desativar conta | Desativação de uma conta existente. |
| T05 | Autenticar usuário | Receber credenciais e validar o acesso. |
| T06 | Alterar senha inicial | Substituir a senha provisória. |
| T07 | Enviar mensagem | Registrar e encaminhar mensagem de texto. |
| T08 | Enviar arquivo PDF | Receber e disponibilizar um documento PDF. |
| T14 | Liberar usuários gradualmente | Controlar a habilitação de grupos, caso exista processo funcional próprio. |

## 5.2 Saídas Externas — SE

| ID | Processo | Descrição |
|---|---|---|
| T09 | Enviar credenciais iniciais | Encaminhar informações de acesso por e-mail. |

A classificação é provisória e depende da confirmação de que o envio constitui processo elementar independente.

## 5.3 Consultas Externas — CE

| ID | Processo | Descrição |
|---|---|---|
| T10 | Consultar colaboradores | Exibir a relação de usuários cadastrados. |
| T11 | Consultar conversas e mensagens | Recuperar o histórico de comunicação. |
| T12 | Consultar estado de leitura | Exibir se uma mensagem foi visualizada. |
| T13 | Consultar ou baixar PDF | Recuperar documentos compartilhados. |

As consultas deverão ser avaliadas para evitar a contagem separada de etapas que façam parte de um mesmo processo elementar.

# 6. Estimativa preliminar de Pontos de Função

Para o cenário comercial inicial, foram adotados os pesos de baixa complexidade tradicionalmente utilizados na contagem não ajustada do IFPUG.

| Tipo funcional | Quantidade hipotética | Peso baixo | Total |
|---|---:|---:|---:|
| ALI | 5 | 7 | 35 PF |
| AIE | 0 | 5 | 0 PF |
| EE | 8 | 3 | 24 PF |
| SE | 1 | 4 | 4 PF |
| CE | 4 | 3 | 12 PF |
| **TOTAL** | **18** | — | **75 PF** |

**Ressalva técnica:** as quantidades são hipóteses de dimensionamento comercial, ainda não uma contagem homologada. A lista de processos candidatos não comprova, por si só, a independência de todas as funções. A consolidação exige análise de DETs, RETs e FTRs.

# 7. Formação do preço

A tarifa comercial considerada é de R$ 488,00 por Ponto de Função.

| Descrição | Valor |
|---|---:|
| Quantidade estimada | 75 PF |
| Valor unitário | R$ 488,00 |
| **Investimento funcional estimado** | **R$ 36.600,00** |

**Cálculo:** 75 PF × R$ 488,00 = R$ 36.600,00.

## 7.1 Cenários de investimento

| Cenário | Pontos de Função | Investimento |
|---|---:|---:|
| Reduzido | 65 PF | R$ 31.720,00 |
| Referência | 75 PF | R$ 36.600,00 |
| Ampliado | 90 PF | R$ 43.920,00 |

Os cenários são simulações de sensibilidade comercial, não uma margem estatística de erro.

# 8. Estimativa de horas de desenvolvimento e implantação

Para planejamento inicial, foi considerada uma estimativa de 600 horas de esforço da equipe.

| Etapa | Atividade | Horas |
|---|---|---:|
| 1 | Levantamento e validação de requisitos | 50 h |
| 2 | Modelagem e arquitetura | 60 h |
| 3 | Design e interface | 70 h |
| 4 | Desenvolvimento frontend | 120 h |
| 5 | Desenvolvimento backend | 140 h |
| 6 | Testes e correções | 80 h |
| 7 | Segurança e homologação | 40 h |
| 8 | Implantação e documentação | 40 h |
| | **Total estimado** | **600 h** |

### Regras de interpretação das horas

- As 600 horas representam esforço estimado de trabalho da equipe.
- Não representam uma franquia de horas que o cliente poderá utilizar livremente.
- Não constituem, isoladamente, prazo de calendário para entrega.
- O prazo efetivo dependerá da quantidade de profissionais, disponibilidade do cliente, dependências técnicas e cronograma aprovado.
- Mudanças de escopo deverão ser avaliadas e formalizadas.

A estimativa de horas é uma hipótese de planejamento e deverá ser revisada com base na produtividade da equipe e no escopo efetivamente aprovado.

# 9. Suporte técnico opcional

Após a implantação do TeamTalk, o cliente poderá contratar um pacote opcional de suporte técnico.

> **PACOTE OPCIONAL DE SUPORTE**
>
> **Franquia:** 40 horas de atendimento.  
> **Período para contratação:** até 90 dias após a implantação do sistema.  
> **Situação comercial:** não incluído no investimento funcional de R$ 36.600,00.

## 9.1 Serviços que poderão ser contemplados

- Orientação técnica para utilização do sistema.
- Apoio na identificação de problemas operacionais.
- Análise de incidentes reportados pelo cliente.
- Esclarecimento de dúvidas sobre funcionalidades entregues.
- Apoio técnico à equipe responsável pela administração.
- Orientação sobre procedimentos de uso e operação.

## 9.2 Controle das horas de suporte

Para evitar divergências na utilização e cobrança do pacote, cada atendimento deverá possuir um registro contendo:

| Campo | Informação registrada |
|---|---|
| Protocolo | Identificador do atendimento |
| Data | Dia da solicitação |
| Solicitante | Responsável pelo pedido |
| Descrição | Problema ou serviço solicitado |
| Atividade | Procedimento realizado |
| Tempo utilizado | Duração efetiva do atendimento |
| Saldo | Horas restantes do pacote |
| Aprovação | Validação do responsável do cliente |

## 9.3 Condições comerciais do suporte

1. A contratação das 40 horas é opcional.
2. O pacote deverá ser solicitado formalmente pelo cliente em até 90 dias após a implantação.
3. O valor do pacote será apresentado em orçamento complementar.
4. O consumo será registrado e informado ao cliente.
5. Serviços adicionais além das 40 horas dependerão de aprovação e orçamento prévio.
6. O pacote não representa atendimento ilimitado ou disponibilidade permanente.
7. Horários de atendimento, canais, prazos de resposta e regras de utilização deverão ser definidos no contrato complementar.
8. Correções de defeitos e obrigações de garantia deverão ser tratadas separadamente, conforme o contrato principal e a legislação aplicável, sem consumo automático da franquia de suporte.

**Importante:** o período de 90 dias é a janela para contratação do pacote opcional, e não uma promessa de suporte gratuito durante esse período.

# 10. Requisitos não funcionais e impacto no projeto

Os requisitos não funcionais não geram automaticamente Pontos de Função, mas influenciam o esforço, a arquitetura, a infraestrutura e os testes.

| Categoria | Requisito | Impacto esperado |
|---|---|---|
| Segurança | Autenticação e proteção de senhas | Implementação e testes de segurança |
| Comunicação | HTTPS e gestão de sessão | Configuração de infraestrutura |
| Usabilidade | Interface responsiva | Design e testes em dispositivos |
| Desempenho | Resposta adequada às operações | Otimização e testes de carga |
| Escalabilidade | Atendimento a aproximadamente 900 usuários | Planejamento arquitetural |
| Disponibilidade | Continuidade do serviço | Monitoramento e infraestrutura |
| Privacidade | LGPD | Controles de proteção de dados |
| Compatibilidade | Suporte a navegadores | Testes de compatibilidade |
| Arquivos | Validação e proteção de PDFs | Controles de upload e armazenamento |

# 11. Premissas e dependências

A estimativa considera:

- O cliente fornecerá identidade visual e materiais institucionais.
- A organização disponibilizará o serviço de e-mail corporativo.
- A equipe de TI fornecerá os dados necessários para o cadastro dos colaboradores.
- O cadastro de usuários será realizado exclusivamente pela equipe de TI.
- O compartilhamento de documentos será limitado a PDFs.
- A solução terá foco em dispositivos móveis.
- A implantação ocorrerá de forma gradual.

Ainda precisam ser detalhadas políticas de recuperação de senha, retenção de mensagens, armazenamento, suporte, auditoria e implantação.

# 12. Questões para validação

Antes da homologação da contagem, recomenda-se esclarecer:

1. Conversas individuais e em grupo serão suportadas?
2. Cada conversa terá participantes armazenados separadamente?
3. Mensagens poderão ser editadas ou excluídas?
4. O status de leitura será armazenado individualmente?
5. Haverá notificações além do e-mail inicial?
6. O usuário poderá pesquisar mensagens e arquivos?
7. Os PDFs terão limite de tamanho?
8. Haverá recuperação de senha?
9. A equipe de TI poderá importar usuários em lote?
10. Existirá integração com diretório corporativo?
11. Haverá relatórios administrativos?
12. Como será implementada a liberação gradual?
13. Por quanto tempo mensagens e arquivos serão armazenados?
14. O sistema terá logs consultáveis pelos administradores?

# 13. Riscos e recomendações

| Risco | Consequência | Recomendação |
|---|---|---|
| Requisitos incompletos | Alteração da contagem | Validar processos com o cliente |
| Integrações não detalhadas | Aumento do escopo | Definir sistemas externos |
| Retenção indefinida | Alterações de dados e infraestrutura | Formalizar políticas |
| Crescimento de funcionalidades | Aumento do custo | Controlar mudanças de escopo |
| Segurança e privacidade | Riscos operacionais e legais | Realizar avaliação de segurança |

Recomenda-se uma reunião de validação funcional antes da aprovação definitiva da proposta.

# 14. Condições comerciais e itens não incluídos

O investimento funcional estimado não inclui automaticamente:

- Hospedagem e infraestrutura em nuvem.
- Licenças de software e serviços de terceiros.
- Custos de envio de e-mails.
- Suporte opcional de 40 horas.
- Manutenção evolutiva após a entrega.
- Treinamento dos usuários.
- Tributos ou despesas adicionais não especificados.

O suporte opcional será objeto de orçamento complementar. Alterações de escopo também deverão ser avaliadas e aprovadas previamente.

# 15. Aprovação

A aprovação desta versão representa a concordância com a continuidade da validação dos requisitos e da contagem funcional. Não representa a homologação definitiva dos 75 PF nem a contratação automática do pacote opcional de suporte.

| Responsável | Identificação | Assinatura |
|---|---|---|
| Cliente | Fábio Cerqueira | __________________ |
| Responsável pela proposta | Equipe TeamTalk | __________________ |
| Data | ____/____/________ | |

---

**TEAMTALK — PROPOSTA TÉCNICA E COMERCIAL**

*Versão 1.1 — Documento preliminar para análise. A contagem definitiva depende da validação funcional e da aplicação integral dos critérios de mensuração adotados.*
