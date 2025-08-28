import { NextResponse } from "next/server";
import { env } from "@/config/env";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const parsed = new URL(url);
    if (parsed.protocol !== "https:") {
      return NextResponse.json({ error: "Invalid protocol" }, { status: 400 });
    }

    const upstream = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": env.HEYGEN_API_KEY,
        accept: "image/*",
      } as any,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error ${upstream.status}` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") || "image/jpeg";
    const contentLength = upstream.headers.get("content-length") || undefined;
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(contentLength ? { "Content-Length": contentLength } : {}),
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed to proxy avatar image" },
      { status: 500 }
    );
  }
}
