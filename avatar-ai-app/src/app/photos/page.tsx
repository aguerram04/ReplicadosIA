import PhotoAvatarGenerator from "@/components/forms/PhotoAvatarGenerator";
import PhotoAvatarGroupControls from "@/components/forms/PhotoAvatarGroupControls";
import PhotoAvatarEffects from "@/components/forms/PhotoAvatarEffects";

export const metadata = { title: "AI Avatar Photos | ReplicadosIA" };

export default function PhotosPage() {
  return (
    <main className="container py-10 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <a href="/dashboard" className="btn-accent whitespace-nowrap">
            Ir al Tablero
          </a>
        </div>
        
        {/* Primera sección: AI Avatar Photos */}
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6 mb-8">
          <PhotoAvatarGenerator />
        </div>

        {/* Segunda sección: Grupos de Foto Avatar */}
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Grupos de Foto Avatar
          </h2>
          <PhotoAvatarGroupControls />
        </div>

        {/* Tercera sección: Motion & Sound */}
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            Motion & Sound
          </h2>
          <PhotoAvatarEffects />
        </div>
      </div>
    </main>
  );
}
