import { useEffect, useMemo, useState } from "react";

const PRICE_MENSAL = "price_1SDOpXHYBqPSlTajkki9zjy6";   // subscription (cartão)
const PRICE_IA_ADDON = "price_1SDOpuHYBqPSlTajSvMh1eZJ"; // one-time (cartão)
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type SessionSummary = {
  id: string;
  mode: "payment" | "subscription";
  payment_status?: string;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  priceId?: string | null;
};

export default function BillingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("teste+insightflow@example.com");
  const [success, setSuccess] = useState<SessionSummary | null>(null);

  const qs = useMemo(() => new URLSearchParams(window.location.search), []);
  const sessionId = qs.get("session_id");
  const didSucceed =
    qs.get("checkout") === "success" || qs.get("one_time") === "success";

  // Busca detalhes da sessão para confirmar no UI após o retorno do Stripe
  useEffect(() => {
    const run = async () => {
      if (!didSucceed || !sessionId) return;
      try {
        const res = await fetch(`${API}/api/billing/checkout/session/${sessionId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const { session } = await res.json();

        // Monta um resumo amigável
        const summary: SessionSummary = {
          id: session.id,
          mode: session.mode,
          payment_status: session.payment_status,
          amount_total: session.amount_total ?? null,
          currency: session.currency ?? null,
          customer_email:
            session.customer_details?.email ?? session.customer_email ?? null,
          priceId:
            session?.line_items?.data?.[0]?.price?.id ??
            session?.metadata?.priceId ??
            null,
        };
        setSuccess(summary);
      } catch (e: unknown) {
        setError(
          `Não foi possível confirmar o pagamento (session_id=${sessionId}).`
        );
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [didSucceed, sessionId]);

  async function startCheckout(path: string, priceId: string) {
    try {
      setError(null);
      setLoading(path);

      if (!email || !email.includes("@")) {
        throw new Error("Informe um e-mail válido.");
      }

      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, customerEmail: email }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json(); // { url, sessionId }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Resposta sem URL do checkout.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Falha ao iniciar checkout.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-4 grid gap-3 max-w-md">
      <h2 className="text-xl font-semibold">Pagamentos (TEST)</h2>

      {/* Mensagem de sucesso após retorno do Stripe */}
      {success && (
        <div className="rounded-lg border p-3 text-sm bg-green-50">
          <div className="font-medium">Pagamento confirmado ✅</div>
          <div>Modo: {success.mode}</div>
          <div>Status: {success.payment_status}</div>
          {success.amount_total != null && success.currency && (
            <div>
              Valor: {(success.amount_total / 100).toFixed(2)}{" "}
              {success.currency.toUpperCase()}
            </div>
          )}
          {success.customer_email && <div>Email: {success.customer_email}</div>}
          {success.priceId && <div>Price: {success.priceId}</div>}
          <div className="text-xs text-neutral-500">Session: {success.id}</div>
        </div>
      )}

      <label className="grid gap-1 text-sm">
        <span>E-mail do cliente (TEST)</span>
        <input
          className="border rounded-md px-3 py-2"
          type="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <button
        className="rounded-xl px-4 py-2 border"
        disabled={loading !== null}
        onClick={() =>
          startCheckout("/api/billing/checkout/session", PRICE_MENSAL)
        }
      >
        {loading === "/api/billing/checkout/session"
          ? "Redirecionando…"
          : "Assinar Plano Mensal (cartão)"}
      </button>

      <button
        className="rounded-xl px-4 py-2 border"
        disabled={loading !== null}
        onClick={() => startCheckout("/api/checkout/pix/session", PRICE_IA_ADDON)}
      >
        {loading === "/api/checkout/pix/session"
          ? "Redirecionando…"
          : "Comprar IA 30 dias (cartão)"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <p className="text-xs text-neutral-500">
        Modo TEST — use 4242 4242 4242 4242 para cartão. O Pix será reativado
        quando a conta Stripe habilitar o método.
      </p>
    </div>
  );
}
