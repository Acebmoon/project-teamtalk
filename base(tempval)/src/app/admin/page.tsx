import { carregarPainelAdmin } from "@controle/admin/painel";
import { TelaAdmin } from "@design/telas/admin";

export default async function PaginaAdmin() {
  const { nome } = await carregarPainelAdmin();
  return <TelaAdmin nome={nome} />;
}
