import type { ComponentPropsWithoutRef } from "react";
import estilos from "@design/componentes/design-system.module.css";

export type PropsBadge = ComponentPropsWithoutRef<"span"> & {
  tom?: "neutro" | "sucesso" | "atencao" | "erro" | "informacao";
};

export function Badge({ tom = "neutro", className = "", ...props }: PropsBadge) {
  return <span {...props} className={`${estilos.badge} ${className}`} data-tom={tom} />;
}
