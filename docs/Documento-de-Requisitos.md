# Documento de Especificação de Requisitos
## Aplicativo Web de Comunicação Interna

**Tipo:** Especificação de Requisitos de Software  
**Versão:** 1.0  
**Status:** Documento inicial — baseado em entrevista com o cliente  
**Estimativa de usuários:** Aproximadamente 900 funcionários

---

# 1. Introdução

## 1.1 Finalidade
Este documento especifica os requisitos funcionais e não funcionais do Aplicativo Web de Comunicação Interna. Seu objetivo é registrar, de forma organizada e verificável, as necessidades identificadas na entrevista com o cliente e servir como referência para análise, projeto, desenvolvimento, testes e validação da solução.

## 1.2 Escopo do produto
O produto será uma aplicação web destinada à comunicação interna entre funcionários da empresa. O acesso ocorrerá por meio de um link, utilizando dispositivos móveis, sem necessidade de instalação ou publicação em lojas de aplicativos. A experiência de uso deverá se aproximar daquela de um aplicativo mobile tradicional, com interface inspirada em aplicações de mensagens, respeitando a identidade visual corporativa.

Na versão inicial, a plataforma permitirá troca de mensagens de texto e compartilhamento de arquivos PDF. Não será permitido o envio de imagens, fotografias, áudios ou documentos em outros formatos. A criação e administração das contas ficará sob responsabilidade da equipe de Tecnologia da Informação (TI).

## 1.3 Definições, siglas e abreviaturas
- **RF — Requisito Funcional:** descreve um serviço ou comportamento que o sistema deverá oferecer.
- **RNF — Requisito Não Funcional:** estabelece critérios de qualidade, desempenho, segurança ou restrições da solução.
- **TI — Tecnologia da Informação:** equipe responsável pela administração técnica e dos usuários.
- **Mobile-first:** abordagem de desenvolvimento que prioriza a experiência em dispositivos móveis.
- **PWA — Progressive Web App:** aplicação web que pode oferecer recursos e experiência semelhantes aos de um aplicativo instalado.

# 2. Descrição geral

## 2.1 Perspectiva do produto
O sistema será uma solução web própria para comunicação corporativa. Não deverá depender de instalação por lojas de aplicativos. O acesso será realizado pelo navegador do smartphone, por endereço eletrônico fornecido pela empresa. A arquitetura tecnológica será definida pela equipe de desenvolvimento, uma vez que o cliente não indicou preferência de linguagem, framework ou infraestrutura.

## 2.2 Funções do produto
- Autenticar funcionários por meio de usuário e senha.
- Permitir que a TI crie, consulte, gerencie, bloqueie e desative contas.
- Exigir a alteração da senha inicial no primeiro acesso.
- Enviar e receber mensagens de texto.
- Enviar e receber arquivos PDF.
- Informar se uma mensagem foi visualizada pelo destinatário.
- Restringir o acesso a usuários autorizados e priorizar a utilização em smartphones.

## 2.3 Características dos usuários
**Administrador (equipe de TI):** usuário com permissões administrativas para cadastrar e gerenciar contas, encaminhar credenciais iniciais, controlar o acesso e apoiar a implantação gradual.

**Funcionário:** usuário cadastrado pela TI que utiliza a plataforma para autenticar-se, conversar com outros usuários autorizados, enviar e receber mensagens e compartilhar arquivos PDF.

## 2.4 Ambiente operacional
A aplicação deverá operar em navegadores móveis atuais, com atenção especial ao Google Chrome em dispositivos Android e ao Safari em dispositivos iOS. A compatibilidade exata deverá ser definida e validada durante o planejamento técnico. O produto será projetado para smartphones; o comportamento em tablets e computadores deverá seguir a política de restrição de dispositivos definida para o projeto.

