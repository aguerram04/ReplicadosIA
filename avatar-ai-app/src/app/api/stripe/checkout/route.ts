import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { findPlanByPriceId } from "@/config/pricing";

type Body = {
  priceId?: string;
  mode?: "payment" | "subscription";
  quantity?: number;
  metadata?: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    const priceId = body.priceId;
    const mode = body.mode || "payment";
    const quantity = Math.max(1, Number(body.quantity || 1));

    if (!priceId) {
      return NextResponse.json({ error: "priceId requerido" }, { status: 400 });
    }

    const baseUrl =
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      new URL(req.url).origin;

    const stripe = getStripe();

    const plan = findPlanByPriceId(priceId);
    const inferredCreditsPerUnit = plan?.credits;
    const totalCredits = inferredCreditsPerUnit
      ? inferredCreditsPerUnit * quantity
      : undefined;

    const checkout = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity,
        },
      ],
      customer_email: session.user.email as string,
      success_url: `${baseUrl}/account?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account?canceled=1`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      automatic_tax: { enabled: true },
      metadata: {
        userId: String((session.user as any).id || ""),
        planPriceId: priceId,
        ...(body.metadata || {}),
        ...(typeof totalCredits === "number"
          ? { credits: String(totalCredits) }
          : {}),
      },
    });

    return NextResponse.json(
      { id: checkout.id, url: checkout.url },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Stripe checkout error" },
      { status: 500 }
    );
  }
}
