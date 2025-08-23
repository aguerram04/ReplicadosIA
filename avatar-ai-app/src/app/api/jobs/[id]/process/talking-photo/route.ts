import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import {
  heygenUploadTalkingPhotoFromUrl,
  heygenVideoGenerate,
} from "@/lib/heygen";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectToDatabase();
  const job = await Job.findOne({
    _id: params.id,
    userId: String(session.user.id),
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const talkingPhotoIdFromClient: string | undefined = body?.talkingPhotoId;

  const firstMedia: string | undefined =
    (job.mediaUrls && job.mediaUrls[0]) || (job.assets && job.assets[0]);
  if (!firstMedia && !talkingPhotoIdFromClient) {
    return NextResponse.json(
      { error: "Se requiere una imagen o talkingPhotoId para Talking Photo" },
      { status: 400 }
    );
  }
  if (!job.script || !job.script.trim()) {
    return NextResponse.json(
      { error: "Falta el guión (script) para generar" },
      { status: 400 }
    );
  }

  try {
    let talkingPhotoId = talkingPhotoIdFromClient;
    if (!talkingPhotoId) {
      const up = await heygenUploadTalkingPhotoFromUrl(firstMedia as string);
      talkingPhotoId =
        (up as any)?.data?.talking_photo_id || (up as any)?.talking_photo_id;
      if (!talkingPhotoId) {
        job.status = "error";
        job.error = "No talking_photo_id";
        await job.save();
        return NextResponse.json(
          { error: "HeyGen no devolvió talking_photo_id", detail: up },
          { status: 502 }
        );
      }
    }

    const payload: any = {
      video_inputs: [
        {
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId,
          },
          voice: {
            type: "text",
            input_text: job.script,
            voice_id: job.voiceId || undefined,
          },
          background: {
            type: "color",
            value: "#FAFAFA",
          },
        },
      ],
      dimension: { width: 1280, height: 720 },
    };

    const gen = await heygenVideoGenerate(payload);
    const providerId = (gen as any)?.data?.video_id || "";
    if (!providerId) {
      job.status = "error";
      job.error = "No video_id";
      await job.save();
      return NextResponse.json(
        { error: "HeyGen no devolvió video_id", detail: gen },
        { status: 502 }
      );
    }

    job.providerJobId = providerId;
    job.status = "queued";
    await job.save();
    return NextResponse.json({
      id: job._id.toString(),
      providerJobId: providerId,
      status: job.status,
    });
  } catch (e: any) {
    job.status = "error";
    job.error = e?.message || String(e);
    await job.save();
    return NextResponse.json({ error: job.error }, { status: 500 });
  }
}
