import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User, UserSummary } from "@/models";
import { Types } from "mongoose";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  const isAdmin = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.user?.role === "admin"
  );
  let authorized = isAdmin;
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && process.env.ADMIN_BACKFILL_KEY) {
    authorized = authorized || headerKey === process.env.ADMIN_BACKFILL_KEY;
  }
  if (process.env.NODE_ENV === "production" && !authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, percent } = (await req.json().catch(() => ({}))) as {
    userId?: string;
    percent?: number;
  };
  if (!userId || typeof percent !== "number") {
    return NextResponse.json(
      { error: "Parámetros inválidos" },
      { status: 400 }
    );
  }
  const pct = Math.max(0, Math.min(100, Math.floor(percent)));
  await connectToDatabase();
  const _id = new Types.ObjectId(userId);
  const before = await User.findById(_id).lean();
  if (!before) {
    return NextResponse.json(
      { error: "User not found", userId },
      { status: 404 }
    );
  }
  await User.updateOne({ _id }, { $set: { dollarToCreditPct: pct } });
  const u = await User.findById(_id).lean();
  // Mirror to UserSummary
  await UserSummary.updateOne(
    { userId: _id },
    {
      $set: {
        email: u?.email,
        name: u?.name ?? null,
        totalCredits: u?.credits ?? 0,
        dollarToCreditPct: pct,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
  return NextResponse.json({
    ok: true,
    userId: String(_id),
    percent: pct,
    userDollarToCreditPct: (u as any)?.dollarToCreditPct,
  });
}
