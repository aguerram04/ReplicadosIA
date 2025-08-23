"use client";
import { useEffect, useMemo, useState } from "react";

type Template = { id: string; name: string };
type Voice = {
  id: string;
  name: string;
  language?: string | null;
  gender?: string | null;
};

export default function TemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [avatarQuery, setAvatarQuery] = useState<string>("");
  const [addType, setAddType] = useState<AutoVar["type"]>("text");
  const [selected, setSelected] = useState<string>("");
  const [title, setTitle] = useState<string>("Nuevo video");
  const [varsJson, setVarsJson] = useState<string>(
    '{\n  "first_name": {\n    "name": "first_name",\n    "type": "text",\n    "properties": { "content": "John" }\n  }\n}'
  );
  const [toast, setToast] = useState<string | null>(null);
  type AutoVar = {
    name: string;
    type: "text" | "image" | "video" | "character" | "voice" | "audio";
    value?: string; // for text
    url?: string; // for image/video/audio
    fit?: "cover" | "contain" | "crop" | "none"; // images/videos fit
    playStyle?: "fit_to_scene" | "freeze" | "loop" | "once"; // video
    characterType?: "avatar" | "talking_photo"; // character
    characterId?: string; // character
    voiceId?: string; // voice
  };
  const [autoVars, setAutoVars] = useState<AutoVar[]>([]);
  const fitTips: Record<string, string> = {
    cover: "Cubre el área completa; puede estirar y no preservar proporción.",
    contain:
      "Encaja completo dentro del área; preserva proporción; no recorta.",
    crop: "Escala a borde largo manteniendo proporción; puede recortar.",
    none: "Sin escalado; usa tamaño original aunque no encaje en el área.",
  };
  const playTips: Record<string, string> = {
    fit_to_scene:
      "Ajusta la velocidad del video para igualar la duración de la escena.",
    freeze:
      "Se detiene al final y mantiene el último frame hasta terminar la pista.",
    loop: "Reproduce en bucle continuo hasta el final de la pista.",
    once: "Reproduce una sola vez y se detiene.",
  };
  const [lastJobId, setLastJobId] = useState<string>("");
  const [lastProviderId, setLastProviderId] = useState<string>("");
  const [jobStatus, setJobStatus] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);
  const [pollHandle, setPollHandle] = useState<any>(null);
  const [useLibrary, setUseLibrary] = useState<boolean>(true);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 3000);
  }

  async function pollJobStatus(jobId: string) {
    try {
      const r = await fetch(`/api/heygen/video/status?jobId=${jobId}`);
      const j = await r.json();
      if (j?.status) setJobStatus(j.status);
      if (j?.videoUrl) {
        setJobUrl(j.videoUrl);
        return true;
      }
    } catch {}
    return false;
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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `/api/heygen/templates${useLibrary ? "?library=true" : ""}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        setTemplates(j.templates || []);
      } catch {}
      try {
        const r2 = await fetch("/api/heygen/voices", { cache: "no-store" });
        const j2 = await r2.json();
        setVoices(j2.voices || []);
      } catch {}
      try {
        const r3 = await fetch("/api/heygen/avatars", { cache: "no-store" });
        const j3 = await r3.json();
        setAvatars(j3.avatars || []);
      } catch {}
    })();
  }, [useLibrary]);
  const filteredAvatars = useMemo(() => {
    const q = (avatarQuery || "").toLowerCase().trim();
    if (!q) return avatars || [];
    return (avatars || []).filter((av: any) => {
      const id = String(av.avatar_id || av.id || "").toLowerCase();
      const name = String(av.name || av.display_name || "").toLowerCase();
      return id.includes(q) || name.includes(q);
    });
  }, [avatars, avatarQuery]);

  async function loadTemplateVars(id: string) {
    try {
      const r = await fetch(`/api/heygen/template/${id}`, {
        cache: "no-store",
      });
      const j = await r.json();
      const tpl = j?.template || {};
      const rawVars: any = tpl?.variables || tpl?.data?.variables || {};
      const names = Array.isArray(rawVars)
        ? rawVars
        : typeof rawVars === "object"
        ? Object.keys(rawVars)
        : [];
      if (names.length === 0) {
        setAutoVars([]);
        return;
      }
      const detected = names.map((n: string) => {
        const entry = rawVars?.[n] || {};
        const t = String(
          entry?.type ||
            (entry?.properties?.character_id
              ? "character"
              : entry?.properties?.video_url
              ? "video"
              : entry?.properties?.voice_id
              ? "voice"
              : entry?.properties?.url && entry?.type === "audio"
              ? "audio"
              : entry?.properties?.url
              ? "image"
              : "text")
        );
        if (t === "character") {
          return {
            name: String(n),
            type: "character" as const,
            characterType: (entry?.properties?.type as any) || "avatar",
            characterId: String(entry?.properties?.character_id || ""),
          };
        }
        if (t === "voice") {
          return {
            name: String(n),
            type: "voice" as const,
            voiceId: String(entry?.properties?.voice_id || ""),
          };
        }
        if (t === "audio") {
          return {
            name: String(n),
            type: "audio" as const,
            url: String(entry?.properties?.url || ""),
          };
        }
        if (t === "video") {
          return {
            name: String(n),
            type: "video" as const,
            url: String(
              entry?.properties?.video_url || entry?.properties?.url || ""
            ),
            playStyle: (entry?.properties?.play_style as any) || "fit_to_scene",
            fit: (entry?.properties?.fit as any) || "contain",
          };
        }
        if (t === "image") {
          return {
            name: String(n),
            type: "image" as const,
            url: String(entry?.properties?.url || ""),
            fit: (entry?.properties?.fit as any) || "contain",
          };
        }
        return {
          name: String(n),
          type: "text" as const,
          value: String(entry?.properties?.content || ""),
        };
      });
      setAutoVars(detected);
      // Prefill JSON accordingly
      const obj: any = {};
      for (const it of detected) {
        if (it.type === "image") {
          obj[it.name] = {
            name: it.name,
            type: "image",
            properties: {
              url: (it as any).url || "",
              asset_id: null,
              fit: (it as any).fit || "contain",
            },
          };
        } else if (it.type === "video") {
          obj[it.name] = {
            name: it.name,
            type: "video",
            properties: {
              url: (it as any).url || "",
              video_asset_id: null,
              play_style: (it as any).playStyle || "fit_to_scene",
              fit: (it as any).fit || "contain",
            },
          };
        } else if (it.type === "audio") {
          obj[it.name] = {
            name: it.name,
            type: "audio",
            properties: {
              url: (it as any).url || "",
              asset_id: null,
            },
          };
        } else if (it.type === "character") {
          obj[it.name] = {
            name: it.name,
            type: "character",
            properties: {
              type: (it as any).characterType || "avatar",
              character_id: (it as any).characterId || "",
            },
          };
        } else if (it.type === "voice") {
          obj[it.name] = {
            name: it.name,
            type: "voice",
            properties: {
              voice_id: (it as any).voiceId || "",
            },
          };
        } else {
          obj[it.name] = {
            name: it.name,
            type: "text",
            properties: { content: (it as any).value || "" },
          };
        }
      }
      setVarsJson(JSON.stringify(obj, null, 2));
    } catch {
      setAutoVars([]);
    }
  }

  async function generate() {
    if (!selected) {
      showToast("Selecciona un template");
      return;
    }
    let variables: any = {};
    if (autoVars.length > 0) {
      // Validaciones básicas para imágenes y videos
      const validFits = new Set(["cover", "contain", "crop", "none"]);
      const validPlay = new Set(["fit_to_scene", "freeze", "loop", "once"]);
      for (const it of autoVars) {
        const n = (it.name || "").trim();
        if (!n) {
          showToast("Todas las variables deben tener nombre");
          return;
        }
        if (it.type === "image") {
          const urlStr = (it.url || "").trim();
          if (!urlStr) {
            showToast(`Falta URL para la imagen: ${n}`);
            return;
          }
          try {
            const u = new URL(urlStr);
            if (!/^https?:$/.test(u.protocol)) {
              showToast(`La URL de imagen debe ser http(s): ${n}`);
              return;
            }
            if (!/\.(png|jpg|jpeg)$/i.test(u.pathname)) {
              showToast(`La imagen debe ser .png/.jpg/.jpeg: ${n}`);
              return;
            }
          } catch {
            showToast(`URL de imagen inválida: ${n}`);
            return;
          }
          if (it.fit && !validFits.has(it.fit)) {
            showToast(`Fit inválido en imagen ${n}`);
            return;
          }
        }
        if (it.type === "video") {
          const urlStr = (it.url || "").trim();
          if (!urlStr) {
            showToast(`Falta URL para el video: ${n}`);
            return;
          }
          try {
            const u = new URL(urlStr);
            if (!/^https?:$/.test(u.protocol)) {
              showToast(`La URL de video debe ser http(s): ${n}`);
              return;
            }
            if (!/\.(mp4|webm)$/i.test(u.pathname)) {
              showToast(`El video debe ser .mp4 o .webm: ${n}`);
              return;
            }
          } catch {
            showToast(`URL de video inválida: ${n}`);
            return;
          }
          if (it.playStyle && !validPlay.has(it.playStyle)) {
            showToast(`play_style inválido en video ${n}`);
            return;
          }
          if (it.fit && !validFits.has(it.fit)) {
            showToast(`Fit inválido en video ${n}`);
            return;
          }
        }
        if (it.type === "character") {
          const ct = it.characterType || "avatar";
          const cid = (it.characterId || "").trim();
          if (!cid) {
            showToast(`Falta character_id para ${n}`);
            return;
          }
        }
        if (it.type === "voice") {
          const vid = (it.voiceId || "").trim();
          if (!vid) {
            showToast(`Falta voice_id para ${n}`);
            return;
          }
        }
        if (it.type === "audio") {
          const urlStr = (it.url || "").trim();
          if (!urlStr) {
            showToast(`Falta URL para el audio: ${n}`);
            return;
          }
          try {
            const u = new URL(urlStr);
            if (!/^https?:$/.test(u.protocol)) {
              showToast(`La URL de audio debe ser http(s): ${n}`);
              return;
            }
            if (!/\.(mp3|wav|m4a|aac)$/i.test(u.pathname)) {
              showToast(`El audio debe ser .mp3/.wav/.m4a/.aac: ${n}`);
              return;
            }
          } catch {
            showToast(`URL de audio inválida: ${n}`);
            return;
          }
        }
      }
      autoVars.forEach((it) => {
        const n = (it.name || "").trim();
        if (!n) return;
        if (it.type === "image") {
          variables[n] = {
            name: n,
            type: "image",
            properties: {
              url: it.url || "",
              asset_id: null,
              fit: it.fit || "contain",
            },
          };
        } else if (it.type === "video") {
          variables[n] = {
            name: n,
            type: "video",
            properties: {
              url: it.url || "",
              video_asset_id: null,
              play_style: it.playStyle || "fit_to_scene",
              fit: it.fit || "contain",
            },
          };
        } else if (it.type === "character") {
          variables[n] = {
            name: n,
            type: "character",
            properties: {
              type: it.characterType || "avatar",
              character_id: it.characterId || "",
            },
          };
        } else if (it.type === "voice") {
          variables[n] = {
            name: n,
            type: "voice",
            properties: {
              voice_id: it.voiceId || "",
            },
          };
        } else if (it.type === "audio") {
          variables[n] = {
            name: n,
            type: "audio",
            properties: {
              url: it.url || "",
              asset_id: null,
            },
          };
        } else {
          variables[n] = {
            name: n,
            type: "text",
            properties: { content: it.value || "" },
          };
        }
      });
    } else {
      try {
        variables = JSON.parse(varsJson || "{}");
      } catch {
        showToast("Variables JSON inválido");
        return;
      }
    }
    const r = await fetch(`/api/heygen/template/${selected}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, variables }),
    });
    const j = await r.json();
    if (!r.ok) {
      showToast(j?.error || "Error generando");
      return;
    }
    showToast(`Tarea enviada: ${j?.providerJobId || j?.id}`);
    setLastJobId(j?.id || "");
    setLastProviderId(j?.providerJobId || "");
    setJobStatus(j?.status || "queued");
    setJobUrl("");
    if (pollHandle) {
      clearInterval(pollHandle);
    }
    const handle = setInterval(async () => {
      const done = await pollJobStatus(j?.id);
      if (done) {
        showToast("¡Video listo y visible en el Tablero!");
        clearInterval(handle);
        setPollHandle(null);
      }
    }, 5000);
    setPollHandle(handle);
  }

  return (
    <main className="container py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4">
          <a href="/dashboard" className="btn-accent">
            Ir al tablero
          </a>
        </div>
        <div className="rounded-2xl border border-[#e6e8eb] bg-[#f6f7f9] p-6">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Generar Video desde Templete
          </h1>
          <div className="mb-4">
            <label className="block text-sm mb-1">Template</label>
            <div className="flex gap-2">
              <select
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                value={selected}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelected(v);
                }}
              >
                <option value="">Selecciona…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.id})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-outline whitespace-nowrap"
                onClick={() => selected && loadTemplateVars(selected)}
                disabled={!selected}
              >
                Cargar variables
              </button>
              <label className="flex items-center gap-2 text-sm ml-2">
                <input
                  type="checkbox"
                  checked={useLibrary}
                  onChange={(e) => setUseLibrary(e.target.checked)}
                />
                Usar Libreria
              </label>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1">Título</label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-2">Variables</label>
            <div className="space-y-3">
              {autoVars.map((item, idx) => (
                <div
                  key={idx}
                  className="grid md:grid-cols-2 gap-3 items-center"
                >
                  <div className="grid gap-2">
                    <input
                      className="w-full rounded-2xl border border-border bg-transparent p-3 font-mono"
                      placeholder="nombre_variable"
                      value={item.name}
                      onChange={(e) => {
                        const v = e.target.value;
                        setAutoVars((prev) =>
                          prev.map((it, i) =>
                            i === idx ? { ...it, name: v } : it
                          )
                        );
                      }}
                    />
                    <div className="flex items-center gap-2">
                      <select
                        className="w-full rounded-2xl border border-border bg-transparent p-3"
                        value={item.type as any}
                        onChange={(e) => {
                          const v = e.target.value as any;
                          setAutoVars((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, type: v } : it
                            )
                          );
                        }}
                      >
                        <option value="text">text</option>
                        <option value="image">image</option>
                        <option value="video">video</option>
                        <option value="character">character</option>
                        <option value="voice">voice</option>
                        <option value="audio">audio</option>
                      </select>
                      {(item.type === "image" || item.type === "video") && (
                        <button
                          type="button"
                          className="btn-outline whitespace-nowrap"
                          onClick={() => {
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? it.type === "image"
                                    ? {
                                        ...it,
                                        type: "video",
                                        playStyle: "fit_to_scene",
                                        fit: (it as any).fit || "contain",
                                      }
                                    : {
                                        ...it,
                                        type: "image",
                                        fit: (it as any).fit || "contain",
                                      }
                                  : it
                              )
                            );
                          }}
                        >
                          {item.type === "image"
                            ? "Convertir a video"
                            : "Convertir a imagen"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.type === "text" && (
                      <input
                        className="w-full rounded-2xl border border-border bg-transparent p-3"
                        placeholder="valor"
                        value={(item as any).value || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAutoVars((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, value: v } : it
                            )
                          );
                        }}
                      />
                    )}
                    {item.type === "voice" && (
                      <div className="grid gap-2">
                        <select
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          value={(item as any).voiceId || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, voiceId: v } : it
                              )
                            );
                          }}
                        >
                          <option value="">Selecciona una voz…</option>
                          {voices.map((vc) => (
                            <option key={vc.id} value={vc.id}>
                              {vc.name} ({vc.id})
                            </option>
                          ))}
                        </select>
                        <input
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          placeholder="o pega un voice_id manual"
                          value={(item as any).voiceId || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, voiceId: v } : it
                              )
                            );
                          }}
                        />
                      </div>
                    )}
                    {item.type === "image" && (
                      <>
                        <input
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          placeholder="https://imagen.png"
                          value={(item as any).url || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, url: v } : it
                              )
                            );
                          }}
                        />
                        <select
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          value={(item as any).fit || "contain"}
                          title={fitTips[(item as any).fit || "contain"]}
                          onChange={(e) => {
                            const v = e.target.value as any;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, fit: v } : it
                              )
                            );
                          }}
                        >
                          <option value="cover">cover</option>
                          <option value="contain">contain</option>
                          <option value="crop">crop</option>
                          <option value="none">none</option>
                        </select>
                      </>
                    )}
                    {item.type === "video" && (
                      <>
                        <input
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          placeholder="https://video.mp4"
                          value={(item as any).url || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, url: v } : it
                              )
                            );
                          }}
                        />
                        <select
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          value={(item as any).playStyle || "fit_to_scene"}
                          title={
                            playTips[(item as any).playStyle || "fit_to_scene"]
                          }
                          onChange={(e) => {
                            const v = e.target.value as any;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, playStyle: v } : it
                              )
                            );
                          }}
                        >
                          <option value="fit_to_scene">fit_to_scene</option>
                          <option value="freeze">freeze</option>
                          <option value="loop">loop</option>
                          <option value="once">once</option>
                        </select>
                        <select
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          value={(item as any).fit || "contain"}
                          title={fitTips[(item as any).fit || "contain"]}
                          onChange={(e) => {
                            const v = e.target.value as AutoVar["fit"];
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, fit: v } : it
                              )
                            );
                          }}
                        >
                          <option value="cover">cover</option>
                          <option value="contain">contain</option>
                          <option value="crop">crop</option>
                          <option value="none">none</option>
                        </select>
                      </>
                    )}
                    {item.type === "character" && (
                      <>
                        <select
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          value={(item as any).characterType || "avatar"}
                          onChange={(e) => {
                            const v = e.target.value as any;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, characterType: v } : it
                              )
                            );
                          }}
                        >
                          <option value="avatar">avatar</option>
                          <option value="talking_photo">talking_photo</option>
                        </select>
                        <input
                          className="w-full rounded-2xl border border-border bg-transparent p-3"
                          placeholder="character_id (de /v2/avatars)"
                          value={(item as any).characterId || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAutoVars((prev) =>
                              prev.map((it, i) =>
                                i === idx ? { ...it, characterId: v } : it
                              )
                            );
                          }}
                        />
                        {/* Visual selector: dropdown populated from /api/heygen/avatars */}
                        {avatars && avatars.length > 0 && (
                          <div className="grid md:grid-cols-2 gap-2">
                            <input
                              className="w-full rounded-2xl border border-border bg-transparent p-3 md:col-span-2"
                              placeholder="Buscar avatar por nombre o ID..."
                              value={avatarQuery}
                              onChange={(e) => setAvatarQuery(e.target.value)}
                            />
                            <select
                              className="w-full rounded-2xl border border-border bg-transparent p-3"
                              value={(item as any).characterId || ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                setAutoVars((prev) =>
                                  prev.map((it, i) =>
                                    i === idx ? { ...it, characterId: v } : it
                                  )
                                );
                              }}
                            >
                              <option value="">Selecciona avatar…</option>
                              {filteredAvatars.map((av: any) => (
                                <option
                                  key={av.avatar_id || av.id}
                                  value={av.avatar_id || av.id}
                                >
                                  {
                                    (av.name ||
                                      av.display_name ||
                                      av.avatar_id ||
                                      av.id) as string
                                  }
                                </option>
                              ))}
                            </select>
                            {/* Thumbnail preview */}
                            <div className="flex items-center justify-center">
                              {(() => {
                                const current = (avatars || []).find(
                                  (av: any) =>
                                    (av.avatar_id || av.id) ===
                                    (item as any).characterId
                                );
                                const src =
                                  current?.preview_image_url ||
                                  current?.thumbnail_image_url ||
                                  current?.image_url ||
                                  current?.avatar_image_url ||
                                  "";
                                return src ? (
                                  <img
                                    src={src}
                                    alt="avatar"
                                    className="h-16 w-16 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-16 rounded-lg bg-[#eee]" />
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    {item.type === "audio" && (
                      <input
                        className="w-full rounded-2xl border border-border bg-transparent p-3"
                        placeholder="https://audio.mp3"
                        value={(item as any).url || ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setAutoVars((prev) =>
                            prev.map((it, i) =>
                              i === idx ? { ...it, url: v } : it
                            )
                          );
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() =>
                        setAutoVars((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs opacity-70 mt-2">
              {autoVars.length === 0
                ? "No hay variables. Usa los botones para añadir."
                : "Puedes editar valores y presionar Generar."}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select
                className="rounded-2xl border border-border bg-transparent p-3"
                value={addType}
                onChange={(e) => setAddType(e.target.value as AutoVar["type"])}
              >
                <option value="text">text</option>
                <option value="image">image</option>
                <option value="video">video</option>
                <option value="character">character</option>
                <option value="audio">audio</option>
                <option value="voice">voice</option>
              </select>
              <button
                type="button"
                className="btn-outline"
                onClick={() => {
                  const v: AutoVar =
                    addType === "image"
                      ? { name: "", type: "image", url: "", fit: "contain" }
                      : addType === "video"
                      ? {
                          name: "",
                          type: "video",
                          url: "",
                          playStyle: "fit_to_scene",
                          fit: "contain",
                        }
                      : addType === "character"
                      ? {
                          name: "",
                          type: "character",
                          characterType: "avatar",
                          characterId: "",
                        }
                      : addType === "audio"
                      ? { name: "", type: "audio", url: "" }
                      : addType === "voice"
                      ? { name: "", type: "voice", voiceId: "" }
                      : { name: "", type: "text", value: "" };
                  setAutoVars((prev) => [...prev, v]);
                }}
              >
                Añadir
              </button>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm mb-1">Variables (JSON)</label>
            <textarea
              className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[180px] font-mono text-sm"
              value={varsJson}
              onChange={(e) => setVarsJson(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button className="btn-accent" onClick={generate}>
              Generar
            </button>
          </div>
          {(lastJobId || jobStatus) && (
            <div className="mt-4 rounded-2xl border border-border p-4">
              <div className="text-sm font-mono">Job: {lastJobId || "-"}</div>
              <div className="text-sm">Estado: {jobStatus || "-"}</div>
              {jobUrl ? (
                <div className="mt-2 flex gap-2">
                  <a href={jobUrl} target="_blank" className="btn-primary">
                    Ver video
                  </a>
                  <button
                    className="btn-outline"
                    disabled={downloading}
                    onClick={() =>
                      attemptDownload(
                        jobUrl,
                        (title || "video").replace(/\s+/g, "_") + ".mp4"
                      )
                    }
                  >
                    {downloading ? "Descargando..." : "Descargar"}
                  </button>
                  <a href="/dashboard" className="btn-outline">
                    Ver en Tablero
                  </a>
                  {lastJobId && (
                    <a href={`/jobs/${lastJobId}`} className="btn-outline">
                      Detalles del job
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs opacity-70 mt-2">
                  Esperando a que el video esté listo...
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
