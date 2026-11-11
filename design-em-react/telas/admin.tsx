type Props = { nome: string };

export function TelaAdmin({ nome }: Props) {
  return (
    <main className="pagina">
      <section className="painel" aria-labelledby="titulo-admin">
        <h1 id="titulo-admin">Painel da TI</h1>
        <p>Olá, <strong>{nome}</strong>.</p>
        <a href="/" style={{ display: "inline-flex", minHeight: 48, alignItems: "center" }}>Voltar</a>
      </section>
    </main>
  );
}
