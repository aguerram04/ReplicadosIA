import BuyCreditsButton from "@/components/commerce/BuyCreditsButton";
import SubscribeButton from "@/components/commerce/SubscribeButton";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold text-center mb-2">Precios</h1>
      <p className="text-center opacity-70 mb-8">
        Compra créditos por única ocasión o suscríbete mensualmente.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-[#e6e8eb] p-6">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-semibold">Créditos</h2>
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
            <BuyCreditsButton />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e6e8eb] p-6">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xl font-semibold">Suscripción</h2>
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
            <SubscribeButton />
          </div>
        </div>
      </div>
    </main>
  );
}
