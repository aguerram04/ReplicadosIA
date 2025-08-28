"use client";
import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function AutoReconcileAfterStripe() {
  const search = useSearchParams();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    const sid = search.get("session_id");
    if (sid || started.current) return; // handled by ReconcileOnReturn

    const cameFromStripe = (document.referrer || "").includes("stripe.com");
    const already = sessionStorage.getItem("reconcile_checked") === "1";
    if (!cameFromStripe || already) return;

    started.current = true;
    (async () => {
      try {
        await fetch("/api/stripe/reconcile", { method: "POST" });
      } catch {}
      sessionStorage.setItem("reconcile_checked", "1");
      router.refresh();
    })();
  }, [search, router]);

  return null;
}
