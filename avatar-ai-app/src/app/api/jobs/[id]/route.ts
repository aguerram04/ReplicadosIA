import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { Job } from "@/models";
import { estimateHeygenCreditsForJob } from "@/lib/heygen";

export async function GET(
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
  }).lean();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const estimatedCredits = estimateHeygenCreditsForJob(job);
  return NextResponse.json({ job, estimatedCredits });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const res = await Job.deleteOne({
    _id: params.id,
    userId: String(session.user.id),
  });
  if (res.deletedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
