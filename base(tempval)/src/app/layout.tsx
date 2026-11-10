import type { Metadata, Viewport } from "next";
import "@design/estilos.css";

export const metadata: Metadata = {
  title: "TeamTalk | Comunicação interna",
  description: "Plataforma web de comunicação interna da empresa.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#176b5b",
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
