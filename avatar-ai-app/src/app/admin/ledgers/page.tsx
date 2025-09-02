import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, User } from "@/models";

export const dynamic = "force-dynamic";

export default async function AdminLedgers() {
  await connectToDatabase();
  const entries = await CreditLedger.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  const userIds = entries.map((e: any) => e.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const byId = new Map(users.map((u: any) => [String(u._id), u]));
  return (
    <main>
      <h1 className="text-2xl font-semibold mb-4">Movimientos</h1>
      <div className="space-y-2">
        {entries.map((e: any) => (
          <div
            key={String(e._id)}
            className="rounded-md border p-3 flex justify-between"
          >
            <div>
              <div className="font-medium">
                {byId.get(String(e.userId))?.email || "usuario"}
              </div>
              <div className="text-xs opacity-70">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono">
                {e.amount > 0 ? `+${e.amount}` : e.amount}
              </div>
              <div className="text-xs opacity-70">{e.reason}</div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="opacity-70">Sin movimientos</div>
        )}
      </div>
    </main>
  );
}
