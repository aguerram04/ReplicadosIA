"use client";
import { useSession } from "next-auth/react";

export default function SessionDebug() {
  const { data, status } = useSession();
  return (
    <pre className="text-xs p-4 rounded-2xl border border-white/20 overflow-x-auto">
      {JSON.stringify({ status, user: data?.user }, null, 2)}
    </pre>
  );
}
