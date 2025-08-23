import VideoJobForm from "@/components/forms/VideoJobForm";

export const metadata = { title: "Crear video | Avatar IA" };

export default function CreatePage() {
  return (
    <main className="container py-10 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <a href="/dashboard" className="btn-accent whitespace-nowrap">
            Ir al Tablero
          </a>
        </div>
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Crear video con Avatar IA
          </h1>
          <VideoJobForm showAvatarFields={false} nonAvatarMode />
          <div className="mt-6 flex justify-end">
            <a href="/jobs" className="btn-outline">
              Detalles
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
