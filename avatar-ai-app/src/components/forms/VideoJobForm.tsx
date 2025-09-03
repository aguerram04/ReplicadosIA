"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useEffect, useState } from "react";
import MediaUploader from "@/components/uploads/MediaUploader";

type InputType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
type FormValues = {
  title: string;
  script: string;
  inputType: InputType;
  avatarId?: string;
  voiceId?: string;
  voiceSpeed?: number;
  consent: boolean;
  assets?: string[];
  mediaUrls?: string[];
  width?: number;
  height?: number;
  backgroundType?: "none" | "color" | "image" | "video";
  backgroundColor?: string;
  backgroundImageUrl?: string;
  backgroundVideoUrl?: string;
  backgroundPlayStyle?: "fit_to_scene" | "freeze" | "loop" | "once";
  webmTransparent?: boolean;
};

const inputTypeEnum = z.enum(["TEXT", "IMAGE", "AUDIO", "VIDEO"]);
const backgroundTypeEnum = z.enum(["none", "color", "image", "video"]);

const formSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    script: z.string().min(1, "El guión es obligatorio"),
    inputType: inputTypeEnum,
    avatarId: z.string().optional(),
    voiceId: z.string().optional(),
    voiceSpeed: z
      .number({ invalid_type_error: "Debe ser un número" })
      .min(0.5, "Mínimo 0.5")
      .max(2, "Máximo 2.0")
      .optional(),
    consent: z.literal(true, {
      errorMap: () => ({ message: "Debes aceptar el consentimiento." }),
    }),
    assets: z.array(z.string()).optional(),
    mediaUrls: z.array(z.string()).optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    backgroundType: backgroundTypeEnum,
    backgroundColor: z.string().optional(),
    backgroundImageUrl: z.string().url("URL inválida").optional(),
    backgroundVideoUrl: z.string().url("URL inválida").optional(),
    backgroundPlayStyle: z
      .enum(["fit_to_scene", "freeze", "loop", "once"])
      .optional(),
    webmTransparent: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.backgroundType === "color") {
      const color = (val.backgroundColor || "").trim();
      if (color && !/^#([0-9A-Fa-f]{6})$/.test(color)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundColor"],
          message: "Color inválido. Usa formato hex #RRGGBB",
        });
      }
    }
    if (val.backgroundType === "image") {
      if (!val.backgroundImageUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundImageUrl"],
          message: "Debes especificar la URL de la imagen de fondo",
        });
      } else if (
        !/\.(png|jpg|jpeg)$/i.test(new URL(val.backgroundImageUrl).pathname)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundImageUrl"],
          message: "La imagen debe ser .png/.jpg/.jpeg",
        });
      }
    }
    if (val.backgroundType === "video") {
      if (!val.backgroundVideoUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundVideoUrl"],
          message: "Debes especificar la URL del video de fondo",
        });
      } else if (
        !/\.(mp4|webm)$/i.test(new URL(val.backgroundVideoUrl).pathname)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["backgroundVideoUrl"],
          message: "El video debe ser .mp4 o .webm",
        });
      }
    }
  });