## 2.5 Restrições gerais
- A solução deverá ser web e acessada por link, sem obrigatoriedade de instalação por loja de aplicativos.
- A experiência será direcionada a dispositivos móveis; o uso em desktops e notebooks não é desejado pelo cliente.
- Somente a equipe de TI poderá criar contas de funcionários.
- O compartilhamento de arquivos será limitado a PDF.
- Não será permitido o envio de imagens, fotografias ou áudios.
- A implantação será gradual, começando pelo grupo autorizado pela empresa.
- A solução deverá considerar uma estimativa de aproximadamente 900 usuários.

# 3. Requisitos funcionais

Os requisitos funcionais a seguir descrevem as funcionalidades que deverão ser disponibilizadas pelo sistema. Cada requisito possui identificador único para facilitar rastreabilidade, implementação e testes.

## RF01 — Acesso por dispositivos móveis
O sistema deverá permitir o acesso por meio de um link disponibilizado aos funcionários, utilizando navegadores de dispositivos móveis.

## RF02 — Interface semelhante a um aplicativo mobile
O sistema deverá apresentar uma interface visual e uma navegação semelhantes às de aplicativos tradicionais de mensagens, proporcionando familiaridade e facilidade de utilização.

## RF03 — Tela de login
O sistema deverá disponibilizar uma tela de autenticação simples e intuitiva, permitindo que os funcionários acessem a plataforma utilizando usuário e senha.

## RF04 — Cadastro de usuários pela equipe de TI
O sistema deverá permitir que somente usuários autorizados da equipe de TI realizem o cadastro de funcionários. Não deverá existir funcionalidade de cadastro público ou autorregistro.

## RF05 — Envio de credenciais por e-mail
O sistema deverá permitir o envio das informações iniciais de acesso ao funcionário por e-mail, de forma segura. O mecanismo de entrega das credenciais deverá evitar a exposição desnecessária de senhas.

## RF06 — Alteração obrigatória de senha no primeiro acesso
No primeiro acesso à plataforma, o funcionário deverá ser direcionado à alteração da senha inicial antes de utilizar as funcionalidades de comunicação.

## RF07 — Persistência de sessão e facilidade de acesso
O sistema deverá permitir a manutenção segura da sessão autenticada, reduzindo a necessidade de inserir credenciais em todos os acessos. Deverá também ser compatível com o uso de gerenciadores de senha do navegador ou do dispositivo.

## RF08 — Envio de mensagens de texto
O sistema deverá permitir que os funcionários enviem mensagens de texto a outros usuários autorizados da plataforma.

## RF09 — Recebimento de mensagens
O sistema deverá permitir que os funcionários recebam mensagens enviadas por outros usuários autorizados.

## RF10 — Identificação do status de visualização
O sistema deverá informar o status das mensagens enviadas, permitindo identificar quando uma mensagem tiver sido visualizada pelo destinatário.

## RF11 — Envio e recebimento de arquivos PDF
O sistema deverá permitir o compartilhamento de arquivos no formato PDF durante as conversas.

## RF12 — Restrição de formatos de arquivos
O sistema deverá aceitar exclusivamente arquivos PDF para compartilhamento, impedindo o envio de imagens, áudios, documentos Word, planilhas Excel e outros formatos não autorizados.

## RF13 — Gerenciamento de usuários
O sistema deverá disponibilizar à equipe de TI mecanismos para consultar, administrar, bloquear e desativar contas de funcionários.

## RF14 — Controle de acesso
O sistema deverá permitir o acesso somente a funcionários previamente cadastrados e autorizados.

## RF15 — Implantação gradual
O sistema deverá permitir a liberação progressiva do acesso aos usuários, iniciando pelo grupo definido pela empresa e expandindo para os demais setores após a validação da segurança e do funcionamento da aplicação.

# 4. Requisitos não funcionais

Os requisitos não funcionais definem atributos de qualidade, critérios técnicos e restrições que deverão orientar a implementação e a operação do sistema.

## RNF01 — Responsividade e compatibilidade mobile
A aplicação deverá adotar abordagem mobile-first e adaptar sua interface às diferentes dimensões de telas de smartphones.

