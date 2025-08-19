import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) {
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
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-white/70">
        Bienvenido, {session.user.name || session.user.email}.
      </p>
      <div className="mt-6 grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="rounded-lg border border-white/10 p-4">
          <h2 className="font-medium">Créditos</h2>
          <p className="text-3xl mt-2">0</p>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <h2 className="font-medium">Tus videos</h2>
          <p className="text-white/60 mt-2">Aún no hay videos generados.</p>
        </div>
      </div>
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button className="mt-8 px-4 py-2 rounded-md border border-white/20">
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
