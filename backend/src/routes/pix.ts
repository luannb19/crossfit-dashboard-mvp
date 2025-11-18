import { Router } from "express";
import { env } from "../env";
import { getStripeClient } from "../lib/stripe";

const router = Router();

/**
 * POST /api/checkout/pix/session
 * Body: { customerEmail: string; customerName?: string; priceId: string }
 * Cria uma Stripe Checkout Session em modo "payment" (one-time) usando CARTÃO (temporário).
 */
router.post("/pix/session", async (req, res) => {
  try {
    const { customerEmail, customerName, priceId } = req.body ?? {};
    if (!priceId || !customerEmail) {
      return res
        .status(400)
        .json({ error: "priceId e customerEmail são obrigatórios" });
    }

    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      payment_method_types: ["card"], // <- por enquanto só cartão
      success_url: `${env.APP_BASE_URL}/?one_time=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_BASE_URL}/?one_time=canceled`,
      payment_intent_data: { setup_future_usage: undefined },
      metadata: {
        product_context: "IA Treinos 30 dias",
        customer_name: customerName || "",
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[one-time/card] stripe /checkout/pix/session error:", msg);
    return res
      .status(500)
      .json({ error: msg || "erro ao criar sessão one-time (cartão)" });
  }
});

export default router;
