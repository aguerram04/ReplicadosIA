import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenGenerateWebm } from "@/lib/heygen";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const job = await Job.findOne({
    _id: params.id,
    userId: String(session.user.id),
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!job.avatarId || !job.voiceId || !job.script) {
    return NextResponse.json(
      { error: "Se requieren avatarId, voiceId y script" },
      { status: 400 }
    );
  }

  try {
    const payload = {
      avatar_pose_id: job.avatarId, // For studio avatars, avatarId should be a pose ID
      avatar_style: "normal",
      input_text: job.script,
      voice_id: job.voiceId,
    };
    const r: any = await heygenGenerateWebm(payload);
    const providerId = r?.data?.video_id || r?.video_id || "";
    if (!providerId) {
      job.status = "error";
      job.error = JSON.stringify(r);
      await job.save();
      return NextResponse.json(
        { error: "HeyGen no devolvió video_id", detail: r },
        { status: 502 }
      );
    }
    job.providerJobId = providerId;
    job.status = "queued";
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
