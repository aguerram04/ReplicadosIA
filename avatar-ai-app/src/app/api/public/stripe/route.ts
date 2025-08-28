import { NextResponse } from "next/server";

export async function GET() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    "";
  const buyButtonId = process.env.NEXT_PUBLIC_STRIPE_BUY_BUTTON_ID || "";
  const priceId =
    process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100 ||
    process.env.STRIPE_PRICE_CREDITS_100 ||
    "";
  return NextResponse.json({ publishableKey, buyButtonId, priceId });
}
