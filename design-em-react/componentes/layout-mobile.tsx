import type { ReactNode } from "react";
import estilos from "@design/componentes/design-system.module.css";

export type PropsLayoutMobile = {
  cabecalho: ReactNode;
  navegacao?: ReactNode;
  children?: ReactNode;
  idConteudo?: string;
};

export function LayoutMobile({ cabecalho, navegacao, children, idConteudo = "conteudo-principal" }: PropsLayoutMobile) {
  return (
    <div className={estilos.layout}>
      <a className={estilos.pular} href={`#${idConteudo}`}>Pular para o conteúdo</a>
      {cabecalho}
      <main className={estilos.conteudo} id={idConteudo} tabIndex={-1}>{children}</main>
      {navegacao}
    </div>
  );
}
