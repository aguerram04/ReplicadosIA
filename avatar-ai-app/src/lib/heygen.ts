import axios from "axios";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY as string;
if (!HEYGEN_API_KEY) throw new Error("Falta HEYGEN_API_KEY");

export const heygen = axios.create({
  baseURL: "https://api.heygen.com",
  headers: {
    "x-api-key": HEYGEN_API_KEY,
    "Content-Type": "application/json",
    accept: "application/json",
  },
});

// v1 create avatar video (mantenemos por compatibilidad)
export type CreateVideoPayload = {
  avatar_id?: string;
  voice_id?: string;
  script: string;
  callback_url: string;
  assets?: string[];
};

export async function heygenCreateVideoJob(payload: CreateVideoPayload) {
  const { data } = await heygen.post("/v1/video.create", payload);
  return data as { data?: { video_id?: string } };
}

// v2 translate helpers
export async function heygenListTranslateLanguages() {
  const { data } = await heygen.get("/v2/video_translate/target_languages");
  return data as { data?: { languages?: string[] } };
}

export async function heygenTranslateCreate(params: {
  video_url: string;
  output_language?: string;
  output_languages?: string[];
  title?: string;
}) {
  const { data } = await heygen.post("/v2/video_translate", params);
  return data as { data?: { video_translate_id?: string } };
}

export async function heygenTranslateStatus(id: string) {
  const { data } = await heygen.get(`/v2/video_translate/${id}`);
  return data as { data?: { status?: string; video_url?: string } };
}

// v2 avatar video generate
export async function heygenVideoGenerate(payload: any) {
  const { data } = await heygen.post("/v2/video/generate", payload);
  return data as { data?: { video_id?: string } };
}

// v1 status API (still used for video status)
export async function heygenVideoStatus(videoId: string) {
  const { data } = await heygen.get(`/v1/video_status.get`, {
    params: { video_id: videoId },
  });
  return data as { data?: { status?: string; video_url?: string } };
}

// v2 list avatars (for selector)
export async function heygenListAvatars() {
  const { data } = await heygen.get("/v2/avatars");
  return data as { data?: any };
}
