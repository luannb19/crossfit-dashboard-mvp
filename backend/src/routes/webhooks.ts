// src/routes/webhooks.ts
import express, { Request, Response } from "express";
import Stripe from "stripe";
import {
  upsertFromCheckoutSession,
  updateFromPaymentIntent,
  updateFromSubscriptionEvent,
} from "../services/payments";

const router = express.Router();

// Montado como app.use("/api/webhooks/stripe", webhooksRouter) → POST /api/webhooks/stripe
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).send("Webhook secret ausente");
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      return res.status(400).send("Assinatura Stripe ausente");
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET || "");

    let event: Stripe.Event;
    try {
      // req.body é Buffer (por causa do express.raw)
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        webhookSecret,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[WEBHOOK] constructEvent error:", msg);
      return res.status(400).send(`Webhook Error: ${msg}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          await upsertFromCheckoutSession(session);
          console.log(
            "[WEBHOOK] checkout.session.completed persisted",
            session.id,
          );
          break;
        }
        case "payment_intent.succeeded":
        case "payment_intent.processing":
        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          await updateFromPaymentIntent(pi);
          console.log("[WEBHOOK] payment_intent.* persisted", pi.id, pi.status);
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          await updateFromSubscriptionEvent(sub);
          console.log("[WEBHOOK] subscription persisted", sub.id, sub.status);
          break;
        }
        default:
          console.log("[WEBHOOK] Event:", event.type);
      }
      return res.json({ received: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[WEBHOOK] handler error:", msg);
      return res.status(500).send("Internal webhook handler error");
    }
  },
);

export default router;
