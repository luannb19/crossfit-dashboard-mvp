import { useDateRange } from "@/context/DateRangeContext";

export default function DateRangePicker() {
  const { range, setPreset } = useDateRange();

  const presets: { key: typeof range.preset; label: string }[] = [
    { key: "7d", label: "7d" },
    { key: "28d", label: "28d" },
    { key: "90d", label: "90d" },
    { key: "365d", label: "365d" },
  ];

  const baseBtn =
    "px-2 py-1 rounded-md text-sm border transition-colors";
  const active = "bg-black text-white border-black";
  const idle = "bg-white text-black hover:bg-gray-50";

  return (
    <div className="flex items-center gap-2">
      {presets.map((p) => (
        <button
          key={p.key}
          className={`${baseBtn} ${range.preset === p.key ? active : idle}`}
          onClick={() => setPreset(p.key)}
        >
          {p.label}
        </button>
      ))}
      <span className="ml-2 text-xs text-gray-500">
        {range.from} → {range.to}
      </span>
    </div>
  );
}
