// Vinh Giang's 5 Vocal Foundations — reference benchmarks & scoring
// Based on his public teaching: vinhgiang.com / STAGE Academy / YouTube

// Target zones (all on 0–1 normalized scale matching useAudioAnalyzer outputs)
export const VINH_TARGETS = {
  volume:     { min: 0.42, ideal: 0.58, max: 0.78, label: 'Project at 6–7/10' },
  speechRate: { min: 0.28, ideal: 0.40, max: 0.55, label: '130–145 WPM' },
  pitch:      { min: 0.28, ideal: 0.45, max: 0.70, label: 'Full vocal range' },
  tonality:   { min: 0.40, ideal: 0.62, max: 1.00, label: 'Expressive & melodic' },
  pause:      { min: 0.00, ideal: 0.18, max: 0.38, label: '1–3s strategic pauses' },
};

// How far from ideal (0 = perfect, 1 = worst)
function distanceScore(value, target) {
  if (value >= target.min && value <= target.max) {
    // Inside zone — score by distance from ideal
    return Math.abs(value - target.ideal) / Math.max(target.ideal - target.min, target.max - target.ideal);
  }
  if (value < target.min) return Math.min(1, (target.min - value) / target.min);
  return Math.min(1, (value - target.max) / (1 - target.max));
}

export function computeVinhScore(metrics) {
  const { volume, speechRate, pitch, tonality, pauseDuration, isSpeaking, malaysianScore } = metrics;
  if (!isSpeaking && pauseDuration < 0.05) return null; // not enough data

  const vDist   = distanceScore(volume,      VINH_TARGETS.volume);
  const rDist   = distanceScore(speechRate,  VINH_TARGETS.speechRate);
  const pDist   = distanceScore(pitch,       VINH_TARGETS.pitch);
  const tDist   = distanceScore(tonality,    VINH_TARGETS.tonality);
  const paDist  = distanceScore(pauseDuration, VINH_TARGETS.pause);

  // Weighted — Vinh emphasises tonality and pause most
  const weighted = vDist * 0.20 + rDist * 0.20 + pDist * 0.15 + tDist * 0.30 + paDist * 0.15;
  const matchPct = Math.round((1 - weighted) * 100);

  // Per-dimension deviation labels
  const dims = {
    volume:     getDeviation(volume,      VINH_TARGETS.volume,  'too soft',       'too loud'),
    speechRate: getDeviation(speechRate,  VINH_TARGETS.speechRate, 'too slow',    'too fast'),
    pitch:      getDeviation(pitch,       VINH_TARGETS.pitch,   'too monotone',   'too high'),
    tonality:   getDeviation(tonality,    VINH_TARGETS.tonality,'flat delivery',  'over-expressive'),
    pause:      getDeviation(pauseDuration, VINH_TARGETS.pause, 'no pauses',      'too much silence'),
  };

  // Primary coaching tip (worst offender)
  const worst = Object.entries(dims).sort((a,b) => Math.abs(b[1].dist) - Math.abs(a[1].dist))[0];
  const tip = getCoachingTip(worst[0], worst[1]);

  return { matchPct: Math.max(0, matchPct), dims, tip, distScores: { vDist, rDist, pDist, tDist, paDist } };
}

function getDeviation(value, target, lowLabel, highLabel) {
  const dist = distanceScore(value, target);
  const dir  = value < target.min ? 'low' : value > target.max ? 'high' : 'ok';
  return { dist, dir, label: dir === 'low' ? lowLabel : dir === 'high' ? highLabel : '✓ on target' };
}

function getCoachingTip(dim, dev) {
  const tips = {
    volume: {
      low:  'Project more — Vinh targets a confident 6–7/10. Imagine speaking to someone 5 metres away.',
      high: 'Ease back on volume — you\'re pushing past natural projection.',
      ok:   'Volume is solid. Keep that confident projection.',
    },
    speechRate: {
      low:  'Pick up your pace slightly — Vinh targets ~130–145 WPM. Slow is good for emphasis, not everywhere.',
      high: 'Slow down — Vinh deliberately decelerates at key moments to let ideas land.',
      ok:   'Great pace. Vary it: slow for impact, faster for excitement.',
    },
    pitch: {
      low:  'Open up your pitch range — think piano keys. Try Vinh\'s siren drill: glide from low to high and back.',
      high: 'Bring pitch centre lower — authority lives in the lower registers.',
      ok:   'Nice pitch range. Keep exploring the full spectrum.',
    },
    tonality: {
      low:  'Add emotion to your voice — Vinh says tonality is the feeling underneath the words. Smile while you speak.',
      high: 'Dial back intensity slightly — let the words carry meaning too.',
      ok:   'Tonality is working. Listeners can feel your conviction.',
    },
    pause: {
      low:  'Use silence as a tool — Vinh says a 1–3s pause is more powerful than any word. Replace uh/um with silence.',
      high: 'Your pauses are running long — the audience starts to disengage after 3 seconds of silence.',
      ok:   'Pausing well. That silence is letting your ideas breathe.',
    },
  };
  return tips[dim]?.[dev.dir] ?? 'Keep speaking — more data needed.';
}

// Vinh's 5 Foundations descriptions for the reference panel
export const VINH_FOUNDATIONS = [
  {
    key: 'volume',
    name: 'Volume',
    icon: '📢',
    vinh: 'Target 6–7/10. Quiet = no confidence. Loud = no control. Project like you believe it.',
    target: '42–78% of max',
  },
  {
    key: 'speechRate',
    name: 'Rate of Speech',
    icon: '⏱',
    vinh: '130–145 WPM baseline. Slow to ~90 for key points. Speed up for excitement.',
    target: '28–55% of scale',
  },
  {
    key: 'pitch',
    name: 'Pitch & Melody',
    icon: '🎵',
    vinh: 'Your voice is a piano — use all the keys. Practise the siren glide daily.',
    target: 'Wide variation',
  },
  {
    key: 'tonality',
    name: 'Tonality',
    icon: '❤️',
    vinh: 'Emotion lives beneath the words. Control your face → it controls your voice.',
    target: '>40% expressiveness',
  },
  {
    key: 'pause',
    name: 'The Pause',
    icon: '🤫',
    vinh: '1–3 seconds of silence beats any filler word. Pause before key ideas, not after.',
    target: '1–3s strategic',
  },
];
