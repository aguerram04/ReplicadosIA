import VideoJobForm from "@/components/forms/VideoJobForm";

export const metadata = { title: "Crear video | Avatar IA" };

export default function CreatePage() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Crear video con Avatar IA</h1>
      <div className="mb-6">
        <a href="/" className="btn-accent">
          Volver al inicio
        </a>
      </div>
      <VideoJobForm />
    </main>
  );
}
