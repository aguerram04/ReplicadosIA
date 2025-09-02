import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { heygenPhotoAvatarGenerate } from "@/lib/heygen";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const required = [
    "name",
    "age",
    "gender",
    "ethnicity",
    "orientation",
    "pose",
    "style",
    "appearance",
  ];
  for (const k of required) {
    if (!body?.[k])
      return NextResponse.json({ error: `${k} required` }, { status: 400 });
  }
  try {
    const data: any = await heygenPhotoAvatarGenerate(body);
    const generationId = data?.data?.generation_id || data?.generation_id;
    if (!generationId)
      return NextResponse.json(
        { error: "generation_id missing", detail: data },
        { status: 502 }
      );

    // Persist as a Job so it appears in the dashboard
    await connectToDatabase();
    const title = `Photo Avatar: ${String(body?.name || "Generación")}`;
    const appearance = String(body?.appearance || "");
    const job = await Job.create({
      userId: String((session.user as any).id),
      title,
      script: appearance,
      inputType: "IMAGE",
      status: "queued",
      heygenTaskId: String(generationId),
      assets: [],
      mediaUrls: [],
    });

    return NextResponse.json({ generationId, jobId: job._id.toString() });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "HeyGen error", detail: e?.response?.data },
      { status: 500 }
    );
  }
}
