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

// Fetch account API credits/balance if HeyGen exposes it. Returns null if unknown
export async function heygenGetApiCreditsBalance(): Promise<number | null> {
  try {
    // Attempt 1: hypothetical balance endpoint (subject to change)
    const r1 = await heygen.get("/v1/credits/balance");
    const fromR1 =
      (r1 as any)?.data?.data?.credits ?? (r1 as any)?.data?.credits;
    if (typeof fromR1 === "number") return fromR1;
  } catch {}
  try {
    // Attempt 2: alternative path used by some tenants
    const r2 = await heygen.get("/v2/credits/balance");
    const fromR2 =
      (r2 as any)?.data?.data?.credits ?? (r2 as any)?.data?.credits;
    if (typeof fromR2 === "number") return fromR2;
  } catch {}
  try {
    // Optional override via env for manual display
    const override = process.env.HEYGEN_BALANCE_OVERRIDE;
    if (override && !Number.isNaN(Number(override))) return Number(override);
  } catch {}
  return null;
}

// Business rules: estimate credits to spend for a HeyGen job
export function estimateHeygenCreditsForJob(_job?: any): number {
  const fromEnv = Number(process.env.HEYGEN_COST_CREDITS_PER_JOB || "10");
  return Number.isFinite(fromEnv) && fromEnv > 0 ? Math.floor(fromEnv) : 10;
}

