import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  heygenListAvatars,
  heygenListAvatarGroups,
  heygenListAvatarsInGroup,
} from "@/lib/heygen";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data: any = await heygenListAvatars();
    const items = data?.data?.avatars || data?.avatars || [];

    // Build base list
    const avatars = items.map((a: any) => ({
      id: a?.avatar_id || a?.id,
      name: a?.name || a?.avatar_name || a?.id,
      // Try multiple possible fields HeyGen may use
      thumbnail:
        a?.thumbnail_url ||
        a?.cover_image_url ||
        a?.portrait_url ||
        a?.image_url ||
        a?.preview_url ||
        null,
      // Also include preview_url explicitly for clients using that key
      preview_url:
        a?.preview_url ||
        a?.cover_image_url ||
        a?.portrait_url ||
        a?.image_url ||
        a?.thumbnail_url ||
        null,
      status: a?.status,
    }));

    // Fallback: enrich with avatar group previews if base list lacks images
    try {
      const groupResp: any = await heygenListAvatarGroups();
      const groups =
        groupResp?.data?.avatar_groups ||
        groupResp?.data ||
        groupResp?.groups ||
        [];
      const idToPreview = new Map<
        string,
        { thumb?: string; preview?: string }
      >();

      for (const g of groups) {
        const gid = g?.group_id || g?.id;
        if (!gid) continue;
        try {
          const ga: any = await heygenListAvatarsInGroup(String(gid));
          const arr = ga?.data?.avatars || ga?.avatars || [];
          for (const a of arr) {
            const aid = a?.avatar_id || a?.id;
            if (!aid) continue;
            const thumb =
              a?.thumbnail_url ||
              a?.cover_image_url ||
              a?.portrait_url ||
              a?.image_url ||
              null;
            const prev = a?.preview_url || thumb || null;
            if (thumb || prev)
              idToPreview.set(String(aid), {
                thumb: thumb || undefined,
                preview: prev || undefined,
              });
          }
        } catch {}
      }

      // Merge into base avatars when missing
      for (const a of avatars) {
        if (!a.thumbnail && !a.preview_url) {
          const extra = idToPreview.get(String(a.id));
          if (extra) {
            a.thumbnail = extra.thumb || extra.preview || a.thumbnail;
            a.preview_url = extra.preview || extra.thumb || a.preview_url;
          }
        }
      }
    } catch {}
    return NextResponse.json({ avatars });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list avatars" },
      { status: 500 }
    );
  }
}
