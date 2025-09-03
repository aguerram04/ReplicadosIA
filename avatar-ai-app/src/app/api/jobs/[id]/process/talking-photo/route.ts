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
  const silentRequested: boolean = Boolean(body?.silent);

  const firstMedia: string | undefined =
    (job.mediaUrls && job.mediaUrls[0]) || (job.assets && job.assets[0]);
  if (!firstMedia && !talkingPhotoIdFromClient) {
    return NextResponse.json(
      {
        error: "Se requiere una imagen o talkingPhotoId para Talking Photo",
        jobMediaUrls: job.mediaUrls || [],
        jobAssets: (job as any).assets || [],
      },
      { status: 400 }
    );
  }
  if (!silentRequested && (!job.script || !job.script.trim())) {
    return NextResponse.json(
      {
        error: "Falta el guión (script) para generar",
        hint: "Escribe el texto que hablará el avatar",
      },
      { status: 400 }
    );
  }

  try {
    let talkingPhotoId = talkingPhotoIdFromClient;
    if (!talkingPhotoId) {
      try {
        const up = await heygenUploadTalkingPhotoFromUrl(firstMedia as string);
        talkingPhotoId =
          (up as any)?.data?.talking_photo_id || (up as any)?.talking_photo_id;
        if (!talkingPhotoId) {
          job.status = "error";
          job.error = "No talking_photo_id";
          await job.save();
          return NextResponse.json(
            {
              error: "HeyGen no devolvió talking_photo_id",
              detail: up,
              sourceImage: firstMedia,
            },
            { status: 502 }
          );
        }
      } catch (e: any) {
        job.status = "error";
        job.error = e?.message || "Fallo subiendo imagen a HeyGen";
        await job.save();
        const status = e?.response?.status || 500;
        return NextResponse.json(
          {
            error: job.error,
            detail: e?.response?.data || null,
            sourceImage: firstMedia,
          },
          { status }
        );
      }
    }

    // Voice strategy: prefer uploaded audio; otherwise use text with a voice_id
    const audioUrl: string | undefined = (
      Array.isArray(job.mediaUrls) ? job.mediaUrls : []
    ).find((u: string) => /\.(mp3|wav|m4a|aac)$/i.test(String(u)));
    const chosenVoiceId: string | undefined =
      (job as any).voiceId || process.env.HEYGEN_DEFAULT_VOICE_ID;
    let voice: any | undefined;
    if (audioUrl) {
      // Estructura esperada: voice.audio_url
      voice = { type: "audio", audio_url: audioUrl };
    } else if (!silentRequested && chosenVoiceId) {
      // Estructura esperada para TTS: voice.text.voice_id + input_text
      voice = {
        type: "text",
        text: {
          input_text: job.script,
          voice_id: chosenVoiceId,
        },
      };
    } else if (silentRequested && process.env.HEYGEN_SILENT_AUDIO_URL) {
      // Para cumplir con requerimiento de voice, usamos un audio silencioso
      voice = {
        type: "audio",
        audio_url: String(process.env.HEYGEN_SILENT_AUDIO_URL),
      };
    } else if (!silentRequested) {
      // Sin audio ni voiceId y no es modo silencioso -> error claro
      return NextResponse.json(
        {
          error:
            "Falta audio o voice_id. Sube un audio, elige una voz o configura HEYGEN_DEFAULT_VOICE_ID.",
          hint: "Para silencioso, marca 'Generar sin audio' o define HEYGEN_SILENT_AUDIO_URL.",
        },
        { status: 400 }
      );
    } else {
      // Modo silencioso sin silent audio URL: intentamos sin 'voice'
      voice = undefined;
    }

    const payload: any = {
      video_inputs: [
        {
          character: {
            type: "talking_photo",
            talking_photo_id: talkingPhotoId,
          },
          ...(voice ? { voice } : {}),
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
    const status = e?.response?.status || 500;
    return NextResponse.json(
      { error: job.error, detail: e?.response?.data || null },
      { status }
    );
  }
}
