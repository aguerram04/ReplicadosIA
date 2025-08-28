import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { User, CreditLedger } from "@/models";
import AccountActions from "@/components/commerce/AccountActions";
import BuyCreditsButton from "@/components/commerce/BuyCreditsButton";
import SyncCreditsButton from "@/components/commerce/SyncCreditsButton";
import AutoReconcileAfterStripe from "@/components/commerce/AutoReconcileAfterStripe";
import ReconcileOnReturn from "@/components/commerce/ReconcileOnReturn";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session: any = await getServerSession(authOptions as any);
  if (!session?.user?.email) {
    return (
      <main className="container py-10">
        <h1 className="text-2xl font-semibold">Cuenta</h1>
        <p className="mt-2 opacity-80">Debes iniciar sesión.</p>
        <a href="/login" className="btn-accent mt-4 inline-block">
          Ir a login
        </a>
      </main>
    );
  }

  await connectToDatabase();
  const dbUser = await User.findOne({ email: session.user.email }).lean();
  const credits = dbUser?.credits ?? 0;
  const items = await CreditLedger.find({ userId: dbUser?._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const priceId = process.env.STRIPE_PRICE_CREDITS_100 || "";
  const paymentLinkUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";

  return (
    <main className="container py-10">
      <AutoReconcileAfterStripe />
      {/* Client-side reconcile when returning from Stripe */}
      <ReconcileOnReturn />
      <h1 className="text-2xl font-semibold">Cuenta</h1>
      <p className="opacity-80">{session.user.email}</p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-white/10 p-4">
          <h2 className="font-medium">Créditos</h2>
          <p className="text-3xl mt-2">{credits}</p>
          <div className="mt-4 flex items-center">
            <BuyCreditsButton />
            <SyncCreditsButton />
          </div>
        </div>

        <div className="md:col-span-2 rounded-lg border border-white/10 p-4">
          <h2 className="font-medium mb-2">Movimientos</h2>
          <div className="text-xs opacity-70 mb-2">Últimos 20 movimientos</div>
          <div className="space-y-2 text-sm">
            {items.map((it: any) => (
              <div
                key={String(it._id)}
                className="flex items-center justify-between border border-white/10 rounded-md p-2"
              >
                <div>
                  <div className="font-medium">{it.reason}</div>
                  <div className="opacity-70">
                    {new Date(it.createdAt).toLocaleString()}
                  </div>
                </div>
                <div
                  className={`font-mono ${
                    it.amount >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {it.amount >= 0 ? "+" : ""}
                  {it.amount}
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <div className="opacity-60">Sin movimientos</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
