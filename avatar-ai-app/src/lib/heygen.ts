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
