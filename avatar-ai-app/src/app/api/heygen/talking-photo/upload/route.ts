import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenUploadTalkingPhotoFromUrl } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { imageUrl } = (await req.json().catch(() => ({}))) as {
    imageUrl?: string;
  };
  if (!imageUrl)
    return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  try {
    const data: any = await heygenUploadTalkingPhotoFromUrl(String(imageUrl));
    const talking_photo_id =
      data?.data?.talking_photo_id || data?.talking_photo_id || null;
    if (!talking_photo_id)
      return NextResponse.json(
        { error: "No talking_photo_id in response", detail: data },
        { status: 502 }
      );
    return NextResponse.json({ talking_photo_id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
