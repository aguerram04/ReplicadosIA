import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger, User } from "@/models";
import VendorLedger from "@/models/VendorLedger";
import {
  addCredits,
  findOrCreateUserByEmail,
  saveWebhookEvent,
} from "@/lib/db-helpers";
import { findPlanByPriceId } from "@/config/pricing";

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
        const plan = findPlanByPriceId(
          session.metadata?.planPriceId || priceId
        );
        // Fallback baseline: $1 = 1 crédito
        const fallbackDollarsToCredits =
          typeof amountTotal === "number" ? Math.floor(amountTotal / 100) : 0;
        const baseCredits =
          metadataCredits ?? plan?.credits ?? fallbackDollarsToCredits;

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

        // Apply per-user exchange factor ALWAYS (plan or fallback)
        const u = await User.findById(userId).lean();
        const pct = Math.max(
          0,
          Math.min(100, Number((u as any)?.dollarToCreditPct ?? 50))
        );
        const creditsToAdd = Math.floor(
          (Number(baseCredits) || 0) * (pct / 100)
        );
        if (creditsToAdd <= 0) break;
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

        // Record revenue and margin for purchase
        try {
          const revenueUsd = (amountTotal || 0) / 100;
          await VendorLedger.create({
            userId: (u as any)?._id,
            userEmail: (u as any)?.email,
            userName: (u as any)?.name ?? null,
            type: "purchase",
            vendor: "stripe",
            credits: creditsToAdd,
            vendorCostUsd: 0, // costo vendor se registra en consumo HeyGen
            revenueUsd,
            marginUsd: revenueUsd, // margen bruto inicial; el costo HeyGen se descuenta en consumos
            meta: { stripeSessionId: sessionId, priceId },
          });
        } catch {}

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
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as
          | string
          | undefined;
        const customerId = invoice.customer as string | undefined;
        const amountPaid = invoice.amount_paid || 0;
        const priceId = (invoice as any).lines?.data?.[0]?.price?.id as
          | string
          | undefined;

        // Idempotency: avoid double-crediting by invoice id
        const existing = await CreditLedger.findOne({
          reason: "purchase",
          "meta.invoiceId": String(invoice.id),
        }).lean();
        if (existing) break;

        // Resolve user
        await connectToDatabase();
        let userId: string | undefined;
        if (customerId) {
          const userByCustomer = await User.findOne({
            stripeCustomerId: customerId,
          }).lean();
          if (userByCustomer) userId = String(userByCustomer._id);
        }
        if (!userId) {
          const email = (invoice.customer_email || invoice.account_name || "")
            .toString()
            .trim();
          if (email) {
            const user = await findOrCreateUserByEmail(email);
            userId = user._id.toString();
          }
        }
        if (!userId) break;

        // Determine base credits via pricing config or fallback $1 = 1 credit
        const plan = findPlanByPriceId(priceId);
        const base = (plan?.credits ?? Math.floor(amountPaid / 100)) || 0;
        const u2 = await User.findById(userId).lean();
        const pct2 = Math.max(
          0,
          Math.min(100, Number((u2 as any)?.dollarToCreditPct ?? 50))
        );
        const credits = Math.floor(base * (pct2 / 100));
        if (credits <= 0) break;

        await addCredits(userId, credits, "purchase", {
          invoiceId: String(invoice.id),
          subscriptionId,
          customerId,
          priceId,
          amountPaid,
          currency: invoice.currency,
          eventType: event.type,
        });

        // Record recurring revenue in VendorLedger
        try {
          const revenueUsd = (amountPaid || 0) / 100;
          const urec = await User.findById(userId).lean();
          await VendorLedger.create({
            userId: (urec as any)?._id,
            userEmail: (urec as any)?.email,
            userName: (urec as any)?.name ?? null,
            type: "purchase",
            vendor: "stripe",
            credits,
            vendorCostUsd: 0,
            revenueUsd,
            marginUsd: revenueUsd,
            meta: { invoiceId: String(invoice.id), priceId },
          });
        } catch {}
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
