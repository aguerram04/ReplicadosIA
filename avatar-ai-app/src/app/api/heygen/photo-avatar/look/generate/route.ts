import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenPhotoAvatarLookGenerate } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const required = ["group_id", "prompt", "orientation", "pose", "style"];
  for (const k of required) {
    if (!body?.[k])
      return NextResponse.json({ error: `${k} required` }, { status: 400 });
  }
  try {
    const data: any = await heygenPhotoAvatarLookGenerate(body);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "HeyGen error", detail: e?.response?.data },
      { status: 500 }
    );
  }
}
