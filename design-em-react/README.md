# Design system mobile — TeamTalk

Refs #74. Atende RF01, RF02, RNF01, RNF03, RNF04 e RNF14 da Issue #74, de `DIVISAO_TAREFAS.md` e de `docs/04-requisitos-de-interface.md`.

## Organização e estilos

`estilos/tokens.css` é a fonte dos tokens; `estilos.css` os importa e mantém os estilos das telas existentes. O layout raiz do Next continua importando somente `@design/estilos.css`. Componentes em `componentes/` usam CSS Module para não alterar seletores de login, chat ou anexos. Importe componentes pelo alias `@design/componentes` ou pelo arquivo individual.

| Categoria | Tokens e uso |
|---|---|
| Marca | `--cor-primaria` (`#176b5b`), `--cor-primaria-hover`; paleta verde já presente na main e nos PRs #93/#94 |
| Texto e superfícies | `--cor-texto`, `--cor-secundaria`, `--cor-superficie`, `--cor-fundo`, `--cor-selecionada` |
| Estados | `--cor-erro`, `--cor-sucesso`, `--cor-atencao`, `--cor-informacao` e seus fundos; sempre acompanhar de texto |
| Bordas | `--borda-fina`, `--cor-borda` para superfícies, `--cor-borda-controle` para identificar campos com contraste de pelo menos 3:1 |
| Tipografia | `--fonte-familia` usa fontes do sistema; tamanhos `xs`, `sm`, `base`, `lg`, `xl` em rem; pesos normal/médio/forte e alturas de linha |
| Espaçamento | `--espaco-1/2/3/4/5/6/8`: 4, 8, 12, 16, 20, 24 e 32 px com fonte raiz de 16 px |
| Forma | `--raio-sm/md/lg/pill`, `--sombra-painel` |
| Foco | `--cor-foco`, `--foco-espessura` (3 px), `--foco-distancia` (3 px) |
| Toque | mínimo de 44 px; componentes usam `--toque-confortavel` (48 px) de largura mínima e altura mínima |
| Leitura e movimento | `--largura-leitura`, `--duracao-interacao`; respeitar `prefers-reduced-motion` |

Os testes verificam contraste AA (4,5:1 para texto), contraste dos controles/foco e preservação dos nomes de cor existentes. A paleta versionada é a referência desta entrega; mudanças de identidade devem ocorrer nesses tokens e passar pela revisão visual da equipe.

## Componentes e contratos

| Componente | Contrato |
|---|---|
| `Botao` | Props nativas de button, incluindo ref; `variante` primaria/secundaria/discreta/perigo; `ocupado` bloqueia cliques e anuncia processamento; `expandido` ocupa toda a largura. `type="button"` por padrão; submit deve ser explícito. |
| `Campo` | Props nativas de input, incluindo ref; exige `id` único e `rotulo`. `ajuda` e `erro` geram descrições associadas; erro usa `aria-invalid` e alerta. Preserva `aria-describedby` externo, autocomplete, inputMode, required, limites, leitura e desabilitação. |
| `Badge` | Conteúdo textual e `tom` neutro/sucesso/atencao/erro/informacao. É informação estática, sem papel de botão ou anúncios automáticos. |
| `CabecalhoMobile` | `titulo`, `subtitulo`, `acoes` e retorno opcional com `aoVoltar`/`rotuloVoltar`. Não cria ações sem callback. Renderiza o h1 da página. |
| `NavegacaoMobile` | `itens` com id único, rótulo, ícone decorativo, contagem e desabilitação opcionais; `ativoId` e `aoSelecionar(id)` controlados pelo consumidor. Destino ativo usa `aria-current="page"`, sublinhado e cor. Contagens acima de 99 exibem 99+ e anunciam o valor completo. |
| `LayoutMobile` | `cabecalho`, `navegacao` opcional e conteúdo. Uma instância por página, com um main e link de salto; `idConteudo` pode personalizar a âncora. Conteúdo central rolável; cabeçalho/navegação permanecem no fluxo sem sobreposição. |

Prefira de dois a cinco destinos com rótulos curtos na navegação inferior. Use botões para alternar as vistas controladas da mesma aplicação; o contêiner implementa mudança de rota quando necessária. A seleção muda somente quando novas props forem fornecidas. A navegação não consulta permissões nem inclui um item administrativo automaticamente: o servidor deve fornecer apenas destinos autorizados e continuar protegendo cada página/API.

`LayoutMobile` usa alturas `vh`, `svh` e `dvh` com fallback e permite rolagem em paisagem ou com teclado aberto. Cabeçalho e navegação respeitam safe areas; `viewportFit: "cover"` está no layout raiz. A escala do navegador permanece liberada. Campos usam ao menos 16 px para evitar zoom automático de foco no Safari. Não introduza alturas mínimas fixas maiores que o viewport ou barras fixas sobre o compositor.

## Exemplo de montagem

