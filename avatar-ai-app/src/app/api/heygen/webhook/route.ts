import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import crypto from "crypto";

// Preflight validation: HeyGen hace OPTIONS con timeout de ~1s
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const jobIdFromQuery = searchParams.get("jobId");
  // Lee cuerpo bruto para poder validar la firma HMAC
  const raw = (await req.text().catch(() => "")) || "";
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = {};
  }

  // Verificación de firma (opcional). Configura HEYGEN_WEBHOOK_SECRET con el secreto del endpoint
  const secret = process.env.HEYGEN_WEBHOOK_SECRET;
  const incomingSig =
    req.headers.get("signature") || req.headers.get("Signature") || "";
  if (secret) {
    try {
      const mac = crypto.createHmac("sha256", secret);
      mac.update(raw);
      const computed = mac.digest("hex");
      if (!incomingSig || computed !== incomingSig) {
        return NextResponse.json(
          { ok: false, reason: "invalid signature" },
          { status: 401 }
        );
      }
    } catch {
      return NextResponse.json(
        { ok: false, reason: "signature check failed" },
        { status: 401 }
      );
    }
  }

  // HeyGen webhook v1 examples
  const eventType: string | undefined =
    body?.event_type || body?.type || body?.event;
  const eventData: any = body?.event_data || body?.data || body?.payload || {};

  const status: string | undefined =
    body?.status || eventData?.status || body?.data?.status;
  const taskId: string | undefined =
    body?.task_id || body?.id || body?.data?.task_id || eventData?.task_id;
  const videoId: string | undefined =
    eventData?.video_id || body?.video_id || body?.data?.video_id;
  const translateId: string | undefined =
    eventData?.video_translate_id ||
    body?.video_translate_id ||
    body?.data?.video_translate_id;
  const videoUrl: string | undefined =
    eventData?.url ||
    body?.video_url ||
    body?.result?.video_url ||
    body?.data?.video_url;
  const metaJobId: string | undefined =
    body?.metadata?.jobId || eventData?.callback_id || undefined;
  const errorObj = body?.error || body?.data?.error || eventData?.error;

  const query: any = metaJobId
    ? { _id: metaJobId }
    : jobIdFromQuery
    ? { _id: jobIdFromQuery }
    : taskId
    ? { heygenTaskId: taskId }
    : translateId
    ? { translateTaskId: translateId }
    : videoId
    ? { providerJobId: videoId }
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

  // Explicit mapping for documented event types
  if (eventType === "avatar_video.success") {
    update.status = "done";
    if (eventData?.url) {
      update.resultUrl = eventData.url;
      update.outputUrl = eventData.url;
    }
  } else if (eventType === "avatar_video.fail") {
    update.status = "error";
    update.error = JSON.stringify(eventData || body);
    update.errorMessage = update.error;
  } else if (eventType === "video_translate.success") {
    update.status = "done";
    if (eventData?.url) update.translateUrl = eventData.url;
  } else if (eventType === "video_translate.fail") {
    update.status = "error";
    update.error = JSON.stringify(eventData || body);
    update.errorMessage = update.error;
  }

  await Job.updateOne(query, { $set: update });
  return NextResponse.json({ ok: true });
}
