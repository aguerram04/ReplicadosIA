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
      language: v?.language || v?.locale || null,
      gender: v?.gender || null,
    }));
    return NextResponse.json({ voices });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list voices" },
      { status: 500 }
    );
  }
}
