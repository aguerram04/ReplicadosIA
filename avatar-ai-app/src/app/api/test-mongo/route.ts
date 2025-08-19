import { NextResponse } from "next/server";
import { findOrCreateUserByEmail } from "@/lib/db-helpers";

export async function GET() {
  try {
    const user = await findOrCreateUserByEmail("test@example.com", {
      name: "Test User",
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name ?? null,
        credits: user.credits,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
