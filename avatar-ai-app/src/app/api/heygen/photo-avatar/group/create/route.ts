import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenPhotoAvatarGroupCreate } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body?.name || !body?.image_key)
    return NextResponse.json(
      { error: "name and image_key required" },
      { status: 400 }
    );

  try {
    const data: any = await heygenPhotoAvatarGroupCreate(body);
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "HeyGen error", detail: e?.response?.data },
      { status: 500 }
    );
  }
}
