import VideoJobForm from "@/components/forms/VideoJobForm";

export const metadata = { title: "Crear video | Avatar IA" };

export default function CreatePage() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Crear video con Avatar IA</h1>
      <div className="mb-6">
        <a
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-md border border-white/20"
        >
          Volver al Dashboard
        </a>
      </div>
      <VideoJobForm />
    </main>
  );
}
