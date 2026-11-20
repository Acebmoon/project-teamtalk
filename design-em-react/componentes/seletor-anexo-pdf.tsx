"use client";

import { Icone } from "@design/icones/icone";
import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { formatarTamanhoArquivo, validarAnexoPdf } from "@controle/anexos/validar-anexo-pdf";
import estilos from "@design/componentes/seletor-anexo-pdf.module.css";

export type PropsSeletorAnexoPdf = {
  arquivo: File | null;
  limiteMaximoBytes: number;
  aoAlterarArquivo: (arquivo: File | null) => void;
  desabilitado?: boolean;
};

/** Controlado pelo compositor: não envia arquivos nem acessa serviços de armazenamento. */
export function SeletorAnexoPdf({
  arquivo,
  limiteMaximoBytes,
  aoAlterarArquivo,
  desabilitado = false,
}: PropsSeletorAnexoPdf) {
  const id = useId();
  const entrada = useRef<HTMLInputElement>(null);
  const [erroSelecao, setErroSelecao] = useState<string | null>(null);
  const validacaoAtual = arquivo ? validarAnexoPdf(arquivo, limiteMaximoBytes) : null;
  const erro = erroSelecao ?? (validacaoAtual && !validacaoAtual.valido ? validacaoAtual.mensagem : null);
  const descricao = `${id}-ajuda${erro ? ` ${id}-erro` : ""}`;

  function selecionar(evento: ChangeEvent<HTMLInputElement>) {
    const selecionado = evento.currentTarget.files?.[0];
    // Permite selecionar novamente o mesmo arquivo após remoção ou rejeição.
    evento.currentTarget.value = "";
    if (desabilitado || !selecionado) return;

    const resultado = validarAnexoPdf(selecionado, limiteMaximoBytes);
    if (!resultado.valido) {
      setErroSelecao(`${resultado.mensagem}${arquivo ? " O PDF selecionado anteriormente foi mantido." : ""}`);
      return;
    }

    setErroSelecao(null);
    aoAlterarArquivo(selecionado);
  }

  function remover() {
    if (desabilitado) return;
    setErroSelecao(null);
    aoAlterarArquivo(null);
    entrada.current?.focus();
  }

  return (
    <div className={estilos.seletor} role="group" aria-labelledby={`${id}-titulo`}>
      <strong id={`${id}-titulo`}>Anexo PDF</strong>
      <p className={estilos.ajuda} id={`${id}-ajuda`}>
        Somente PDF. Máximo: {formatarTamanhoArquivo(limiteMaximoBytes)}.
      </p>
      <div className={estilos.arquivo} role="status" aria-live="polite" aria-atomic="true">
        {arquivo ? (
          <>
            <span className={estilos.nome}>{arquivo.name}</span>
            <span className={estilos.tamanho}>{formatarTamanhoArquivo(arquivo.size)}</span>
          </>
        ) : (
          <span>Nenhum PDF selecionado.</span>
        )}
      </div>
      <div className={estilos.acoes}>
        <label className={estilos.controle} data-desabilitado={desabilitado}>
          <Icone nome="anexar-pdf" />{arquivo ? "Substituir PDF" : "Anexar PDF"}
          <input
            ref={entrada}
            className={estilos.entrada}
            type="file"
            accept="application/pdf,.pdf"
            onChange={selecionar}
            disabled={desabilitado}
            aria-describedby={descricao}
            aria-invalid={!!erro}
          />
        </label>
        {arquivo && (
          <button className={estilos.remover} type="button" onClick={remover} disabled={desabilitado}>
            Remover PDF
          </button>
        )}
      </div>
      {erro && <p className={estilos.erro} id={`${id}-erro`} role="alert">{erro}</p>}
    </div>
  );
}
