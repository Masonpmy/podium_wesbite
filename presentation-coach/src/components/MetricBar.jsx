// target: { min, ideal, max } on 0–1 scale — renders a green zone overlay
export default function MetricBar({ label, value, color = '#6366f1', warn = false, target = null }) {
  const barColor = warn && value > 0.6 ? '#ef4444' : color;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 text-slate-400 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden relative">
        {/* Target zone highlight */}
        {target && (
          <div
            className="absolute top-0 h-full rounded-full opacity-30"
            style={{
              left: `${target.min * 100}%`,
              width: `${(target.max - target.min) * 100}%`,
              background: '#4ade80',
            }}
          />
        )}
        {/* Value bar */}
        <div
          className="h-full rounded-full transition-all duration-100 relative"
          style={{ width: `${Math.round(value * 100)}%`, background: barColor }}
        />
      </div>
      <span className="w-7 text-right text-slate-500 flex-shrink-0">{Math.round(value * 100)}</span>
    </div>
  );
}
