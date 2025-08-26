import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygen } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = (await req.json().catch(() => ({} as any))) as {
    jobId?: string;
  };
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  await connectToDatabase();
  const job = await Job.findOne({
    _id: jobId,
    userId: String(session.user.id),
  });
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (!baseUrl) {
    return NextResponse.json({ error: "Base URL missing" }, { status: 500 });
  }
  const webhook_url = `${baseUrl}/api/heygen/webhook?jobId=${job._id.toString()}`;

  const payload: any = {
    script: job.script,
    avatar_id: job.avatarId,
    voice_id: job.voiceId || undefined,
    webhook_url,
    metadata: { jobId: String(job._id), userId: job.userId },
  };

  try {
    const { data } = await heygen.post("/video.generate", payload);
    const taskId = data?.data?.task_id || data?.task_id || data?.id;
    await Job.updateOne(
      { _id: job._id },
      { $set: { status: "queued", heygenTaskId: taskId } }
    );
    return NextResponse.json({ ok: true, taskId });
  } catch (e: any) {
    await Job.updateOne(
      { _id: job._id },
      { $set: { status: "error", errorMessage: e?.message || "HeyGen error" } }
    );
    return NextResponse.json(
      {
        error: "ReplicadosIA api Error",
        detail: e?.response?.data || e?.message,
      },
      { status: 500 }
    );
  }
}
