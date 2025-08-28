import AccountActions from "@/components/commerce/AccountActions";
import BuyCreditsButton from "@/components/commerce/BuyCreditsButton";

export default function PricingFooter() {
  const priceId = process.env.STRIPE_PRICE_CREDITS_100 || "";
  const paymentLinkUrl = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "";
  return (
    <section className="w-full border-t border-[#e6e8eb] bg-white">
      <div className="container py-12">
        <h2 className="text-2xl font-semibold text-center mb-2">Precios</h2>
        <p className="text-center opacity-70 mb-8">
          Compra créditos por única ocasión o administra tu suscripción.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[#e6e8eb] p-6">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-semibold">Créditos</h3>
              <span className="text-xs rounded-full border px-2 py-0.5">
                one‑time
              </span>
            </div>
            <p className="opacity-70 mt-1 text-sm">
              Paga una sola vez y usa tus créditos cuando los necesites.
            </p>
            <ul className="mt-4 text-sm list-disc pl-5 space-y-1 opacity-80">
              <li>Generación de video con avatar</li>
              <li>Talking photo y traducción</li>
              <li>Sin permanencia</li>
            </ul>
            <div className="mt-6">
              {/* Use Stripe Buy Button component to purchase credits */}
              <BuyCreditsButton />
            </div>
          </div>
          <div className="rounded-2xl border border-[#e6e8eb] p-6">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl font-semibold">Suscripción</h3>
              <span className="text-xs rounded-full border px-2 py-0.5">
                mensual
              </span>
            </div>
            <p className="opacity-70 mt-1 text-sm">
              Ahorra con paquetes mensuales de créditos.
            </p>
            <ul className="mt-4 text-sm list-disc pl-5 space-y-1 opacity-80">
              <li>Créditos mensuales con rollover parcial</li>
              <li>Cancelación en cualquier momento</li>
              <li>Soporte prioritario</li>
            </ul>
            <div className="mt-6">
              <a
                href="/pricing"
                className="px-4 py-2 rounded-md border border-[#e6e8eb] inline-block"
              >
                Ver planes
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
