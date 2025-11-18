// src/lib/stripe.ts
import Stripe from "stripe";
import { env } from "../env";

export const STRIPE_ENABLED = Boolean(env.STRIPE_SECRET);

function assertStripe() {
  if (!env.STRIPE_SECRET) {
    throw new Error(
      "Stripe desabilitado: defina STRIPE_SECRET no .env (sk_test_...)",
    );
  }
}

export function getStripeClient() {
  assertStripe();
  // Removido apiVersion para evitar conflito de typings
  return new Stripe(env.STRIPE_SECRET!);
}
