import { useState, useEffect, useCallback, useRef } from 'react';
import AudienceGrid from './components/AudienceGrid';
import ControlPanel from './components/ControlPanel';
import { regenerateFaces } from './utils/faceGenerator';
import { computeTargetExpression, smoothTransitionExpression } from './utils/reactionEngine';
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer';
import './index.css';

const INITIAL_COUNT = 54;
const DEFAULT_AGE_RANGE = [20, 55];
const DEFAULT_GENDER = 'mixed';
const DEFAULT_ASPECTS = {
  volume: true,
  speechRate: true,
  pitch: true,
  tonality: true,
  pauses: true,
  malaysianNorms: true,
};

export default function App() {
  const [faces, setFaces] = useState(() =>
    regenerateFaces(INITIAL_COUNT, DEFAULT_GENDER, DEFAULT_AGE_RANGE[0], DEFAULT_AGE_RANGE[1])
  );
  const [genderMode, setGenderMode] = useState(DEFAULT_GENDER);
  const [ageRange, setAgeRange] = useState(DEFAULT_AGE_RANGE);
  const [faceCount, setFaceCount] = useState(INITIAL_COUNT);
  const [micEnabled, setMicEnabled] = useState(false);
  const [enabledAspects, setEnabledAspects] = useState(DEFAULT_ASPECTS);

  const { metrics, error, active } = useAudioAnalyzer(micEnabled);
  const reactionTimerRef = useRef(null);
  const lastRippleRef = useRef(0);

  const doRegenerate = useCallback((count, gender, age) => {
    setFaces(regenerateFaces(count, gender, age[0], age[1]));
  }, []);

  const handleGenderChange = useCallback((g) => {
    setGenderMode(g);
    doRegenerate(faceCount, g, ageRange);
  }, [faceCount, ageRange, doRegenerate]);

  const handleAgeRangeChange = useCallback((range) => {
    const clamped = [Math.min(range[0], range[1] - 1), Math.max(range[1], range[0] + 1)];
    setAgeRange(clamped);
    doRegenerate(faceCount, genderMode, clamped);
  }, [faceCount, genderMode, doRegenerate]);

  const handleFaceCountChange = useCallback((count) => {
    setFaceCount(count);
    doRegenerate(count, genderMode, ageRange);
  }, [genderMode, ageRange, doRegenerate]);

  const handleRegenerateFaces = useCallback(() => {
    doRegenerate(faceCount, genderMode, ageRange);
  }, [faceCount, genderMode, ageRange, doRegenerate]);

  const handleToggleAspect = useCallback((key) => {
    setEnabledAspects(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Reaction update loop
  useEffect(() => {
    if (reactionTimerRef.current) clearInterval(reactionTimerRef.current);

    reactionTimerRef.current = setInterval(() => {
      const now = Date.now();
      setFaces(prev => {
        let epicenter = -1;
        if (now - lastRippleRef.current > 1400 && metrics.isSpeaking) {
          lastRippleRef.current = now;
          epicenter = Math.floor(Math.random() * prev.length);
        }

        const cols = Math.ceil(Math.sqrt(prev.length));

        return prev.map((face, i) => {
          const target = computeTargetExpression(face, metrics, enabledAspects);

          // Ripple distance-based alpha
          let alpha = 0.1;
          if (epicenter >= 0) {
            const epicRow = Math.floor(epicenter / cols);
            const epicCol = epicenter % cols;
            const row = Math.floor(i / cols);
            const col = i % cols;
            const dist = Math.sqrt(Math.pow(row - epicRow, 2) + Math.pow(col - epicCol, 2));
            // Closer faces react faster
            alpha = 0.1 + 0.15 * Math.max(0, 1 - dist / 6);
          }

          const smooth = smoothTransitionExpression(
            { expression: face.expression, intensity: face.expressionIntensity },
            target,
            alpha
          );
          return { ...face, expression: smooth.expression, expressionIntensity: smooth.intensity };
        });
      });
    }, 160);

    return () => clearInterval(reactionTimerRef.current);
  }, [metrics, enabledAspects]);

  // Compute audience mood summary
  const moodCounts = faces.reduce((acc, f) => {
    acc[f.expression] = (acc[f.expression] || 0) + 1;
    return acc;
  }, {});
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  const engagedPct = Math.round(
    ((moodCounts.engaged || 0) + (moodCounts.amused || 0)) / faces.length * 100
  );

  return (
    <div className="min-h-screen flex" style={{ background: '#0a1120' }}>
      {/* Sidebar */}
      <aside
        className="w-60 flex-shrink-0 border-r border-slate-700/60 p-3 overflow-y-auto"
        style={{ background: '#0d1a2e' }}
      >
        <ControlPanel
          micEnabled={micEnabled}
          onToggleMic={() => setMicEnabled(v => !v)}
          metrics={metrics}
          error={error}
          active={active}
          enabledAspects={enabledAspects}
          onToggleAspect={handleToggleAspect}
          genderMode={genderMode}
          onGenderChange={handleGenderChange}
          ageRange={ageRange}
          onAgeRangeChange={handleAgeRangeChange}
          faceCount={faceCount}
          onFaceCountChange={handleFaceCountChange}
          onRegenerateFaces={handleRegenerateFaces}
        />
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Status bar */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-b border-slate-700/60 text-xs flex-shrink-0"
          style={{ background: '#0d1a2e' }}
        >
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-400">{active ? 'Live' : 'Paused'}</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            <span className="text-slate-200 font-medium">{faces.length}</span> audience
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">
            Engaged:{' '}
            <span className={`font-bold ${engagedPct > 60 ? 'text-green-400' : engagedPct > 35 ? 'text-yellow-400' : 'text-red-400'}`}>
              {engagedPct}%
            </span>
          </span>
          {topMood && (
            <>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Top mood: <span className="text-slate-200 font-medium capitalize">{topMood[0]}</span>
              </span>
            </>
          )}
          {metrics.malaysianScore.overall > 0.4 && (
            <div className="ml-auto text-yellow-400 font-medium animate-pulse">
              ⚠ {getMalaysianTip(metrics.malaysianScore)}
            </div>
          )}
        </div>

        {/* Audience grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <AudienceGrid faces={faces} />
        </div>

        {/* Podium stage */}
        <div
          className="h-10 flex items-center justify-center flex-shrink-0 border-t border-slate-700/60"
          style={{ background: 'linear-gradient(to top, #1e293b, #0d1a2e)' }}
        >
          <div className="flex flex-col items-center gap-1">
            <div className="w-40 h-1 bg-slate-500/60 rounded-full" />
            <span className="text-slate-600 text-xs tracking-widest uppercase select-none">Stage</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function getMalaysianTip(ms) {
  if (ms.tooSoft > 0.5) return 'Speak louder — project your voice';
  if (ms.tooFast > 0.5) return "Slow down — you're rushing";
  if (ms.monotone > 0.55) return 'Vary your pitch — avoid flat delivery';
  if (ms.longPause > 0.6) return 'Long silence — resume speaking';
  if (ms.fillerRhythm > 0.4) return 'Watch filler words — uh/um patterns detected';
  return 'Check your delivery';
}
