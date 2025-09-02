import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenPhotoAvatarGenerationStatus } from "@/lib/heygen";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || ""; // generation_id
  const jobId = searchParams.get("jobId") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const data: any = await heygenPhotoAvatarGenerationStatus(id);

    // Optionally persist status into Job if jobId provided
    if (jobId) {
      await connectToDatabase();
      const job: any = await Job.findById(jobId);
      if (job) {
        const raw: any = data?.data || data;
        const statusStr = String(raw?.status || "").toLowerCase();
        const update: any = {};
        if (statusStr.includes("queued") || statusStr.includes("process")) {
          update.status = statusStr.includes("queued")
            ? "queued"
            : "processing";
        }
        if (
          statusStr.includes("success") ||
          statusStr.includes("completed") ||
          Array.isArray(raw?.images)
        ) {
          update.status = "done";
          // For photo avatar generation we may only have image_keys or previews
          const firstUrl = (raw?.images || [])?.[0]?.url || raw?.preview_url;
          if (firstUrl) {
            update.resultUrl = firstUrl;
            update.outputUrl = firstUrl;
          }
        }
        if (statusStr.includes("fail") || statusStr.includes("error")) {
          update.status = "error";
          update.error = JSON.stringify(raw);
          update.errorMessage = update.error;
        }
        if (Object.keys(update).length > 0) {
          await Job.updateOne({ _id: job._id }, { $set: update });
        }
      }
    }
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "HeyGen status error", detail: e?.response?.data },
      { status: 500 }
    );
  }
}
