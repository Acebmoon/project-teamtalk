import "server-only";
import { validarAmbienteServidor } from "./ambiente";

export function obterAmbienteServidor() {
  return validarAmbienteServidor(process.env);
}
