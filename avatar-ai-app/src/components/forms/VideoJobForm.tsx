"use client";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useState } from "react";
import MediaUploader from "@/components/uploads/MediaUploader";

type InputType = "TEXT" | "IMAGE" | "AUDIO" | "VIDEO";
type FormValues = {
  title: string;
  script: string;
  inputType: InputType;
  avatarId?: string;
  voiceId?: string;
  consent: boolean;
  assets?: string[];
  mediaUrls?: string[];
};

export default function VideoJobForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { title: "", script: "", inputType: "TEXT", consent: false },
  });

  const inputType = watch("inputType");
  const [media, setMedia] = useState<string[]>([]);
  function handleAdd(urls: string[]) {
    setMedia((prev) => [...prev, ...urls]);
  }
  function removeAt(i: number) {
    setMedia((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(data: FormValues) {
    try {
      const res = await axios.post("/api/jobs", { ...data, mediaUrls: media });
      alert("Solicitud creada: " + res.data?.id);
      setMedia([]);
      reset();
    } catch (e: any) {
      alert(e?.response?.data?.error || "Error creando la solicitud");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm mb-1">Título</label>
        <input
          className="w-full rounded-2xl border border-border bg-transparent p-3"
          {...register("title", { required: "El título es obligatorio" })}
        />
        {errors.title && (
          <p className="text-sm text-red-400">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <label className="block text-sm">
          Archivos (imágenes, audio, video, cámara)
        </label>
        <MediaUploader onAdd={handleAdd} />
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

      <div>
        <label className="block text-sm mb-1">Guión</label>
        <textarea
          className="w-full rounded-2xl border border-border bg-transparent p-3 min-h-[140px]"
          {...register("script", { required: "El guión es obligatorio" })}
        />
        {errors.script && (
          <p className="text-sm text-red-400">{errors.script.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm mb-2">Tipo de entrada</label>
        <div className="grid grid-cols-2 gap-2">
          {(["TEXT", "IMAGE", "AUDIO", "VIDEO"] as InputType[]).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-2xl border px-3 py-2 text-center ${
                inputType === t ? "border-foreground" : "border-border"
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
        <p className="text-xs opacity-70 mt-1">
          Los archivos se subirán en el Paso 6.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Avatar ID (HeyGen)</label>
          <input
            className="w-full rounded-2xl border border-border bg-transparent p-3"
            placeholder="ej. avatar_123"
            {...register("avatarId")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Voice ID (opcional)</label>
          <input
            className="w-full rounded-2xl border border-border bg-transparent p-3"
            placeholder="ej. voice_abc"
            {...register("voiceId")}
          />
        </div>
      </div>

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

      <div className="flex gap-3">
        <button
          disabled={isSubmitting}
          className="btn-primary disabled:opacity-60"
        >
          {isSubmitting ? "Enviando..." : "Crear solicitud"}
        </button>
        <button type="button" onClick={() => reset()} className="btn-outline">
          Limpiar
        </button>
      </div>
    </form>
  );
}
