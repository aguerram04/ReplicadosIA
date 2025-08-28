import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, User } from "@/models";
import {
  addCredits,
  findOrCreateUserByEmail,
  saveWebhookEvent,
} from "@/lib/db-helpers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 }
    );
  }

  const sig = req.headers.get("stripe-signature") || "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    // Persist raw event for audit/debugging
    const saved = await saveWebhookEvent("stripe", event.type, event);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        let userId =
          (session.metadata?.userId as string | undefined) ||
          (session.client_reference_id as string | undefined);

        const sessionId = session.id;
        const priceId =
          ((session as any).line_items?.data?.[0]?.price?.id as
            | string
            | undefined) ||
          (session as any).display_items?.[0]?.price?.id ||
          undefined;
        const amountTotal = session.amount_total || 0; // in cents
        const metadataCredits = session.metadata?.credits
          ? Number(session.metadata.credits)
          : undefined;

        // Compute credits:
        // 1) If metadata.credits is present, prefer it
        // 2) Else, if price equals STRIPE_PRICE_CREDITS_100 => grant exactly 100
        // 3) Else fallback: $1 = 1 crédito
        const priceFor100 =
          process.env.STRIPE_PRICE_CREDITS_100 ||
          process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100;
        const fallbackDollarsToCredits =
          typeof amountTotal === "number" ? Math.floor(amountTotal / 100) : 0;
        const computed =
          metadataCredits ??
          (priceFor100 && priceId === priceFor100
            ? 100
            : fallbackDollarsToCredits);
        const creditsToAdd = Math.max(1, Number(computed));

        await connectToDatabase();

        // If missing userId, try resolving by customer email
        if (!userId) {
          const email = (
            session.customer_details?.email ||
            session.customer_email ||
            ""
          ).toString();
          if (email) {
            const user = await findOrCreateUserByEmail(email);
            userId = user._id.toString();
          }
        }
        if (!userId) break;
        // Idempotency: skip if we already recorded this session
        const existing = await CreditLedger.findOne({
          reason: "purchase",
          "meta.stripeSessionId": sessionId,
        }).lean();
        if (existing) break;

        await addCredits(userId, creditsToAdd, "purchase", {
          stripeSessionId: sessionId,
          priceId,
          amountTotal,
          currency: session.currency,
          mode: session.mode,
        });

        // Persist stripeCustomerId on user if available
        if (session.customer && typeof session.customer === "string") {
          await User.updateOne(
            { _id: userId },
            { $set: { stripeCustomerId: session.customer } }
          );
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // Optional: handle subscription renewals later
        break;
      }
      default:
        break;
    }
    // Mark event as handled
    if (saved) {
      try {
        await (
          await import("@/models")
        ).WebhookEvent.updateOne(
          { _id: (saved as any)._id },
          { $set: { handledAt: new Date() } }
        );
      } catch {}
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
