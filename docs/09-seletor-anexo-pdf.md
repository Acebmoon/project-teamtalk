# Seletor de anexos PDF — Issue #77

`SeletorAnexoPdf`, em `design-em-react/componentes/seletor-anexo-pdf.tsx`, é um componente React controlado. Recebe o arquivo, o limite em bytes e callbacks por props. Os estilos ficam em um CSS Module no mesmo diretório, sem alterar os estilos globais usados pelo PR #94. Não acessa Supabase, rede, armazenamento nem variáveis de ambiente.

| Prop | Tipo | Contrato |
|---|---|---|
| `arquivo` | `File \| null` | PDF selecionado no estado do compositor; `null` representa ausência de anexo. |
| `limiteMaximoBytes` | `number` | Inteiro positivo fornecido pela camada de controle, alinhado ao limite configurado no servidor da Issue #84. |
| `aoAlterarArquivo` | `(arquivo: File \| null) => void` | Recebe o `File` original somente após pré-validação; recebe `null` ao remover. Nunca recebe um candidato rejeitado. |
| `desabilitado` | `boolean` opcional | Bloqueia seleção, substituição e remoção enquanto o compositor envia. |

O seletor aceita `application/pdf,.pdf`, exibe nome completo e tamanho legível em pt-BR e oferece substituição e remoção. Usa controle nativo de arquivos acessível por teclado, rótulo, descrição do limite, foco visível, alvos de toque de 48 px e regiões de anúncio para seleção e erros. Nomes longos quebram linha em telas estreitas. Uma substituição inválida ou o cancelamento do seletor preserva o arquivo anterior. O input é limpo após cada escolha para permitir selecionar o mesmo arquivo novamente.

## Pré-validação

`@controle/anexos/validar-anexo-pdf` exporta `validarAnexoPdf`, `formatarTamanhoArquivo` e os tipos de metadados/resultado, sem dependências de React ou serviços.

- Exige extensão `.pdf` sem distinguir maiúsculas e minúsculas. Rejeita imagens, áudio, vídeo, Word e Excel, inclusive renomeados para `.pdf` quando o MIME informado denuncia o formato original.
- Quando o navegador informa MIME, aceita apenas `application/pdf`. MIME vazio é aceito com extensão `.pdf` para compatibilidade com seletores mobile. Isso não comprova o conteúdo real do arquivo.
- Rejeita arquivos vazios, tamanhos inválidos e arquivos acima do limite recebido por props; aceita exatamente o limite. Limite inválido bloqueia a seleção.
- A formatação usa unidades de 1024 bytes com rótulos B/KB/MB/GB, compatíveis com o limite em bytes. O componente não fixa um limite próprio.

**Esta validação no cliente complementa, mas não substitui, a validação obrigatória do servidor da Issue #84.** MIME e nome fornecidos pelo navegador podem ser falsificados. O servidor deve validar tamanho, MIME, magic bytes e estrutura do PDF, além de autorização e armazenamento privado, antes de aceitar o upload. Nenhum teste desta entrega demonstra validade estrutural de PDF ou segurança do upload.

## Encaixe no compositor do PR #94

A assinatura existente `aoEnviarMensagem(conversaId, conteudo): Promise<void>` permanece destinada a texto. O seletor não adiciona um argumento de arquivo a esse callback. O compositor mantém o anexo em estado e conecta `aoAlterarArquivo` a esse estado. O envio de PDF deve usar um callback separado, implementado pela camada de controle com o serviço da Issue #84, por exemplo `aoEnviarPdf(conversaId, arquivo): Promise<void>`.

Importação e montagem no compositor:

```tsx
import { SeletorAnexoPdf } from "@design/componentes/seletor-anexo-pdf";
import { validarAnexoPdf } from "@controle/anexos/validar-anexo-pdf";

const [arquivo, definirArquivo] = useState<File | null>(null);

<SeletorAnexoPdf
  arquivo={arquivo}
  limiteMaximoBytes={limiteMaximoBytes}
  aoAlterarArquivo={definirArquivo}
  desabilitado={enviando}
/>;
```

Monte o seletor no compositor da conversa ativa. Como o formulário `.chat-compositor` do PR #94 organiza texto e botão em uma linha, o seletor pode ficar logo antes desse formulário, dentro da mesma área de composição. Se ficar dentro do formulário, organize a área em coluna ou permita quebra de linha. A ação de remover tem `type="button"` e não envia a mensagem.

O contêiner que integra a tela deve:

1. Fornecer o limite obtido da configuração pública de upload da camada de controle, sem expor segredos de servidor.
2. Limpar o anexo ao trocar de conversa e montar o seletor com `key={conversaAtivaId}` para reiniciar também o feedback local.
3. Reexecutar `validarAnexoPdf(arquivo, limiteMaximoBytes)` imediatamente antes de chamar `aoEnviarPdf(conversaAtivaId, arquivo)`, pois o limite pode mudar após a escolha. Quando o limite diminui, o componente também apresenta o erro nas novas props.
4. Desabilitar o seletor durante o envio; remover o arquivo somente após confirmação do serviço. Em falha de upload, manter o arquivo e mostrar o erro retornado pelo serviço.
5. Manter `aoEnviarMensagem(conversaId, conteudo)` para envio de texto e não simular upload, mensagem enviada ou recibo de leitura ao selecionar um PDF.

O PR #94 ainda não está na `main` usada como base desta branch (`31be7e7`). Esta entrega fornece o seletor independente e seu contrato de integração, sem copiar ou incorporar a tela de conversas de outra branch. O upload real depende da Issue #84.

## Verificação

Na raiz do repositório, execute:

```sh
npm install
npm run typecheck --workspace 'base(tempval)'
npm run lint --workspace 'base(tempval)'
npm run build --workspace 'base(tempval)'
npm test --workspace 'base(tempval)'
```

Os testes `*.test.ts` cobrem metadados válidos/proibidos, PDFs acima do limite, limites inválidos, tamanho legível e interações do componente (callback, substituição, remoção, cancelamento, foco, desabilitação e atributos acessíveis). Somente os testes do componente usam jsdom; os helpers permanecem testáveis em Node. A configuração do Vitest resolve os aliases `@controle/*` e `@design/*` como o TypeScript/Next.

Na homologação em Chrome Android e Safari iOS, conferir abertura do seletor nativo, cancelamento, escolha repetida, leitura dos erros por leitor de tela, nomes longos e layout em 320 px. Os testes automatizados em jsdom não equivalem a essa verificação em aparelhos reais.
