"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncCreditsButton() {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function syncNow() {
    try {
      setBusy(true);
      const res = await fetch("/api/stripe/reconcile", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "No se pudo sincronizar");
      alert(`Sincronizado: +${data?.credited || 0} créditos`);
      router.refresh();
    } catch (e: any) {
      alert(e?.message || "Error al sincronizar pago");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={syncNow}
      disabled={busy}
      className="ml-3 px-4 py-2 border rounded-md"
    >
      {busy ? "Sincronizando…" : "Sincronizar pago"}
    </button>
  );
}
