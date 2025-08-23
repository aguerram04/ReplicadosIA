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
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            AI Avatar Photos
          </h1>
          <PhotoAvatarGenerator />
          <hr className="my-8 border-[#e6e8eb]" />
          <PhotoAvatarGroupControls />
          <hr className="my-8 border-[#e6e8eb]" />
          <PhotoAvatarEffects />
        </div>
      </div>
    </main>
  );
}
