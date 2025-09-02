"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserPctControl({
  userId,
  initialPercent,
  email,
}: {
  userId: string;
  initialPercent: number;
  email?: string;
}) {
  const [pct, setPct] = useState<number>(
    Number.isFinite(initialPercent) ? initialPercent : 50
  );
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function save() {
    try {
      setBusy(true);
      const res = await fetch("/api/admin/users/dollarToCredit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, percent: pct }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "No se pudo guardar");
      // Refresca los datos del servidor para que la lista muestre el valor actualizado (users y usersummary)
      router.refresh();
    } catch (e) {
      // noop visual; podríamos usar un toast en el futuro
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(Number(e.currentTarget.value))}
        className="w-40"
        aria-label="Porcentaje dólar a crédito"
      />
      <div className="text-xs w-12 text-right">{pct}%</div>
      <button
        onClick={save}
        disabled={busy}
        className="px-2 py-1 text-xs rounded-md border"
        aria-busy={busy}
      >
        {busy ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}
