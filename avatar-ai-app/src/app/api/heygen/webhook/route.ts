import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";

export async function POST(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const jobIdFromQuery = searchParams.get("jobId");

  const body = (await req.json().catch(() => ({}))) as any;
  const status: string | undefined =
    body?.status || body?.event || body?.data?.status;
  const taskId: string | undefined =
    body?.task_id || body?.id || body?.data?.task_id;
  const videoUrl: string | undefined =
    body?.video_url || body?.result?.video_url || body?.data?.video_url;
  const metaJobId: string | undefined = body?.metadata?.jobId;
  const errorObj = body?.error || body?.data?.error;

  const query: any = metaJobId
    ? { _id: metaJobId }
    : jobIdFromQuery
    ? { _id: jobIdFromQuery }
    : taskId
    ? { heygenTaskId: taskId }
    : null;
  if (!query) return NextResponse.json({ ok: false, reason: "no identifier" });

  const update: any = {};
  if (status?.toString().includes("process") || status === "queued") {
    update.status = "processing";
  }
  if (status === "finished" || status === "completed" || videoUrl) {
    update.status = "done";
    if (videoUrl) {
      update.resultUrl = videoUrl;
      update.outputUrl = videoUrl;
    }
  }
  if (status === "failed" || status === "error" || errorObj) {
    update.status = "error";
    update.error =
      typeof errorObj === "string"
        ? errorObj
        : JSON.stringify(errorObj || body);
    update.errorMessage = update.error;
  }

  await Job.updateOne(query, { $set: update });
  return NextResponse.json({ ok: true });
}
