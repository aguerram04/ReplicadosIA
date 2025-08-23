"use client";
import { useState } from "react";
import axios from "axios";
import MediaUploader from "@/components/uploads/MediaUploader";
import LanguageSelect from "@/components/ui/LanguageSelect";

export default function TranslatePage() {
  const [title, setTitle] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [sourceLang, setSourceLang] = useState<string>("auto");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await axios.post("/api/heygen/translate/create", {
        title,
        videoUrl,
        sourceLang,
        targetLang,
      });
      alert(`Tarea enviada: ${r.data?.taskId || "OK"}`);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error creando traducción");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-10 flex justify-center">
      <div className="w-full max-w-2xl rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Traducir Video</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm">Título</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="Nombre de este trabajo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm">Video (URL)</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="https://..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
            />
            <div className="flex">
              <MediaUploader onAdd={(urls) => setVideoUrl(urls[0] || "")}>
                <span className="btn-accent">
                  Subir desde dispositivo/cámara
                </span>
              </MediaUploader>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Idioma origen</label>
              <LanguageSelect
                value={sourceLang}
                onChange={setSourceLang}
                placeholder="auto"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Idioma destino</label>
              <LanguageSelect
                value={targetLang}
                onChange={setTargetLang}
                placeholder="en"
              />
            </div>
          </div>

          <button disabled={loading} className="btn-accent disabled:opacity-60">
            {loading ? "Enviando..." : "Traducir"}
          </button>
        </form>
      </div>
    </main>
  );
}
