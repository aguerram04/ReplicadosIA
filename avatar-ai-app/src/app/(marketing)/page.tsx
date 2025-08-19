export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl md:text-6xl font-bold">ReplicadosIA</h1>
      <p className="mt-4 text-lg text-white/70 max-w-2xl">
        Crea contenido profesional con avatares de IA en minutos y automatiza tu
        presencia online.
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/dashboard"
          className="px-6 py-3 rounded-md bg-white text-black font-medium"
        >
          Ir al Dashboard
        </a>
        <a
          href="#features"
          className="px-6 py-3 rounded-md border border-white/30"
        >
          Ver características
        </a>
      </div>
    </main>
  );
}
