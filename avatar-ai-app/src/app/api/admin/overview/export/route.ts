import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import VendorLedger from "@/models/VendorLedger";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.isAdmin && session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const { searchParams } = new URL(req.url);
  const fromStr = searchParams.get("from") || "";
  const toStr = searchParams.get("to") || "";
  const matchDate: any = {};
  if (fromStr) matchDate.$gte = new Date(`${fromStr}T00:00:00.000Z`);
  if (toStr) matchDate.$lte = new Date(`${toStr}T23:59:59.999Z`);
  const dateFilter = Object.keys(matchDate).length
    ? { createdAt: matchDate }
    : {};
  const vendor = searchParams.get("vendor") || "";
  const type = searchParams.get("type") || "";
  const byUser = searchParams.get("user") === "1";

  // Aggregate daily revenue/cost/margin
  const pipeline: any[] = [
    {
      $match: {
        ...dateFilter,
        ...(vendor ? { vendor } : {}),
        ...(type ? { type } : {}),
      },
    },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          type: "$type",
          vendor: "$vendor",
          userId: byUser ? "$userId" : null,
          userEmail: byUser ? "$userEmail" : null,
        },
        revenue: { $sum: "$revenueUsd" },
        cost: { $sum: "$vendorCostUsd" },
      },
    },
  ];
  const rows = await VendorLedger.aggregate(pipeline);

  // Re-shape per day
  const dayMap = new Map<
    string,
    { revenue: number; cost: number; userEmail?: string }
  >();
  for (const r of rows) {
    const day = r._id.day as string;
    const key = byUser
      ? `${day}:${r._id.userEmail || r._id.userId || "unknown"}`
      : day;
    const entry = dayMap.get(key) || {
      revenue: 0,
      cost: 0,
      userEmail: r._id.userEmail,
    };
    if (r._id.type === "purchase" && r._id.vendor === "stripe") {
      entry.revenue += r.revenue || 0;
    }
    if (r._id.type === "consumption" && r._id.vendor === "heygen") {
      entry.cost += r.cost || 0;
    }
    dayMap.set(key, entry);
  }

  const header = byUser
    ? "day,userEmail,revenueUsd,vendorCostUsd,marginUsd"
    : "day,revenueUsd,vendorCostUsd,marginUsd";
  const lines = [header];
  const keys = Array.from(dayMap.keys()).sort();
  for (const k of keys) {
    const v = dayMap.get(k)!;
    const day = byUser ? k.split(":")[0] : k;
    const margin = (v.revenue || 0) - (v.cost || 0);
    if (byUser) {
      lines.push(
        `${day},${v.userEmail || ""},${(v.revenue || 0).toFixed(2)},${(
          v.cost || 0
        ).toFixed(2)},${margin.toFixed(2)}`
      );
    } else {
      lines.push(
        `${day},${(v.revenue || 0).toFixed(2)},${(v.cost || 0).toFixed(
          2
        )},${margin.toFixed(2)}`
      );
    }
  }
  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=overview.csv",
    },
  });
}