export default function VideoJobForm({
  labelsBelow = false,
  wideSpacing = false,
  showUploader = true,
  showInputType = true,
  showAvatarFields = true,
  defaultWebm = false,
  nonAvatarMode = false,
}: {
  labelsBelow?: boolean;
  wideSpacing?: boolean;
  showUploader?: boolean;
  showInputType?: boolean;
  showAvatarFields?: boolean;
  defaultWebm?: boolean;
  nonAvatarMode?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      script: "",
      inputType: "TEXT",
      consent: false as any,
      backgroundType: "none",
      webmTransparent: defaultWebm,
    },
  });

  const inputType = watch("inputType");
  const [media, setMedia] = useState<string[]>([]);
  const [photoGroups, setPhotoGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [groupAvatars, setGroupAvatars] = useState<any[]>([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string>("");
  const [silent, setSilent] = useState<boolean>(false);

  function handleAdd(urls: string[]) {
    setMedia((prev) => [...prev, ...urls]);
  }
  function removeAt(i: number) {
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
  }

  const [toast, setToast] = useState<string | null>(null);
  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  // Autosave/restore borradores
  const STORAGE_KEY = `videoJobForm_${nonAvatarMode ? "nonAvatar" : "avatar"}`;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        reset(saved);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);
  useEffect(() => {
    const subscription = watch((values) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
      } catch {}
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  async function onSubmit(data: z.infer<typeof formSchema>) {
    try {
      // En modo sin avatar, garantizamos que no se envíe avatar/voice/webm
      if (nonAvatarMode) {
        data.avatarId = undefined;
        data.voiceId = undefined;
        data.webmTransparent = false;
      }
      // Validación de fondo ahora la maneja Zod (formSchema)

      // Envía mediaUrls de forma robusta (string | string[])
      const mediaPayload = Array.isArray(media)
        ? media
        : typeof (media as any) === "string"
        ? [String(media)]
        : [];
      const res = await axios.post("/api/jobs", {
        ...data,
        mediaUrls: mediaPayload,
      });
      const newId: string | undefined = res.data?.id;
      if (!newId) {
        showToast("No se pudo crear el trabajo");
        return;
      }
      // Enviar a producción según bandera WebM o tipo de entrada
      let proc: Response;
      if (!nonAvatarMode && data.webmTransparent) {
        if (!data.avatarId || !data.voiceId) {
          showToast(
            "WebM requiere Avatar ID y Voice ID. Usa la pestaña AvatarID."
          );
          return;
        }
        proc = await fetch(`/api/jobs/${newId}/process/webm`, {
          method: "POST",
        });
      } else if (data.inputType === "IMAGE") {
        if (media.length === 0 && !selectedPhotoId) {
          showToast("Debes subir una imagen o elegir un look de foto");
          return;
        }
        proc = await fetch(`/api/jobs/${newId}/process/talking-photo`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            talkingPhotoId: selectedPhotoId || undefined,
            silent: Boolean(silent),
          }),
        });
      } else {
        // Fallback automático: si no hay avatarId pero sí hay imagen subida, usar Talking Photo
        const hasImage = media.some((u) =>
          /\.(png|jpe?g)$/i.test(u.split("?")[0] || "")
        );
        const missingAvatar =
          !data.avatarId || String(data.avatarId).trim() === "";
        // If user selected a photo avatar look, prefer that
        if (selectedPhotoId) {
          proc = await fetch(`/api/jobs/${newId}/process/talking-photo`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ talkingPhotoId: selectedPhotoId }),
          });
        } else if ((nonAvatarMode || missingAvatar) && hasImage) {
          proc = await fetch(`/api/jobs/${newId}/process/talking-photo`, {
            method: "POST",
          });
        } else if (nonAvatarMode || missingAvatar) {
          showToast(
            "Falta Avatar ID. Sube una imagen (Talking Photo) o usa la pestaña AvatarID."
          );
          return;
        } else {
          proc = await fetch(`/api/jobs/${newId}/process`, {
            method: "POST",
          });
        }
      }
      let statusLabel = "";
      if (proc.ok) {
        try {
          const j = await proc.json();
          statusLabel = j?.status || "queued";
        } catch {}
        showToast(`Video enviado a producción → ${statusLabel}`);
      } else {
        let detail = "";
        try {
          const j = await proc.json();
          detail = j?.error || j?.detail || j?.message || "";
        } catch {
          try {
            const t = await proc.text();
            detail = t;
          } catch {}
        }
        const httpInfo = `HTTP ${proc.status} ${proc.statusText || ""}`.trim();
        showToast(
          `Error al generar: ${detail || httpInfo || "Solicitud inválida"}`
        );
      }
      setMedia([]);
      reset();
    } catch (e: any) {
      const resp = e?.response;
      const msg = resp
        ? resp?.data?.error ||
          resp?.data?.detail ||
          resp?.data?.message ||
          `HTTP ${resp?.status} ${resp?.statusText || ""}`
        : e?.message || "Error creando la solicitud";
      showToast(msg);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={`${wideSpacing ? "space-y-8" : "space-y-6"} max-w-2xl`}
    >
      <div>
        <label className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}>
          Título
        </label>
        <input
          className="w-full rounded-2xl border border-border bg-transparent p-3"
          {...register("title", { required: "El título es obligatorio" })}
        />
        {errors.title && (
          <p className="text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      <div className={`grid md:grid-cols-2 ${wideSpacing ? "gap-6" : "gap-4"}`}>
        {showAvatarFields && (
          <div>
            <label className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}>
              Avatar ID (ReplicadosIA)
            </label>
            <input
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="ej. avatar_123"
              {...register("avatarId")}
            />
          </div>
        )}
        <div>
          <label className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}>
            Voz (HeyGen)
          </label>
          <select
            className="w-full rounded-2xl border border-border bg-transparent p-3"
            {...register("voiceId")}
            defaultValue=""
            disabled={silent}
            onFocus={async (e) => {
              // Lazy-load voices the first time user opens the dropdown
              try {
                const r = await fetch("/api/heygen/voices", {
                  cache: "no-store",
                });
                const j = await r.json();
                const sel = e.currentTarget;
                if (Array.isArray(j?.voices) && sel.options.length <= 1) {
                  for (const v of j.voices) {
                    const opt = document.createElement("option");
                    opt.value = String(v.id || v.voice_id || "");
                    opt.text = `${v.name || v.id}${
                      v.language ? ` — ${v.language}` : ""
                    }`;
                    sel.appendChild(opt);
                  }
                }
              } catch {}
            }}
          >
            <option value="">(elige una voz o deja vacío)</option>
          </select>
          <p className="text-xs opacity-70 mt-1">
            Consejo: si lo dejas vacío, puedes subir un audio o configurar
            HEYGEN_DEFAULT_VOICE_ID.
          </p>
          <label className="flex items-center gap-2 mt-2 text-sm">
            <input
              type="checkbox"
              checked={silent}
              onChange={(e) => setSilent(e.target.checked)}
            />
            Generar sin audio
          </label>
        </div>
      </div>

      {/* Background customization */}
      {!watch("webmTransparent") && (
        <div className={wideSpacing ? "mt-2" : undefined}>
          <label className="block text-sm mb-2">Fondo del video</label>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Tipo</label>
              <select
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                {...register("backgroundType")}
                defaultValue="none"
              >
                <option value="none">Ninguno</option>
                <option value="color">Color</option>
                <option value="image">Imagen (URL)</option>
                <option value="video">Video (URL)</option>
              </select>
            </div>
            {watch("backgroundType") === "color" && (
              <div>
                <label className="block text-sm mb-1">Color (hex)</label>
                <input
                  className="w-full rounded-2xl border border-border bg-transparent p-3"
                  placeholder="#FAFAFA"
                  {...register("backgroundColor")}
                />
                {errors.backgroundColor && (
                  <p className="text-sm text-red-400">
                    {String(errors.backgroundColor.message)}
                  </p>
                )}
              </div>
            )}
            {watch("backgroundType") === "video" && (
              <div>
                <label className="block text-sm mb-1">Play style (video)</label>
                <select
                  className="w-full rounded-2xl border border-border bg-transparent p-3"
                  {...register("backgroundPlayStyle")}
                >
                  <option value="">(auto)</option>
                  <option value="fit_to_scene">fit_to_scene</option>
                  <option value="freeze">freeze</option>
                  <option value="loop">loop</option>
                  <option value="once">once</option>
                </select>
              </div>
            )}
          </div>
          {watch("backgroundType") !== "none" && (
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {watch("backgroundType") === "image" && (
                <div>
                  <label className="block text-sm mb-1">Imagen URL</label>
                  <input
                    className="w-full rounded-2xl border border-border bg-transparent p-3"
                    placeholder="https://..."
                    {...register("backgroundImageUrl")}
                  />
                  {errors.backgroundImageUrl && (
                    <p className="text-sm text-red-400">
                      {String(errors.backgroundImageUrl.message)}
                    </p>
                  )}
                </div>
              )}
              {watch("backgroundType") === "video" && (
                <div>
                  <label className="block text-sm mb-1">Video URL</label>
                  <input
                    className="w-full rounded-2xl border border-border bg-transparent p-3"
                    placeholder="https://..."
                    {...register("backgroundVideoUrl")}
                  />
                  {errors.backgroundVideoUrl && (
                    <p className="text-sm text-red-400">
                      {String(errors.backgroundVideoUrl.message)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {watch("backgroundType") === "color" && (
            <p className="text-xs opacity-70 mt-1">
              Para green screen usa #008000.
            </p>
          )}
        </div>
      )}

      {showUploader && (
        <div className={`${wideSpacing ? "space-y-4" : "space-y-3"}`}>
          <label className="block text-sm">
            Archivos (imágenes, audio, video, cámara)
          </label>
          <div className="flex">
            <MediaUploader onAdd={handleAdd}>
              <span className="btn-accent">Subir desde dispositivo/cámara</span>
            </MediaUploader>
            <div className="w-3" />
            <MediaUploader accept="video" onAdd={handleAdd}>
              <span className="btn-outline">Subir video</span>
            </MediaUploader>
            <div className="w-3" />
            <MediaUploader
              accept="auto"
              onAdd={(urls) => {
                const audioOnly = urls.filter((u) =>
                  /\.(mp3|wav|m4a|aac)$/i.test(u.split("?")[0] || "")
                );
                if (audioOnly.length > 0) handleAdd(audioOnly);
              }}
            >
              <span className="btn-outline">Subir audio</span>
            </MediaUploader>
          </div>
          <div className="text-xs opacity-70">
            Consejo: para usar tu propia voz, sube un archivo de audio
            (mp3/wav/m4a/aac).
          </div>
          {/* Optional: Photo Avatar groups selector */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">
                Grupo de fotos (opcional)
              </label>
              <select
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                value={selectedGroup}
                onChange={async (e) => {
                  const v = e.target.value;
                  setSelectedGroup(v);
                  setSelectedPhotoId("");
                  setGroupAvatars([]);
                  if (v) {
                    try {
                      const r = await fetch(
                        `/api/heygen/avatar-groups/${v}/avatars`
                      );
                      const j = await r.json();
                      const list =
                        j?.data?.data?.avatars || j?.data?.avatars || [];
                      setGroupAvatars(list);
                    } catch {}
                  }
                }}
                onFocus={async () => {
                  if (photoGroups.length === 0) {
                    try {
                      const r = await fetch(`/api/heygen/avatar-groups`);
                      const j = await r.json();
                      const list =
                        j?.data?.data?.groups ||
                        j?.data?.groups ||
                        j?.data?.data?.avatar_group_list ||
                        j?.data?.avatar_group_list ||
                        [];
                      setPhotoGroups(list);
                    } catch {}
                  }
                }}
              >
                <option value="">(ninguno)</option>
                {photoGroups.map((g) => (
                  <option key={g.id || g.group_id} value={g.id || g.group_id}>
                    {g.name || g.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Look (opcional)</label>
              <select
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                value={selectedPhotoId}
                onChange={(e) => setSelectedPhotoId(e.target.value)}
                disabled={!selectedGroup}
              >
                <option value="">(ninguno)</option>
                {groupAvatars.map((av) => (
                  <option
                    key={av.avatar_id || av.id}
                    value={av.avatar_id || av.id}
                  >
                    {av.name || av.avatar_id || av.id}
                  </option>
                ))}
              </select>
              {groupAvatars.length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {groupAvatars.map((av) => {
                    const id = av.avatar_id || av.id;
                    const url =
                      av.image_url ||
                      av.preview_url ||
                      av.thumbnail_url ||
                      av.avatar_url ||
                      av.url ||
                      "";
                    return (
                      <button
                        type="button"
                        key={id}
                        onClick={() => setSelectedPhotoId(id)}
                        className={`text-left rounded-xl border border-border p-1 hover:bg-[#f6f7f9] ${
                          selectedPhotoId === id ? "ring-2 ring-[#007bff]" : ""
                        }`}
                      >
                        {url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={url}
                            alt={String(id)}
                            className="h-32 w-full rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-32 w-full rounded-lg bg-[#eee]" />
                        )}
                        <div className="mt-1 truncate text-xs">
                          {String(id)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {media.length > 0 && (
            <ul className="mt-2 space-y-2 text-sm">
              {media.map((u, i) => (
                <li
                  key={`${u}-${i}`}
                  className="flex justify-between gap-3 border border-border rounded-2xl px-3 py-2"
                >
                  <span className="truncate">{u}</span>
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="btn-outline"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs opacity-70">
            Se adjuntarán {media.length} archivo(s).
          </p>
        </div>
      )}

      <div className={wideSpacing ? "mt-2" : undefined}>
        <label className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}>
          Guión
        </label>
        <textarea
          className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[140px]"
          {...register("script", { required: "El guión es obligatorio" })}
        />
        {errors.script && (
          <p className="text-sm text-red-400">{errors.script.message}</p>
        )}
      </div>

      {showAvatarFields && (
        <div
          className={`grid md:grid-cols-2 ${wideSpacing ? "gap-6" : "gap-4"}`}
        >
          <div>
            <label className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}>
              Velocidad de voz (0.5 - 2.0)
            </label>
            <input
              type="number"
              step="0.1"
              min={0.5}
              max={2}
              className="w-full rounded-2xl border border-border bg-transparent p-3"
              placeholder="1.0"
              {...register("voiceSpeed", { valueAsNumber: true })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}
              >
                Ancho (px)
              </label>
              <input
                type="number"
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                placeholder="1280"
                {...register("width", { valueAsNumber: true })}
              />
            </div>
            <div>
              <label
                className={`block text-sm ${labelsBelow ? "mt-1" : "mb-1"}`}
              >
                Alto (px)
              </label>
              <input
                type="number"
                className="w-full rounded-2xl border border-border bg-transparent p-3"
                placeholder="720"
                {...register("height", { valueAsNumber: true })}
              />
            </div>
          </div>
        </div>
      )}

      {showInputType && (
        <div className={wideSpacing ? "mt-2" : undefined}>
          <label className="block text-sm mb-2">Tipo de entrada</label>
          <div className="grid grid-cols-2 gap-2">
            {(["TEXT", "IMAGE", "AUDIO", "VIDEO"] as InputType[]).map((t) => (
              <label
                key={t}
                className={`chip ${
                  inputType === t ? "chip-selected" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  value={t}
                  className="hidden"
                  {...register("inputType")}
                />
                {t}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Avatar/Voice fields moved above */}

      <label className="flex gap-3 items-start">
        <input
          type="checkbox"
          className="mt-1"
          {...register("consent", { required: true })}
        />
        <span className="text-sm">
          Confirmo derechos/consentimiento del material.
        </span>
      </label>
      {errors.consent && (
        <p className="text-sm text-red-400">Debes aceptar el consentimiento.</p>
      )}

      {!nonAvatarMode && (
        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            className="mt-1"
            {...register("webmTransparent")}
          />
          <span className="text-sm">
            Generar como WebM transparente (solo avatares de estudio)
          </span>
        </label>
      )}

      <div className="flex gap-3">
        <button
          disabled={isSubmitting}
          className="btn-accent disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Generar"}
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="btn-outline hidden md:inline-flex"
        >
          Limpiar
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 rounded-2xl border border-border bg-black/80 text-white px-4 py-3 shadow-lg">
          {toast}
        </div>
      )}
    </form>
  );
}
