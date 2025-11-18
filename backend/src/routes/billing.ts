// src/routes/billing.ts
import { Router } from "express";
import { env } from "../env";
import { getStripeClient } from "../lib/stripe";

const router = Router();

/**
 * POST /api/billing/checkout/session
 * Body: { customerEmail: string; customerName?: string; priceId: string }
 * Cria uma Stripe Checkout Session em modo "subscription" (cartão).
 */
router.post("/checkout/session", async (req, res) => {
  try {
    const { customerEmail, customerName, priceId } = req.body ?? {};
    if (!priceId || !customerEmail) {
      return res
        .status(400)
        .json({ error: "priceId e customerEmail são obrigatórios" });
    }

    const stripe = getStripeClient();

    // (Opcional) checar tipo do price para evitar engano
    const price = await stripe.prices.retrieve(priceId);
    if (price.type !== "recurring") {
      return res
        .status(400)
        .json({ error: "Price precisa ser do tipo subscription (recurring)" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: customerEmail, // evita criar customer manual toda vez
      line_items: [{ price: priceId, quantity: 1 }],

      // Se quiser forçar só cartão, descomente:
      // payment_method_types: ["card"],

      // Retornar com session_id ajuda o frontend a confirmar a compra
      success_url: `${env.APP_BASE_URL}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.APP_BASE_URL}/?checkout=canceled`,

      // Metadados úteis para conciliação
      metadata: {
        product_context: "Plano Mensal Box",
        customer_name: customerName || "",
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing] /checkout/session error:", msg);
    return res.status(500).json({ error: msg || "erro ao criar sessão" });
  }
});

/**
 * GET /api/billing/checkout/session/:id
 * Retorna detalhes da Checkout Session para confirmar no frontend após o retorno
 */
router.get("/checkout/session/:id", async (req, res) => {
  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.id, {
      expand: ["payment_intent", "subscription", "line_items.data.price"],
    });
    return res.json({ session });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing] GET /checkout/session/:id error:", msg);
    return res.status(400).json({ error: msg });
  }
});

export default router;
