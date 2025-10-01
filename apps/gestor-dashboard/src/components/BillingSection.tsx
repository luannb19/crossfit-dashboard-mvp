import { useState } from "react";

const PRICE_MENSAL = "price_1SDBqmHYBqPSlTajIDLwzNFF";       // subscription (cartão)
const PRICE_IA_ADDON = "price_1SDBzdHYBqPSlTaj4d8ACMlV";     // one-time (Pix/cartão)

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function BillingSection() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("teste+insightflow@example.com"); // pode trocar

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

      const data = await res.json(); // espera { url: "https://checkout.stripe.com/..." }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Resposta sem URL do checkout.");
      }
    } catch (e: any) {
      setError(e.message ?? "Falha ao iniciar checkout.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-4 grid gap-3 max-w-md">
      <h2 className="text-xl font-semibold">Pagamentos (TEST)</h2>

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
        onClick={() => startCheckout("/api/billing/checkout/session", PRICE_MENSAL)}
      >
        {loading === "/api/billing/checkout/session" ? "Redirecionando…" : "Assinar Plano Mensal (cartão)"}
      </button>

      <button
        className="rounded-xl px-4 py-2 border"
        disabled={loading !== null}
        onClick={() => startCheckout("/api/checkout/pix/session", PRICE_IA_ADDON)}
      >
        {loading === "/api/checkout/pix/session" ? "Gerando QR Code…" : "Comprar IA 30 dias (Pix/cartão)"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <p className="text-xs text-neutral-500">
        Modo TEST — use 4242 4242 4242 4242 para cartão. Pix disponível no pagamento avulso.
      </p>
    </div>
  );
}
