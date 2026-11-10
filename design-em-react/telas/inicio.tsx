type Props = { nome: string; sair: () => Promise<void> };

export function TelaInicial({ nome, sair }: Props) {
  return (
    <main className="pagina">
      <section className="painel" aria-labelledby="titulo-inicio">
        <h1 id="titulo-inicio">TeamTalk</h1>
        <p>Olá, <strong>{nome}</strong>.</p>
        <form action={sair}>
          <button type="submit">Sair</button>
        </form>
      </section>
    </main>
  );
}
