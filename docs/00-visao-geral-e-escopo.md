# 00 — Visão geral e escopo

## Identificação do documento

- **Tipo:** Especificação de Requisitos de Software
- **Versão:** 1.0
- **Status:** Documento inicial — baseado em entrevista com o cliente
- **Estimativa de usuários:** aproximadamente 900 funcionários

## 1. Introdução

### 1.1 Finalidade

Este documento especifica os requisitos funcionais e não funcionais do Aplicativo Web de Comunicação Interna. Seu objetivo é registrar, de forma organizada e verificável, as necessidades identificadas na entrevista com o cliente e servir como referência para análise, projeto, desenvolvimento, testes e validação da solução.

### 1.2 Escopo do produto

O produto será uma aplicação web destinada à comunicação interna entre funcionários da empresa. O acesso ocorrerá por meio de um link, utilizando dispositivos móveis, sem necessidade de instalação ou publicação em lojas de aplicativos. A experiência de uso deverá se aproximar daquela de um aplicativo mobile tradicional, com interface inspirada em aplicações de mensagens, respeitando a identidade visual corporativa.

Na versão inicial, a plataforma permitirá troca de mensagens de texto e compartilhamento de arquivos PDF. Não será permitido o envio de imagens, fotografias, áudios ou documentos em outros formatos. A criação e administração das contas ficará sob responsabilidade da equipe de Tecnologia da Informação (TI).

### 1.3 Definições, siglas e abreviaturas

- **RF — Requisito Funcional:** descreve um serviço ou comportamento que o sistema deverá oferecer.
- **RNF — Requisito Não Funcional:** estabelece critérios de qualidade, desempenho, segurança ou restrições da solução.
- **TI — Tecnologia da Informação:** equipe responsável pela administração técnica e dos usuários.
- **Mobile-first:** abordagem de desenvolvimento que prioriza a experiência em dispositivos móveis.
- **PWA — Progressive Web App:** aplicação web que pode oferecer recursos e experiência semelhantes aos de um aplicativo instalado.

## 2. Descrição geral

### 2.1 Perspectiva do produto

O sistema será uma solução web própria para comunicação corporativa. Não deverá depender de instalação por lojas de aplicativos. O acesso será realizado pelo navegador do smartphone, por endereço eletrônico fornecido pela empresa. A arquitetura tecnológica será definida pela equipe de desenvolvimento, uma vez que o cliente não indicou preferência de linguagem, framework ou infraestrutura.

### 2.2 Funções do produto

- Autenticar funcionários por meio de usuário e senha.
- Permitir que a TI crie, consulte, gerencie, bloqueie e desative contas.
- Exigir a alteração da senha inicial no primeiro acesso.
- Enviar e receber mensagens de texto.
- Enviar e receber arquivos PDF.
- Informar se uma mensagem foi visualizada pelo destinatário.
- Restringir o acesso a usuários autorizados e priorizar a utilização em smartphones.

### 2.3 Características dos usuários

**Administrador (equipe de TI):** usuário com permissões administrativas para cadastrar e gerenciar contas, encaminhar credenciais iniciais, controlar o acesso e apoiar a implantação gradual.

**Funcionário:** usuário cadastrado pela TI que utiliza a plataforma para autenticar-se, conversar com outros usuários autorizados, enviar e receber mensagens e compartilhar arquivos PDF.

### 2.4 Ambiente operacional

A aplicação deverá operar em navegadores móveis atuais, com atenção especial ao Google Chrome em dispositivos Android e ao Safari em dispositivos iOS. A compatibilidade exata deverá ser definida e validada durante o planejamento técnico. O produto será projetado para smartphones; o comportamento em tablets e computadores deverá seguir a política de restrição de dispositivos definida para o projeto.

### 2.5 Restrições gerais

- A solução deverá ser web e acessada por link, sem obrigatoriedade de instalação por loja de aplicativos.
- A experiência será direcionada a dispositivos móveis; o uso em desktops e notebooks não é desejado pelo cliente.
- Somente a equipe de TI poderá criar contas de funcionários.
- O compartilhamento de arquivos será limitado a PDF.
- Não será permitido o envio de imagens, fotografias ou áudios.
- A implantação será gradual, começando pelo grupo autorizado pela empresa.
- A solução deverá considerar uma estimativa de aproximadamente 900 usuários.
