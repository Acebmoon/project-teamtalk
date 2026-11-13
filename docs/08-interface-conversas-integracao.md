# Interface de conversas — integração

## O que esta entrega fornece
- Componente React mobile-first `TelaConversas`.
- Lista de conversas, seleção, cabeçalho, histórico, balões recebidos/enviados e compositor de texto.
- Indicadores visuais para estados `enviando`, `enviada`, `lida` e `falha`.
- Contagem de mensagens não lidas e indicação opcional de presença.
- Acessibilidade básica, estados vazios/carregamento/erro e navegação mobile entre lista e conversa.

## Fronteira de integração
A tela é deliberadamente presentational: recebe os dados e callbacks por props. O componente não importa Supabase, não consulta tabelas diretamente e não inventa recibos de leitura.

O módulo de serviço do backend deve adaptar seus contratos para:
- fornecer `usuarioId`, `conversas` e `mensagens`;
- atualizar `conversaAtivaId` ao chamar `aoSelecionarConversa(id)`;
- implementar `aoEnviarMensagem(conversaId, conteudo)` e atualizar a lista/histórico após confirmação;
- publicar atualizações em tempo real de mensagens e estados de leitura, refletindo-as nas props;
- marcar como lida no servidor somente conforme a regra de negócio do serviço.

## Tipos esperados pela interface
Os tipos exportados em `design-em-react/telas/conversas.tsx` são o modelo de visualização da tela, não substituem os DTOs/API contracts oficiais do backend. Faça o mapeamento no adaptador da camada de controle, preservando os nomes e regras publicados pelo responsável pelo serviço.

## Limite atual
Os contratos de serviço do chat atribuídos ao Pedro não foram encontrados na branch `main` durante esta implementação. Portanto, a tela e sua fronteira de integração estão preparadas, mas o fluxo ponta a ponta com dois usuários, persistência e recibos reais depende da conexão ao serviço oficial e de validação com duas contas de teste.
