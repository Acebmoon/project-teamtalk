type Props = { entrar: (dados: FormData) => Promise<void>; mensagem: string };

export function TelaLogin({ entrar, mensagem }: Props) {
  return (
    <main className="pagina">
      <section className="painel" aria-labelledby="titulo-login">
        <h1 id="titulo-login">TeamTalk</h1>
        <p>Entre com sua conta autorizada.</p>
        <form action={entrar} className="formulario">
          <label htmlFor="usuario">Usuário</label>
          <input id="usuario" name="usuario" type="email" autoComplete="username" required />
          <label htmlFor="senha">Senha</label>
          <input id="senha" name="senha" type="password" autoComplete="current-password" required aria-describedby={mensagem ? "erro-login" : undefined} aria-invalid={!!mensagem} />
          {mensagem && <p className="erro" id="erro-login" role="alert">{mensagem}</p>}
          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