export function vendorUsdCostPerCredit(): number {
  const v = Number(process.env.HEYGEN_VENDOR_COST_USD_PER_CREDIT || "0");
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

export function computeCreditsFromDurationSec(durationSeconds: number): number {
  const n = Math.ceil(Number(durationSeconds || 0) / 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseMaybeNumber(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function estimateCreditsFromResolution(job: any): number {
  const width = Number((job as any)?.width) || 1280;
  const height = Number((job as any)?.height) || 720;
  const p720 = Number(process.env.HEYGEN_COST_CREDITS_720P || "10");
  const p1080 = Number(process.env.HEYGEN_COST_CREDITS_1080P || "15");
  const p4k = Number(process.env.HEYGEN_COST_CREDITS_4K || "25");
  if (width >= 3800 || height >= 2100) return p4k;
  if (width >= 1900 || height >= 1000) return p1080;
  return p720;
}

// Tries multiple sources to determine actual credits used once a job finishes
export async function deriveActualCreditsForJob(
  job: any,
  body?: any,
  eventData?: any
): Promise<number> {
  // 1) Prefer exact duration from webhook payload
  const directDur =
    parseMaybeNumber(eventData?.duration_seconds) ||
    parseMaybeNumber(eventData?.duration) ||
    parseMaybeNumber(eventData?.meta?.duration) ||
    parseMaybeNumber(body?.duration_seconds) ||
    parseMaybeNumber(body?.duration);
  if (directDur) return computeCreditsFromDurationSec(directDur);

  // 2) Try querying status API by provider video id
  const providerId = (job as any)?.providerJobId;
  if (providerId) {
    try {
      const s: any = await heygenVideoStatus(providerId);
      const data = s?.data || s;
      const dur =
        parseMaybeNumber(data?.duration_seconds) ||
        parseMaybeNumber(data?.duration) ||
        parseMaybeNumber(data?.meta?.duration);
      if (dur) return computeCreditsFromDurationSec(dur);
    } catch {}
  }

  // 3) Fall back to resolution-based heuristic
  const resEst = estimateCreditsFromResolution(job);
  if (resEst) return resEst;

  // 4) Final fallback to general estimate
  return estimateHeygenCreditsForJob(job);
}

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

// Upload talking photo (binary) using HeyGen upload endpoint
export async function heygenUploadTalkingPhotoFromUrl(imageUrl: string) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) {
    throw new Error(`No se pudo descargar la imagen (${resp.status})`);
  }
  const contentType = resp.headers.get("content-type") || "image/jpeg";
  const arrayBuf = await resp.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);
  const { data } = await heygen.post("/v1/talking_photo", buffer, {
    baseURL: "https://upload.heygen.com",
    headers: { "Content-Type": contentType },
  } as any);
  return data as { data?: { talking_photo_id?: string } };
}

// v2 list voices
export async function heygenListVoices() {
  const { data } = await heygen.get("/v2/voices");
  return data as { data?: any };
}

// v1 transparent webm generation
export async function heygenGenerateWebm(payload: {
  avatar_pose_id: string;
  avatar_style?: string;
  input_text: string;
  voice_id: string;
}) {
  const { data } = await heygen.post("/v1/video.webm", payload);
  return data as { data?: { video_id?: string } };
}

// Template API helpers (v2)
export async function heygenListTemplates() {
  const { data } = await heygen.get("/v2/templates");
  return data as { data?: any };
}

export async function heygenGetTemplate(templateId: string) {
  const { data } = await heygen.get(`/v2/template/${templateId}`);
  return data as { data?: any };
}

export async function heygenTemplateGenerate(templateId: string, body: any) {
  const { data } = await heygen.post(
    `/v2/template/${templateId}/generate`,
    body
  );
  return data as { data?: { video_id?: string } };
}

// Optional: list templates from HeyGen library (no fallback)
export async function heygenListTemplatesLibrary() {
  const { data } = await heygen.get("/v2/templates/library");
  return data as { data?: any };
}

// AI Avatar Photos (v2)
export async function heygenPhotoAvatarGenerate(payload: {
  name: string;
  age: string;
  gender: string;
  ethnicity: string;
  orientation: string; // horizontal | vertical
  pose: string; // e.g., half_body
  style: string; // e.g., Realistic
  appearance: string; // prompt-like description
}) {
  const { data } = await heygen.post(
    "/v2/photo_avatar/photo/generate",
    payload
  );
  return data as { data?: { generation_id?: string } };
}

export async function heygenPhotoAvatarGenerationStatus(generationId: string) {
  const { data } = await heygen.get(
    `/v2/photo_avatar/generation/${generationId}`
  );
  return data as { data?: any };
}

// Photo Avatar Groups: create/add looks, train, status, look generate
export async function heygenPhotoAvatarGroupCreate(payload: {
  name: string;
  image_key: string; // from generation or asset upload
  generation_id?: string;
}) {
  const { data } = await heygen.post(
    "/v2/photo_avatar/avatar_group/create",
    payload
  );
  return data as { data?: { group_id?: string } };
}

export async function heygenPhotoAvatarGroupAdd(payload: {
  group_id: string;
  image_keys: string[];
  name?: string;
}) {
  const { data } = await heygen.post(
    "/v2/photo_avatar/avatar_group/add",
    payload
  );
  return data as { data?: any };
}

export async function heygenPhotoAvatarTrain(payload: { group_id: string }) {
  const { data } = await heygen.post("/v2/photo_avatar/train", payload);
  return data as { data?: { train_id?: string } };
}

export async function heygenPhotoAvatarTrainStatus(trainId: string) {
  const { data } = await heygen.get(`/v2/photo_avatar/train/status/${trainId}`);
  return data as { data?: any };
}

export async function heygenPhotoAvatarLookGenerate(payload: {
  group_id: string;
  prompt: string;
  orientation: string;
  pose: string;
  style: string;
}) {
  const { data } = await heygen.post("/v2/photo_avatar/look/generate", payload);
  return data as { data?: { generation_id?: string } };
}

// Motion and Sound Effects for Photo Avatar
export async function heygenPhotoAvatarAddMotion(id: string) {
  const { data } = await heygen.post("/v2/photo_avatar/add_motion", { id });
  return data as { data?: any };
}

export async function heygenPhotoAvatarAddSoundEffect(id: string) {
  const { data } = await heygen.post("/v2/photo_avatar/add_sound_effect", {
    id,
  });
  return data as { data?: any };
}

export async function heygenPhotoAvatarStatus(id: string) {
  const { data } = await heygen.get(`/v2/photo_avatar/${id}`);
  return data as { data?: any };
}

// List Photo Avatar Groups and Avatars (looks)
export async function heygenListAvatarGroups() {
  const { data } = await heygen.get(`/v2/avatar_group.list`);
  return data as { data?: any };
}

export async function heygenListAvatarsInGroup(groupId: string) {
  const { data } = await heygen.get(`/v2/avatar_group/${groupId}/avatars`);
  return data as { data?: any };
}
