import { VINH_FOUNDATIONS, VINH_TARGETS } from '../utils/vinhScore';

const DIR_COLOR = { ok: '#4ade80', low: '#f59e0b', high: '#f87171' };

function DimRow({ foundation, dim }) {
  const color = dim ? DIR_COLOR[dim.dir] : '#475569';
  const label = dim ? dim.label : '—';
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-slate-700/40 last:border-0">
      <span className="text-base leading-none mt-0.5">{foundation.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold text-slate-200">{foundation.name}</span>
          <span className="text-xs font-bold truncate" style={{ color }}>{label}</span>
        </div>
        <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">{foundation.vinh}</p>
      </div>
    </div>
  );
}

export default function VinhPanel({ vinhScore, metrics }) {
  const matchPct = vinhScore?.matchPct ?? null;
  const dims = vinhScore?.dims ?? null;
  const tip = vinhScore?.tip ?? null;

  const ringColor = matchPct === null ? '#334155'
    : matchPct >= 75 ? '#4ade80'
    : matchPct >= 50 ? '#fbbf24'
    : '#f87171';

  const circumference = 2 * Math.PI * 28;
  const dash = matchPct !== null ? (matchPct / 100) * circumference : 0;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 pt-3 pb-2 border-b border-slate-700">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg width="64" height="64" className="rotate-[-90deg]">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke={ringColor} strokeWidth="5"
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.4s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold" style={{ color: ringColor }}>
              {matchPct !== null ? `${matchPct}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 leading-none">match</span>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-200 leading-tight">Vinh Giang</p>
          <p className="text-xs text-slate-500">5 Vocal Foundations</p>
          {tip && (
            <p className="text-xs text-amber-400 leading-tight mt-1 line-clamp-2">{tip}</p>
          )}
        </div>
      </div>

      {/* Foundations breakdown */}
      <div className="px-3 py-1">
        {VINH_FOUNDATIONS.map(f => (
          <DimRow key={f.key} foundation={f} dim={dims?.[f.key]} />
        ))}
      </div>

      {/* Coaching tip banner */}
      {tip && (
        <div className="mx-3 mb-3 mt-1 p-2 rounded-lg bg-amber-950/40 border border-amber-800/40">
          <p className="text-xs text-amber-300 leading-snug">
            <span className="font-semibold">Coach: </span>{tip}
          </p>
        </div>
      )}
    </div>
  );
}
