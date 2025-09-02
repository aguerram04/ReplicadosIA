import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, User, VideoJob } from "@/models";
import VendorLedger from "@/models/VendorLedger";

export const dynamic = "force-dynamic";

export default async function AdminOverview({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  await connectToDatabase();
  const fromStr = (searchParams?.from as string) || "";
  const toStr = (searchParams?.to as string) || "";
  const vendor = (searchParams?.vendor as string) || "";
  const type = (searchParams?.type as string) || "";
  const matchDate: any = {};
  if (fromStr) matchDate.$gte = new Date(`${fromStr}T00:00:00.000Z`);
  if (toStr) matchDate.$lte = new Date(`${toStr}T23:59:59.999Z`);
  const dateFilter = Object.keys(matchDate).length
    ? { createdAt: matchDate }
    : {};
  const [users, credits, jobs] = await Promise.all([
    User.countDocuments().lean(),
    CreditLedger.countDocuments().lean(),
    VideoJob.countDocuments().lean(),
  ]);
  const revenueMatch: any = {
    type: "purchase",
    vendor: "stripe",
    ...dateFilter,
  };
  if (vendor) revenueMatch.vendor = vendor;
  if (type) revenueMatch.type = type;
  const revenueAgg = await VendorLedger.aggregate([
    { $match: revenueMatch },
    { $group: { _id: null, revenue: { $sum: "$revenueUsd" } } },
  ]);
  const costMatch: any = {
    type: "consumption",
    vendor: "heygen",
    ...dateFilter,
  };
  if (vendor) costMatch.vendor = vendor;
  if (type) costMatch.type = type;
  const vendorCostAgg = await VendorLedger.aggregate([
    { $match: costMatch },
    { $group: { _id: null, cost: { $sum: "$vendorCostUsd" } } },
  ]);
  const totalRevenue = revenueAgg?.[0]?.revenue || 0;
  const totalVendorCost = vendorCostAgg?.[0]?.cost || 0;
  const totalMargin = totalRevenue - totalVendorCost;
  let overrideActive = false;
  try {
    const balResp = await fetch(
      `${process.env.NEXTAUTH_URL || ""}/api/admin/heygen/balance`,
      { cache: "no-store" }
    );
    const bal = await balResp.json();
    overrideActive = bal && bal.override !== null && bal.override !== undefined;
  } catch {}
  return (
    <main>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold">Overview</h1>
        {overrideActive && (
          <span className="text-xs rounded-full border border-yellow-400/40 text-yellow-300 px-2 py-1">
            Override HeyGen activo
          </span>
        )}
      </div>
      {/** Filtros */}
      {await import("@/components/admin/OverviewFilters").then((m) => (
        <m.default />
      ))}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Usuarios</div>
          <div className="text-3xl">{users}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Movimientos de crédito</div>
          <div className="text-3xl">{credits}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Trabajos</div>
          <div className="text-3xl">{jobs}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Ingresos (Stripe)</div>
          <div className="text-3xl">${totalRevenue.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Costo proveedor (HeyGen)</div>
          <div className="text-3xl">${totalVendorCost.toFixed(2)}</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm opacity-70">Margen acumulado</div>
          <div className="text-3xl">${totalMargin.toFixed(2)}</div>
        </div>
      </div>
    </main>
  );
}
