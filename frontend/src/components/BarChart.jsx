export default function BarChart({ data, height = 170 }) {
  if (!data?.length) return null;

  const max = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 30;

  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const barHeight = Math.max((d.value / max) * chartHeight, 3);
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 min-w-0 group"
          >
            <div className="relative w-full flex justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-semibold text-emerald-900 bg-white border border-stone-100 rounded px-1.5 py-0.5 shadow-sm whitespace-nowrap pointer-events-none">
                {d.value.toFixed(2)} €
              </span>
              <div
                className="w-full max-w-9 rounded-t bg-emerald-900/15 group-hover:bg-emerald-900/70 transition-colors"
                style={{ height: barHeight }}
                title={`${d.label} : ${d.value.toFixed(2)} €`}
              />
            </div>
            <span className="text-[10px] text-stone-400 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
