import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenVideoStatus } from "@/lib/heygen";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const jobId = searchParams.get("jobId");

  await connectToDatabase();

  let job: any = null;
  let videoId = id || "";
  if (!videoId) {
    if (!jobId)
      return NextResponse.json(
        { error: "id or jobId required" },
        { status: 400 }
      );
    job = await Job.findOne({
      _id: jobId,
      userId: String(session.user.id),
    }).lean();
    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    videoId = (job as any).providerJobId || "";
    if (!videoId)
      return NextResponse.json(
        { error: "providerJobId missing" },
        { status: 400 }
      );
  }

  try {
    const resp = await heygenVideoStatus(videoId);
    const data: any = (resp as any)?.data || resp;
    const status: string = data?.status || "";
    const videoUrl: string | undefined = data?.video_url;

    if (jobId) {
      const update: any = {};
      if (/fail|error/i.test(status)) update.status = "error";
      else if (/pending|running|processing|queued/i.test(status))
        update.status = "processing";
      else if (/success|completed|done/i.test(status) || videoUrl)
        update.status = "done";
      if (videoUrl) update.resultUrl = videoUrl;
      if (Object.keys(update).length)
        await Job.updateOne({ _id: jobId }, { $set: update });
    }
    return NextResponse.json({ status, videoUrl });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Status error" },
      { status: 500 }
    );
  }
}
