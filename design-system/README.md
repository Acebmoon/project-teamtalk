# TeamTalk — Pacote de UI Assets e Handoff

**Versão do pacote:** 2.6  
**Status:** seis pranchas aprovadas; biblioteca com 27 ícones SVG.

## Conteúdo do pacote

- `icons/` — biblioteca de ícones funcionais em SVG.
- `tokens/` — tokens visuais do projeto.
- `fonts/` — orientações e informações sobre fontes e licenças.
- `handoff/` — manifesto, guia de implementação e registro de decisões.
- `documentation/` — especificações funcionais das duas telas, em DOCX editável e PDF para consulta.
- `references/` — somente imagens de referência aprovadas em alta resolução 4x.

## Inventário de ícones

| Tela / prancha | Ícones |
|---|---:|
| Lista de Conversas — Prancha 1 | 9 |
| Lista de Conversas — Prancha 2 | 2 |
| Tela Conversa — Prancha 1 | 11 |
| Tela Conversa — Prancha 2 | 5 |
| **Total** | **27** |

## Uso dos SVGs

- Os arquivos são vetoriais e possuem `viewBox` próprio.
- Preserve a proporção original ao redimensionar.
- Não altere cores, espessuras ou geometria sem aprovação do time de Design.
- Para ícones de 24 px, use dimensões CSS de `24px × 24px`, salvo especificação diferente na prancha.
- Ícones com branco foram desenhados para fundos escuros; confira o contexto indicado na prancha.
- O ícone de excluir usa vermelho de ação destrutiva.
- O ícone de anexar PDF é o sinal de mais (+), conforme decisão aprovada.
- O SVG `icons/lista-de-conversas/prancha-2/lista-vazia.svg` é o asset vetorial oficial para o estado de lista vazia e deve ser reutilizado onde esse estado aparecer.

## Referências visuais incluídas

A pasta `references/` contém exclusivamente as versões aprovadas em alta resolução 4x:

### Visão geral do projeto
- `references/visao-geral-do-projeto/visao-geral-das-telas-4x.png`

### Lista de Conversas
- `references/lista-de-conversas/prancha-1-design-visual-reconstrucao-4x.png`
- `references/lista-de-conversas/prancha-2-estados-interacoes-reconstrucao-4x.png`
- `references/lista-de-conversas/prancha-3-regras-handoff-reconstrucao-4x.png`

### Tela Conversa
- `references/tela-conversa/prancha-1-design-visual-aprovada-4x.png`
- `references/tela-conversa/prancha-2-estados-interacoes-aprovada-4x.png`
- `references/tela-conversa/prancha-3-regras-handoff-aprovada-4x.png`

**Nota técnica:** as referências 4x são imagens raster ampliadas para facilitar leitura e zoom; não são arquivos vetoriais. Para nitidez vetorial em qualquer escala, seria necessário reconstruir as pranchas em formato vetorial.

## Integração no GitHub

1. Crie uma branch específica para a integração do Design System e do handoff; evite enviar diretamente para `main`.
2. Defina com a equipe o diretório de destino no repositório. Se o pacote for mantido como uma unidade, preserve a estrutura de pastas apresentada neste ZIP.
3. Inclua `icons/`, `tokens/`, `fonts/`, `handoff/`, `documentation/` e `references/`. A pasta `documentation/` contém as especificações funcionais editáveis e suas versões de consulta; `references/` contém as pranchas aprovadas em alta resolução 4x.
4. Preserve os nomes e caminhos dos arquivos para evitar referências quebradas.
5. Consulte `handoff/ASSET_MANIFEST.json` para inventário e rastreabilidade.
6. Abra um Pull Request com o resumo dos arquivos incluídos, as decisões aprovadas e as pendências que ainda dependem de Produto.
7. Após a revisão da equipe, faça o merge conforme o fluxo de contribuição do repositório.

## Fora deste pacote

- Arquivos de fonte Amazon Ember: não incluídos. Consulte `fonts/FONTES_E_LICENCAS.md` e use somente arquivos com licença e distribuição autorizadas.
- Logotipos oficiais Amazon/Amazon News: devem vir do repositório oficial de marca aprovado.
- Estados compostos (por exemplo, skeleton loading): devem ser implementados como componentes de interface, não como ícones SVG.

