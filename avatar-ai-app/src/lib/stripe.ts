import Stripe from "stripe";
import { env } from "@/config/env";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Falta STRIPE_SECRET_KEY en variables de entorno");
    }
    stripeInstance = new Stripe(key, {
      // Match your installed Stripe SDK default; omit explicit apiVersion to avoid TS mismatch
    } as any);
  }
  return stripeInstance;
}
