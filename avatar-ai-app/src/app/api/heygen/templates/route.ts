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
    let data: any;
    if (useLibrary) {
      try {
        data = await heygenListTemplatesLibrary();
      } catch (err: any) {
        const status = err?.response?.status || 500;
        const detail = err?.response?.data || err?.message;
        // Fallback: si falla la librería, intenta las plantillas normales
        try {
          const fallback = await heygenListTemplates();
          const raw: any = fallback as any;
          const items = raw?.data?.templates || raw?.templates || [];
          return NextResponse.json(
            {
              templates: items.map((t: any) => ({
                id: t?.template_id || t?.id,
                name: t?.name || t?.title || t?.id,
              })),
              warning: { source: "library", status, detail },
            },
            { status: 200 }
          );
        } catch {
          return NextResponse.json(
            { error: "HeyGen library error", detail, status },
            { status }
          );
        }
      }
    } else {
      data = await heygenListTemplates();
    }
    const rawAny: any = data as any;
    const items = rawAny?.data?.templates || rawAny?.templates || [];
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
      {
        error: e?.message || "Failed to list templates",
        detail: e?.response?.data,
      },
      { status: 500 }
    );
  }
}
