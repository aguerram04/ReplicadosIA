import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import JobsList from "@/components/dashboard/JobsList";
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session: any = await getServerSession(authOptions as any);
  if (!session || !session.user || !session.user.email) {
    return (
      <main className="min-h-screen p-8">
        <h1 className="text-3xl font-semibold">No autenticado</h1>
        <p className="mt-2 text-white/70">
          Por favor inicia sesión para continuar.
        </p>
        <a
          href="/login"
          className="inline-block mt-6 px-4 py-2 rounded-md bg-white text-black"
        >
          Ir a login
        </a>
        <a
          href="/"
          className="inline-block mt-4 ml-3 px-4 py-2 rounded-md border border-white/20"
        >
          Home
        </a>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Tablero</h1>
      <p className="mt-2 text-white/70">
        Bienvenido,{" "}
        {(session as any).user?.name || (session as any).user?.email}.
      </p>
      <div className="mt-6 flex gap-3">
        <a href="/create" className="btn-accent">
          Crear video avatar
        </a>
        <a href="/translate" className="btn-accent">
          Traducir video
        </a>
      </div>
      <div className="mt-6">
        <h2 className="font-medium mb-2">Tus Trabajos</h2>
        <JobsList />
      </div>
      <a
        href="/api/auth/signout"
        className="mt-8 inline-block px-4 py-2 rounded-md border border-white/20"
      >
        Cerrar sesión
      </a>
    </main>
  );
}
