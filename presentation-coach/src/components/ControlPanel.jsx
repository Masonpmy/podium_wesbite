import MetricBar from './MetricBar';
import VinhPanel from './VinhPanel';
import { VINH_TARGETS } from '../utils/vinhScore';

const ASPECTS = [
  { key: 'volume', label: 'Volume' },
  { key: 'speechRate', label: 'Speech Rate' },
  { key: 'pitch', label: 'Pitch' },
  { key: 'tonality', label: 'Tonality' },
  { key: 'pauses', label: 'Pauses' },
  { key: 'malaysianNorms', label: '🇲🇾 MY Norms' },
];

export default function ControlPanel({
  micEnabled, onToggleMic,
  metrics, error, active,
  vinhScore,
  enabledAspects, onToggleAspect,
  genderMode, onGenderChange,
  ageRange, onAgeRangeChange,
  faceCount, onFaceCountChange,
  onRegenerateFaces,
}) {
  const { volume, speechRate, pitch, tonality, pauseDuration, isSpeaking, malaysianScore } = metrics;

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-100 tracking-tight">Presentation Coach</h1>
        <p className="text-xs text-slate-500 mt-0.5">Malaysian audience · Vinh Giang benchmarks</p>
      </div>

      {/* Mic control */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Microphone</span>
          <button
            onClick={onToggleMic}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              micEnabled ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            {micEnabled ? '⏹ Stop' : '🎙 Start'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {active && (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-green-400' : 'bg-slate-500'}`} />
            <span className="text-xs text-slate-400">{isSpeaking ? 'Speaking…' : 'Listening…'}</span>
          </div>
        )}
      </div>

      {/* Vinh Giang panel */}
      <VinhPanel vinhScore={vinhScore} metrics={metrics} />

      {/* Vocal metrics with target zones */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your Metrics</p>
          <span className="text-xs text-slate-600">🟩 = Vinh zone</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <MetricBar label="Volume"      value={volume}       color="#22c55e" target={VINH_TARGETS.volume} />
          <MetricBar label="Speech Rate" value={speechRate}   color="#3b82f6" warn target={VINH_TARGETS.speechRate} />
          <MetricBar label="Pitch"       value={pitch}        color="#a78bfa" target={VINH_TARGETS.pitch} />
          <MetricBar label="Tonality"    value={tonality}     color="#f59e0b" target={VINH_TARGETS.tonality} />
          <MetricBar label="Pause"       value={pauseDuration}color="#f97316" warn target={VINH_TARGETS.pause} />
        </div>
      </div>

      {/* Malaysian norms */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">🇲🇾 MY Norms</p>
        <div className="flex flex-col gap-1.5">
          <MetricBar label="Too Soft"      value={malaysianScore.tooSoft}     color="#ef4444" warn />
          <MetricBar label="Filler Rhythm" value={malaysianScore.fillerRhythm}color="#f59e0b" warn />
          <MetricBar label="Too Fast"      value={malaysianScore.tooFast}     color="#ef4444" warn />
          <MetricBar label="Monotone"      value={malaysianScore.monotone}    color="#ef4444" warn />
          <MetricBar label="Long Pause"    value={malaysianScore.longPause}   color="#f97316" warn />
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400">Issues</span>
          <span className={`text-xs font-bold ${malaysianScore.overall > 0.5 ? 'text-red-400' : malaysianScore.overall > 0.25 ? 'text-yellow-400' : 'text-green-400'}`}>
            {Math.round(malaysianScore.overall * 100)}%
          </span>
        </div>
      </div>

      {/* Aspect toggles */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Active Aspects</p>
        <div className="flex flex-col gap-1">
          {ASPECTS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={enabledAspects[key]} onChange={() => onToggleAspect(key)} className="w-3 h-3 accent-indigo-500" />
              <span className="text-xs text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Audience controls */}
      <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Audience</p>
        <div className="mb-3">
          <p className="text-xs text-slate-400 mb-1">Gender</p>
          <div className="flex gap-1">
            {['male', 'female', 'mixed'].map(g => (
              <button key={g} onClick={() => onGenderChange(g)}
                className={`flex-1 py-1 rounded text-xs font-medium capitalize transition-all ${genderMode === g ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Age Range</span><span>{ageRange[0]}–{ageRange[1]}</span>
          </div>
          <input type="range" min={15} max={59} value={ageRange[0]} onChange={e => onAgeRangeChange([+e.target.value, ageRange[1]])} className="slider-thumb w-full mb-1" />
          <input type="range" min={16} max={60} value={ageRange[1]} onChange={e => onAgeRangeChange([ageRange[0], +e.target.value])} className="slider-thumb w-full" />
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Audience Size</span><span>{faceCount}</span>
          </div>
          <input type="range" min={12} max={80} value={faceCount} onChange={e => onFaceCountChange(+e.target.value)} className="slider-thumb w-full" />
        </div>
        <button onClick={onRegenerateFaces} className="w-full py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-slate-200 transition-all">
          🔀 Regenerate Faces
        </button>
      </div>
    </div>
  );
}
