import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const body = await req.json().catch(() => ({}));
  const {
    title,
    script,
    inputType = "TEXT",
    avatarId,
    voiceId,
    consent,
    assets,
  } = body as Record<string, unknown>;

  if (!title || !script) {
    return NextResponse.json(
      { error: "title/script required" },
      { status: 400 }
    );
  }

  const job = await Job.create({
    userId: String((session.user as any).id),
    title: String(title),
    script: String(script),
    inputType: String(inputType),
    avatarId: avatarId ? String(avatarId) : undefined,
    voiceId: voiceId ? String(voiceId) : undefined,
    consent: Boolean(consent),
    assets: Array.isArray(assets)
      ? (assets as unknown[]).map(String)
      : typeof assets === "string"
      ? (() => {
          try {
            const arr = JSON.parse(assets as string);
            return Array.isArray(arr) ? arr.map(String) : [];
          } catch {
            return [];
          }
        })()
      : [],
    status: "draft",
  });

  return NextResponse.json({ id: job._id.toString(), status: job.status });
}

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const jobs = await Job.find({ userId: String((session.user as any).id) })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ jobs });
}
