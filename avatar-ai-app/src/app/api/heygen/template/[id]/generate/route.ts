import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenTemplateGenerate } from "@/lib/heygen";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = body?.title || "Video de templete";
  const variables = body?.variables || {};

  try {
    const data: any = await heygenTemplateGenerate(params.id, {
      title,
      variables,
    });
    const videoId = data?.data?.video_id || data?.video_id || "";
    if (!videoId) {
      return NextResponse.json(
        { error: "HeyGen no devolvió video_id", detail: data },
        { status: 502 }
      );
    }
    await connectToDatabase();
    const job = await Job.create({
      userId: String(session.user.id),
      title: String(title),
      script: "",
      inputType: "TEXT",
      providerJobId: videoId,
      status: "queued",
    });
    return NextResponse.json({
      id: job._id.toString(),
      providerJobId: videoId,
      status: job.status,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Failed" },
      { status: 500 }
    );
  }
}
