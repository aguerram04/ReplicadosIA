import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { heygenListTemplates, heygenListTemplatesLibrary } from "@/lib/heygen";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(req.url);
    const useLibrary = url.searchParams.get("library") === "true";
    const data: any = useLibrary
      ? await heygenListTemplatesLibrary()
      : await heygenListTemplates();
    const items = data?.data?.templates || data?.templates || [];
    if (useLibrary && items.length === 0) {
      return NextResponse.json(
        { error: "HeyGen Library no disponible para tu cuenta/plan" },
        { status: 404 }
      );
    }
    const templates = items.map((t: any) => ({
      id: t?.template_id || t?.id,
      name: t?.name || t?.title || t?.id,
    }));
    return NextResponse.json({ templates });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to list templates" },
      { status: 500 }
    );
  }
}
