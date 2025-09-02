"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ReconcileOnLoad() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/stripe/reconcile", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (Number(data?.credited) > 0 || data?.alreadyCredited)) {
          router.refresh();
        }
      } catch {}
    })();
  }, [router]);
  return null;
}
