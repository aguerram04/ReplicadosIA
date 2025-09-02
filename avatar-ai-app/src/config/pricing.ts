export type PricingPlan = {
  priceId: string;
  credits: number;
  label: string;
  marginPct: number; // margen bruto estimado sobre costo vendor
};

export const PRICING: PricingPlan[] = [
  {
    priceId:
      process.env.STRIPE_PRICE_CREDITS_100 ||
      (process.env.NEXT_PUBLIC_STRIPE_PRICE_CREDITS_100 as string) ||
      "",
    credits: 100,
    label: "Pack 100 créditos",
    marginPct: Number(process.env.MARGIN_PCT_PACK_100 || 30),
  },
];

export function findPlanByPriceId(priceId?: string | null) {
  if (!priceId) return undefined;
  return PRICING.find((p) => p.priceId && p.priceId === priceId);
}
