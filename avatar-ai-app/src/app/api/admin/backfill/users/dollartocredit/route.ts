import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models";

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
  // Use pipeline update to set default 50 only when field is missing or null
  const res = await User.updateMany({}, [
    {
      $set: {
        dollarToCreditPct: {
          $ifNull: ["$dollarToCreditPct", 50],
        },
      },
    },
  ] as any);

  return NextResponse.json({
    ok: true,
    matched: (res as any).matchedCount ?? 0,
    updated: (res as any).modifiedCount ?? 0,
  });
}
