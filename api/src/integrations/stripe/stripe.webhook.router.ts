import { Router } from "express";
import express from "express";
import { stripe } from "./stripe.client";
import { env } from "../../config/env/env-validation";
import { creditTokensFromWebhook } from "../../modules/billing/billing.service";

const router = Router();

/** Stripe’s fee on the charge (BalanceTransaction.fee), in minor units; null if unavailable. */
async function stripeFeeCentsForCheckoutSession(sessionId: string): Promise<number | null> {
  try {
    const full = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent.latest_charge.balance_transaction"],
    });
    const pi = full.payment_intent;
    if (!pi || typeof pi === "string") return null;
    const charge = pi.latest_charge;
    if (!charge || typeof charge === "string") return null;
    const bt = charge.balance_transaction;
    if (!bt || typeof bt === "string") return null;
    const fee = bt.fee;
    return typeof fee === "number" && fee >= 0 ? fee : null;
  } catch (err) {
    console.warn("[stripe webhook] could not resolve balance transaction fee:", err);
    return null;
  }
}

router.post("/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  if (typeof sig !== "string") {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string | undefined> | null;
      amount_total?: number | null;
    };
    const meta = session.metadata;
    if (!meta?.userId || !meta?.packId || meta.tokens == null || meta.tokens === "") {
      console.warn("[stripe webhook] checkout.session.completed missing metadata");
      return res.json({ received: true });
    }

    const tokens = parseInt(meta.tokens, 10);
    if (!Number.isFinite(tokens) || tokens < 1) {
      console.warn("[stripe webhook] invalid tokens in metadata");
      return res.json({ received: true });
    }

    try {
      const stripeFeeCents = await stripeFeeCentsForCheckoutSession(session.id);
      await creditTokensFromWebhook(
        meta.userId,
        meta.packId,
        tokens,
        session.amount_total ?? 0,
        session.id,
        stripeFeeCents,
      );
    } catch (err) {
      console.error("Webhook processing error:", err);
      return res.status(500).json({ error: "Failed to credit tokens" });
    }
  }

  res.json({ received: true });
});

export default router;