## RNF02 — Restrição de acesso por dispositivos
A experiência deverá ser destinada exclusivamente a dispositivos móveis. O acesso por computadores e notebooks deverá ser restringido por mecanismo técnico a ser definido e validado. A restrição deverá ser tratada como controle de acesso, reconhecendo que a identificação de dispositivos por navegador não é infalível.

## RNF03 — Identidade visual
A interface deverá seguir o design system e a identidade visual da empresa, respeitando cores, tipografia, logotipo, elementos gráficos e padrões de navegação oficiais.

## RNF04 — Usabilidade
O sistema deverá apresentar navegação simples, intuitiva e familiar, utilizando padrões de interação conhecidos em aplicativos de mensagens.

## RNF05 — Segurança de autenticação
O sistema deverá proteger as credenciais dos usuários. As senhas deverão ser armazenadas por meio de algoritmos apropriados de hash com salt, nunca em texto puro.

## RNF06 — Proteção de dados e sessões
A aplicação deverá utilizar HTTPS e mecanismos seguros de gerenciamento de sessão, incluindo proteção contra acesso não autorizado e encerramento de sessões conforme política definida.

## RNF07 — Controle de permissões
O sistema deverá implementar controle de acesso baseado em papéis e permissões, garantindo que somente usuários autorizados executem operações administrativas.

## RNF08 — Desempenho
A aplicação deverá apresentar tempos de resposta adequados durante navegação, envio e recebimento de mensagens e compartilhamento de arquivos, inclusive em períodos de maior utilização. Metas quantitativas deverão ser definidas durante o planejamento técnico.

## RNF09 — Escalabilidade
A arquitetura deverá suportar a estimativa de aproximadamente 900 usuários cadastrados e permitir crescimento futuro sem degradação inaceitável do serviço.

## RNF10 — Disponibilidade
O sistema deverá possuir mecanismos de monitoramento, recuperação e prevenção de falhas para reduzir interrupções na comunicação. A meta de disponibilidade deverá ser acordada com o cliente.

## RNF11 — Integridade e validação de arquivos
Os arquivos enviados deverão ser validados quanto ao tipo real de conteúdo, e não apenas pela extensão ou pelo nome. O sistema deverá aplicar limites de tamanho e verificações de segurança definidos pelo projeto.

## RNF12 — Privacidade
As conversas e os documentos compartilhados deverão ser acessíveis somente aos usuários autorizados, conforme as permissões estabelecidas. O tratamento de dados deverá observar a legislação aplicável, incluindo a LGPD.

## RNF13 — Manutenibilidade
O sistema deverá possuir arquitetura organizada, documentação técnica e código de fácil manutenção, permitindo correções e futuras evoluções.

## RNF14 — Compatibilidade com navegadores
A aplicação deverá funcionar corretamente nas versões suportadas dos principais navegadores móveis, especialmente Google Chrome e Safari. A matriz de versões suportadas deverá ser definida e testada.

# 5. Regras de negócio

| Identificador | Regra de negócio |
|---|---|
| RN01 | Somente integrantes autorizados da equipe de TI poderão criar contas de funcionários. |
| RN02 | Não será permitido o cadastro independente ou público de novos usuários. |
| RN03 | Cada funcionário deverá possuir credenciais individuais de acesso. |
| RN04 | A senha inicial deverá ser alterada obrigatoriamente no primeiro acesso. |
| RN05 | O acesso à plataforma será permitido somente a funcionários cadastrados e autorizados. |
| RN06 | O compartilhamento de arquivos será limitado ao formato PDF. |
| RN07 | O envio de imagens, fotografias e mensagens de áudio não será permitido. |
| RN08 | O sistema deverá identificar quando uma mensagem for visualizada pelo destinatário. |
| RN09 | A liberação de acesso deverá ocorrer de forma gradual, conforme autorização da empresa. |
| RN10 | A equipe de TI será responsável pelo gerenciamento dos usuários durante todo o ciclo de utilização da plataforma. |

# 6. Requisitos de interface

