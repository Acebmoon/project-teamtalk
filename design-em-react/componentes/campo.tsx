import type { ComponentPropsWithRef } from "react";
import estilos from "@design/componentes/design-system.module.css";

export type PropsCampo = Omit<ComponentPropsWithRef<"input">, "id"> & {
  id: string;
  rotulo: string;
  ajuda?: string;
  erro?: string;
};

/** O id explícito permite uso em Server Components e associação estável do rótulo. */
export function Campo({ id, rotulo, ajuda, erro, className = "", ...props }: PropsCampo) {
  const descricao = [props["aria-describedby"], ajuda && `${id}-ajuda`, erro && `${id}-erro`]
    .filter(Boolean).join(" ") || undefined;
  return (
    <div className={estilos.campo}>
      <label className={estilos.rotulo} htmlFor={id}>{rotulo}</label>
      <input
        {...props}
        id={id}
        className={`${estilos.entrada} ${className}`}
        aria-invalid={erro ? true : props["aria-invalid"]}
        aria-describedby={descricao}
      />
      {ajuda && <p className={estilos.ajuda} id={`${id}-ajuda`}>{ajuda}</p>}
      {erro && <p className={estilos.erro} id={`${id}-erro`} role="alert">{erro}</p>}
    </div>
  );
}
