// src/services/payments.ts
import Stripe from "stripe";
import { prisma } from "../lib/prisma";

/**
 * Checkout Session → cria Payment e Subscription (se existir no session)
 */
export async function upsertFromCheckoutSession(
  session: Stripe.Checkout.Session,
) {
  const mode = session.mode ?? "payment";
  const email =
    (session.customer_details?.email ?? session.customer_email) || undefined;
  const customerId =
    typeof session.customer === "string" ? session.customer : undefined;

  const priceId =
    session.line_items?.data?.[0]?.price?.id ||
    ((session as any).metadata?.priceId as string | undefined);

  const amount = session.amount_total ?? undefined;
  const currency = session.currency ?? undefined;

  // Sempre cria um Payment (mesmo em subscription)
  await prisma.payment.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      priceId,
      customerEmail: email,
      amount,
      currency,
      status: (session.payment_status as string) || "unpaid",
      mode,
    },
    update: {
      stripeCustomerId: customerId,
      priceId,
      customerEmail: email,
      amount,
      currency,
      status: (session.payment_status as string) || "unpaid",
      mode,
    },
  });

  // Se for assinatura → cria a Subscription inicial
  if (mode === "subscription" && typeof session.subscription === "string") {
    await prisma.subscription.upsert({
      where: { stripeSubId: session.subscription },
      create: {
        stripeSubId: session.subscription,
        stripeCustomerId: customerId,
        priceId,
        customerEmail: email,
        status: "incomplete",
      },
      update: {
        stripeCustomerId: customerId,
        priceId,
        customerEmail: email,
      },
    });
  }
}

/**
 * Payment Intent → atualiza um Payment existente
 */
export async function updateFromPaymentIntent(pi: Stripe.PaymentIntent) {
  const intentId = pi.id;
  const amount = typeof pi.amount === "number" ? pi.amount : undefined;
  const currency = pi.currency ?? undefined;
  const email = (pi.receipt_email as string | undefined) ?? undefined;
  const customerId = typeof pi.customer === "string" ? pi.customer : undefined;

  await prisma.payment.upsert({
    where: { stripeIntentId: intentId },
    create: {
      stripeSessionId: `unknown_${intentId}`,
      stripeIntentId: intentId,
      stripeCustomerId: customerId,
      customerEmail: email,
      amount,
      currency,
      status: pi.status,
      mode: "payment",
    },
    update: {
      stripeCustomerId: customerId,
      customerEmail: email,
      amount,
      currency,
      status: pi.status,
    },
  });
}

/**
 * Subscription Updated Event (webhook)
 */
export async function updateFromSubscriptionEvent(sub: Stripe.Subscription) {
  const status = sub.status;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : undefined;
  const price = sub.items.data[0]?.price?.id;

  // Campo correto no Stripe
  const currentPeriodEnd =
    typeof sub.current_period_end === "number"
      ? new Date(sub.current_period_end * 1000)
      : null;

  await prisma.subscription.upsert({
    where: { stripeSubId: sub.id },
    create: {
      stripeSubId: sub.id,
      stripeCustomerId: customerId,
      priceId: price,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? undefined,
    },
    update: {
      stripeCustomerId: customerId,
      priceId: price ?? undefined,
      status,
      currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? undefined,
    },
  });
}
