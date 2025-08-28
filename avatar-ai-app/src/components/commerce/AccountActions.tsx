"use client";
import { useState } from "react";

export default function AccountActions({
  priceId,
  paymentLinkUrl,
}: {
  priceId?: string;
  paymentLinkUrl?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const baseBtn =
    "inline-flex items-center justify-center gap-2 rounded-md transition select-none active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white/50 disabled:opacity-50 disabled:pointer-events-none";
  const canPay = Boolean(paymentLinkUrl || priceId);

  async function openCheckout() {
    try {
      setBusy("checkout");
      // If a Stripe Payment Link is provided, redirect directly
      if (paymentLinkUrl) {
        window.location.href = paymentLinkUrl;
        return;
      }
      if (!priceId || !priceId.startsWith("price_")) {
        throw new Error(
          "Configura STRIPE_PRICE_CREDITS_100 con un Price ID válido (empieza con 'price_'), no un Product ('prod_')."
        );
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode: "payment", quantity: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Checkout error");
      if (data?.url) window.location.href = data.url as string;
    } catch (e: any) {
      alert(e?.message || "No se pudo iniciar el checkout");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    try {
      setBusy("portal");
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Portal error");
      if (data?.url) window.location.href = data.url as string;
    } catch (e: any) {
      alert(e?.message || "No se pudo abrir el portal de facturación");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <button
        onClick={openCheckout}
        disabled={!canPay || busy !== null}
        className={`btn-accent ${baseBtn}`}
        title={
          !canPay
            ? "Configura STRIPE_PRICE_CREDITS_100 o NEXT_PUBLIC_STRIPE_PAYMENT_LINK"
            : undefined
        }
        aria-busy={busy === "checkout"}
      >
        {busy === "checkout" ? "Redirigiendo…" : "Comprar créditos"}
      </button>
      <button
        onClick={openPortal}
        disabled={busy !== null}
        className={`${baseBtn} px-4 py-2 border border-white/20 hover:bg-white/10`}
        aria-busy={busy === "portal"}
      >
        {busy === "portal" ? "Abriendo…" : "Administrar facturación"}
      </button>
    </div>
  );
}
