import { useCallback, useEffect, useState } from "react";
import {
  BadgeDollarSign,
  Check,
  Crown,
  Loader2,
  Lock,
  Sparkles,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchProfileBilling } from "../lib/api";
import {
  BRAND_CREATION_PRICE_USD,
  captureOrder,
  confirmSubscription,
  createOrder,
  createSubscription,
  DEFAULT_FREE_DESIGNS,
  friendlyBillingError,
  PLANS,
  planByTier,
} from "../lib/billing";
import type { ProfileBilling } from "../lib/types";

/**
 * Le Barème — the subscriptions of EL ATELIER, paid through PayPal.
 * · L'Atelier (free): 2 designs. After that the gateway opens.
 * · Couture $100/mo: 1 brand creation + 5 images per month.
 * · Première $250/mo & La Luxe $500/mo: metered — billed upon usage,
 *   never unlimited.
 * · Brand creation: $50 one-time per brand.
 * No PayPal secret ever touches the browser — the `paypal` Edge Function
 * holds the credentials and returns only approval links.
 */
export default function BillingModal({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Subscriptions"
    >
      <div className="anim-fade-in relative my-8 w-full max-w-4xl rounded-3xl border border-border bg-on-primary p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close subscriptions"
          className="absolute right-4 top-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-secondary transition-colors duration-200 hover:bg-muted hover:text-primary"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            Le barème de la maison
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h2 className="font-heading mt-3 text-3xl font-medium text-primary">
            Subscriptions
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-secondary">
            {reason ??
              "Two designs are on the house. After that, a Couture subscription — or a $50 brand creation — opens the atelier. Première and La Luxe are metered: nothing is unlimited, everything is billed upon usage."}
          </p>
        </div>
        <BillingSection />
      </div>
    </div>
  );
}

export function BillingSection() {
  const { user } = useAuth();
  const [billing, setBilling] = useState<ProfileBilling | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSub, setPendingSub] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setBilling(await fetchProfileBilling(user.id));
    } catch {
      setBilling(null);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const currentPlan = planByTier(billing?.tier ?? "free");

  const subscribe = async (planId: string) => {
    setMessage(null);
    setBusy(planId);
    try {
      const { approveUrl, reference } = await createSubscription(planId);
      setPendingSub(reference);
      window.open(approveUrl, "_blank", "noopener");
      setMessage(
        "PayPal has opened in a new tab. Complete the payment there, then confirm here.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : friendlyBillingError("paypal failed"));
    } finally {
      setBusy(null);
    }
  };

  const confirm = async () => {
    if (!pendingSub) return;
    setBusy("confirm");
    setMessage(null);
    try {
      await confirmSubscription(pendingSub);
      setPendingSub(null);
      setMessage("Welcome to the maison — your subscription is active.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : friendlyBillingError("subscription check failed"));
    } finally {
      setBusy(null);
    }
  };

  const buyBrandCreation = async () => {
    setMessage(null);
    setBusy("brand");
    try {
      const { approveUrl, reference } = await createOrder({ purpose: "brand" });
      setPendingOrder(reference);
      window.open(approveUrl, "_blank", "noopener");
      setMessage(
        "PayPal has opened for the $50 brand creation. Complete the payment, then confirm here.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : friendlyBillingError("paypal failed"));
    } finally {
      setBusy(null);
    }
  };

  const confirmOrder = async () => {
    if (!pendingOrder) return;
    setBusy("confirm-order");
    setMessage(null);
    try {
      await captureOrder(pendingOrder);
      setPendingOrder(null);
      setMessage("The payment is captured — the atelier is open.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : friendlyBillingError("capture failed"));
    } finally {
      setBusy(null);
    }
  };

  const usageLabel = (b: ProfileBilling) => {
    if (b.tier === "free") {
      return `${b.designs_used} of ${DEFAULT_FREE_DESIGNS} designs used`;
    }
    if (b.tier === "couture") {
      return `${b.images_used} of 5 images · ${b.brands_created} of 1 brand this month`;
    }
    return `${b.images_used} images · ${b.brands_created} brands this month — metered`;
  };

  return (
    <div className="mt-8">
      {billing && (
        <div className="mx-auto mb-6 flex max-w-xl flex-col items-center gap-2 rounded-2xl border border-border bg-muted/40 px-5 py-3 text-center">
          <p className="flex items-center gap-2 text-sm font-semibold text-primary">
            <Crown className={`h-4 w-4 ${currentPlan.tier === "free" ? "text-secondary" : "text-gold"}`} aria-hidden="true" />
            {currentPlan.name} — ${currentPlan.priceUsd}/month
          </p>
          <p className="text-xs text-secondary">{usageLabel(billing)}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const active = billing?.tier === plan.tier;
          const featured = plan.tier === "couture";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-200 ${
                featured
                  ? "border-gold bg-gradient-to-b from-gold/10 to-on-primary shadow-md"
                  : "border-border bg-on-primary"
              } ${active ? "ring-2 ring-primary/30" : ""}`}
            >
              {featured && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-[0.6rem] font-bold tracking-widest text-on-primary uppercase">
                  Popular
                </span>
              )}
              <h3 className="font-heading text-lg font-semibold text-primary">{plan.name}</h3>
              <p className="mt-1 text-3xl font-medium text-primary">
                ${plan.priceUsd}
                <span className="text-xs font-normal text-secondary">/mo</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-secondary">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-xs leading-relaxed">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                    <span className="text-secondary">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {active ? (
                  <span className="btn-secondary w-full cursor-default text-sm">
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Current plan
                  </span>
                ) : plan.tier === "free" ? (
                  <span className="btn-ghost w-full cursor-default text-sm">L'Atelier</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => subscribe(plan.id)}
                    disabled={busy !== null}
                    className={featured ? "btn-primary w-full text-sm" : "btn-secondary w-full text-sm"}
                  >
                    {busy === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Lock className="h-4 w-4" aria-hidden="true" />
                    )}
                    {busy === plan.id ? "Opening PayPal…" : plan.cta}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* One-time brand creation */}
      <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-border bg-muted/30 p-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-violet/10 text-violet">
            <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              Found a brand, one time — ${BRAND_CREATION_PRICE_USD}
            </p>
            <p className="text-xs leading-relaxed text-secondary">
              No subscription needed. One brand creation, paid once, kept forever.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={buyBrandCreation}
          disabled={busy !== null}
          className="btn-primary shrink-0 text-sm"
        >
          {busy === "brand" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {busy === "brand" ? "Opening PayPal…" : "Create a brand — $50"}
        </button>
      </div>

      {pendingSub && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-secondary">
            Paid in the PayPal tab? Confirm to activate your subscription.
          </p>
          <button
            type="button"
            onClick={confirm}
            disabled={busy !== null}
            className="btn-primary shrink-0 text-sm"
          >
            {busy === "confirm" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            I've approved — activate
          </button>
        </div>
      )}

      {pendingOrder && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-gold/40 bg-gold/5 p-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-secondary">
            Paid in the PayPal tab? Confirm to capture the payment.
          </p>
          <button
            type="button"
            onClick={confirmOrder}
            disabled={busy !== null}
            className="btn-primary shrink-0 text-sm"
          >
            {busy === "confirm-order" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            I've approved — capture
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-center text-sm text-secondary"
        >
          {message}
        </p>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[0.65rem] text-secondary/70">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Payments are processed by PayPal — your card details never touch this
        atelier. Subscriptions and metered usage are billed by the `paypal` edge function.
      </p>
    </div>
  );
}
