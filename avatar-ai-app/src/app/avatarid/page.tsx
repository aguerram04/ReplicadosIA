import VideoJobForm from "@/components/forms/VideoJobForm";

export const metadata = { title: "Crear con Avatar ID | ReplicadosIA" };

export default function AvatarIdPage() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Generar video con Avatar ID
      </h1>
      <div className="mx-auto max-w-2xl rounded-2xl border border-yellow-500 bg-[#1a1a1a] p-6 text-gray-300">
        <VideoJobForm />
      </div>
      <div className="mx-auto max-w-2xl mt-4">
        <a href="/dashboard" className="btn-accent">
          Ir al Tablero
        </a>
      </div>
    </main>
  );
}
