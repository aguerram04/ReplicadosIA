"use client";
import { useRef, useState } from "react";

export default function PhotoAvatarEffects() {
  const [avatarId, setAvatarId] = useState("");
  const [status, setStatus] = useState<any>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pollRef = useRef<any>(null);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  }

  async function pollOnce(id: string) {
    try {
      const r = await fetch(`/api/heygen/photo-avatar/status?id=${id}`);
      const j = await r.json();
      if (r.ok) {
        setStatus(j?.data || j);
        const raw = j?.data || {};
        const s = String(raw?.data?.status || raw?.status || "").toLowerCase();
        if (
          s.includes("completed") ||
          s.includes("ready") ||
          s.includes("success")
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {}
  }

  async function trigger(
    endpoint:
      | "/api/heygen/photo-avatar/motion"
      | "/api/heygen/photo-avatar/sound"
  ) {
    if (!avatarId) {
      showToast("Debes indicar un ID de photo avatar");
      return;
    }
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: avatarId }),
      });
      const j = await r.json();
      if (!r.ok) {
        showToast(j?.error || "Error");
        return;
      }
      showToast("Tarea enviada");
      setStatus(null);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => pollOnce(avatarId), 5000);
    } catch {
      showToast("Error de red");
    }
  }

  const raw = status?.data || status || {};
  const imageUrl: string | undefined = raw?.image_url;
  const motionPreviewUrl: string | undefined = raw?.motion_preview_url;
  const soundPreviewUrl: string | undefined =
    raw?.background_sound_effect?.sound_effect_preview_url;

  return (
    <div>
      <h2 className="text-2xl font-semibold mt-10 mb-4 text-center">
        Motion & Sound
      </h2>
      <div className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Photo Avatar ID</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="e08fcc7348ef4f839ed31abf000cef2c"
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-outline"
            onClick={() => trigger("/api/heygen/photo-avatar/motion")}
          >
            Añadir motion
          </button>
          <button
            className="btn-outline"
            onClick={() => trigger("/api/heygen/photo-avatar/sound")}
          >
            Añadir sound effect
          </button>
          <button
            className="btn-outline"
            onClick={() => avatarId && pollOnce(avatarId)}
          >
            Refrescar estado
          </button>
        </div>
        {status && (
          <div className="mt-2 rounded-2xl border border-border bg-white p-3">
            <div className="grid md:grid-cols-2 gap-3">
              {imageUrl && (
                <div>
                  <div className="text-xs mb-1 opacity-70">Imagen</div>
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="w-full h-40 object-cover rounded-xl"
                  />
                </div>
              )}
              {motionPreviewUrl && (
                <div>
                  <div className="text-xs mb-1 opacity-70">Motion preview</div>
                  <video
                    src={motionPreviewUrl}
                    controls
                    className="w-full h-40 object-cover rounded-xl"
                  />
                </div>
              )}
              {soundPreviewUrl && (
                <div className="md:col-span-2">
                  <div className="text-xs mb-1 opacity-70">Sound effect</div>
                  <audio controls className="w-full">
                    <source src={soundPreviewUrl} />
                  </audio>
                </div>
              )}
            </div>
            <pre className="mt-3 text-xs overflow-auto max-h-64">
              {JSON.stringify(status, null, 2)}
            </pre>
          </div>
        )}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
