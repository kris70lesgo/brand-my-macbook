import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import express from "express";
import { createClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "plan-my-mapbook-logos";
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

type CheckoutRequest = {
  slotId: number;
  bidAmount: number;
  brandName: string;
  contactName: string;
  companyName: string;
  email: string;
  website?: string;
  xHandle?: string;
};

const required = (value: unknown, max: number) =>
  typeof value === "string" && value.trim().length > 0 && value.trim().length <= max
    ? value.trim()
    : null;

function config() {
  const values = {
    supabaseUrl: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    dodoApiKey: process.env.DODO_PAYMENTS_API_KEY,
    dodoWebhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
    dodoProductId: process.env.DODO_CONTRIBUTION_PRODUCT_ID,
  };
  if (Object.values(values).some((value) => !value)) {
    throw new Error("Plan My Mapbook payment integration is not configured.");
  }
  return values as Record<keyof typeof values, string>;
}

async function getDodo() {
  const values = config();
  // Delay loading the payment SDK until a payment route is called. This keeps
  // read-only auction routes available in serverless runtimes during cold start.
  const { default: DodoPayments } = await import("dodopayments");
  return new DodoPayments({
    bearerToken: values.dodoApiKey,
    webhookKey: values.dodoWebhookKey,
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
  });
}

function getSupabase() {
  const values = config();
  return createClient(values.supabaseUrl, values.serviceRoleKey, { auth: { persistSession: false } });
}

function validatedCheckout(body: unknown): CheckoutRequest | null {
  if (!body || typeof body !== "object") return null;
  const input = body as Record<string, unknown>;
  const slotId = Number(input.slotId);
  const bidAmount = Number(input.bidAmount);
  const brandName = required(input.brandName, 120);
  const contactName = required(input.contactName, 120);
  const companyName = required(input.companyName, 160);
  const email = required(input.email, 320);
  if (!Number.isInteger(slotId) || !Number.isFinite(bidAmount) || bidAmount <= 0 || !brandName || !contactName || !companyName || !email || !/^\S+@\S+\.\S+$/.test(email)) return null;
  const website = typeof input.website === "string" && input.website.trim() ? input.website.trim() : undefined;
  const xHandle = typeof input.xHandle === "string" && input.xHandle.trim() ? input.xHandle.trim() : undefined;
  if (website) {
    try { new URL(website); } catch { return null; }
  }
  return { slotId, bidAmount: Math.round(bidAmount * 100) / 100, brandName, contactName, companyName, email, website, xHandle };
}

function metadataFor(input: CheckoutRequest, token: string, depositCents: number) {
  return {
    app: "plan_my_mapbook",
    checkout_token: token,
    slot_id: String(input.slotId),
    bid_amount: String(input.bidAmount),
    deposit_cents: String(depositCents),
    brand_name: input.brandName,
    contact_name: input.contactName,
    company_name: input.companyName,
    email: input.email,
    website: input.website ?? "",
    x_handle: input.xHandle ?? "",
  };
}

function dataUrlToLogo(dataUrl: unknown) {
  if (typeof dataUrl !== "string") return null;
  const match = /^data:(image\/(?:png|jpeg)|image\/svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > MAX_LOGO_BYTES) return null;
  const extension = match[1] === "image/png" ? "png" : match[1] === "image/jpeg" ? "jpg" : "svg";
  return { bytes, contentType: match[1], extension };
}

export function attachPlanMyMapbookApi(app: Express) {
  app.post("/api/dodo/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const dodo = await getDodo();
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
      const headers = ["webhook-id", "webhook-signature", "webhook-timestamp"].reduce<Record<string, string>>((result, name) => {
        const value = req.header(name);
        if (value) result[name] = value;
        return result;
      }, {});
      const event = dodo.webhooks.unwrap(rawBody, { headers, key: config().dodoWebhookKey });
      if (event.type !== "payment.succeeded" || event.data.metadata.app !== "plan_my_mapbook") {
        res.status(200).json({ received: true });
        return;
      }
      const meta = event.data.metadata;
      const token = String(meta.checkout_token ?? "");
      const slotId = Number(meta.slot_id);
      const bidAmount = Number(meta.bid_amount);
      const depositCents = Number(meta.deposit_cents);
      if (!/^[0-9a-f-]{36}$/i.test(token) || !Number.isInteger(slotId) || !Number.isFinite(bidAmount) || !Number.isInteger(depositCents) || event.data.total_amount !== depositCents) throw new Error("Invalid payment metadata");

      const supabase = getSupabase();
      const eventId = req.header("webhook-id");
      if (!eventId) throw new Error("Missing webhook id");
      const { error: eventError } = await supabase.from("plan_my_mapbook_webhook_events").insert({ dodo_event_id: eventId, event_type: event.type });
      if (eventError?.code === "23505") { res.status(200).json({ received: true }); return; }
      if (eventError) throw eventError;
      const { error } = await supabase.from("plan_my_mapbook_bids").upsert({
        checkout_token: token,
        dodo_payment_id: event.data.payment_id,
        dodo_webhook_id: eventId,
        slot_id: slotId,
        bid_amount: bidAmount,
        deposit_amount: depositCents / 100,
        currency: "USD",
        brand_name: String(meta.brand_name ?? ""),
        contact_name: String(meta.contact_name ?? ""),
        company_name: String(meta.company_name ?? ""),
        email: String(meta.email ?? ""),
        website: String(meta.website ?? "") || null,
        x_handle: String(meta.x_handle ?? "") || null,
      }, { onConflict: "dodo_payment_id" });
      if (error) throw error;
      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Dodo webhook rejected", error);
      res.status(400).json({ error: "Invalid webhook" });
    }
  });

  app.use(express.json({ limit: "7mb" }));

  app.get("/api/slots", async (_req, res) => {
    try {
      const supabase = getSupabase();
      const [{ data: inventory, error: inventoryError }, { data: bids, error: bidsError }] = await Promise.all([
        supabase.from("plan_my_mapbook_slots").select("id, position, size, dimensions, minimum_bid, class_name, tone").order("id"),
        supabase.from("plan_my_mapbook_bids").select("slot_id, bid_amount, brand_name, logo_path, payment_status").order("bid_amount", { ascending: false }),
      ]);
      if (inventoryError || bidsError) throw inventoryError ?? bidsError;
      const bySlot = new Map<number, { bid_amount: number; brand_name: string; logo_path: string | null; payment_status: string; count: number }>();
      for (const bid of bids ?? []) {
        const current = bySlot.get(bid.slot_id);
        bySlot.set(bid.slot_id, current ? { ...current, count: current.count + 1 } : { bid_amount: Number(bid.bid_amount), brand_name: bid.brand_name, logo_path: bid.logo_path, payment_status: bid.payment_status, count: 1 });
      }
      const slots = await Promise.all((inventory ?? []).map(async (slot) => {
        const current = bySlot.get(slot.id);
        let logoUrl: string | null = null;
        if (current?.payment_status === "complete" && current.logo_path) {
          const { data, error } = await supabase.storage.from(LOGO_BUCKET).createSignedUrl(current.logo_path, 3600);
          if (error) throw error;
          logoUrl = data.signedUrl;
        }
        return { id: slot.id, position: slot.position, size: slot.size, dimensions: slot.dimensions, minimumBid: Number(slot.minimum_bid), className: slot.class_name, tone: slot.tone, price: current?.bid_amount ?? Number(slot.minimum_bid), bids: current?.count ?? 0, brand: current?.brand_name ?? null, logoUrl };
      }));
      res.json(slots);
    } catch (error) {
      console.error("Unable to load live auction", error);
      res.status(500).json({ error: "Unable to load auction inventory." });
    }
  });

  app.post("/api/waitlist", async (req, res) => {
    const email = required(req.body?.email, 320);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { res.status(400).json({ error: "Enter a valid email address." }); return; }
    const { error } = await getSupabase().from("plan_my_mapbook_waitlist").insert({ email: email.toLowerCase() });
    if (error && error.code !== "23505") { console.error("Waitlist save failed", error); res.status(500).json({ error: "Unable to save your email. Please try again." }); return; }
    res.status(201).json({ joined: true });
  });

  app.post("/api/checkout", async (req: Request, res: Response) => {
    try {
      const input = validatedCheckout(req.body);
      if (!input) { res.status(400).json({ error: "Please complete every required field with valid values." }); return; }
      const supabase = getSupabase();
      const { data: slot, error: slotError } = await supabase.from("plan_my_mapbook_slots").select("minimum_bid").eq("id", input.slotId).maybeSingle();
      if (slotError) throw slotError;
      if (!slot || input.bidAmount < Number(slot.minimum_bid)) { res.status(400).json({ error: "Your bid must meet this spot's current minimum." }); return; }
      const checkoutToken = crypto.randomUUID();
      // The product has a $10 floor, while every server-approved slot minimum keeps
      // its 20% deposit above that floor. Never accept a client-calculated deposit.
      const depositCents = Math.round(input.bidAmount * 20);
      const origin = `${req.protocol}://${req.get("host")}`;
      const testBypassEnabled = process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_PAYMENT_BYPASS === "true";

      if (testBypassEnabled) {
        const { count, error: testCountError } = await supabase
          .from("plan_my_mapbook_bids")
          .select("id", { count: "exact", head: true })
          .like("dodo_payment_id", "test_%");
        if (testCountError) throw testCountError;
        if ((count ?? 0) >= 1) {
          res.status(409).json({ error: "The one development test purchase has already been used." });
          return;
        }

        const { error: testBidError } = await supabase.from("plan_my_mapbook_bids").insert({
          checkout_token: checkoutToken,
          dodo_payment_id: `test_${checkoutToken}`,
          slot_id: input.slotId,
          bid_amount: input.bidAmount,
          deposit_amount: depositCents / 100,
          currency: "USD",
          brand_name: input.brandName,
          contact_name: input.contactName,
          company_name: input.companyName,
          email: input.email,
          website: input.website ?? null,
          x_handle: input.xHandle ?? null,
          payment_status: "logo_pending",
        });
        if (testBidError) throw testBidError;
        res.json({ checkoutUrl: `${origin}/?checkout_token=${checkoutToken}`, checkoutToken, testBypass: true });
        return;
      }

      const dodo = await getDodo();
      const session = await dodo.checkoutSessions.create({
        product_cart: [{ product_id: config().dodoProductId, quantity: 1, amount: depositCents }],
        customer: { email: input.email, name: input.contactName },
        customer_business_name: input.companyName,
        metadata: metadataFor(input, checkoutToken, depositCents),
        return_url: `${origin}/?checkout_token=${checkoutToken}`,
        cancel_url: `${origin}/?checkout_cancelled=1`,
      });
      if (!session.checkout_url) throw new Error("Dodo did not return a checkout URL.");
      res.json({ checkoutUrl: session.checkout_url, checkoutToken });
    } catch (error) {
      console.error("Checkout creation failed", error);
      res.status(500).json({ error: "Unable to start secure checkout. Please try again." });
    }
  });

  app.get("/api/bids/status/:checkoutToken", async (req, res) => {
    const { data, error } = await getSupabase().from("plan_my_mapbook_bids").select("payment_status").eq("checkout_token", req.params.checkoutToken).maybeSingle();
    if (error) { res.status(500).json({ error: "Unable to check payment status." }); return; }
    res.json({ paid: Boolean(data), complete: data?.payment_status === "complete" });
  });

  app.post("/api/bids/complete", async (req, res) => {
    try {
      const checkoutToken = typeof req.body?.checkoutToken === "string" ? req.body.checkoutToken : "";
      const logo = dataUrlToLogo(req.body?.logoDataUrl);
      if (!/^[0-9a-f-]{36}$/i.test(checkoutToken) || !logo) { res.status(400).json({ error: "A valid paid bid and logo are required." }); return; }
      const supabase = getSupabase();
      const { data: bid, error: bidError } = await supabase.from("plan_my_mapbook_bids").select("id, payment_status").eq("checkout_token", checkoutToken).maybeSingle();
      if (bidError) throw bidError;
      if (!bid) { res.status(409).json({ error: "Payment is still being confirmed. Please retry in a moment." }); return; }
      if (bid.payment_status === "complete") { res.json({ complete: true }); return; }
      const path = `${bid.id}/logo.${logo.extension}`;
      const { error: uploadError } = await supabase.storage.from(LOGO_BUCKET).upload(path, logo.bytes, { contentType: logo.contentType, upsert: false });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from("plan_my_mapbook_bids").update({ logo_path: path, payment_status: "complete", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", bid.id).eq("payment_status", "logo_pending");
      if (updateError) throw updateError;
      res.json({ complete: true });
    } catch (error) {
      console.error("Logo completion failed", error);
      res.status(500).json({ error: "Payment succeeded, but the logo could not be saved. Please retry." });
    }
  });
}