## Controle de versão e aprovação

As seis pranchas de referência — três da Lista de Conversas e três da Tela Conversa — foram aprovadas. A aprovação visual não substitui testes de acessibilidade, contraste, renderização em Android/iOS e validação no produto.

A pasta `references/` mantém somente as imagens de alta resolução 4x. Não há arquivos originais ou versões intermediárias listados neste pacote.


## Tokens e documentação de implementação — v2.6

- `tokens/teamtalk.tokens.json` — fonte estruturada dos tokens.
- `tokens/teamtalk.css` — variáveis CSS correspondentes.
- `handoff/GUIA_IMPLEMENTACAO_UIUX.md` — orientações de implementação, regras e checklist de QA.
- `handoff/REGISTRO_DE_DECISOES.md` — decisões aprovadas e pendências explícitas.

Os valores foram consolidados a partir das pranchas e documentos funcionais disponíveis. Não inferir decisões ainda pendentes, especialmente o escopo da exclusão de mensagens e o histórico de versões editadas.


## Preparação para integração — v2.6

- Tokens considerados revisados para esta etapa.
- README, guia de implementação, registro de decisões e manifesto conferidos em conjunto.
- O pacote está preparado para revisão de integração ao repositório; nenhuma alteração foi enviada ao GitHub.


## Especificações funcionais — DOCX e PDF

O pacote inclui **somente as duas especificações funcionais vigentes**, organizadas por tela dentro de `documentation/`. Cada documento está disponível em dois formatos: DOCX editável e PDF para consulta e distribuição.

### Lista de Conversas

Localização: `documentation/lista-de-conversas/`

- `TeamTalk_Lista_de_Conversas.docx`
- `TeamTalk_Lista_de_Conversas.pdf`

Este documento consolida as decisões funcionais e visuais da tela Lista de Conversas. Use-o para consultar o escopo aprovado, a estrutura da tela, os componentes, as regras de comportamento, as restrições e as pendências que precisam de validação. Ele complementa as três pranchas da Lista de Conversas e serve de referência compartilhada para Design, Front-End, Back-End, QA e Produto.

### Tela Conversa

Localização: `documentation/tela-conversa/`

- `TeamTalk_Conversa.docx`
- `TeamTalk_Conversa.pdf`

Este documento consolida as decisões funcionais e visuais da Tela Conversa. Use-o para consultar as regras de mensagens, envio e compartilhamento exclusivo de PDF, estados de envio/entrega/leitura, ações sobre mensagens, limites, critérios de aceitação e pontos ainda pendentes. Ele complementa as três pranchas da Tela Conversa e orienta Design, Front-End, Back-End, QA e Produto.

### Por que existem duas versões de cada documento?

- **DOCX:** versão editável. Use quando for necessário propor, revisar ou aprovar alterações no conteúdo. Ao atualizar o DOCX, gere novamente o PDF correspondente para manter os dois formatos sincronizados.
- **PDF:** versão de consulta e distribuição. Use para leitura, revisão, compartilhamento e referência durante implementação e QA. O PDF não deve ser tratado como arquivo-fonte para edição.

### Como usar no fluxo de trabalho

1. Identifique a tela em que está trabalhando e abra a pasta correspondente.
2. Consulte primeiro o PDF para leitura rápida e referência estável durante implementação, revisão ou QA.
3. Se precisar alterar uma regra ou especificação, edite o DOCX correspondente e submeta a mudança à validação dos responsáveis.
4. Após a aprovação da alteração, atualize o PDF a partir do DOCX e mantenha ambos na mesma pasta.
5. Consulte também as pranchas correspondentes em `references/` para conferir a representação visual. Os documentos funcionais complementam as pranchas; não as substituem.
6. Em caso de dúvida ou conflito, não escolha uma regra por inferência: registre a divergência e solicite validação de Design/Produto antes da implementação.

O documento inicial `TeamTalk_Squad_Handoff.docx` **não faz parte deste pacote**. O arquivo `TeamTalk_Especificacao_Funcional_UIUX_v1.0.docx` foi renomeado para `TeamTalk_Lista_de_Conversas.docx`, conforme decisão do projeto. As versões PDF foram geradas a partir dos respectivos DOCX para facilitar consulta e compartilhamento.
