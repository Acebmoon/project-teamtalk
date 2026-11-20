import type { ReactNode } from "react";
import { Badge } from "@design/componentes/badge";
import estilos from "@design/componentes/design-system.module.css";

export type ItemNavegacaoMobile = {
  id: string;
  rotulo: string;
  icone?: ReactNode;
  contagem?: number;
  desabilitado?: boolean;
};

export type PropsNavegacaoMobile = {
  itens: readonly ItemNavegacaoMobile[];
  ativoId: string;
  aoSelecionar: (id: string) => void;
  rotulo?: string;
};

/** Navegação controlada: o consumidor fornece apenas destinos disponíveis ao usuário. */
export function NavegacaoMobile({ itens, ativoId, aoSelecionar, rotulo = "Navegação principal" }: PropsNavegacaoMobile) {
  return (
    <nav className={estilos.navegacao} aria-label={rotulo}>
      <ul>
        {itens.map(({ id, rotulo: nome, icone, contagem, desabilitado }) => (
          <li key={id}>
            <button
              type="button"
              className={estilos.destino}
              aria-current={id === ativoId ? "page" : undefined}
              disabled={desabilitado}
              onClick={() => aoSelecionar(id)}
            >
              {icone && <span aria-hidden="true">{icone}</span>}
              <span>{nome}</span>
              {Number.isSafeInteger(contagem) && contagem! > 0 && (
                <Badge aria-label={`${contagem} ${contagem === 1 ? "não lida" : "não lidas"}`}>
                  {contagem! > 99 ? "99+" : contagem}
                </Badge>
              )}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
