import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenPhotoAvatarGenerate } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const required = [
    "name",
    "age",
    "gender",
    "ethnicity",
    "orientation",
    "pose",
    "style",
    "appearance",
  ];
  for (const k of required) {
    if (!body?.[k])
      return NextResponse.json({ error: `${k} required` }, { status: 400 });
  }
  try {
    const data: any = await heygenPhotoAvatarGenerate(body);
    const generationId = data?.data?.generation_id || data?.generation_id;
    if (!generationId)
      return NextResponse.json(
        { error: "generation_id missing", detail: data },
        { status: 502 }
      );
    return NextResponse.json({ generationId });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "HeyGen error", detail: e?.response?.data },
      { status: 500 }
    );
  }
}
