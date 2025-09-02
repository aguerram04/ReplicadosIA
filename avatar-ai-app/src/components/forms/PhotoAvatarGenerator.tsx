"use client";
import { useEffect, useRef, useState } from "react";

export default function PhotoAvatarGenerator() {
  const [name, setName] = useState("Lina");
  const [age, setAge] = useState("Young Adult");
  const [gender, setGender] = useState("Woman");
  const [ethnicity, setEthnicity] = useState("Asian American");
  const [orientation, setOrientation] = useState("horizontal");
  const [pose, setPose] = useState("half_body");
  const [style, setStyle] = useState("Realistic");
  const [appearance, setAppearance] = useState(
    "A stylish East Asian Woman in casual attire walking through a bustling city street"
  );

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string>("");
  const [statusData, setStatusData] = useState<any>(null);
  const pollRef = useRef<any>(null);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  function extractImageUrls(obj: any): string[] {
    const urls: string[] = [];
    const images = obj?.data?.images || obj?.images || [];
    if (Array.isArray(images)) {
      for (const it of images) {
        if (typeof it === "string" && /^https?:\/\//.test(it)) urls.push(it);
        else if (it && typeof it === "object") {
          if (typeof it.url === "string" && /^https?:\/\//.test(it.url))
            urls.push(it.url);
          if (
            typeof it.image_url === "string" &&
            /^https?:\/\//.test(it.image_url)
          )
            urls.push(it.image_url);
        }
      }
    }
    const maybe = obj?.data?.image_urls || obj?.image_urls;
    if (Array.isArray(maybe)) {
      for (const u of maybe)
        if (typeof u === "string" && /^https?:\/\//.test(u)) urls.push(u);
    }
    const maybe2 = obj?.data?.image_url_list || obj?.image_url_list;
    if (Array.isArray(maybe2)) {
      for (const u of maybe2)
        if (typeof u === "string" && /^https?:\/\//.test(u)) urls.push(u);
    }
    return Array.from(new Set(urls));
  }

  function extractImageKeys(obj: any): string[] {
    const keys = obj?.data?.image_key_list || obj?.image_key_list || [];
    return Array.isArray(keys)
      ? keys.filter((k: any) => typeof k === "string")
      : [];
  }

  async function onGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const body = {
        name,
        age,
        gender,
        ethnicity,
        orientation,
        pose,
        style,
        appearance,
      };
      const r = await fetch("/api/heygen/photo-avatar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        showToast(j?.error || "Error generando foto avatar");
        setLoading(false);
        return;
      }
      setGenerationId(j.generationId || "");
      // If we created a Job, kick off status persistence poll with jobId
      if (j.jobId) {
        // augment poller to include jobId so dashboard reflects progress
        (pollRef as any).jobId = j.jobId;
      }
      setStatusData(null);
      showToast("Tarea enviada");
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollOnce, 5000);
    } catch (e: any) {
      showToast("Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function pollOnce() {
    if (!generationId) return;
    try {
      const jobId = (pollRef as any).jobId || "";
      const url = jobId
        ? `/api/heygen/photo-avatar/generation/status?id=${generationId}&jobId=${jobId}`
        : `/api/heygen/photo-avatar/generation/status?id=${generationId}`;
      const r = await fetch(url);
      const j = await r.json();
      if (r.ok) {
        setStatusData(j?.data || j);
        // si viene un estado de success o incluye resultados, detenemos polling
        const raw = j?.data || {};
        const s = (raw?.data?.status || raw?.status || "")
          .toString()
          .toLowerCase();
        if (
          s.includes("success") ||
          s.includes("completed") ||
          raw?.data?.images
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    } catch {}
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const imageUrls = extractImageUrls(statusData || {});
  const imageKeys = extractImageKeys(statusData || {});

  async function downloadZip() {
    try {
      const r = await fetch("/api/utils/zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: imageUrls,
          filename: `ai_photos_${generationId || "result"}`,
        }),
      });
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ai_photos_${generationId || "result"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {}
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Generar AI Avatar Photos
      </h2>
      <form onSubmit={onGenerate} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Nombre</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Edad</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            >
              <option>Teenager</option>
              <option>Young Adult</option>
              <option>Adult</option>
              <option>Middle-aged</option>
              <option>Senior</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Género</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option>Woman</option>
              <option>Man</option>
              <option>Non-binary</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Etnicidad</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={ethnicity}
              onChange={(e) => setEthnicity(e.target.value)}
              placeholder="ej. Asian American"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Orientación</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
            >
              <option value="horizontal">horizontal</option>
              <option value="vertical">vertical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Pose</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={pose}
              onChange={(e) => setPose(e.target.value)}
            >
              <option value="close_up">close_up</option>
              <option value="half_body">half_body</option>
              <option value="full_body">full_body</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Estilo</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              <option>Realistic</option>
              <option>Cinematic</option>
              <option>Studio</option>
              <option>Illustration</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Apariencia (prompt)</label>
          <textarea
            className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[100px]"
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
          />
        </div>
        <button disabled={loading} className="btn-accent disabled:opacity-60">
          {loading ? "Generando..." : "Generar AI Avatar Photo"}
        </button>
      </form>
      {(generationId || statusData) && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-4">
          <div className="text-sm font-mono">ID: {generationId || "-"}</div>
          {imageUrls.length > 0 ? (
            <div className="mt-3">
              <div className="grid grid-cols-2 gap-3">
                {imageUrls.map((u) => (
                  <a key={u} href={u} target="_blank" className="block">
                    <img
                      src={u}
                      alt="preview"
                      className="h-40 w-full rounded-xl object-cover"
                    />
                  </a>
                ))}
              </div>
              <button className="btn-outline mt-3" onClick={downloadZip}>
                Descargar ZIP
              </button>
              {imageKeys.length > 0 && (
                <div className="mt-4">
                  <label className="block text-sm mb-1">image_key_list</label>
                  <textarea
                    className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[80px] text-xs font-mono"
                    readOnly
                    value={imageKeys.join("\n")}
                  />
                  <button
                    className="btn-outline mt-2"
                    onClick={async () => {
                      await navigator.clipboard.writeText(imageKeys.join("\n"));
                    }}
                  >
                    Copiar image_key_list
                  </button>
                </div>
              )}
            </div>
          ) : (
            <pre className="mt-2 text-xs overflow-auto max-h-64">
              {JSON.stringify(statusData || { status: "pending" }, null, 2)}
            </pre>
          )}
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
