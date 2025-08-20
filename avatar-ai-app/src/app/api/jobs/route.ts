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

  const {
    title,
    script,
    inputType = "TEXT",
    avatarId,
    voiceId,
    consent,
    mediaUrls = [],
  } = (await req.json()) as any;

  if (!title || !script) {
    return NextResponse.json(
      { error: "title/script required" },
      { status: 400 }
    );
  }

  const mediaList = Array.isArray(mediaUrls)
    ? (mediaUrls as unknown[]).map(String)
    : typeof mediaUrls === "string"
    ? [String(mediaUrls)]
    : [];

  const job = await Job.create({
    userId: String((session.user as any).id),
    title: String(title),
    script: String(script),
    inputType: String(inputType),
    avatarId: avatarId ? String(avatarId) : undefined,
    voiceId: voiceId ? String(voiceId) : undefined,
    consent: Boolean(consent),
    mediaUrls: mediaList,
    assets: mediaList,
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
