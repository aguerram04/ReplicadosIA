"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OverviewFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [from, setFrom] = useState<string>(sp.get("from") || "");
  const [to, setTo] = useState<string>(sp.get("to") || "");
  const [vendor, setVendor] = useState<string>(sp.get("vendor") || "");
  const [type, setType] = useState<string>(sp.get("type") || "");
  const [byUser, setByUser] = useState<boolean>((sp.get("user") || "") === "1");

  useEffect(() => {
    setFrom(sp.get("from") || "");
    setTo(sp.get("to") || "");
    setVendor(sp.get("vendor") || "");
    setType(sp.get("type") || "");
    setByUser((sp.get("user") || "") === "1");
  }, [sp]);

  function applyFilters(e?: React.FormEvent) {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (vendor) params.set("vendor", vendor);
    if (type) params.set("type", type);
    if (byUser) params.set("user", "1");
    router.push(`/admin/overview${params.toString() ? `?${params}` : ""}`);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (vendor) params.set("vendor", vendor);
    if (type) params.set("type", type);
    if (byUser) params.set("user", "1");
    const url = `/api/admin/overview/export${
      params.toString() ? `?${params}` : ""
    }`;
    window.open(url, "_blank");
  }

  return (
    <form
      onSubmit={applyFilters}
      className="flex flex-wrap items-end gap-3 mb-4"
    >
      <div className="flex flex-col">
        <label className="text-xs opacity-70">Desde</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-md border border-white/10 bg-transparent px-2 py-1"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs opacity-70">Vendor</label>
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          className="rounded-md border border-white/10 bg-transparent px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="stripe">Stripe</option>
          <option value="heygen">HeyGen</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs opacity-70">Tipo</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-white/10 bg-transparent px-2 py-1"
        >
          <option value="">Todos</option>
          <option value="purchase">purchase</option>
          <option value="consumption">consumption</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={byUser}
          onChange={(e) => setByUser(e.target.checked)}
        />
        Desglose por usuario (CSV)
      </label>
      <div className="flex flex-col">
        <label className="text-xs opacity-70">Hasta</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-md border border-white/10 bg-transparent px-2 py-1"
        />
      </div>
      <button type="submit" className="btn-outline">
        Aplicar
      </button>
      <button type="button" className="btn-accent" onClick={exportCsv}>
        Exportar CSV
      </button>
    </form>
  );
}
