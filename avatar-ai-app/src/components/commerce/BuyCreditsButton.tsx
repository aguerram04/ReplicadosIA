"use client";
import Script from "next/script";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function BuyCreditsButton() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<{
    buyButtonId: string;
    publishableKey: string;
    priceId?: string;
  }>(() => ({
    buyButtonId: process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID || "",
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
    priceId:
      process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100 ||
      process.env.STRIPE_PRICE_CREDITS_100 ||
      undefined,
  }));

  useEffect(() => {
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
    if (!keys.buyButtonId || !keys.publishableKey) {
      fetch("/api/public/stripe")
        .then((r) => r.json())
        .then((j) => {
          if (j?.buyButtonId || j?.publishableKey) {
            setKeys({
              buyButtonId: j.buyButtonId || keys.buyButtonId,
              publishableKey: j.publishableKey || keys.publishableKey,
              priceId: j.priceId || keys.priceId,
            });
          }
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-2 rounded-md border border-white/20 opacity-60">
        Cargando…
      </div>
    );
  }

  if (!user) {
    return (
      <Link href="/login" className="btn-accent inline-flex">
        Inicia sesión para comprar
      </Link>
    );
  }

  return (
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
  );
}
