import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job, User } from "@/models";
import {
  heygenVideoGenerate,
  heygenVideoStatus,
  estimateHeygenCreditsForJob,
  vendorUsdCostPerCredit,
} from "@/lib/heygen";
import { spendCredits, addCredits } from "@/lib/db-helpers";
import VendorLedger from "@/models/VendorLedger";

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

  // Validate required fields for generation
  if (!job.avatarId) {
    return NextResponse.json(
      { error: "Falta Avatar ID para generar el video" },
      { status: 400 }
    );
  }
  if (!job.script || !job.script.trim()) {
    return NextResponse.json(
      { error: "Falta el guión (script) para generar el video" },
      { status: 400 }
    );
  }

  try {
    // Pre-deduct estimated credits
    const creditsToSpend = estimateHeygenCreditsForJob(job);
    const user = await User.findById(String(session.user.id)).lean();
    if (!user || (user as any).credits < creditsToSpend) {
      return NextResponse.json(
        { error: "Créditos insuficientes" },
        { status: 402 }
      );
    }
    await spendCredits(String(session.user.id), creditsToSpend, "spend", {
      jobId: String(job._id),
      stage: "pre_deduct",
      provider: "heygen",
    });
    job.estimatedCredits = creditsToSpend;
    // Record vendor consumption estimate (optional vendor cost)
    const vendorCost = vendorUsdCostPerCredit() * creditsToSpend;
    try {
      await VendorLedger.create({
        userId: (user as any)?._id,
        userEmail: (user as any)?.email,
        userName: (user as any)?.name ?? null,
        type: "consumption",
        vendor: "heygen",
        credits: -Math.abs(creditsToSpend),
        vendorCostUsd: vendorCost,
        meta: { jobId: String(job._id), stage: "pre_deduct" },
      });
    } catch {}
    // Build background block if configured
    let background: any = undefined;
    const bgType = (job as any).backgroundType as
      | "none"
      | "color"
      | "image"
      | "video"
      | undefined;
    if (bgType && bgType !== "none") {
      if (bgType === "color" && (job as any).backgroundColor) {
        background = { type: "color", value: (job as any).backgroundColor };
      } else if (bgType === "image" && (job as any).backgroundImageUrl) {
        background = { type: "image", url: (job as any).backgroundImageUrl };
      } else if (bgType === "video" && (job as any).backgroundVideoUrl) {
        background = {
          type: "video",
          url: (job as any).backgroundVideoUrl,
          play_style: (job as any).backgroundPlayStyle || undefined,
        };
      }
    }

    // Build v2 generate payload
    const payload: any = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: job.avatarId,
            avatar_style: "normal",
          },
          voice:
            (job as any).mediaUrls && (job as any).mediaUrls.length > 0
              ? {
                  type: "audio",
                  url:
                    (job as any).mediaUrls.find((u: string) =>
                      /\.(mp3|wav|m4a|aac)$/i.test(u)
                    ) || (job as any).mediaUrls[0],
                }
              : job.script
              ? {
                  type: "text",
                  input_text: job.script,
                  voice_id: job.voiceId,
                  speed:
                    typeof (job as any).voiceSpeed === "number"
                      ? (job as any).voiceSpeed
                      : 1.0,
                }
              : undefined,
          background,
        },
      ],
      dimension: {
        width:
          typeof (job as any).width === "number" ? (job as any).width : 1280,
        height:
          typeof (job as any).height === "number" ? (job as any).height : 720,
      },
    };

    const gen = await heygenVideoGenerate(payload);
    const providerId = (gen as any)?.data?.video_id || "";
    if (!providerId) {
      job.status = "error";
      job.error = JSON.stringify(gen);
      await job.save();
      return NextResponse.json(
        { error: "HeyGen no devolvió video_id", detail: gen },
        { status: 502 }
      );
    }
    job.providerJobId = providerId;
    job.status = "queued";
    await job.save();

    // Optional immediate status check to move from queued -> processing
    if (providerId) {
      try {
        const statusResp: any = await heygenVideoStatus(providerId);
        const data = statusResp?.data || statusResp;
        const st: string | undefined = data?.status;
        if (st && /pending|running|processing/i.test(st)) {
          job.status = "processing";
          await job.save();
        }
      } catch {
        // ignore immediate status errors
      }
    }

    return NextResponse.json({
      id: job._id.toString(),
      providerJobId: providerId,
      status: job.status,
      estimatedCredits: job.estimatedCredits,
    });
  } catch (e: any) {
    // Refund if generation failed
    try {
      const creditsToRefund = estimateHeygenCreditsForJob(job);
      await addCredits(String(session.user.id), creditsToRefund, "adjust", {
        jobId: String(job._id),
        stage: "refund_on_error",
        provider: "heygen",
      });
    } catch {}
    const apiDetail = e?.response?.data || e?.data;
    job.status = "error";
    job.error =
      apiDetail?.error?.message ||
      apiDetail?.message ||
      e?.message ||
      String(e);
    await job.save();
    return NextResponse.json(
      { error: job.error, detail: apiDetail },
      { status: 500 }
    );
  }
}
