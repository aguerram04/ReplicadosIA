import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserSummary } from "@/models";

export async function GET() {
  const session = await getServerSession(authOptions as any);
  const isAdmin = Boolean(
    (session as any)?.user?.isAdmin || (session as any)?.user?.role === "admin"
  );
  if (process.env.NODE_ENV === "production" && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const docs = await UserSummary.find()
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({ docs });
}
