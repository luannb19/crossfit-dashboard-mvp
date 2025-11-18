// src/services/payments.ts
import Stripe from "stripe";
import { prisma } from "../lib/prisma";

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

  // amount_total vem apenas após completed
  const amount = session.amount_total ?? undefined;
  const currency = session.currency ?? undefined;

  // 1) Sempre upsert em Payment (mesmo em subscription) para ter o histórico do checkout
  await prisma.payment.upsert({
    where: { stripeSessionId: session.id },
    create: {
      stripeSessionId: session.id,
      stripeCustomerId: customerId,
      priceId,
      customerEmail: email,
      amount: amount ?? undefined,
      currency: currency ?? undefined,
      status: (session.payment_status as string) || "unpaid",
      mode,
    },
    update: {
      stripeCustomerId: customerId,
      priceId,
      customerEmail: email,
      amount: amount ?? undefined,
      currency: currency ?? undefined,
      status: (session.payment_status as string) || "unpaid",
      mode,
    },
  });

  // 2) Se for assinatura e já tiver subscription no session, garante Subscription
  if (mode === "subscription" && typeof session.subscription === "string") {
    await prisma.subscription.upsert({
      where: { stripeSubId: session.subscription },
      create: {
        stripeSubId: session.subscription,
        stripeCustomerId: customerId,
        priceId,
        customerEmail: email,
        status: "incomplete", // será atualizado por eventos da Subscription/Invoice
      },
      update: {
        stripeCustomerId: customerId,
        priceId,
        customerEmail: email,
      },
    });
  }
}

export async function updateFromPaymentIntent(pi: Stripe.PaymentIntent) {
  const intentId = pi.id;
  const amount = typeof pi.amount === "number" ? pi.amount : undefined;
  const currency = pi.currency ?? undefined;
  const email = (pi.receipt_email as string | undefined) ?? undefined;
  const customerId = typeof pi.customer === "string" ? pi.customer : undefined;

  // amarre pelo intentId se já tiver Payment com esse intent (pode não ter; amarramos pelo session também)
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

export async function updateFromSubscriptionEvent(sub: Stripe.Subscription) {
  const status = sub.status;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : undefined;
  const price = sub.items.data[0]?.price?.id;
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : undefined;

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
