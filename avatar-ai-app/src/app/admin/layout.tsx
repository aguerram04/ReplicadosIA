import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.isAdmin) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Acceso denegado</h1>
        <p className="opacity-80 mt-2">
          Esta sección es solo para administradores.
        </p>
      </main>
    );
  }
  return (
    <div className="container py-8">
      <nav className="mb-6 flex gap-4 text-sm">
        <a href="/admin" className="underline">
          Overview
        </a>
        <a href="/admin/users" className="underline">
          Usuarios
        </a>
        <a href="/admin/ledgers" className="underline">
          Movimientos
        </a>
        <a href="/admin/jobs" className="underline">
          Trabajos
        </a>
        <a href="/admin/credits" className="underline">
          Créditos
        </a>
      </nav>
      {children}
    </div>
  );
}
