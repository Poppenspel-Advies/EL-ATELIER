import { createClient } from "jsr:@supabase/supabase-js@2";

/* ------------------------------------------------------------------ */
/*  PayPal gateway for EL ATELIER                                      */
/*                                                                    */
/*  · Subscriptions (monthly): Couture $100, Première $250, Luxe $500  */
/*    via the PayPal Subscriptions API (plans + subscriptions).        */
/*  · One-time orders: $50 brand creations and metered usage invoices  */
/*    via the PayPal Orders API (create → approve → capture).          */
/*                                                                    */
/*  Secrets (Edge Function secrets, never client-side):                */
/*    PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, optional PAYPAL_WEBHOOK_ID */
/*    PAYPAL_ENV = "sandbox" | "live" (default sandbox)                */
/* ------------------------------------------------------------------ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIERS: Record<string, string> = {
  atelier: "free",
  couture: "couture",
  premium: "premium",
  luxe: "luxe",
};

const PLAN_PRICE: Record<string, number> = {
  couture: 100,
  premium: 250,
  luxe: 500,
};

// Metered allowances per plan (beyond these, usage is billed per unit).
const METERED: Record<string, { brands: number; images: number; brandRate: number; imageRate: number }> = {
  premium: { brands: 2, images: 10, brandRate: 50, imageRate: 5 },
  luxe: { brands: 4, images: 25, brandRate: 40, imageRate: 3 },
};

const BRAND_PRICE = 50;

function paypalBase(): string {
  return (Deno.env.get("PAYPAL_ENV") ?? "sandbox") === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function paypalToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) {
    const err = new Error("PayPal isn't configured yet — add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
    (err as Error & { code?: string }).code = "paypal_not_configured";
    throw err;
  }
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed (${res.status}).`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function paypalFetch(token: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Content-Type", "application/json");
  return fetch(`${paypalBase()}${path}`, { ...init, headers });
}

/** Create (or reuse) a billing plan for a tier and return its id. */
async function ensurePlan(token: string, tier: string): Promise<string> {
  const price = PLAN_PRICE[tier];
  const names: Record<string, string> = {
    couture: "EL ATELIER — Couture",
    premium: "EL ATELIER — Première (metered)",
    luxe: "EL ATELIER — La Luxe (metered)",
  };
  const res = await paypalFetch(token, "/v1/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id: "EL-ATELIER-MAISON",
      name: names[tier] ?? "EL ATELIER",
      description: "EL ATELIER couture intelligence subscription.",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: { value: String(price), currency_code: "USD" } },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 2,
        setup_fee_failure_action: "CONTINUE",
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    // A plan may already exist from a previous run — if PayPal says so,
    // fall back to listing plans and matching the name.
    if (res.status === 400 || res.status === 422) {
      const list = await paypalFetch(token, "/v1/billing/plans?total_required=true");
      if (list.ok) {
        const data = await list.json();
        const match = data.plans?.find((p: { name?: string }) =>
          p.name === (names[tier] ?? "EL ATELIER"),
        );
        if (match?.id) return match.id;
      }
    }
    throw new Error(`PayPal plan creation failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.id as string;
}

/** Create a catalog product once (idempotent). */
async function ensureProduct(token: string): Promise<void> {
  const res = await paypalFetch(token, "/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      id: "EL-ATELIER-MAISON",
      name: "EL ATELIER",
      description: "Couture intelligence subscriptions and one-time creations.",
      type: "SERVICE",
      category: "DIGITAL_PRODUCTS",
    }),
  });
  if (!res.ok && res.status !== 409 && res.status !== 400) {
    throw new Error(`PayPal product creation failed (${res.status}).`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    // --- Verify the caller is a client of this project ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) {
      return json({ error: "Unauthorized", code: "unauthorized" }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser(token);
      if (data.user) userId = data.user.id;
    } catch {
      /* anon caller */
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    if (action === "report-usage") {
      // Count billed generations (designs / images / brands) for the client.
      if (!userId) return json({ error: "Sign in to track usage.", code: "unauthorized" }, 401);
      const designs = Math.max(0, Number(body?.designs) || 0);
      const images = Math.max(0, Number(body?.images) || 0);
      const brands = Math.max(0, Number(body?.brands) || 0);
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      const next = {
        designs_used: (profile?.designs_used ?? 0) + designs,
        images_used: (profile?.images_used ?? 0) + images,
        brands_created: (profile?.brands_created ?? 0) + brands,
        updated_at: new Date().toISOString(),
      };
      await supabase.from("profiles").update(next).eq("id", userId);
      return json({ ...(profile ?? {}), ...next });
    }

    const token = await paypalToken();

    if (action === "create-subscription") {
      if (!userId) return json({ error: "Sign in to subscribe.", code: "unauthorized" }, 401);
      const planId = String(body?.plan ?? "");
      const tier = TIERS[planId];
      if (!tier || tier === "free") {
        return json({ error: "That plan doesn't exist.", code: "bad_request" }, 400);
      }
      await ensureProduct(token);
      const plan = await ensurePlan(token, tier);
      const res = await paypalFetch(token, "/v1/billing/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          plan_id: plan,
          application_context: {
            brand_name: "EL ATELIER",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            user_action: "SUBSCRIBE_NOW",
            return_url: `${req.url.replace(/\/functions\/v1\/paypal.*$/, "")}/#/billing?paypal=subscribed`,
            cancel_url: `${req.url.replace(/\/functions\/v1\/paypal.*$/, "")}/#/billing?paypal=cancelled`,
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`PayPal couldn't create the subscription (${res.status}).`);
      }
      const data = await res.json();
      const approve = data.links?.find((l: { rel?: string }) => l.rel === "approve");
      if (!approve?.href) throw new Error("PayPal returned no approval link.");
      // Remember the pending subscription on the profile.
      await supabase.from("profiles").update({
        tier,
        paypal_subscription_id: data.id,
        paypal_status: "PENDING",
        plan_cycle_start: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      }).eq("id", userId);
      return json({ approveUrl: approve.href, reference: data.id });
    }

    if (action === "get-subscription") {
      if (!userId) return json({ error: "Sign in to confirm.", code: "unauthorized" }, 401);
      const subId = String(body?.subscription_id ?? "");
      const res = await paypalFetch(token, `/v1/billing/subscriptions/${subId}`);
      if (!res.ok) {
        throw new Error("PayPal couldn't verify the subscription.");
      }
      const sub = await res.json();
      const status = String(sub.status ?? "UNKNOWN");
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", userId)
        .maybeSingle();
      const tier = TIERS[profile?.tier ?? ""] ?? "free";
      if (status === "APPROVED" || status === "ACTIVE") {
        await supabase.from("profiles").update({
          tier,
          paypal_status: status,
          plan_cycle_start: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }).eq("id", userId);
      }
      return json({ status, tier: status === "APPROVED" || status === "ACTIVE" ? tier : "free" });
    }

    if (action === "create-order") {
      if (!userId) return json({ error: "Sign in to pay.", code: "unauthorized" }, 401);
      const purpose = String(body?.purpose ?? "");
      let amount = 0;
      let description = "";
      if (purpose === "brand") {
        amount = BRAND_PRICE;
        description = "EL ATELIER — one brand creation ($50)";
      } else if (purpose === "metered") {
        // Compute the metered overage from the client's usage counters.
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        const meta = METERED[profile?.tier ?? ""];
        if (!meta) return json({ error: "Metered billing requires a Première or Luxe plan.", code: "bad_request" }, 400);
        const extraBrands = Math.max(0, (profile?.brands_created ?? 0) - meta.brands);
        const extraImages = Math.max(0, (profile?.images_used ?? 0) - meta.images);
        amount = extraBrands * meta.brandRate + extraImages * meta.imageRate;
        description = `EL ATELIER — metered usage invoice (${extraBrands} brand(s), ${extraImages} image(s))`;
        if (amount <= 0) {
          return json({ error: "Your usage is within the plan's allowance.", code: "no_usage" }, 400);
        }
      } else {
        return json({ error: "Unknown order purpose.", code: "bad_request" }, 400);
      }
      const res = await paypalFetch(token, "/v2/checkout/orders", {
        method: "POST",
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              reference_id: `${purpose}:${userId}`,
              description,
              amount: { currency_code: "USD", value: String(amount) },
            },
          ],
          application_context: {
            brand_name: "EL ATELIER",
            locale: "en-US",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
          },
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`PayPal couldn't create the order (${res.status}).`);
      }
      const data = await res.json();
      const approve = data.links?.find((l: { rel?: string }) => l.rel === "approve");
      if (!approve?.href) throw new Error("PayPal returned no approval link.");
      return json({ approveUrl: approve.href, reference: data.id });
    }

    if (action === "capture-order") {
      if (!userId) return json({ error: "Sign in to capture.", code: "unauthorized" }, 401);
      const orderId = String(body?.order_id ?? "");
      const purpose = String(body?.purpose ?? "brand");
      const res = await paypalFetch(token, `/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text();
        if (res.status === 422 || text.includes("already been captured")) {
          // Idempotent — the order was already captured.
          if (purpose === "brand") {
            await supabase.rpc("increment_counter", {
              uid: userId,
              col: "brands_created",
              by: 1,
            }).catch(() => {});
          }
          return json({ status: "CAPTURED" });
        }
        throw new Error("PayPal couldn't capture the payment.");
      }
      const data = await res.json();
      if (purpose === "brand") {
        await supabase.rpc("increment_counter", {
          uid: userId,
          col: "brands_created",
          by: 1,
        }).catch(async () => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("brands_created")
            .eq("id", userId)
            .maybeSingle();
          await supabase.from("profiles").update({
            brands_created: (profile?.brands_created ?? 0) + 1,
            updated_at: new Date().toISOString(),
          }).eq("id", userId);
        });
      }
      return json({ status: data.status ?? "CAPTURED" });
    }

    if (action === "webhook") {
      // Server-side confirmation of subscription events. Requires the
      // PAYPAL_WEBHOOK_ID secret (configured in the PayPal dashboard).
      const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
      const raw = await req.text();
      if (!webhookId) {
        return json(
          { error: "Webhook verification isn't configured (PAYPAL_WEBHOOK_ID missing).", code: "bad_request" },
          501,
        );
      }
      const verify = await paypalFetch(token, "/v1/notifications/verify-webhook-signature", {
        method: "POST",
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: webhookId,
          webhook_event: JSON.parse(raw),
        }),
      });
      if (!verify.ok) return json({ error: "Webhook signature invalid.", code: "unauthorized" }, 401);
      const verdict = await verify.json();
      if (verdict.verification_status !== "SUCCESS") {
        return json({ error: "Webhook signature not verified.", code: "unauthorized" }, 401);
      }
      const event = JSON.parse(raw);
      const resource = event.resource ?? {};
      const subId = String(resource.id ?? "");
      if (event.event_type === "BILLING.SUBSCRIPTION.CANCELLED" || event.event_type === "BILLING.SUBSCRIPTION.EXPIRED") {
        await supabase.from("profiles").update({
          tier: "free",
          paypal_status: "CANCELLED",
          updated_at: new Date().toISOString(),
        }).eq("paypal_subscription_id", subId);
      }
      if (event.event_type === "BILLING.SUBSCRIPTION.ACTIVATED") {
        await supabase.from("profiles").update({
          paypal_status: "ACTIVE",
          updated_at: new Date().toISOString(),
        }).eq("paypal_subscription_id", subId);
      }
      return json({ received: true });
    }

    return json({ error: "Unknown action.", code: "bad_request" }, 400);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "upstream";
    const message = (err as Error)?.message ?? "The gateway encountered an error.";
    console.error("paypal error:", err);
    return json({ error: message, code }, code === "paypal_not_configured" ? 501 : 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
