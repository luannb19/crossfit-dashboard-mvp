import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type Payment = {
  id: string;
  stripeSessionId: string;
  stripeIntentId?: string | null;
  amount?: number | null;
  currency?: string | null;
  status: string;
  mode: string;
  customerEmail?: string | null;
  createdAt: string;
};

type Subscription = {
  id: string;
  stripeSubId: string;
  priceId?: string | null;
  status: string;
  currentPeriodEnd?: string | null;
  customerEmail?: string | null;
  createdAt: string;
};

export default function AdminBillingPanel() {
  const [pays, setPays] = useState<Payment[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function fetchAll() {
    setError(null);
    try {
      const [p1, p2] = await Promise.all([
        fetch(`${API}/api/admin/billing/payments?limit=20`, { credentials: "include" }),
        fetch(`${API}/api/admin/billing/subscriptions?limit=20`, { credentials: "include" }),
      ]);
      if (!p1.ok || !p2.ok) throw new Error("Falha ao carregar dados");
      const j1 = await p1.json();
      const j2 = await p2.json();
      setPays(j1.items || []);
      setSubs(j2.items || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Admin • Billing</h3>
        <button onClick={fetchAll} className="px-3 py-1 border rounded">Recarregar</button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <section className="grid gap-2">
        <h4 className="font-medium">Pagamentos recentes</h4>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Data</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Modo</th>
                <th className="p-2 text-left">Valor</th>
                <th className="p-2 text-left">Session</th>
              </tr>
            </thead>
            <tbody>
              {pays.map(p => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-2">{p.customerEmail || "-"}</td>
                  <td className="p-2">{p.status}</td>
                  <td className="p-2">{p.mode}</td>
                  <td className="p-2">
                    {p.amount != null && p.currency
                      ? `${(p.amount/100).toFixed(2)} ${p.currency.toUpperCase()}`
                      : "-"}
                  </td>
                  <td className="p-2 truncate max-w-[240px]" title={p.stripeSessionId}>
                    {p.stripeSessionId}
                  </td>
                </tr>
              ))}
              {pays.length === 0 && (
                <tr><td className="p-2 text-sm text-gray-500" colSpan={6}>Nenhum pagamento.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-2">
        <h4 className="font-medium">Assinaturas</h4>
        <div className="overflow-x-auto border rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">Criada</th>
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Status</th>
                <th className="p-2 text-left">Price</th>
                <th className="p-2 text-left">Renova em</th>
                <th className="p-2 text-left">Sub ID</th>
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-t">
                  <td className="p-2">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-2">{s.customerEmail || "-"}</td>
                  <td className="p-2">{s.status}</td>
                  <td className="p-2">{s.priceId || "-"}</td>
                  <td className="p-2">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString() : "-"}</td>
                  <td className="p-2 truncate max-w-[240px]" title={s.stripeSubId}>{s.stripeSubId}</td>
                </tr>
              ))}
              {subs.length === 0 && (
                <tr><td className="p-2 text-sm text-gray-500" colSpan={6}>Nenhuma assinatura.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
