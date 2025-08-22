import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenTranslateCreate } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, videoUrl, sourceLang, targetLang } = (await req
    .json()
    .catch(() => ({}))) as any;
  if (!jobId && !videoUrl) {
    return NextResponse.json(
      { error: "jobId or videoUrl required" },
      { status: 400 }
    );
  }

  await connectToDatabase();
  const job = jobId
    ? await Job.findOne({ _id: jobId, userId: String(session.user.id) })
    : await Job.create({
        userId: String(session.user.id),
        title: `Translate ${new Date().toISOString()}`,
        script: "", // not used for translate
        inputType: "VIDEO",
        mediaUrls: [String(videoUrl)],
        status: "draft",
      });
  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const baseUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL || "";
  if (!baseUrl)
    return NextResponse.json({ error: "Base URL missing" }, { status: 500 });

  try {
    const payload = {
      video_url: String((job.mediaUrls && job.mediaUrls[0]) || videoUrl),
      output_language: String(targetLang || job.targetLang || "en"),
      title: job.title || "Translate",
    };
    const resp = await heygenTranslateCreate(payload);
    const taskId =
      // v2 returns data.video_translate_id
      (resp as any)?.data?.video_translate_id ||
      (resp as any)?.video_translate_id;
    job.sourceLang = sourceLang || job.sourceLang || "auto";
    job.targetLang = payload.output_language;
    job.translateTaskId = taskId;
    job.status = "queued";
    await job.save();
    return NextResponse.json({ ok: true, taskId, jobId: job._id.toString() });
  } catch (e: any) {
    job.status = "error";
    job.errorMessage = e?.message || "HeyGen translate error";
    await job.save();
    return NextResponse.json(
      { error: "HeyGen API error", detail: e?.response?.data || e?.message },
      { status: 500 }
    );
  }
}
