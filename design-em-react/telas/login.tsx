type Props = { entrar: (dados: FormData) => Promise<void>; mensagem: string; aviso: string };

export function TelaLogin({ entrar, mensagem, aviso }: Props) {
  return (
    <main className="pagina">
      <section className="painel" aria-labelledby="titulo-login">
        <div className="marca" aria-label="TeamTalk">
          <span className="marca-simbolo" aria-hidden="true">T</span>
          <span>TeamTalk</span>
        </div>
        <h1 id="titulo-login">Acesse sua conta</h1>
        <p>Entre com suas credenciais corporativas autorizadas.</p>
        {aviso && <p role="status">{aviso}</p>}
        <form action={entrar} className="formulario">
          <label htmlFor="usuario">E-mail corporativo</label>
          <input
            id="usuario"
            name="usuario"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="email"
            enterKeyHint="next"
            required
            aria-invalid={!!mensagem}
          />
          <label htmlFor="senha">Senha</label>
          <input
            id="senha"
            name="senha"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            required
            aria-describedby={mensagem ? "erro-login" : undefined}
            aria-invalid={!!mensagem}
          />
          {mensagem && <p className="erro" id="erro-login" role="alert">{mensagem}</p>}
          <button type="submit">Entrar</button>
        </form>
      </section>
    </main>
  );
}
