import { supabase } from "./supabase";
import type { Plan, PlanTier, ProfileBilling } from "./types";

/* ------------------------------------------------------------------ */
/*  Le Barème — the subscription and usage catalogue of EL ATELIER.    */
/*                                                                    */
/*  · Atelier (free)  — 2 designs; after that, a Couture subscription  */
/*    or a $50 one-time brand creation unlocks the atelier.            */
/*  · Couture $100/mo — 1 brand creation + 5 rendered images / month.  */
/*  · Premium $250/mo — metered billing: nothing is unlimited, every   */
/*    image and design beyond the allowance is billed upon usage.      */
/*  · Luxe   $500/mo — the same metered model, at the house's top      */
/*    tier (lower per-unit rates).                                     */
/*                                                                    */
/*  All payments flow through PayPal (Orders for one-time charges,     */
/*  Subscriptions for monthly plans) via the `paypal` Edge Function —  */
/*  the client never sees a PayPal secret.                             */
/* ------------------------------------------------------------------ */

export const PLANS: Plan[] = [
  {
    id: "atelier",
    tier: "free",
    name: "L'Atelier",
    priceUsd: 0,
    cadence: "month",
    blurb: "Two designs to taste the maison.",
    features: [
      "2 designs, rendered",
      "The collection archive",
      "PDF dossier per creation",
      "The concierge, on the house",
    ],
    cta: "Current plan",
  },
  {
    id: "couture",
    tier: "couture",
    name: "Couture",
    priceUsd: 100,
    cadence: "month",
    blurb: "For the client who keeps creating.",
    features: [
      "Unlimited designs after the 2-design intro",
      "1 brand creation per month",
      "5 rendered images per month",
      "Films with their soundtrack",
      "The full booklet (Le Livret)",
    ],
    cta: "Subscribe with PayPal",
  },
  {
    id: "premium",
    tier: "premium",
    name: "Première",
    priceUsd: 250,
    cadence: "metered",
    blurb: "Metered billing — billed upon usage, never unlimited.",
    features: [
      "Everything in Couture",
      "2 brand creations per month",
      "Beyond the allowance, billed per use",
      "Songs in 4 languages",
      "Priority rendering",
    ],
    cta: "Subscribe with PayPal",
  },
  {
    id: "luxe",
    tier: "luxe",
    name: "La Luxe",
    priceUsd: 500,
    cadence: "metered",
    blurb: "The top tier of the house — metered, at the finest rates.",
    features: [
      "Everything in Première",
      "4 brand creations per month",
      "Lowest per-use rates",
      "Precious bridal finishes included",
      "A dedicated atelier liaison",
    ],
    cta: "Subscribe with PayPal",
  },
];

export const BRAND_CREATION_PRICE_USD = 50;

export const planByTier = (tier: PlanTier): Plan =>
  PLANS.find((p) => p.tier === tier) ?? PLANS[0];

export const DEFAULT_FREE_DESIGNS = 2;

/** Does this profile still have its free design allowance? */
export function freeAllowanceLeft(billing: ProfileBilling): boolean {
  return (
    billing.tier === "free" &&
    billing.designs_used < DEFAULT_FREE_DESIGNS
  );
}

/** One-time $50 brand creation is available to every signed-in client. */
export const brandCreationAvailable = () => true;

/* ------------------------------------------------------------------ */
/*  PayPal client — talks only to the `paypal` Edge Function.          */
/* ------------------------------------------------------------------ */

export interface PaypalApproval {
  approveUrl: string;
  reference: string;
}

async function invokePaypal<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("paypal", { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = await (error as { context?: Response }).context?.json();
      if (ctx?.error) message = ctx.error;
    } catch {
      /* keep default */
    }
    throw new Error(friendlyBillingError(message));
  }
  return data as T;
}

export function friendlyBillingError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("paypal") && m.includes("configured")) {
    return "PayPal isn't configured yet — the atelier will open the gateway shortly.";
  }
  if (m.includes("declined") || m.includes("not approved")) {
    return "PayPal didn't approve that payment — please try again.";
  }
  if (m.includes("cancelled") || m.includes("canceled")) {
    return "The payment was cancelled — no charge was made.";
  }
  return "The payment gateway couldn't complete that — please try again.";
}

/** Create a monthly subscription (Couture / Première / Luxe) → approval link. */
export async function createSubscription(planId: string): Promise<PaypalApproval> {
  return invokePaypal<PaypalApproval>({ action: "create-subscription", plan: planId });
}

/** One-time charge — a $50 brand creation, or a metered usage invoice. */
export async function createOrder(params: {
  purpose: "brand" | "metered";
  amountUsd?: number;
  note?: string;
}): Promise<PaypalApproval> {
  return invokePaypal<PaypalApproval>({
    action: "create-order",
    purpose: params.purpose,
    amount_usd: params.amountUsd,
    note: params.note,
  });
}

export async function captureOrder(orderId: string): Promise<{ status: string }> {
  return invokePaypal<{ status: string }>({ action: "capture-order", order_id: orderId });
}

/** After a subscription approval redirect — confirm the subscription state. */
export async function confirmSubscription(subscriptionId: string): Promise<{
  status: string;
  tier: PlanTier;
}> {
  return invokePaypal<{ status: string; tier: PlanTier }>({
    action: "get-subscription",
    subscription_id: subscriptionId,
  });
}

/**
 * Report a billed generation so the edge function can count it against the
 * client's plan (designs, images, brand creations).
 */
export async function reportUsage(params: {
  designs?: number;
  images?: number;
  brands?: number;
}): Promise<ProfileBilling> {
  return invokePaypal<ProfileBilling>({
    action: "report-usage",
    designs: params.designs ?? 0,
    images: params.images ?? 0,
    brands: params.brands ?? 0,
  });
}
