import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <section className="welcome-card" aria-labelledby="welcome-title">
        <p className="eyebrow">COMUNICAÇÃO INTERNA</p>
        <h1 id="welcome-title">TeamTalk</h1>
        <p className="description">
          Um espaço seguro para a comunicação da equipe. Acesse sua conta para continuar.
        </p>
        <Link className="primary-link" href="/login">
          Acessar plataforma
        </Link>
        <p className="support-note">Acesso disponível para funcionários autorizados.</p>
      </section>
    </main>
  );
}
