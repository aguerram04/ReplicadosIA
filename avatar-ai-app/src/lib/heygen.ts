import axios from "axios";

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY as string;
if (!HEYGEN_API_KEY) throw new Error("Falta HEYGEN_API_KEY");

export const heygen = axios.create({
  baseURL: "https://api.heygen.com/v1",
  headers: {
    Authorization: `Bearer ${HEYGEN_API_KEY}`,
    "Content-Type": "application/json",
  },
});

export type CreateVideoPayload = {
  avatar_id?: string;
  voice_id?: string;
  script: string;
  callback_url: string;
  assets?: string[];
};

export async function heygenCreateVideoJob(payload: CreateVideoPayload) {
  const { data } = await heygen.post("/video.create", payload);
  return data as { data?: { video_id?: string } };
}
