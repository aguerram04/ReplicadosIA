import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    // Basic safeguard: only allow https
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    const upstream = await fetch(url, {
      // Forward as-is; samples are typically public
      method: "GET",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "audio/mpeg";
    const contentLength = upstream.headers.get("content-length") || undefined;

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy sample" },
      { status: 500 }
    );
  }
}
