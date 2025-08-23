"use client";
import { useRef, useState } from "react";

export default function PhotoAvatarGroupControls() {
  const [name, setName] = useState("Sylvia");
  const [imageKey, setImageKey] = useState("");
  const [groupId, setGroupId] = useState("");

  const [looksKeys, setLooksKeys] = useState("");

  const [trainId, setTrainId] = useState("");
  const [trainStatus, setTrainStatus] = useState<string>("");
  const trainPollRef = useRef<any>(null);

  const [prompt, setPrompt] = useState("White shirt front-facing");
  const [orientation, setOrientation] = useState("square");
  const [pose, setPose] = useState("half_body");
  const [style, setStyle] = useState("Realistic");
  const [lookGenId, setLookGenId] = useState("");
  const [lookStatus, setLookStatus] = useState<any>(null);
  const lookPollRef = useRef<any>(null);

  const [toast, setToast] = useState<string | null>(null);
  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2500);
  }

  async function createGroup() {
    if (!name || !imageKey) {
      showToast("name e image_key son requeridos");
      return;
    }
    const r = await fetch("/api/heygen/photo-avatar/group/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, image_key: imageKey }),
    });
    const j = await r.json();
    if (!r.ok) return showToast(j?.error || "Error");
    const gid = j?.data?.data?.group_id || j?.data?.group_id;
    setGroupId(gid || "");
    showToast("Grupo creado");
  }

  async function addLooks() {
    if (!groupId) return showToast("group_id requerido");
    const arr = looksKeys
      .split(/\n|,/) // allow commas or new lines
      .map((s) => s.trim())
      .filter(Boolean);
    if (!arr.length) return showToast("image_keys requerido");
    const r = await fetch("/api/heygen/photo-avatar/group/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId, image_keys: arr, name }),
    });
    const j = await r.json();
    if (!r.ok) return showToast(j?.error || "Error");
    showToast("Looks añadidos");
  }

  async function train() {
    if (!groupId) return showToast("group_id requerido");
    const r = await fetch("/api/heygen/photo-avatar/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId }),
    });
    const j = await r.json();
    if (!r.ok) return showToast(j?.error || "Error");
    const tid = j?.data?.data?.train_id || j?.data?.train_id || "";
    setTrainId(tid);
    setTrainStatus("pending");
    if (trainPollRef.current) clearInterval(trainPollRef.current);
    trainPollRef.current = setInterval(async () => {
      const sr = await fetch(`/api/heygen/photo-avatar/train/status?id=${tid}`);
      const sj = await sr.json();
      const raw = sj?.data || {};
      const s = String(raw?.data?.status || raw?.status || "");
      setTrainStatus(s);
      if (/ready|success|completed/i.test(s)) {
        clearInterval(trainPollRef.current);
        trainPollRef.current = null;
      }
    }, 5000);
  }

  async function generateLook() {
    if (!groupId) return showToast("group_id requerido");
    const r = await fetch("/api/heygen/photo-avatar/look/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        group_id: groupId,
        prompt,
        orientation,
        pose,
        style,
      }),
    });
    const j = await r.json();
    if (!r.ok) return showToast(j?.error || "Error");
    const gid = j?.data?.data?.generation_id || j?.data?.generation_id || "";
    setLookGenId(gid);
    setLookStatus(null);
    if (lookPollRef.current) clearInterval(lookPollRef.current);
    lookPollRef.current = setInterval(async () => {
      const sr = await fetch(
        `/api/heygen/photo-avatar/generation/status?id=${gid}`
      );
      const sj = await sr.json();
      setLookStatus(sj?.data || sj);
      const raw = sj?.data || {};
      const s = (raw?.data?.status || raw?.status || "")
        .toString()
        .toLowerCase();
      if (
        s.includes("success") ||
        s.includes("completed") ||
        raw?.data?.images
      ) {
        clearInterval(lookPollRef.current);
        lookPollRef.current = null;
      }
    }, 5000);
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mt-10 mb-4 text-center">
        Grupos de Foto Avatar
      </h2>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Nombre del grupo</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">image_key</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="image/.../original"
              value={imageKey}
              onChange={(e) => setImageKey(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-accent" onClick={createGroup}>
            Crear grupo
          </button>
          {groupId && (
            <span className="text-xs font-mono opacity-70 self-center">
              ID: {groupId}
            </span>
          )}
        </div>

        <div>
          <label className="block text-sm mb-1">
            Añadir looks (image_keys separados por coma/enter)
          </label>
          <textarea
            className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[90px]"
            placeholder="image/.../original, image/.../original"
            value={looksKeys}
            onChange={(e) => setLooksKeys(e.target.value)}
          />
          <button className="btn-outline mt-2" onClick={addLooks}>
            Añadir looks
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-outline" onClick={train}>
            Entrenar grupo
          </button>
          {trainId && (
            <span className="text-xs font-mono opacity-70">
              train_id: {trainId} — {trainStatus || "-"}
            </span>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Prompt</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Orientación</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={orientation}
              onChange={(e) => setOrientation(e.target.value)}
            >
              <option>square</option>
              <option>horizontal</option>
              <option>vertical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Pose</label>
            <select
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={pose}
              onChange={(e) => setPose(e.target.value)}
            >
              <option>close_up</option>
              <option>half_body</option>
              <option>full_body</option>
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
        <div className="flex items-center gap-2">
          <button className="btn-accent" onClick={generateLook}>
            Generar look
          </button>
          {lookGenId && (
            <span className="text-xs font-mono opacity-70">
              generation_id: {lookGenId}
            </span>
          )}
        </div>
        {lookStatus &&
          (() => {
            const raw = lookStatus || {};
            const images: any[] = raw?.data?.images || raw?.images || [];
            const urls = Array.isArray(images)
              ? images
                  .map((it: any) =>
                    typeof it === "string"
                      ? it
                      : typeof it?.url === "string"
                      ? it.url
                      : typeof it?.image_url === "string"
                      ? it.image_url
                      : null
                  )
                  .filter(Boolean)
              : [];
            return urls.length ? (
              <div className="mt-3">
                <div className="grid grid-cols-2 gap-3">
                  {urls.map((u: string) => (
                    <a key={u} href={u} target="_blank" className="block">
                      <img
                        src={u}
                        alt="look"
                        className="h-40 w-full rounded-xl object-cover"
                      />
                    </a>
                  ))}
                </div>
                <button
                  className="btn-outline mt-3"
                  onClick={async () => {
                    const r = await fetch("/api/utils/zip", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        urls,
                        filename: (
                          name ||
                          groupId ||
                          "looks_result"
                        ).toString(),
                      }),
                    });
                    const blob = await r.blob();
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `${(
                      name ||
                      groupId ||
                      "looks_result"
                    ).toString()}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  Descargar ZIP
                </button>
              </div>
            ) : (
              <pre className="mt-3 text-xs overflow-auto max-h-64 border border-border rounded-2xl p-3 bg-white">
                {JSON.stringify(lookStatus, null, 2)}
              </pre>
            );
          })()}
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