## 6.1 Interface do usuário
A interface deverá ser desenvolvida prioritariamente para smartphones, com organização visual inspirada em aplicativos de mensagens. A navegação deverá facilitar o acesso às conversas, à leitura e ao envio de mensagens e ao compartilhamento de PDFs.

## 6.2 Tela de autenticação
A tela de login deverá conter campos para identificação do usuário e senha, além de ação clara para entrar no sistema. O layout deverá ser simples, rápido e coerente com a identidade visual corporativa. A possibilidade de salvar credenciais deverá ser oferecida por compatibilidade com o gerenciador de senhas do navegador ou dispositivo, sem armazenamento inseguro de senhas pela aplicação.

## 6.3 Interface de conversação
A interface de conversa deverá apresentar as mensagens de forma organizada e distinguir visualmente mensagens enviadas e recebidas. Deverá disponibilizar campo para digitação de texto, ação de envio e opção de anexar arquivo PDF. A interface não deverá oferecer controles de envio de fotos, imagens ou áudios.

## 6.4 Interface administrativa
A área administrativa deverá permitir à equipe de TI consultar e gerenciar contas, cadastrar funcionários, alterar estados de acesso e apoiar a liberação gradual da plataforma. Os recursos administrativos deverão ser separados da experiência comum dos funcionários e protegidos por permissões específicas.

# 7. Requisitos de segurança

## SEG01 — Autenticação individual
Cada funcionário deverá utilizar uma conta individual, não compartilhada.

## SEG02 — Senhas protegidas
As senhas deverão ser armazenadas com hash seguro e salt. Senhas temporárias ou iniciais deverão ser tratadas com cuidado e não deverão ser expostas em registros ou mensagens indevidas.

## SEG03 — Transporte seguro
Todo o tráfego entre o dispositivo e a aplicação deverá ocorrer por HTTPS.

## SEG04 — Autorização no servidor
As permissões deverão ser verificadas no servidor para cada operação protegida; ocultar controles na interface não será considerado controle suficiente.

## SEG05 — Proteção de arquivos
O upload de arquivos deverá validar conteúdo, tipo, tamanho e condições de armazenamento. Os arquivos deverão ser disponibilizados somente a usuários autorizados.

## SEG06 — Gestão de sessão
A sessão deverá utilizar mecanismos seguros, com proteção de cookies ou tokens, expiração e possibilidade de encerramento.

## SEG07 — Auditoria administrativa
As operações relevantes de administração de contas deverão ser registradas para permitir rastreabilidade, respeitando a política de privacidade e retenção definida pela empresa.

# 8. Premissas e dependências

- A empresa fornecerá a identidade visual oficial, incluindo logotipo, cores e orientações de uso da marca.
- A empresa disponibilizará ou indicará o serviço de e-mail corporativo para envio de comunicações de acesso.
- A equipe de TI será responsável por fornecer os dados necessários para criação e gestão das contas.
- O cliente validará os grupos que participarão da implantação inicial e os critérios para expansão aos demais setores.
- A equipe de desenvolvimento definirá a stack tecnológica e a infraestrutura considerando segurança, escalabilidade, prazo e manutenção.
- A empresa deverá definir políticas de retenção de mensagens, armazenamento de documentos, recuperação de senha e suporte aos usuários, pois esses detalhes não foram estabelecidos na entrevista.

# 9. Funcionalidades fora do escopo inicial

Com base nas informações fornecidas pelo cliente, as funcionalidades abaixo não fazem parte do escopo inicial do produto:

- Chamadas de voz.
- Chamadas de vídeo.
- Envio de mensagens de áudio.
- Compartilhamento de fotografias e imagens.
- Compartilhamento de documentos Word.
- Compartilhamento de planilhas Excel.
- Publicação do aplicativo na Google Play ou na App Store.
- Utilização da plataforma em computadores e notebooks.

Outras funcionalidades existentes em aplicativos de mensagens, mas não mencionadas expressamente pelo cliente, não deverão ser consideradas automaticamente incluídas no escopo. Sua inclusão dependerá de análise, priorização e aprovação formal.
