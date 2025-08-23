import { NextResponse } from "next/server";
// @ts-ignore - archiver has no types in this project
import archiver from "archiver";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { urls, filename } = (await req.json().catch(() => ({}))) as {
    urls?: string[];
    filename?: string;
  };
  if (!Array.isArray(urls) || urls.length === 0)
    return NextResponse.json({ error: "urls required" }, { status: 400 });

  const zipName =
    (filename || "images").replace(/[^a-zA-Z0-9_-]+/g, "_") + ".zip";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const archive: any = archiver("zip", { zlib: { level: 9 } });
      archive.on("data", (chunk: any) =>
        controller.enqueue(new Uint8Array(chunk))
      );
      archive.on("end", () => controller.close());
      archive.on("error", (err: any) => controller.error(err));

      (async () => {
        for (let i = 0; i < urls.length; i++) {
          const u = urls[i];
          try {
            const res = await fetch(u);
            if (!res.ok) continue;
            const buf = Buffer.from(await res.arrayBuffer());
            const ext = u.split("?")[0].split(".").pop() || "jpg";
            archive.append(buf, { name: `image_${i + 1}.${ext}` });
          } catch {}
        }
        archive.finalize();
      })();
    },
  });

  return new NextResponse(stream as any, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename=${zipName}`,
    },
  });
}
