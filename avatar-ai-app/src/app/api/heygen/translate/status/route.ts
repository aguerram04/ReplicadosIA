import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenTranslateStatus } from "@/lib/heygen";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const jobId = searchParams.get("jobId");

  await connectToDatabase();

  let job: any = null;
  let translateId = id || "";
  if (!translateId) {
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
    translateId = job.translateTaskId || "";
    if (!translateId)
      return NextResponse.json(
        { error: "translateTaskId missing" },
        { status: 400 }
      );
  }

  try {
    const resp = await heygenTranslateStatus(translateId);
    const data: any = (resp as any)?.data || resp;
    const status: string = data?.status || "";
    // Try multiple shapes for translated video url returned by v2
    let videoUrl: string | undefined =
      data?.video_url ||
      data?.result?.video_url ||
      (Array.isArray(data?.translated_urls)
        ? data.translated_urls[0]
        : undefined) ||
      (Array.isArray(data?.output_urls) ? data.output_urls[0] : undefined) ||
      (Array.isArray(data?.outputs)
        ? data.outputs.find((u: any) => typeof u === "string")
        : undefined) ||
      (typeof data?.url === "string" ? data.url : undefined);

    if (jobId) {
      const update: any = {};
      if (status?.toLowerCase().includes("fail")) update.status = "error";
      else if (
        status?.toLowerCase().includes("pending") ||
        status?.toLowerCase().includes("running")
      )
        update.status = "processing";
      else if (
        status?.toLowerCase().includes("success") ||
        status?.toLowerCase().includes("completed") ||
        videoUrl
      )
        update.status = "done";
      if (videoUrl) update.translateUrl = videoUrl;
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
