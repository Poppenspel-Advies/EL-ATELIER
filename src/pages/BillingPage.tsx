import { BillingSection } from "../components/BillingModal";
import { useAuth } from "../lib/auth";
import { planByTier } from "../lib/billing";
import { fetchProfileBilling } from "../lib/api";
import { useEffect, useState } from "react";
import type { ProfileBilling } from "../lib/types";

/** Abonnement — the subscriptions of EL ATELIER, paid through PayPal. */
export default function BillingPage() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<ProfileBilling | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchProfileBilling(user.id).then(setBilling).catch(() => setBilling(null));
  }, [user]);

  const plan = planByTier(billing?.tier ?? "free");

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            Le barème de la maison
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            Abonnement
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            Two designs are on the house. Then the gateway opens: Couture at
            $100 a month (one brand creation and five images), or the metered
            Première and La Luxe plans at $250 and $500 — nothing is unlimited,
            everything is billed upon usage. A single brand creation can also
            be bought once, for $50.
          </p>
          {billing && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-on-primary px-4 py-1.5 text-xs text-secondary">
              Your plan · <span className="font-semibold text-primary">{plan.name}</span> — $
              {plan.priceUsd}/month
            </p>
          )}
        </div>
        <BillingSection />
      </div>
    </div>
  );
}
