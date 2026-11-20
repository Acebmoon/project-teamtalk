export type MetadadosAnexo = Pick<File, "name" | "type" | "size">;

export type ResultadoValidacaoPdf =
  | { valido: true }
  | {
      valido: false;
      codigo: "limite" | "formato" | "vazio" | "tamanho";
      mensagem: string;
    };

export function formatarTamanhoArquivo(bytes: number): string {
  if (!Number.isSafeInteger(bytes) || bytes < 0) return "Tamanho indisponível";
  const unidades = ["B", "KB", "MB", "GB", "TB", "PB"];
  const indice = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  const tamanho = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / 1024 ** indice);
  return `${tamanho} ${unidades[indice]}`;
}

/** Pré-validação de metadados; a inspeção real do conteúdo pertence ao servidor (Issue #84). */
export function validarAnexoPdf(arquivo: MetadadosAnexo, limiteMaximoBytes: number): ResultadoValidacaoPdf {
  if (!Number.isSafeInteger(limiteMaximoBytes) || limiteMaximoBytes <= 0) {
    return { valido: false, codigo: "limite", mensagem: "Não foi possível verificar o limite do anexo. Tente novamente mais tarde." };
  }

  // Alguns seletores mobile não informam MIME. MIME informado e incompatível nunca é aceito.
  const mime = arquivo.type.trim().toLowerCase();
  if (!/\.pdf$/i.test(arquivo.name) || (mime !== "" && mime !== "application/pdf")) {
    return {
      valido: false,
      codigo: "formato",
      mensagem: "Selecione somente arquivos PDF (.pdf). Imagens, áudio, vídeo, Word e Excel não são permitidos.",
    };
  }

  if (!Number.isSafeInteger(arquivo.size) || arquivo.size <= 0) {
    return { valido: false, codigo: "vazio", mensagem: "O PDF está vazio ou tem tamanho inválido. Escolha outro arquivo." };
  }

  if (arquivo.size > limiteMaximoBytes) {
    return {
      valido: false,
      codigo: "tamanho",
      mensagem: `O PDF excede o limite de ${formatarTamanhoArquivo(limiteMaximoBytes)}. Escolha um arquivo menor.`,
    };
  }

  return { valido: true };
}
