import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { heygenGetApiCreditsBalance } from "@/lib/heygen";
import { SystemSetting } from "@/models";

export const dynamic = "force-dynamic";

const KEY = "heygen.balance.override";

export async function GET() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const apiBalance = await heygenGetApiCreditsBalance();
  const doc = await SystemSetting.findOne({ key: KEY }).lean();
  const effective = doc?.value ?? apiBalance ?? null;
  return NextResponse.json({
    apiBalance,
    override: doc?.value ?? null,
    effective,
  });
}

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as any;
  const valueRaw = body?.balance;
  if (valueRaw === undefined) {
    return NextResponse.json({ error: "Missing balance" }, { status: 400 });
  }
  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "Invalid balance" }, { status: 400 });
  }
  await connectToDatabase();
  await SystemSetting.updateOne(
    { key: KEY },
    { $set: { value, updatedAt: new Date() } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, override: value });
}

export async function DELETE() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  await SystemSetting.deleteOne({ key: KEY });
  return NextResponse.json({ ok: true });
}
