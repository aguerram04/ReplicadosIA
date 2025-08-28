import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models";

export async function POST() {
  try {
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripe();
    await connectToDatabase();

    // Ensure we have a Stripe customer for this user
    const email = String(session.user.email);
    const user = await User.findOne({ email });
    let customerId = user?.stripeCustomerId as string | undefined;

    if (!customerId) {
      // Try to find an existing customer by email
      const list = await stripe.customers.list({ email, limit: 1 });
      if (list.data.length > 0) {
        customerId = list.data[0].id;
      } else {
        const created = await stripe.customers.create({
          email,
          name: user?.name || undefined,
        });
        customerId = created.id;
      }
      if (customerId && user) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: { stripeCustomerId: customerId },
          }
        );
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { error: "Unable to resolve Stripe customer" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "";
    if (!baseUrl) {
      return NextResponse.json(
        { error: "Missing NEXTAUTH_URL for return_url" },
        { status: 500 }
      );
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: portal.url }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Stripe portal error" },
      { status: 500 }
    );
  }
}
