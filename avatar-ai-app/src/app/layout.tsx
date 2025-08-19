import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
