export default function MetricBar({ label, value, color = '#6366f1', warn = false }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-slate-400 truncate">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${Math.round(value * 100)}%`,
            background: warn && value > 0.6 ? '#ef4444' : color,
          }}
        />
      </div>
      <span className="w-8 text-right text-slate-500">{Math.round(value * 100)}</span>
    </div>
  );
}
