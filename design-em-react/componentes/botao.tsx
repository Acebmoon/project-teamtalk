import type { ComponentPropsWithRef } from "react";
import estilos from "@design/componentes/design-system.module.css";

export type PropsBotao = ComponentPropsWithRef<"button"> & {
  variante?: "primaria" | "secundaria" | "discreta" | "perigo";
  ocupado?: boolean;
  expandido?: boolean;
};

export function Botao({
  variante = "primaria", ocupado = false, expandido = false,
  type = "button", disabled, className = "", children, ...props
}: PropsBotao) {
  return (
    <button
      {...props}
      type={type}
      className={`${estilos.botao} ${className}`}
      data-variante={variante}
      data-expandido={expandido}
      disabled={disabled || ocupado}
      aria-busy={ocupado || undefined}
    >
      {ocupado && <span aria-hidden="true">…</span>}
      {children}
      {ocupado && <span className={estilos.somenteLeitor}>Em andamento.</span>}
    </button>
  );
}
