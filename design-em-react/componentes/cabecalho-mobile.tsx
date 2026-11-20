import type { ReactNode } from "react";
import { Botao } from "@design/componentes/botao";
import estilos from "@design/componentes/design-system.module.css";

export type PropsCabecalhoMobile = {
  titulo: string;
  subtitulo?: string;
  aoVoltar?: () => void;
  rotuloVoltar?: string;
  acoes?: ReactNode;
};

export function CabecalhoMobile({
  titulo, subtitulo, aoVoltar, rotuloVoltar = "Voltar", acoes,
}: PropsCabecalhoMobile) {
  return (
    <header className={estilos.cabecalho}>
      {aoVoltar && (
        <Botao variante="discreta" onClick={aoVoltar} aria-label={rotuloVoltar}>
          <span aria-hidden="true">‹</span>
        </Botao>
      )}
      <div className={estilos.identidade}>
        <h1>{titulo}</h1>
        {subtitulo && <p>{subtitulo}</p>}
      </div>
      {acoes && <div className={estilos.acoes}>{acoes}</div>}
    </header>
  );
}