```tsx
"use client";

import { useState } from "react";
import { CabecalhoMobile, LayoutMobile, NavegacaoMobile } from "@design/componentes";
import type { ReactNode } from "react";

export function AreaMobile({ conversas, conta }: { conversas: ReactNode; conta: ReactNode }) {
  const [ativoId, definirAtivo] = useState("conversas");
  return (
    <LayoutMobile
      cabecalho={<CabecalhoMobile titulo={ativoId === "conversas" ? "Conversas" : "Conta"} />}
      navegacao={<NavegacaoMobile
        itens={[{ id: "conversas", rotulo: "Conversas" }, { id: "conta", rotulo: "Conta" }]}
        ativoId={ativoId}
        aoSelecionar={definirAtivo}
      />}
    >
      {ativoId === "conversas" ? conversas : conta}
    </LayoutMobile>
  );
}
```

`GaleriaDesignSystem`, em `@design/exemplos/galeria`, fornece uma referência navegável de estados e componentes. A fixture Vite em `testes/fixture/` monta a galeria somente para desenvolvimento/teste, sem criar rota de produto nem consultar serviços. Para abrir localmente: `npx vite --config design-em-react/testes/vite.config.ts --host 127.0.0.1` na raiz.

## Integração com as entregas em andamento

Os PRs #93 (`4b960ca`), #94 (`15c9b3b`) e #104 (`31a7725`) foram consultados; seguem separados da main de origem (`31be7e7`). Esta branch não incorpora as implementações deles.

- **PR #93 — login/primeiro acesso:** `Campo` preserva `name="usuario"`, `autocomplete="username"` e `type="email"`; senha de login mantém `current-password` e nova senha/confirmação mantêm `new-password`. `Botao type="submit"` pode receber as ações de formulário existentes. Nenhuma regra de autenticação precisa mudar. Ao integrar os estilos, manter o import dos tokens no topo e remover declarações de cor duplicadas em `:root`.
- **PR #94 — conversas:** preservar `aoSelecionarConversa(id)` e `aoEnviarMensagem(conversaId, conteudo): Promise<void>`. Cabeçalho pode receber retorno `() => aoSelecionarConversa("")`. O componente `TelaConversas` já renderiza main; não o aninhe diretamente dentro de outro main. Ao adotar `LayoutMobile`, extraia o conteúdo da tela e substitua seu main externo na integração. Não mantenha `height: 100svh`/`min-height: 560px` no filho, pois o conteúdo deve caber na área central disponível. Não criar rotas ou estados de mensagem fictícios nesta etapa.
- **PR #104 — PDF:** os tokens mantêm os nomes `--cor-*` usados por `SeletorAnexoPdf`. O CSS Module do seletor permanece isolado. Montar o seletor em coluna com o compositor, manter `arquivo`, `limiteMaximoBytes`, `aoAlterarArquivo` e `desabilitado`; envio de PDF continua em callback separado. O design system não altera validação, accept ou upload. Na integração do `vitest.config.ts`, conservar os aliases/JSX automático e a exclusão do teste Playwright da suíte Vitest; `jsdom` é a mesma dependência de teste adotada no PR #104.

Toda a apresentação recebe dados e ações por props. Não importar Supabase, clientes de servidor, credenciais ou storage do navegador. Não há novas rotas Next, alterações de banco ou dependência dos PRs abertos para executar esta entrega.

## Verificação reproduzível

Na raiz:

```sh
npm install
npm run typecheck --workspace 'base(tempval)'
npm run lint --workspace 'base(tempval)'
npm test --workspace 'base(tempval)'
npm run build --workspace 'base(tempval)'
npx playwright install --with-deps chromium webkit
npm run test:mobile --workspace 'base(tempval)'
```

Os testes `*.test.ts` do Vitest verificam contratos, interação, bloqueio durante processamento, descrições acessíveis, retorno, seleção controlada, gerenciadores de senha, contraste e separação de camadas. Os testes `mobile.test.ts` rodam separadamente em Chromium com perfil Android e WebKit com perfil iPhone: navegação por toque, foco por teclado, largura/rolagem em 320×568, 390×844 e 844×390, controles >= 44 px, fonte dos campos, ampliação de texto e movimento reduzido. O build Next confirma a importação dos tokens; a galeria usa os mesmos arquivos de componentes e estilos.

Os perfis automatizados exercitam os motores de navegador em emulação, sem equivaler a aparelhos reais. Na homologação de Chrome Android e Safari iOS, registrar versão/aparelho e conferir teclado virtual e barras do navegador, recortes físicos, rotação, zoom de 200%, TalkBack/VoiceOver, gerenciador de senhas e seletor nativo de PDF ao integrar #104. O bloqueio de desktop segue no middleware existente.

O workflow `.github/workflows/design-system.yml` executa os mesmos comandos e a suíte mobile no GitHub Actions, com screenshots e traces em `design-system-mobile`. Para usar um Chromium já instalado no desenvolvimento, forneça `PLAYWRIGHT_CHROMIUM_EXECUTABLE` com o caminho do executável. O restante da suíte continua usando o WebKit instalado pelo Playwright.
