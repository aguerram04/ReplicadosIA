import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, User } from "@/models";
import { Types } from "mongoose";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions as any);
  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.user?.role === "admin"
  );
  let authorized = isAdminSession;
  const headerKey = req.headers.get("x-admin-key");
  if (headerKey && process.env.ADMIN_BACKFILL_KEY) {
    authorized = authorized || headerKey === process.env.ADMIN_BACKFILL_KEY;
  }
  if (process.env.NODE_ENV === "production" && !authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const cursor = CreditLedger.find({
    $or: [
      { userEmail: { $exists: false } },
      { userEmail: null },
      { userName: { $exists: false } },
      { userName: null },
      { dollarToCreditPct: { $exists: false } },
      { dollarToCreditPct: null },
    ],
  }).cursor();

  let updated = 0;
  for await (const led of cursor as any) {
    const uid = new Types.ObjectId(led.userId);
    const u = await User.findById(uid).lean();
    const userEmail = u?.email;
    const userName = u?.name ?? null;
    const dollarToCreditPct =
      typeof (u as any)?.dollarToCreditPct === "number"
        ? (u as any).dollarToCreditPct
        : 50;
    if (
      userEmail !== undefined ||
      userName !== undefined ||
      dollarToCreditPct !== undefined
    ) {
      await CreditLedger.updateOne(
        { _id: led._id },
        {
          $set: {
            userEmail: userEmail ?? null,
            userName,
            dollarToCreditPct,
          },
        },
        { strict: false }
      );
      updated++;
    }
  }

  return NextResponse.json({ ok: true, updated });
}
