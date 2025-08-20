import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenCreateVideoJob } from "@/lib/heygen";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const job = await Job.findOne({
    _id: params.id,
    userId: String(session.user.id),
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "";
  if (!baseUrl)
    return NextResponse.json({ error: "Base URL missing" }, { status: 500 });

  try {
    job.status = "queued";
    await job.save();

    const resp = await heygenCreateVideoJob({
      avatar_id: job.avatarId,
      voice_id: job.voiceId,
      script: job.script,
      assets: job.mediaUrls?.length ? job.mediaUrls : job.assets,
      callback_url: `${baseUrl}/api/heygen/webhook?jobId=${job._id.toString()}`,
    });
    const providerId = resp?.data?.video_id || "";
    job.providerJobId = providerId;
    job.status = providerId ? "processing" : "queued";
    await job.save();
    return NextResponse.json({
      id: job._id.toString(),
      providerJobId: providerId,
      status: job.status,
    });
  } catch (e: any) {
    job.status = "error";
    job.error = e?.message || String(e);
    await job.save();
    return NextResponse.json({ error: job.error }, { status: 500 });
  }
}
