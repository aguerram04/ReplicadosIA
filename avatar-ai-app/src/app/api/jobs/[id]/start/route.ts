import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const base = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
  const res = await fetch(`${base}/api/heygen/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobId: params.id }),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
