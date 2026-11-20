import type { SVGProps } from "react";

export type NomeIcone = "inbox" | "equipes" | "arquivos" | "menu" | "nova-conversa" | "busca" | "erro" | "lista-vazia" | "voltar" | "anexar-pdf" | "enviar" | "arquivo-pdf" | "enviada" | "lida" | "aguardando" | "falha";

/** Geometrias de Gilson; a cor vem exclusivamente dos tokens do TeamTalk. */
export function Icone({ nome, ...props }: SVGProps<SVGSVGElement> & { nome: NomeIcone }) {
  const comum = { width: 24, height: 24, "aria-hidden": true as const, focusable: false as const, ...props };
  switch (nome) {
    case "inbox": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M12 3.2c-5.1 0-9.2 3.4-9.2 7.7 0 2.2 1.1 4.1 3 5.5l-.7 4.1 4.2-2.1c.9.2 1.8.3 2.7.3 5.1 0 9.2-3.4 9.2-7.8S17.1 3.2 12 3.2Z" fill="currentColor" stroke="currentColor"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"/></svg>;
    case "equipes": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><circle cx="12" cy="7.2" r="3.4"/><path d="M4.5 20c.4-4 3.3-6.2 7.5-6.2s7.1 2.2 7.5 6.2Z"/></svg>;
    case "arquivos": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M6.5 3.5h7l4 4V20H6.5A2.5 2.5 0 0 1 4 17.5v-11A3 3 0 0 1 6.5 3.5Z"/><path d="M13.5 3.5v4h4M8 12h6M8 15.5h6"/></svg>;
    case "menu": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case "nova-conversa": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M13.5 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V11"/><path d="M14.5 9.5 20 4m-4.5 0H20v4.5"/></svg>;
    case "busca": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/></svg>;
    case "erro": return <svg viewBox="0 0 24 24" fill="none" {...comum}><circle cx="12" cy="12" r="9.1" stroke="currentColor" strokeWidth="1.9"/>
  <path d="M12 6.9v6.05" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round"/>
  <circle cx="12" cy="16.65" r="1.05" fill="currentColor"/></svg>;
    case "lista-vazia": return <svg viewBox="0 0 72 60"
    
     fill="none" {...comum}><path d="M32 13.5H58.2C64.1 13.5 68 17.4 68 23.1V41.3C68 47.1 64.1 51 58.2 51H54.1V58.1L43.7 51H32C26.1 51 22.2 47.1 22.2 41.3V23.1C22.2 17.4 26.1 13.5 32 13.5Z"
        fill="currentColor" stroke="currentColor" strokeWidth="1.7"
        strokeLinecap="round" strokeLinejoin="round"/>

  
  <path d="M14.1 3.5H45.7C53 3.5 57.7 8.2 57.7 15.2V31.4C57.7 38.5 53 43.2 45.7 43.2H23.4L13.5 51.2V43.2H12.1C5.1 43.2 1.5 38.5 1.5 31.4V15.2C1.5 8.2 6.2 3.5 14.1 3.5Z"
        fill="currentColor" stroke="currentColor" strokeWidth="3.1"
        strokeLinecap="round" strokeLinejoin="round"/>

  
  <circle cx="19.2" cy="23.1" r="2.35" fill="currentColor"/>
  <circle cx="29.7" cy="23.1" r="2.35" fill="currentColor"/>
  <circle cx="40.2" cy="23.1" r="2.35" fill="currentColor"/></svg>;
    case "voltar": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M19.2 12H4.8"/><path d="M11.4 5.4 4.8 12l6.6 6.6"/></svg>;
    case "anexar-pdf": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M12 5v14M5 12h14"/></svg>;
    case "enviar": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M21 3.1 13.9 20.4a.55.55 0 0 1-1.02-.03l-3.05-7.2-7.2-3.05a.55.55 0 0 1 .03-1.02L20.2 2.1A.62.62 0 0 1 21 3.1Z"/><path d="m9.85 13.15 6.2-6.2"/></svg>;
    case "arquivo-pdf": return <svg viewBox="0 0 24 24" fill="none" stroke="none" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="M6 2.4h8l5 5V20a1.6 1.6 0 0 1-1.6 1.6H6A2 2 0 0 1 4 19.6V4.4a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M14 2.7v4.9h4.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><text x="11.95" y="15.7" textAnchor="middle" fontFamily="inherit" fontSize="5.25" fontWeight="700" letterSpacing=".12" fill="currentColor">PDF</text></svg>;
    case "enviada": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.0" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="m4.7 12.25 4.05 4.05L19.3 5.8"/></svg>;
    case "lida": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" {...comum}><path d="m2.7 12.15 4.05 4.05L16.2 6.75"/><path d="m8.5 12.15 4.05 4.05L22.1 6.75"/></svg>;
    case "aguardando": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...comum}><circle cx="12" cy="12" r="8.6"/><path d="M12 7.1v5l3.2 1.9"/></svg>;
    case "falha": return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...comum}><circle cx="12" cy="12" r="9"/><path d="M12 7v6.1"/><path d="M12 16.8v.1"/></svg>;
  }
}
