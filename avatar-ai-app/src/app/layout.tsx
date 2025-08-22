import type { Metadata } from "next";
import "./globals.css";
import AuthSessionProvider from "@/components/providers/session-provider";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Avatar AI App",
  description: "Genera videos con avatares IA usando HeyGen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <AuthSessionProvider>
          {/* Header global */}
          {/* Asegúrate de colocar /public/replicadosia-logo.png con tu logo */}
          {/* Colores: bg blanco, texto #454545, azules de la paleta */}
          {/* Sección principal */}
          <Header />
          <div className="min-h-[calc(100vh-56px)] bg-white text-[#454545]">
            {children}
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
