import React from "react";
import { usePeriod, PeriodDays } from "@/context/PeriodContext";

const OPTIONS: PeriodDays[] = [7, 28, 90, 365];

export default function PeriodSelector() {
  const { period, setPeriod, from, to } = usePeriod();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Período:</span>
      <div className="flex gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setPeriod(opt)}
            className={
              "px-3 py-1 rounded-full text-sm border transition " +
              (period === opt
                ? "bg-black text-white border-black"
                : "bg-white text-gray-800 border-gray-300 hover:bg-gray-50")
            }
            aria-pressed={period === opt}
          >
            {opt === 365 ? "365d" : `${opt}d`}
          </button>
        ))}
      </div>
      <span className="ml-2 text-xs text-gray-400">{from} → {to}</span>
    </div>
  );
}
