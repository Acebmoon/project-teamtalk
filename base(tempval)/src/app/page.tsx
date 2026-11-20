import { carregarInicio } from "@controle/auth/inicio";
import { sair } from "@controle/auth/sair";
import { WorkspaceChat } from "@controle/chat/workspace";

export const dynamic = "force-dynamic";

export default async function PaginaInicial() {
  const dados = await carregarInicio();
  return <WorkspaceChat key={dados.usuarioId} {...dados} sair={sair} />;
}
