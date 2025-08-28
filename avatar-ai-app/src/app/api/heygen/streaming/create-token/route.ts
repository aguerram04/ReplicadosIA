import { NextResponse } from "next/server";
import { env } from "@/config/env";

export async function POST() {
  try {
    const resp = await fetch(
      "https://api.heygen.com/v1/streaming.create_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": env.HEYGEN_API_KEY,
        },
        // No body required per HeyGen docs; pass-through for future params if needed
      }
    );

    const text = await resp.text();
    // Return the raw JSON/text as-is with original status code
    return new NextResponse(text, {
      status: resp.status,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "application/json",
        // Allow device calls (React Native/Web) — adjust to specific origin in prod
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: true,
        message: error?.message || "Failed to create HeyGen streaming token",
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
