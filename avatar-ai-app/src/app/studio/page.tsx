"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type AvatarItem = {
  id?: string;
  avatar_id?: string;
  name?: string;
  preview_url?: string;
  thumbnail?: string;
};

type VoiceItem = {
  id?: string;
  name?: string;
  language?: string | null;
  gender?: string | null;
  sample_url?: string | null;
  accents?: string[] | string | null;
};

type Scene = {
  id: string;
  avatarId?: string;
  avatarName?: string;
  voiceId?: string;
  voiceName?: string;
  accent?: string;
  rate: number;
  volume: number;
  script: string;
};

const STORAGE_KEY = "replicadosia_studio_scenes_v1";

export default function StudioPage() {
  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [voices, setVoices] = useState<VoiceItem[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [previewAudio] = useState<HTMLAudioElement | null>(
    typeof window !== "undefined" ? new Audio() : null
  );
  const objectUrlRef = useRef<string | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  useEffect(() => {
    if (previewAudio) {
      const onPlay = () => console.log("[Studio] audio play");
      const onPause = () => console.log("[Studio] audio pause");
      const onCanPlay = () => console.log("[Studio] audio canplay");
      const onCanPlayThrough = () =>
        console.log("[Studio] audio canplaythrough");
      const onEnded = () => console.log("[Studio] audio ended");
      const onStalled = () => console.warn("[Studio] audio stalled");
      const onError = () =>
        console.error("[Studio] audio error", previewAudio.error);
      previewAudio.addEventListener("play", onPlay);
      previewAudio.addEventListener("pause", onPause);
      previewAudio.addEventListener("canplay", onCanPlay);
      previewAudio.addEventListener("canplaythrough", onCanPlayThrough);
      previewAudio.addEventListener("ended", onEnded);
      previewAudio.addEventListener("stalled", onStalled);
      previewAudio.addEventListener("error", onError);
      return () => {
        previewAudio.removeEventListener("play", onPlay);
        previewAudio.removeEventListener("pause", onPause);
        previewAudio.removeEventListener("canplay", onCanPlay);
        previewAudio.removeEventListener("canplaythrough", onCanPlayThrough);
        previewAudio.removeEventListener("ended", onEnded);
        previewAudio.removeEventListener("stalled", onStalled);
        previewAudio.removeEventListener("error", onError);
      };
    }
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      try {
        (previewAudio as HTMLAudioElement | null)?.pause?.();
      } catch {}
    };
  }, [previewAudio]);
  const current = scenes[currentIdx];
  const [previewText, setPreviewText] = useState<string>(
    "Hello, this is a preview."
  );

  // Load data once on mount
  useEffect(() => {
    const load = async () => {
      try {
        const a = await fetch("/api/heygen/avatars");
        const aj = await a.json();
        const items: AvatarItem[] =
          aj?.avatars || aj?.data?.avatars || aj?.data || [];
        setAvatars(items);
      } catch {}
      try {
        const v = await fetch("/api/heygen/voices");
        const vj = await v.json();
        const vitems: VoiceItem[] =
          vj?.voices || vj?.data?.voices || vj?.data || [];
        setVoices(vitems);
        // Preselect language filter with first language if none
        if (
          !voiceFilterLang &&
          Array.isArray(vj?.languages) &&
          vj.languages.length > 0
        ) {
          // keep default "All languages" but we could expose list below
        }
      } catch {}
    };
    load();
  }, []);

  // Load scenes from storage or create one
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScenes(parsed);
          return;
        }
      }
    } catch {}
    setScenes([
      {
        id: crypto.randomUUID(),
        rate: 1,
        volume: 1,
        script: "",
      },
    ]);
  }, []);

  // Persist
  useEffect(() => {
    try {
      if (scenes.length > 0)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scenes));
    } catch {}
  }, [scenes]);

  function updateCurrent(patch: Partial<Scene>) {
    setScenes((prev) => {
      const copy = [...prev];
      copy[currentIdx] = { ...copy[currentIdx], ...patch } as Scene;
      return copy;
    });
  }

  function addScene() {
    setScenes((prev) => [
      ...prev,
      { id: crypto.randomUUID(), rate: 1, volume: 1, script: "" },
    ]);
    setCurrentIdx(scenes.length);
  }

  function removeScene(idx: number) {
    setScenes((prev) => prev.filter((_, i) => i !== idx));
    setCurrentIdx((i) => Math.max(0, Math.min(i, scenes.length - 2)));
  }

  function moveScene(from: number, to: number) {
    if (to < 0 || to >= scenes.length || from === to) return;
    setScenes((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
    setCurrentIdx((cur) => (cur === from ? to : cur));
  }

  const gridAvatars = useMemo(() => avatars.slice(0, 60), [avatars]);
  const uniqueAvatars = useMemo(() => {
    const map = new Map<string, AvatarItem>();
    for (const a of avatars) {
      const id = String((a as any)?.avatar_id || a.id || "");
      if (id && !map.has(id)) map.set(id, a);
    }
    return Array.from(map.values());
  }, [avatars]);
  const [avatarQuery, setAvatarQuery] = useState<string>("");
  const filteredAvatars = useMemo(() => {
    const q = avatarQuery.trim().toLowerCase();
    if (!q) return uniqueAvatars;
    return uniqueAvatars.filter((a) =>
      String(a.name || a.id || "")
        .toLowerCase()
        .includes(q)
    );
  }, [uniqueAvatars, avatarQuery]);
  const [voiceFilterLang, setVoiceFilterLang] = useState<string>("");
  const uniqueVoices = useMemo(() => {
    const map = new Map<string, VoiceItem>();
    for (const v of voices) {
      const id = String((v as any)?.id || "");
      if (id && !map.has(id)) map.set(id, v);
    }
    return Array.from(map.values());
  }, [voices]);
  const voiceLanguages = useMemo(() => {
    const set = new Set<string>();
    uniqueVoices.forEach((v) => {
      if (v.language) set.add(String(v.language).toLowerCase());
    });
    return Array.from(set).sort();
  }, [uniqueVoices]);
  const filteredVoices = useMemo(() => {
    return uniqueVoices.filter((v) =>
      voiceFilterLang
        ? String(v.language || "")
            .toLowerCase()
            .startsWith(voiceFilterLang.toLowerCase())
        : true
    );
  }, [uniqueVoices, voiceFilterLang]);

  return (
    <div className="mx-auto max-w-6xl p-5">
      <h1 className="text-2xl font-semibold mb-4">Studio • ReplicadosIA</h1>

      {/* Timeline */}
      <div className="mb-6 rounded-md border p-3">
        <div className="mb-2 text-sm font-semibold">Timeline</div>
        <div className="flex flex-wrap gap-2">
          {scenes.map((s, idx) => (
            <div key={s.id} className="flex flex-col items-center">
              <button
                onClick={() => setCurrentIdx(idx)}
                className={`rounded-md border px-3 py-1 text-sm ${
                  idx === currentIdx ? "bg-blue-600 text-white" : "bg-white"
                }`}
                title={s.script?.slice(0, 40)}
              >
                {idx + 1}
                <span className="ml-2 text-xs opacity-70">
                  {s.avatarName || "Avatar"}
                </span>
                {s.voiceName ? (
                  <span className="ml-2 text-[10px] opacity-70">
                    {s.voiceName}
                  </span>
                ) : null}
                <span
                  className="ml-2 text-xs text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeScene(idx);
                  }}
                >
                  ✕
                </span>
              </button>
            </div>
          ))}
          <button
            onClick={addScene}
            className="rounded-md border px-3 py-1 text-sm bg-white"
          >
            + Add scene
          </button>
        </div>
      </div>

      {/* Main editor split */}
      <div className="grid grid-cols-12 gap-5">
        {/* Left: avatar gallery (boxed, scrollable like voice) */}
        <div className="col-span-7">
          <div className="mb-4 rounded-md border p-3 max-h-[70vh] overflow-hidden flex flex-col">
            <div className="mb-2 text-sm font-semibold">
              Choose Avatar
              <span className="ml-2 text-xs font-normal opacity-70">
                Selected: {current?.avatarName || "None"}
              </span>
            </div>
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                className="w-full rounded-md border px-2 py-1 text-sm"
                placeholder="Search avatar…"
                value={avatarQuery}
                onChange={(e) => setAvatarQuery(e.target.value)}
              />
              <div className="text-xs opacity-60">
                {filteredAvatars.length} found
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-md border p-2 bg-white">
              <div className="grid grid-cols-4 gap-3">
                {filteredAvatars.map((a) => {
                  const id = (a.avatar_id || a.id) as string;
                  const isSel = id && id === current?.avatarId;
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        updateCurrent({ avatarId: id, avatarName: a.name })
                      }
                      className={`rounded-md border text-left ${
                        isSel ? "ring-2 ring-blue-500" : ""
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          a.thumbnail || a.preview_url
                            ? `/api/heygen/avatars/thumbnail?url=${encodeURIComponent(
                                (a.thumbnail as string) ||
                                  (a.preview_url as string)
                              )}`
                            : "/replicadosia-logo.png"
                        }
                        alt={a.name || "avatar"}
                        className="h-24 w-full object-cover rounded-t-md"
                      />
                      <div className="p-2 text-xs truncate">{a.name || id}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: voice + script */}
        <div className="col-span-5">
          <div className="mb-4 rounded-md border p-3">
            <div className="mb-2 text-sm font-semibold">
              Voice
              <span className="ml-2 text-xs font-normal opacity-70">
                Selected: {current?.voiceName || "None"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <label className="text-xs">
                Language
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={voiceFilterLang}
                  onChange={(e) => setVoiceFilterLang(e.target.value)}
                >
                  <option value="">All languages</option>
                  {voiceLanguages.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <div />
            </div>
            <select
              className="w-full rounded-md border px-2 py-1 text-sm"
              value={current?.voiceId || ""}
              onChange={(e) => {
                const v = voices.find((x) => x.id === e.target.value);
                updateCurrent({
                  voiceId: e.target.value || undefined,
                  voiceName: v?.name,
                  accent: undefined,
                });
              }}
            >
              <option value="">Choose voice…</option>
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name || v.id}
                </option>
              ))}
            </select>
            {/* Voice library grid (match avatar box size) */}
            <div className="mt-3 h-80 overflow-auto rounded-md border p-2 bg-white grid grid-cols-3 gap-3">
              {filteredVoices.slice(0, 24).map((v) => (
                <div
                  key={v.id}
                  className={`rounded-md border p-2 text-xs ${
                    current?.voiceId === v.id ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <div className="font-medium truncate" title={v.name || v.id}>
                    {v.name || v.id}
                  </div>
                  <div className="opacity-70 truncate">{v.language || ""}</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      className="rounded-md border px-2 py-0.5"
                      onClick={() =>
                        updateCurrent({
                          voiceId: v.id,
                          voiceName: v.name,
                          accent: undefined,
                        })
                      }
                    >
                      Use
                    </button>
                    <button
                      className={`rounded-md border px-2 py-0.5 ${
                        playingKey === `grid:${v.id}`
                          ? "bg-blue-600 text-white animate-pulse"
                          : playingKey === `no:${v.id}`
                          ? "bg-gray-200"
                          : ""
                      }`}
                      onClick={async () => {
                        if (v.sample_url && previewAudio) {
                          const proxied = `/api/heygen/voices/sample?url=${encodeURIComponent(
                            v.sample_url
                          )}`;
                          console.log("[Studio] play sample (grid)", {
                            url: v.sample_url,
                            proxied,
                          });
                          try {
                            setPlayingKey(`grid:${v.id}`);
                            previewAudio.onended = () => setPlayingKey(null);
                            previewAudio.onpause = () => setPlayingKey(null);
                            previewAudio.onerror = () => setPlayingKey(null);
                            previewAudio.pause();
                            previewAudio.currentTime = 0;
                            previewAudio.src = proxied;
                            previewAudio.crossOrigin = "anonymous";
                            await previewAudio.play();
                            return;
                          } catch (err) {
                            console.warn(
                              "[Studio] direct play failed, trying blob",
                              err
                            );
                            try {
                              const res = await fetch(proxied, {
                                cache: "no-store",
                              });
                              console.log(
                                "[Studio] blob fetch",
                                res.status,
                                res.headers.get("content-type")
                              );
                              if (!res.ok) return;
                              const blob = await res.blob();
                              if (objectUrlRef.current) {
                                URL.revokeObjectURL(objectUrlRef.current);
                              }
                              const objUrl = URL.createObjectURL(blob);
                              objectUrlRef.current = objUrl;
                              setPlayingKey(`grid:${v.id}`);
                              previewAudio.onended = () => setPlayingKey(null);
                              previewAudio.onpause = () => setPlayingKey(null);
                              previewAudio.onerror = () => setPlayingKey(null);
                              previewAudio.pause();
                              previewAudio.currentTime = 0;
                              previewAudio.src = objUrl;
                              previewAudio.load();
                              await previewAudio.play();
                            } catch (e) {
                              console.error("[Studio] blob play failed", e);
                              try {
                                window.open(v.sample_url, "_blank");
                              } catch {}
                            }
                          }
                        } else {
                          // No sample available: brief feedback
                          setPlayingKey(`no:${v.id}`);
                          setTimeout(() => setPlayingKey(null), 800);
                        }
                      }}
                    >
                      {playingKey === `grid:${v.id}`
                        ? "Playing…"
                        : playingKey === `no:${v.id}`
                        ? "No sample"
                        : "▶"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {/* Accent selector & preview */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs">
                Accent
                <select
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={current?.accent || ""}
                  onChange={(e) =>
                    updateCurrent({ accent: e.target.value || undefined })
                  }
                >
                  <option value="">Original</option>
                  {(() => {
                    const selected = voices.find(
                      (x) => x.id === current?.voiceId
                    );
                    const list = selected?.accents
                      ? Array.isArray(selected.accents)
                        ? selected.accents
                        : String(selected.accents)
                            .split(",")
                            .map((s) => s.trim())
                      : [];
                    return list.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ));
                  })()}
                </select>
              </label>
              <label className="text-xs">
                Preview
                <button
                  type="button"
                  className={`mt-1 w-full rounded-md border px-2 py-1 text-sm ${
                    playingKey === `button:${current?.voiceId}`
                      ? "bg-blue-600 text-white animate-pulse"
                      : playingKey === `no:button:${current?.voiceId}`
                      ? "bg-gray-200"
                      : ""
                  }`}
                  onClick={async () => {
                    const selected = voices.find(
                      (x) => x.id === current?.voiceId
                    );
                    const url = selected?.sample_url;
                    if (url && previewAudio) {
                      const proxied = `/api/heygen/voices/sample?url=${encodeURIComponent(
                        url
                      )}`;
                      console.log("[Studio] play sample (button)", {
                        url,
                        proxied,
                      });
                      try {
                        setPlayingKey(`button:${current?.voiceId}`);
                        previewAudio.onended = () => setPlayingKey(null);
                        previewAudio.onpause = () => setPlayingKey(null);
                        previewAudio.onerror = () => setPlayingKey(null);
                        previewAudio.pause();
                        previewAudio.currentTime = 0;
                        previewAudio.src = proxied;
                        previewAudio.crossOrigin = "anonymous";
                        await previewAudio.play();
                        return;
                      } catch (err) {
                        console.warn(
                          "[Studio] direct play failed, trying blob",
                          err
                        );
                        try {
                          const res = await fetch(proxied, {
                            cache: "no-store",
                          });
                          console.log(
                            "[Studio] blob fetch",
                            res.status,
                            res.headers.get("content-type")
                          );
                          if (!res.ok) return;
                          const blob = await res.blob();
                          if (objectUrlRef.current) {
                            URL.revokeObjectURL(objectUrlRef.current);
                          }
                          const objUrl = URL.createObjectURL(blob);
                          objectUrlRef.current = objUrl;
                          setPlayingKey(`button:${current?.voiceId}`);
                          previewAudio.onended = () => setPlayingKey(null);
                          previewAudio.onpause = () => setPlayingKey(null);
                          previewAudio.onerror = () => setPlayingKey(null);
                          previewAudio.pause();
                          previewAudio.currentTime = 0;
                          previewAudio.src = objUrl;
                          previewAudio.load();
                          await previewAudio.play();
                        } catch (e) {
                          console.error("[Studio] blob play failed", e);
                          try {
                            window.open(url, "_blank");
                          } catch {}
                        }
                      }
                    } else {
                      // Fallback: brief feedback + attempt best-effort TTS like Speak preview
                      try {
                        setPlayingKey(`no:button:${current?.voiceId}`);
                        setTimeout(() => setPlayingKey(null), 800);
                        const synth = window.speechSynthesis;
                        if (synth) {
                          const u = new SpeechSynthesisUtterance(
                            previewText || "Preview"
                          );
                          const list = synth.getVoices();
                          const accent = current?.accent?.toLowerCase() || "";
                          const langHint = selected?.language || "";
                          const pick =
                            list.find((v) =>
                              v.name.toLowerCase().includes(accent)
                            ) ||
                            list.find((v) =>
                              v.lang
                                ?.toLowerCase()
                                .includes(
                                  String(langHint).slice(0, 2).toLowerCase()
                                )
                            ) ||
                            list[0];
                          if (pick) u.voice = pick;
                          u.rate = Math.max(
                            0.5,
                            Math.min(1.5, current?.rate ?? 1)
                          );
                          u.volume = Math.max(
                            0,
                            Math.min(1, (current?.volume ?? 1) / 1)
                          );
                          synth.cancel();
                          synth.speak(u);
                        }
                      } catch {}
                    }
                  }}
                >
                  {playingKey === `button:${current?.voiceId}`
                    ? "Playing…"
                    : playingKey === `no:button:${current?.voiceId}`
                    ? "No sample"
                    : "Play sample"}
                </button>
              </label>
            </div>
            {/* Text preview using browser speech (best-effort) */}
            <div className="mt-3 grid grid-cols-3 gap-3 items-end">
              <label className="text-xs col-span-2">
                Preview text
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border px-2 py-1 text-sm"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Type a short sentence…"
                />
              </label>
              <button
                type="button"
                className="rounded-md border px-2 py-1 text-sm"
                onClick={() => {
                  try {
                    const synth = window.speechSynthesis;
                    if (!synth) return;
                    const u = new SpeechSynthesisUtterance(
                      previewText || "Preview"
                    );
                    // Try to match accent or language
                    const list = synth.getVoices();
                    const accent = current?.accent?.toLowerCase() || "";
                    const langHint =
                      voices.find((x) => x.id === current?.voiceId)?.language ||
                      "";
                    const pick =
                      list.find((v) => v.name.toLowerCase().includes(accent)) ||
                      list.find((v) =>
                        v.lang
                          ?.toLowerCase()
                          .includes(String(langHint).slice(0, 2).toLowerCase())
                      ) ||
                      list[0];
                    if (pick) u.voice = pick;
                    u.rate = Math.max(0.5, Math.min(1.5, current?.rate ?? 1));
                    u.volume = Math.max(
                      0,
                      Math.min(1, (current?.volume ?? 1) / 1)
                    );
                    synth.cancel();
                    synth.speak(u);
                  } catch {}
                }}
              >
                Speak preview
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-xs">
                Rate
                <input
                  type="range"
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  value={current?.rate ?? 1}
                  onChange={(e) =>
                    updateCurrent({ rate: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </label>
              <label className="text-xs">
                Volume
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={current?.volume ?? 1}
                  onChange={(e) =>
                    updateCurrent({ volume: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
              </label>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="mb-2 text-sm font-semibold">Script</div>
            <textarea
              className="w-full rounded-md border px-2 py-2 text-sm"
              rows={8}
              placeholder="Type scene script…"
              value={current?.script || ""}
              onChange={(e) => updateCurrent({ script: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="mt-6 flex items-center justify-between gap-2">
        <div className="text-xs opacity-70">
          Autosave: scenes are saved to local storage.
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => {
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {}
            }}
          >
            Clear local draft
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm bg-white"
            onClick={() => {
              try {
                const blob = new Blob([JSON.stringify(scenes, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "studio-scenes.json";
                a.click();
                URL.revokeObjectURL(url);
              } catch {}
            }}
          >
            Export JSON
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm bg-blue-600 text-white"
            onClick={async () => {
              // Prepare generation payload for current scene
              const s = current;
              if (!s?.avatarId || !s.script?.trim()) {
                alert(
                  "Please select an avatar and enter a script for this scene."
                );
                return;
              }
              const jobPayload = {
                title: (s.script || "Scene").slice(0, 40),
                script: s.script,
                inputType: "TEXT",
                avatarId: s.avatarId,
                voiceId: s.voiceId,
                voiceSpeed: typeof s.rate === "number" ? s.rate : 1,
                consent: true,
                width: 1280,
                height: 720,
                status: "draft",
              } as any;
              try {
                const res = await fetch("/api/jobs", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(jobPayload),
                });
                const data = await res.json();
                if (!res.ok) {
                  alert(data?.error || "Failed to create job");
                  return;
                }
                const jobId = data?.id || data?._id || data?.jobId;
                if (!jobId) {
                  alert("Job created but id missing");
                  return;
                }
                // Kick off processing (calls HeyGen generate)
                const proc = await fetch(`/api/jobs/${jobId}/process`, {
                  method: "POST",
                });
                const pdata = await proc.json();
                if (!proc.ok) {
                  alert(pdata?.error || "Failed to start processing");
                  return;
                }
                // Navigate to job page
                window.location.href = `/jobs/${jobId}`;
              } catch (e) {
                console.error(e);
                alert("Unexpected error creating job");
              }
            }}
          >
            Generate current scene
          </button>
        </div>
      </div>
    </div>
  );
}
