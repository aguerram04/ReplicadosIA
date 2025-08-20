export default function Home() {
  return (
    <main className="min-h-screen flex items-center">
      <section className="container">
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
          Avatar AI App
        </h1>
        <p className="text-lg md:text-xl opacity-80 mb-8">
          Genera videos con avatares en minutos.
        </p>
        <div className="flex gap-4">
          <a className="btn-primary" href="/create">
            Crear video
          </a>
          <a className="btn-outline" href="/dashboard">
            Dashboard
          </a>
        </div>
      </section>
    </main>
  );
}
