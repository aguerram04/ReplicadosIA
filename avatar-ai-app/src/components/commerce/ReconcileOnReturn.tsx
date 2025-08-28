"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReconcileOnReturn() {
  const search = useSearchParams();
  const router = useRouter();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const sid = search.get("session_id");
    if (!sid || done) return;
    (async () => {
      try {
        await fetch("/api/stripe/reconcile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        });
      } catch {}
      setDone(true);
      router.replace("/account");
      router.refresh();
    })();
  }, [search, router, done]);
  return null;
}
