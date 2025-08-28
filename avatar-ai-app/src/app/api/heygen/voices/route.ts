import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenListVoices } from "@/lib/heygen";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data: any = await heygenListVoices();
    const items = data?.data?.voices || data?.voices || [];
    const voices = items.map((v: any) => ({
      id: v?.voice_id || v?.id,
      name: v?.name || v?.voice_name || v?.id,
      language: v?.language || v?.language_code || v?.locale || v?.lang || null,
      gender: v?.gender || null,
      sample_url:
        v?.sample_url ||
        v?.preview_url ||
        v?.voice_preview_url ||
        v?.voice_sample_url ||
        v?.audio?.preview_url ||
        v?.audio_preview_url ||
        v?.audio_url ||
        null,
      accents: v?.accents || v?.accent || v?.styles || null,
    }));
    const languages = Array.from(
      new Set(
        voices
          .map((v: any) => (v.language ? String(v.language) : ""))
          .filter((s: string) => s && s !== "null")
      )
    ).sort();
    return NextResponse.json({ voices, languages });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list voices" },
      { status: 500 }
    );
  }
}
