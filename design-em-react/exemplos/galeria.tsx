"use client";

import { useState } from "react";
import { Badge, Botao, CabecalhoMobile, Campo, LayoutMobile, NavegacaoMobile } from "@design/componentes";
import estilos from "@design/exemplos/galeria.module.css";

/** Referência interativa para desenvolvimento e testes; não registra uma rota pública. */
export function GaleriaDesignSystem() {
  const [ativoId, definirAtivo] = useState("componentes");
  const [concluido, definirConcluido] = useState(false);
  return (
    <LayoutMobile
      cabecalho={(
        <CabecalhoMobile
          titulo="TeamTalk"
          subtitulo="Design system mobile"
          aoVoltar={ativoId !== "componentes" ? () => definirAtivo("componentes") : undefined}
          rotuloVoltar="Voltar para componentes"
        />
      )}
      navegacao={(
        <NavegacaoMobile
          ativoId={ativoId}
          aoSelecionar={definirAtivo}
          itens={[
            { id: "componentes", rotulo: "Componentes" },
            { id: "orientacoes", rotulo: "Orientações" },
          ]}
        />
      )}
    >
      <div className={estilos.galeria}>
        {ativoId === "componentes" ? (
          <>
            <section className={estilos.secao} aria-labelledby="titulo-botoes">
              <h2 id="titulo-botoes">Ações claras</h2>
              <p>Variantes de botão com estados de interação e texto visível.</p>
              <div className={estilos.linha}>
                <Botao onClick={() => definirConcluido(true)}>Ação principal</Botao>
                <Botao variante="secundaria" onClick={() => definirConcluido(false)}>Limpar feedback</Botao>
                <Botao variante="discreta" onClick={() => definirAtivo("orientacoes")}>Ver orientações</Botao>
                <Botao variante="perigo" disabled>Ação indisponível</Botao>
                <Botao ocupado>Salvando</Botao>
              </div>
              {concluido && <p role="status">Ação de exemplo concluída.</p>}
            </section>
            <section className={estilos.secao} aria-labelledby="titulo-campos">
              <h2 id="titulo-campos">Campos identificados</h2>
              <Campo id="exemplo-email" rotulo="E-mail corporativo" type="email" inputMode="email" autoComplete="username" autoCapitalize="none" spellCheck={false} ajuda="Use o endereço autorizado pela empresa." />
              <Campo id="exemplo-erro" rotulo="Campo com erro de exemplo" erro="Confira o valor informado." />
              <Campo id="exemplo-leitura" rotulo="Somente leitura" value="Identificação corporativa" readOnly />
            </section>
            <section className={estilos.secao} aria-labelledby="titulo-badges">
              <h2 id="titulo-badges">Estados com texto</h2>
              <div className={estilos.linha}>
                <Badge>Neutro</Badge><Badge tom="sucesso">Concluído</Badge>
                <Badge tom="atencao">Pendente</Badge><Badge tom="erro">Falha</Badge>
                <Badge tom="informacao">Informação</Badge>
              </div>
            </section>
          </>
        ) : (
          <section className={estilos.secao} aria-labelledby="titulo-orientacoes">
            <h2 id="titulo-orientacoes">Navegação no celular</h2>
            <p>Use a navegação inferior para alternar entre as seções. O cabeçalho oferece retorno quando houver uma tela anterior.</p>
            <p>Os controles têm rótulos visíveis e os estados não dependem apenas de cor. O conteúdo central rola sem cobrir a navegação.</p>
            <Botao onClick={() => definirAtivo("componentes")}>Explorar componentes</Botao>
          </section>
        )}
      </div>
    </LayoutMobile>
  );
}
