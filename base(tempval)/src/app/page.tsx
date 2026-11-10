import { carregarInicio } from "@controle/auth/inicio";
import { sair } from "@controle/auth/sair";
import { TelaInicial } from "@design/telas/inicio";

export default async function PaginaInicial() {
  const { nome } = await carregarInicio();
  return <TelaInicial nome={nome} sair={sair} />;
}
