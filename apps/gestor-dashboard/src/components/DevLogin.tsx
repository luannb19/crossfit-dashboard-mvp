import { useState } from "react";
import { fetchJSON, getToken, setToken, clearToken } from "@/lib/api";

export default function DevLogin() {
  const [input, setInput] = useState("");
  const [me, setMe] = useState<any>(null);
  const token = getToken();

  async function handlePing() {
    try {
      const data = await fetchJSON("/auth/me", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setMe(data);
    } catch (e: any) {
      setMe({ error: e?.message ?? "erro" });
    }
  }

  return (
    <div className="rounded-2xl border p-3 flex flex-col gap-2">
      <div className="text-sm font-medium">Dev Login</div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-md px-2 py-1 text-xs"
          placeholder="cole token | accessToken | jwt"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="px-2 py-1 text-xs rounded-md border"
          onClick={() => { setToken(input.trim()); setInput(""); }}
        >
          set
        </button>
        <button className="px-2 py-1 text-xs rounded-md border" onClick={() => clearToken()}>
          clear
        </button>
        <button className="px-2 py-1 text-xs rounded-md border" onClick={handlePing}>
          ping
        </button>
      </div>
      <div className="text-[11px] text-gray-600">
        token atual: {token ? "✅ carregado" : "⚠️ vazio"}
      </div>
      {me && (
        <pre className="text-[11px] bg-gray-50 p-2 rounded-md overflow-auto">
          {JSON.stringify(me, null, 2)}
        </pre>
      )}
    </div>
  );
}
