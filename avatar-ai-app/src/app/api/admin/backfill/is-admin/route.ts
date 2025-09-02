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
  const res1 = await User.updateMany(
    { isAdmin: { $exists: false } },
    { $set: { isAdmin: false } }
  );
  const res2 = await User.updateMany(
    { $or: [{ role: { $exists: false } }, { role: null }] },
    { $set: { role: "user" } }
  );

  return NextResponse.json({
    ok: true,
    updatedIsAdmin: (res1 as any).modifiedCount ?? 0,
    matchedIsAdmin: (res1 as any).matchedCount ?? 0,
    updatedRole: (res2 as any).modifiedCount ?? 0,
    matchedRole: (res2 as any).matchedCount ?? 0,
  });
}
