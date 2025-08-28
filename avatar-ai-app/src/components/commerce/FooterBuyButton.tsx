"use client";
import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function FooterBuyButton({
  publishableKey: pkFromServer,
  buyButtonId: idFromServer,
}: { publishableKey?: string; buyButtonId?: string } = {}) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<{
    buyButtonId: string;
    publishableKey: string;
  }>(() => ({
    buyButtonId:
      idFromServer || process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID || "",
    publishableKey:
      pkFromServer || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  }));

  useEffect(() => {
    // Fetch session user for client-reference-id and customer-email
    fetch("/api/auth/session").then(async (r) => {
      try {
        const j = await r.json();
        const id = j?.user?.id || j?.user?._id || null;
        const email = j?.user?.email || null;
        if (id && email) setUser({ id, email });
      } catch {}
      setLoading(false);
    });
  }, []);

  const attrs = useMemo(() => {
    return {
      buyButtonId: keys.buyButtonId,
      publishableKey: keys.publishableKey,
      clientRef: user?.id || "",
      email: user?.email || "",
    } as const;
  }, [keys, user]);

  useEffect(() => {
    // Si vienen vacíos, intenta obtenerlos vía API pública
    if (!keys.buyButtonId || !keys.publishableKey) {
      fetch("/api/public/stripe")
        .then((r) => r.json())
        .then((j) => {
          if (j?.buyButtonId || j?.publishableKey) {
            setKeys({
              buyButtonId: j.buyButtonId || keys.buyButtonId,
              publishableKey: j.publishableKey || keys.publishableKey,
            });
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <footer className="w-full border-t border-[#e6e8eb] bg-[#f6f7f9]">
      <div className="container py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Créditos ReplicadosIA</h2>
            <p className="text-sm opacity-70">
              Compra créditos y empieza a generar videos.
            </p>
          </div>
          <div>
            {loading ? (
              <div className="px-4 py-2 rounded-md border border-white/20 opacity-60">
                Cargando…
              </div>
            ) : user ? (
              <>
                <Script async src="https://js.stripe.com/v3/buy-button.js" />
                {attrs.publishableKey && attrs.buyButtonId ? (
                  <stripe-buy-button
                    buy-button-id={attrs.buyButtonId as any}
                    publishable-key={attrs.publishableKey as any}
                    client-reference-id={attrs.clientRef as any}
                    customer-email={attrs.email as any}
                  />
                ) : (
                  <div className="px-4 py-2 rounded-md border border-white/20">
                    Configura NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY y
                    NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID
                  </div>
                )}
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-md bg-white text-black"
              >
                Inicia sesión para comprar
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
