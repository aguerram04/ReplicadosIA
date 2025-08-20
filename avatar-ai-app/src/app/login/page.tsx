"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-screen p-8 max-w-md mx-auto">
      <h1>Iniciar sesión</h1>
      <form
        className="mt-6 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const formData = new FormData(form);
          const email = String(formData.get("email") || "");
          const name = String(formData.get("name") || "");
          await signIn("credentials", {
            email,
            name,
            callbackUrl: "/dashboard",
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
      <div className="mt-8 space-y-3">
        <button
          className="w-full px-4 py-2 rounded-md border border-white/20"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continuar con Google
        </button>
        <button
          className="w-full px-4 py-2 rounded-md border border-white/20"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          Continuar con GitHub
        </button>
      </div>
      <div className="mt-6">
        <a
          href="/"
          className="block w-full text-center px-4 py-2 rounded-md border border-white/20"
        >
          Home
        </a>
      </div>
    </main>
  );
}
