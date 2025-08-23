"use client";
import { useState, useRef } from "react";
import axios from "axios";
import MediaUploader from "@/components/uploads/MediaUploader";
import LanguageSelect from "@/components/ui/LanguageSelect";

export default function TranslatePage() {
  const [title, setTitle] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [sourceLang, setSourceLang] = useState<string>("auto");
  const [targetLang, setTargetLang] = useState<string>("en");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);
  const pollRef = useRef<any>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function pollStatusLoop(id: string) {
    try {
      const r = await fetch(`/api/heygen/translate/status?jobId=${id}`);
      const j = await r.json();
      if (j?.status) setStatus(j.status);
      if (j?.videoUrl) {
        setResultUrl(j.videoUrl);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        showToast("¡Traducción lista y visible en el Tablero!");
      }
    } catch {}
  }

  async function attemptDownload(url: string, filename: string) {
    try {
      setDownloading(true);
      const resp = await fetch(url, { mode: "cors" });
      if (!resp.ok) throw new Error(String(resp.status));
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "video.mp4";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      window.open(url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Validación avanzada de URL
      const urlStr = (videoUrl || "").trim();
      if (!urlStr) {
        showToast("Debes proporcionar una URL de video");
        setLoading(false);
        return;
      }
      let u: URL | null = null;
      try {
        u = new URL(urlStr);
      } catch {
        showToast("URL inválida");
        setLoading(false);
        return;
      }
      if (!/^https?:$/.test(u.protocol)) {
        showToast("La URL debe ser http(s)");
        setLoading(false);
        return;
      }
      if (!/\.(mp4|webm|mov|mkv)$/i.test(u.pathname)) {
        showToast("La URL debe apuntar a un video (.mp4/.webm/.mov/.mkv)");
        setLoading(false);
        return;
      }
      const r = await axios.post("/api/heygen/translate/create", {
        title,
        videoUrl,
        sourceLang,
        targetLang,
      });
      const createdJobId: string = r.data?.jobId || "";
      setJobId(createdJobId);
      setStatus("queued");
      setResultUrl("");
      showToast(`Tarea enviada: ${r.data?.taskId || "OK"}`);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => pollStatusLoop(createdJobId), 5000);
    } catch (err: any) {
      showToast(err?.response?.data?.error || "Error creando traducción");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container py-10 flex justify-center">
      <div className="w-full max-w-2xl">
        <div className="mb-4">
          <a href="/dashboard" className="btn-accent">
            Ir al tablero
          </a>
        </div>
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Traducir Video
          </h1>
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

            <button
              disabled={loading}
              className="btn-accent disabled:opacity-60"
            >
              {loading ? "Enviando..." : "Traducir"}
            </button>
          </form>

          {(jobId || status) && (
            <div className="mt-6 rounded-2xl border border-border bg-white p-4">
              <div className="text-sm font-mono">Job: {jobId || "-"}</div>
              <div className="text-sm">Estado: {status || "-"}</div>
              {resultUrl ? (
                <div className="mt-2 flex gap-2">
                  <a href={resultUrl} target="_blank" className="btn-primary">
                    Ver video traducido
                  </a>
                  <button
                    className="btn-outline"
                    disabled={downloading}
                    onClick={() =>
                      attemptDownload(
                        resultUrl,
                        (title || "video_traducido").replace(/\s+/g, "_") +
                          ".mp4"
                      )
                    }
                  >
                    {downloading ? "Descargando..." : "Descargar"}
                  </button>
                  <a href="/dashboard" className="btn-outline">
                    Ver en Tablero
                  </a>
                  {jobId && (
                    <a href={`/jobs/${jobId}`} className="btn-outline">
                      Detalles del job
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs opacity-70 mt-2">
                  Esperando a que el video traducido esté listo...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
