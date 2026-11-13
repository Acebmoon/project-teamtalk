# Documentação de software · TeamTalk

Esta pasta reúne a especificação do TeamTalk, aplicativo web de comunicação interna corporativa. O catálogo abaixo segue a divisão do modelo acadêmico indicado, com conteúdo próprio do projeto.

## Comece por aqui

| Ordem | Arquivo | Para que serve |
|---|---|---|
| 1 | [01 — Visão, objetivos e escopo](01-visao-objetivos-escopo.md) | Problema, público, MVP, exclusões, prazo e equipe. |
| 2 | [02 — Requisitos](02-requisitos.md) | RF01–RF15, RNF01–RNF14 e SEG01–SEG07, com critérios verificáveis. |
| 3 | [03 — Regras de negócio](03-regras-de-negocio.md) | RN01–RN10 e camadas de garantia. |
| 4 | [04 — Casos de uso](04-casos-de-uso.md) | Atores, cenários, alternativas e diagrama Mermaid. |
| 5 | [05 — Arquitetura e execução](05-arquitetura-e-execucao.md) | Stack, componentes, fronteiras de responsabilidade e execução local. |
| 6 | [06 — Modelo de dados](06-modelo-de-dados.md) | Esquema PostgreSQL, relações, RLS e diagrama ER. |
| 7 | [07 — Fluxos e estados](07-fluxos-e-estados.md) | Fluxos de acesso, primeiro uso, sessão, mensagens e sequências. |
| 8 | [08 — Testes e rastreabilidade](08-testes-e-rastreabilidade.md) | Requisitos, Issues reais, testes existentes e lacunas. |

## Como interpretar esta documentação

- **Exigido:** comportamento especificado pelo cliente, ainda que não implementado.
- **Implementado na base:** comportamento sustentado pelos arquivos e migrations atuais.
- **Pendente:** previsto no plano, sem implementação comprovada nas fontes examinadas.
- **A definir com o cliente:** decisão que não consta nas fontes, nunca uma meta presumida.
- Identificadores **RF**, **RNF**, **RN** e **SEG** conservam a numeração original.
- Os diagramas em `mermaid` descrevem o modelo documentado. Eles não certificam que todas as funcionalidades já foram entregues.

### Convenções

- **Funcionário** equivale ao papel de banco `employee`.
- **Admin TI** equivale ao papel de banco `it_admin`.
- **Fase 1** é a liberação para a Diretoria / nível estratégico. A expansão até cerca de 900 pessoas é gradual.
- Os números de Issue no documento 08 correspondem às Issues #70–#88 no GitHub.

## Uso responsável

Os documentos existentes `00-visao-geral-e-escopo.md` a `07-fora-do-escopo.md` continuam na pasta como extrações anteriores dos requisitos. Esta sequência de 01 a 08 é o guia integrado de especificação e execução; ela não elimina as extrações antigas.

Fontes primárias preservadas: [Documento de Requisitos](Documento-de-Requisitos.md), [contratos de autenticação](contratos-auth.md), [divisão de tarefas](../DIVISAO_TAREFAS.md), [README da raiz](../README.md), migrations e `controle-base-main/`. Em caso de divergência de regra de negócio, validar com o cliente antes de alterar a implementação.

## Versão e fontes

- Projeto: TeamTalk / Aplicativo Web de Comunicação Interna.
- Requisitos de origem: versão 1.0, entrevista com o cliente.
- Prazo do MVP: **20/11/2026**.
- Estado documentado: base da `main` consultada em **13/11/2026**, com PR #90 integrado e as quatro migrations existentes.
