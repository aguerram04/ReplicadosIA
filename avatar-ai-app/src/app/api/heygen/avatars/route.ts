import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenListAvatars } from "@/lib/heygen";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data: any = await heygenListAvatars();
    const items = data?.data?.avatars || data?.avatars || [];
    const avatars = items.map((a: any) => ({
      id: a?.avatar_id || a?.id,
      name: a?.name || a?.avatar_name || a?.id,
      thumbnail: a?.thumbnail_url || a?.cover_image_url || null,
      status: a?.status,
    }));
    return NextResponse.json({ avatars });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list avatars" },
      { status: 500 }
    );
  }
}
