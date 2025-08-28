import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/mongodb";
import { CreditLedger } from "@/models";
import { addCredits, findOrCreateUserByEmail } from "@/lib/db-helpers";

type Body = { sessionId?: string };

export async function POST(req: Request) {
  try {
    const sessionAuth: any = await getServerSession(authOptions as any);
    if (!sessionAuth?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Body;
    let sessionId =
      body.sessionId ||
      new URL(req.url).searchParams.get("session_id") ||
      undefined;

    const stripe = getStripe();
    let checkout: any;
    if (sessionId) {
      checkout = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items.data.price"],
      });
    } else {
      // Fallback: no session_id in URL → buscar la sesión más reciente del usuario
      const sessions = await stripe.checkout.sessions.list({
        limit: 50,
        expand: ["data.line_items.data.price"],
        status: "complete",
      });
      const userRef =
        (sessionAuth.user as any).id || (sessionAuth.user as any)._id;
      checkout = sessions.data.find(
        (s: any) =>
          s.client_reference_id === String(userRef) &&
          s.payment_status === "paid"
      );
      if (!checkout) {
        return NextResponse.json(
          {
            error:
              "No se encontró una sesión de pago reciente para este usuario",
          },
          { status: 404 }
        );
      }
      sessionId = checkout.id;
    }

    await connectToDatabase();

    // Idempotencia: si ya registramos, salir
    const existing = await CreditLedger.findOne({
      reason: "purchase",
      "meta.stripeSessionId": sessionId,
    }).lean();
    if (existing) {
      return NextResponse.json({ ok: true, alreadyCredited: true });
    }

    const priceId = (checkout as any).line_items?.data?.[0]?.price?.id as
      | string
      | undefined;
    const amountTotal = checkout.amount_total || 0;
    const metadataCredits = checkout.metadata?.credits
      ? Number(checkout.metadata.credits)
      : undefined;
    const priceFor100 = process.env.STRIPE_PRICE_CREDITS_100;
    const fallback =
      typeof amountTotal === "number" ? Math.floor(amountTotal / 100) : 0;
    const computed =
      metadataCredits ??
      (priceFor100 && priceId === priceFor100 ? 100 : fallback);
    const creditsToAdd = Math.max(1, Number(computed));

    let userEmail = (
      checkout.customer_details?.email ||
      checkout.customer_email ||
      sessionAuth.user.email ||
      ""
    ).toString();
    const user = await findOrCreateUserByEmail(userEmail);

    await addCredits(user._id.toString(), creditsToAdd, "purchase", {
      stripeSessionId: sessionId,
      priceId,
      amountTotal,
      currency: checkout.currency,
      mode: checkout.mode,
      reconciled: true,
    });

    return NextResponse.json({ ok: true, credited: creditsToAdd });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Reconcile error" },
      { status: 500 }
    );
  }
}
