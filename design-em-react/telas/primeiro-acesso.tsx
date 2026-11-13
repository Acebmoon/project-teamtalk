type Props = {
  email: string;
  trocarSenha: (dados: FormData) => Promise<void>;
  sair: () => Promise<void>;
  mensagem: string;
};

export function TelaPrimeiroAcesso({ email, trocarSenha, sair, mensagem }: Props) {
  return (
    <main className="pagina">
      <section className="painel" aria-labelledby="titulo-primeiro-acesso">
        <div className="marca" aria-label="TeamTalk">
          <span className="marca-simbolo" aria-hidden="true">T</span>
          <span>TeamTalk</span>
        </div>
        <h1 id="titulo-primeiro-acesso">Crie sua nova senha</h1>
        <p>Por segurança, você precisa substituir a senha provisória antes de acessar as conversas.</p>
        <form action={trocarSenha} className="formulario">
          <label htmlFor="email">E-mail corporativo</label>
          <input
            id="email"
            name="usuario"
            type="email"
            value={email}
            readOnly
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
          <label htmlFor="nova-senha">Nova senha</label>
          <input
            id="nova-senha"
            name="senha"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            enterKeyHint="next"
            required
            aria-describedby={mensagem ? "regra-senha erro-troca" : "regra-senha"}
            aria-invalid={!!mensagem}
          />
          <p id="regra-senha">Use pelo menos 10 caracteres. O limite é de 72 bytes.</p>
          <label htmlFor="confirmacao">Confirmar nova senha</label>
          <input
            id="confirmacao"
            name="confirmacao"
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={72}
            enterKeyHint="done"
            required
            aria-describedby={mensagem ? "erro-troca" : undefined}
            aria-invalid={!!mensagem}
          />
          {mensagem && <p className="erro" id="erro-troca" role="alert">{mensagem}</p>}
          <button type="submit">Salvar nova senha</button>
        </form>
        <form action={sair}>
          <button type="submit">Sair da conta</button>
        </form>
      </section>
    </main>
  );
}
