// Um endereço por entrega, sem display name, listas ou caracteres de cabeçalho.
export function emailIndividual(valor: string): boolean {
  return valor.length <= 254 && /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(valor);
}
