import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Job, User } from "@/models";
import { spendCredits } from "@/lib/db-helpers";
import {
  estimateHeygenCreditsForJob,
  vendorUsdCostPerCredit,
  deriveActualCreditsForJob,
} from "@/lib/heygen";
import VendorLedger from "@/models/VendorLedger";
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

  const job = await Job.findOneAndUpdate(
    query,
    { $set: update },
    { new: true }
  );

  if (job && (update.status === "done" || update.status === "error")) {
    const actualCredits = await deriveActualCreditsForJob(job, body, eventData);
    try {
      if (update.status === "error") {
        const estimated =
          Number(job.estimatedCredits) || estimateHeygenCreditsForJob(job);
        await spendCredits(String(job.userId), -estimated, "adjust", {
          jobId: String(job._id),
          stage: "refund_on_error",
          provider: "heygen",
        });
      } else if (update.status === "done") {
        // Adjust from estimated to actual if different
        const estimated =
          Number(job.estimatedCredits) || estimateHeygenCreditsForJob(job);
        const delta = Math.abs(actualCredits) - Math.abs(estimated);
        if (delta !== 0) {
          await spendCredits(
            String(job.userId),
            Math.abs(delta),
            delta > 0 ? "spend" : "adjust",
            {
              jobId: String(job._id),
              stage: "final_adjust",
              provider: "heygen",
            }
          );
        }
        job.actualCredits = Math.abs(actualCredits);
        await job.save();
        const user = await User.findById(job.userId).lean();
        const vendorCost = vendorUsdCostPerCredit() * Math.abs(actualCredits);
        job.vendorCostUsd = vendorCost;
        await job.save();
        await VendorLedger.create({
          userId: (user as any)?._id,
          userEmail: (user as any)?.email,
          userName: (user as any)?.name ?? null,
          type: "consumption",
          vendor: "heygen",
          credits: -Math.abs(actualCredits),
          vendorCostUsd: vendorCost,
          meta: { jobId: String(job._id), stage: "finalize" },
        });
      }
    } catch {}
  }

  return NextResponse.json({ ok: true });
}
