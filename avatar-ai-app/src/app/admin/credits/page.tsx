import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, UserSummary, User } from "@/models";
import { heygenGetApiCreditsBalance } from "@/lib/heygen";

export const dynamic = "force-dynamic";

export default async function AdminCreditsPage() {
  const session: any = await getServerSession(authOptions as any);
  const isAdmin = Boolean(
    session?.user?.isAdmin || session?.user?.role === "admin"
  );
  if (!isAdmin) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Acceso denegado</h1>
        <p className="opacity-80 mt-2">
          Esta sección es solo para administradores.
        </p>
      </main>
    );
  }

  await connectToDatabase();

  // Saldo HeyGen API
  const apiBalance = await heygenGetApiCreditsBalance();

  // Total de créditos adquiridos (compras)
  const purchasesAgg = await CreditLedger.aggregate([
    { $match: { reason: "purchase" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalPurchased: number = purchasesAgg?.[0]?.total || 0;

  // Total de créditos gastados (spend)
  const spendAgg = await CreditLedger.aggregate([
    { $match: { reason: "spend" } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const totalSpent: number = Math.abs(spendAgg?.[0]?.total || 0);

  // Créditos actuales por usuario
  const users = await User.find(
    {},
    { email: 1, name: 1, credits: 1, dollarToCreditPct: 1 }
  )
    .sort({ credits: -1 })
    .lean();
  const totalHeld = users.reduce(
    (acc: number, u: any) => acc + (u.credits || 0),
    0
  );

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-semibold">Créditos — Panel</h1>
      <p className="opacity-80 mt-1">
        Resumen global y distribución entre usuarios
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-lg border border-white/10 p-4">
          <div className="opacity-70">Saldo HeyGen API</div>
          {await fetch(
            `${process.env.NEXTAUTH_URL || ""}/api/admin/heygen/balance`,
            { cache: "no-store" }
          )
            .then((r) => r.json())
            .then((b) => (
              <div>
                <div className="text-3xl mt-1">
                  {(b?.effective ?? apiBalance ?? "—") as any}
                </div>
                <div className="text-xs opacity-70 mt-1">
                  API:{" "}
                  <span className="font-mono">
                    {String(b?.apiBalance ?? apiBalance ?? "—")}
                  </span>{" "}
                  · Override:{" "}
                  <span className="font-mono">
                    {String(b?.override ?? "—")}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <form
                    action={async () => {
                      "use server";
                      await fetch(
                        `${
                          process.env.NEXTAUTH_URL || ""
                        }/api/admin/heygen/balance`,
                        {
                          method: "DELETE",
                          cache: "no-store",
                        }
                      );
                    }}
                  >
                    <button className="btn-outline" type="submit">
                      Limpiar override
                    </button>
                  </form>
                </div>
              </div>
            ))}
          {apiBalance === null && (
            <div className="text-xs opacity-60 mt-1">
              No disponible por API. Puedes definir HEYGEN_BALANCE_OVERRIDE.
            </div>
          )}
          <form
            action={async (formData: FormData) => {
              "use server";
              const val = Number(formData.get("override"));
              try {
                await fetch(
                  `${process.env.NEXTAUTH_URL || ""}/api/admin/heygen/balance`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ balance: val }),
                    cache: "no-store",
                  }
                );
              } catch {}
            }}
            className="mt-3 flex gap-2 items-center"
          >
            <input
              name="override"
              type="number"
              step="1"
              min="0"
              placeholder="Override manual"
              className="w-40 rounded-md border border-white/10 bg-transparent px-2 py-1"
            />
            <button className="btn-outline" type="submit">
              Usar override
            </button>
          </form>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="opacity-70">Créditos comprados (histórico)</div>
          <div className="text-3xl mt-1">{totalPurchased}</div>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="opacity-70">Créditos gastados (histórico)</div>
          <div className="text-3xl mt-1">{totalSpent}</div>
        </div>
        <div className="rounded-lg border border-white/10 p-4">
          <div className="opacity-70">Créditos en cuentas de usuarios</div>
          <div className="text-3xl mt-1">{totalHeld}</div>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4 mt-6">
        <h2 className="font-medium mb-2">Distribución por usuario</h2>
        <div className="text-xs opacity-70 mb-2">
          Ordenado por créditos actuales
        </div>
        <div className="space-y-2 text-sm">
          {users.map((u: any) => {
            const pct =
              typeof u.dollarToCreditPct === "number"
                ? u.dollarToCreditPct
                : 50;
            const creditsPerDollar = pct / 100;
            return (
              <div
                key={String(u._id)}
                className="flex items-center justify-between border border-white/10 rounded-md p-2"
              >
                <div>
                  <div className="font-medium">{u.email}</div>
                  <div className="opacity-70">{u.name || "(sin nombre)"}</div>
                  <div className="text-xs opacity-70 mt-1">
                    $1 =&gt;{" "}
                    <span className="font-mono">
                      {creditsPerDollar.toFixed(2)}
                    </span>{" "}
                    créditos <span className="opacity-60">({pct}% tasa)</span>
                  </div>
                </div>
                <div className="font-mono">{u.credits || 0}</div>
              </div>
            );
          })}
          {users.length === 0 && <div className="opacity-60">Sin usuarios</div>}
        </div>
      </div>
    </main>
  );
}
