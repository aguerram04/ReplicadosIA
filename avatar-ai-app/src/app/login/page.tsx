import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1>Iniciar sesión</h1>
      <form
        className="mt-6 space-y-4"
        action={async (formData: FormData) => {
          "use server";
          const email = String(formData.get("email") || "");
          const name = String(formData.get("name") || "");
          await signIn("credentials", {
            email,
            name,
            redirectTo: "/dashboard",
          });
        }}
      >
        <div className="grid gap-2">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="px-3 py-2 rounded-md text-black"
            placeholder="tu@correo.com"
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="name">Nombre (opcional)</label>
          <input
            id="name"
            name="name"
            type="text"
            className="px-3 py-2 rounded-md text-black"
            placeholder="Tu nombre"
          />
        </div>
        <button className="mt-4 px-4 py-2 rounded-md bg-white text-black">
          Entrar
        </button>
      </form>
    </main>
  );
}
