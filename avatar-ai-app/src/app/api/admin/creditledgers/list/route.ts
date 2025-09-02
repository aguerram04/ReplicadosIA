import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger } from "@/models";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const isAdminSession = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.user?.role === "admin"
  );
  if (process.env.NODE_ENV === "production" && !isAdminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const docs = await CreditLedger.find(
    {},
    {
      userId: 1,
      dollarToCreditPct: 1,
      userEmail: 1,
      userName: 1,
      amount: 1,
      reason: 1,
      createdAt: 1,
      meta: 1,
    }
  )
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return NextResponse.json({ docs });
}
