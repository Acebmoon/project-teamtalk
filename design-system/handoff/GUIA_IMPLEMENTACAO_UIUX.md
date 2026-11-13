# TeamTalk — Guia de Implementação UI/UX

**Versão:** 1.0  
**Escopo:** Lista de Conversas e Tela Conversa  
**Público:** Design, Front-End, Back-End e QA

## 1. Objetivo

Este guia acompanha as seis pranchas aprovadas e a biblioteca de assets. Ele organiza orientações para implementação; não substitui as pranchas nem as especificações funcionais de cada tela.

## 2. Arquivos de referência

- `tokens/teamtalk.tokens.json`: tokens em formato JSON.
- `tokens/teamtalk.css`: variáveis CSS para consumo no front-end.
- `icons/`: ícones funcionais em SVG.
- `references/`: somente as sete imagens aprovadas em alta resolução 4x.
- `handoff/ASSET_MANIFEST.json`: inventário e rastreabilidade dos assets.

## 3. Uso dos tokens

Importe `tokens/teamtalk.css` no ponto global de estilos do aplicativo. Prefira utilizar as custom properties `--tt-*` em vez de repetir valores HEX ou dimensões em componentes.

Exemplo:

```css
.chat-header {
  min-height: var(--tt-header-height);
  background: var(--tt-color-amazon-dark);
  color: #fff;
  font-family: var(--tt-font-family);
}

.message--sent {
  background: var(--tt-color-message-sent);
  color: #fff;
  border-radius: var(--tt-message-bubble-radius);
  padding: var(--tt-message-bubble-padding);
}
```

O JSON é a fonte estruturada dos tokens; o CSS é a interface de consumo no front-end. Ao alterar um valor, manter os dois arquivos sincronizados.

## 4. Tipografia e marca

- Família preferencial: Amazon Ember, somente se os arquivos e o uso estiverem autorizados.
- Fallback: Inter, Arial, sans-serif.
- Os arquivos de fonte não fazem parte do pacote.
- Não recriar nem redistribuir logotipos proprietários a partir das pranchas. Utilizar os arquivos oficiais fornecidos pelos canais autorizados.

## 5. Biblioteca SVG

- Reutilizar os SVGs por função e manter seus nomes/caminhos.
- Preservar `viewBox`, proporções e cores definidos no arquivo.
- Não rasterizar ícones para uso na interface.
- O ícone `icons/lista-de-conversas/prancha-2/lista-vazia.svg` é o asset oficial para o estado de lista vazia.
- Na Tela Conversa, o controle para anexar PDF é o sinal de mais (+), conforme decisão aprovada.
- O alvo interativo deve ter pelo menos 44 × 44 CSS px, mesmo quando o desenho do ícone mede 24 × 24 px.

## 6. Regras compartilhadas de implementação

- Viewport de referência: 390 × 844 CSS px; abordagem mobile first.
- Layout responsivo para Android e iOS, respeitando safe areas.
- Contraste mínimo de 4.5:1 para texto normal (WCAG 2.1 AA).
- Fornecer nomes acessíveis/labels para ícones e controles.
- Garantir ordem lógica de foco e navegação por teclado.
- Não usar somente cor para comunicar estados; combinar cor com texto ou símbolo.

## 7. Lista de Conversas

- Abas: Todos, Equipes e Favoritos.
- Cabeçalho: referência de 64 px; abas: 48 px; item de conversa: 72 px; navegação inferior: 64 px.
- Avatar: 48 px.
- Até cinco conversas fixadas por funcionário.
- Lista ordenada por atividade recente; conversas fixadas no topo.
- Pesquisa ordenada por relevância e limitada ao conteúdo que o usuário tem permissão para acessar.
- Badge de não lidas limitado visualmente a `99+`.
- Cores dos avatares são atribuídas por departamento, não por hash de usuário:

| Departamento | Fundo | Texto |
|---|---|---|
| Tecnologia (TI) | `#FF9900` | `#232F3E` |
| Operações | `#345B83` | `#FFFFFF` |
| Recursos Humanos | `#7B5266` | `#FFFFFF` |
| Marketing | `#B34E32` | `#FFFFFF` |
| Projetos | `#24776D` | `#FFFFFF` |

## 8. Tela Conversa

- Mensagens de texto em conversas individuais e em grupo.
- Compartilhamento exclusivo de arquivos PDF.
- Limite máximo: 10 MB por arquivo.
- Não oferecer chamadas de áudio ou vídeo.
- Edição de mensagem enviada: até 15 minutos após o envio; exibir o rótulo “Editada”.
- Histórico de mensagens: retenção por prazo indeterminado.
- Ações previstas no menu contextual: copiar, responder, encaminhar, editar e excluir.
- Indicadores de envio, entrega e leitura conforme a Prancha 2.
- O campo de composição deve suportar texto e anexação de PDF pelo botão “+”.

## 9. Decisões ainda pendentes

Os itens abaixo não devem ser inferidos pelo desenvolvimento:

| Tema | Situação |
|---|---|
| Escopo da exclusão de mensagens (somente para quem exclui, para todos ou ambas) | **Pendente de Produto** |
| Histórico de versões anteriores de mensagens editadas | **Não definido** |
| Permissões detalhadas por perfil | Fora do escopo destas pranchas; especificar no fluxo correspondente |
| Política técnica de sincronização e persistência | Definir com Engenharia |

O prazo de edição de 15 minutos, o limite PDF de 10 MB e a retenção indeterminada do histórico são decisões aprovadas e não devem ser tratados como pendentes.

## 10. Checklist de handoff e QA

- [ ] Aplicar os tokens CSS e conferir paridade com o JSON.
- [ ] Conferir as seis pranchas 4x durante a implementação.
- [ ] Validar os SVGs nos tamanhos e fundos previstos.
- [ ] Testar viewport de referência e variações responsivas.
- [ ] Verificar contraste, leitor de tela, foco e alvos de toque.
- [ ] Testar limite de 10 MB e bloqueio de formatos diferentes de PDF.
- [ ] Testar janela de edição de 15 minutos e rótulo “Editada”.
- [ ] Confirmar retenção de histórico sem expiração automática.
- [ ] Não implementar uma regra de exclusão até Produto decidir seu escopo.
- [ ] Validar Android e iOS e registrar resultados de QA.

## 11. Controle de alterações

- **1.0:** primeira consolidação do guia com base nas pranchas aprovadas e especificações disponíveis.
