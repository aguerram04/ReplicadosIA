import FooterBuyButton from "@/components/commerce/FooterBuyButton";
import Script from "next/script";
import PricingFooter from "@/components/commerce/PricingFooter";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col justify-between">
      <section className="container flex justify-center py-16">
        <div className="w-full max-w-2xl">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Avatar AI App
          </h1>
          <p className="text-lg md:text-xl opacity-80 mb-8">
            Genera videos con avatares en minutos.
          </p>
          <div className="flex gap-4">
            <a className="btn-accent" href="/dashboard">
              Ir al Dashboard
            </a>
          </div>
        </div>
      </section>
      <PricingFooter />
      <FooterBuyButton />
    </main>
  );
}
