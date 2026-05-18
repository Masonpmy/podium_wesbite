import { useState, useEffect, useRef, useCallback } from 'react';

const SAMPLE_RATE_TARGET = 60; // analysis frames per second
const SPEECH_DETECT_THRESHOLD = 0.015;

export function useAudioAnalyzer(enabled) {
  const [metrics, setMetrics] = useState({
    volume: 0,
    speechRate: 0,
    pitch: 0,
    tonality: 0,
    pauseDuration: 0,
    isSpeaking: false,
    malaysianScore: {
      tooSoft: 0,
      fillerRhythm: 0,
      toFast: 0,
      monotone: 0,
      longPause: 0,
      overall: 0,
    },
  });

  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const historyRef = useRef({
    volumes: [],
    pitches: [],
    speechOnsets: [],
    silenceStart: null,
    lastSpeechTime: null,
    syllableTimings: [],
    pitchHistory: [],
    pauseHistory: [],
  });
  const [error, setError] = useState(null);
  const [active, setActive] = useState(false);

  const startMic = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      setActive(true);
      setError(null);
    } catch (e) {
      setError(e.message || 'Microphone access denied');
    }
  }, []);

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
    analyserRef.current = null;
    setActive(false);
    setMetrics(prev => ({ ...prev, volume: 0, isSpeaking: false }));
  }, []);

  useEffect(() => {
    if (enabled) { startMic(); }
    else { stopMic(); }
    return stopMic;
  }, [enabled]);

  // Analysis loop
  useEffect(() => {
    if (!active || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const bufferLen = analyser.frequencyBinCount;
    const timeDomainBuf = new Float32Array(analyser.fftSize);
    const freqBuf = new Float32Array(bufferLen);
    const h = historyRef.current;
    let lastFrameTime = performance.now();
    const WINDOW = 3000; // ms history

    function analyze() {
      rafRef.current = requestAnimationFrame(analyze);
      const now = performance.now();
      const dt = now - lastFrameTime;
      if (dt < 1000 / SAMPLE_RATE_TARGET) return;
      lastFrameTime = now;

      analyser.getFloatTimeDomainData(timeDomainBuf);
      analyser.getFloatFrequencyData(freqBuf);

      // RMS volume
      let sum = 0;
      for (const v of timeDomainBuf) sum += v * v;
      const rms = Math.sqrt(sum / timeDomainBuf.length);
      const normVol = Math.min(1, rms * 8);

      // Speaking detection
      const isSpeaking = rms > SPEECH_DETECT_THRESHOLD;

      // Track silence/speech
      if (!isSpeaking) {
        if (!h.silenceStart) h.silenceStart = now;
      } else {
        if (h.silenceStart) {
          const pauseLen = now - h.silenceStart;
          h.pauseHistory.push({ time: now, duration: pauseLen });
          h.silenceStart = null;
        }
        h.lastSpeechTime = now;
        h.speechOnsets.push(now);
      }

      // Autocorrelation-based pitch estimation
      let pitch = 0;
      if (isSpeaking) {
        pitch = estimatePitch(timeDomainBuf, ctxRef.current?.sampleRate || 44100);
      }
      if (pitch > 0) h.pitchHistory.push({ time: now, pitch });

      // Prune history
      const cutoff = now - WINDOW;
      h.pitchHistory = h.pitchHistory.filter(p => p.time > cutoff);
      h.pauseHistory = h.pauseHistory.filter(p => p.time > cutoff);
      h.speechOnsets = h.speechOnsets.filter(t => t > cutoff);
      h.volumes.push({ time: now, v: normVol });
      h.volumes = h.volumes.filter(v => v.time > cutoff);

      // Speech rate (onsets per second ≈ syllable proxy)
      const speechRate = h.speechOnsets.length > 2
        ? (h.speechOnsets.length / (WINDOW / 1000)) * 0.18
        : 0;

      // Average pitch
      const avgPitch = h.pitchHistory.length > 0
        ? h.pitchHistory.reduce((a, b) => a + b.pitch, 0) / h.pitchHistory.length
        : 0;

      // Pitch variance (tonality / expressiveness)
      let pitchVariance = 0;
      if (h.pitchHistory.length > 4) {
        const mean = avgPitch;
        const variance = h.pitchHistory.reduce((a, b) => a + Math.pow(b.pitch - mean, 2), 0) / h.pitchHistory.length;
        pitchVariance = Math.sqrt(variance);
      }

      // Tonality 0–1 (higher = more expressive)
      const tonality = Math.min(1, pitchVariance / 80);

      // Current pause
      const pauseDuration = h.silenceStart ? Math.min(1, (now - h.silenceStart) / 4000) : 0;

      // Malaysian norm scoring
      const avgVol = h.volumes.reduce((a, b) => a + b.v, 0) / Math.max(1, h.volumes.length);
      const tooSoft = avgVol < 0.25 && isSpeaking ? Math.min(1, (0.25 - avgVol) * 5) : 0;
      const tooFast = speechRate > 0.75 ? Math.min(1, (speechRate - 0.75) * 3) : 0;
      const monotone = isSpeaking ? Math.max(0, 1 - tonality * 2.5) : 0;
      const longPause = pauseDuration > 0.6 ? (pauseDuration - 0.6) * 2.5 : 0;

      // Filler rhythm: detect rapid on-off-on patterns (uh/um proxy)
      const recentOnsets = h.speechOnsets.filter(t => t > now - 2000);
      const fillerRhythm = detectFillerRhythm(recentOnsets);

      const overall = Math.min(1, (tooSoft * 0.25 + tooFast * 0.2 + monotone * 0.25 + longPause * 0.2 + fillerRhythm * 0.1));

      setMetrics({
        volume: normVol,
        speechRate: Math.min(1, speechRate),
        pitch: Math.min(1, avgPitch / 300),
        tonality,
        pauseDuration,
        isSpeaking,
        malaysianScore: { tooSoft, fillerRhythm, tooFast: tooFast, monotone, longPause, overall },
      });
    }

    rafRef.current = requestAnimationFrame(analyze);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  return { metrics, error, active };
}

function estimatePitch(buffer, sampleRate) {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestCorr = 0;
  let bestPeriod = -1;

  const rms = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.008) return 0;

  const corr = new Float32Array(MAX_SAMPLES);
  for (let offset = 80; offset < MAX_SAMPLES; offset++) {
    let c = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      c += buffer[i] * buffer[i + offset];
    }
    corr[offset] = c;
    if (c > bestCorr) {
      bestCorr = c;
      bestPeriod = offset;
    }
  }

  if (bestPeriod < 0 || bestCorr < 0.01) return 0;
  return sampleRate / bestPeriod;
}

function detectFillerRhythm(onsets) {
  // Look for bursts of 2-4 onsets within 400ms separated by 100-300ms gaps
  if (onsets.length < 3) return 0;
  let fillerCount = 0;
  for (let i = 1; i < onsets.length - 1; i++) {
    const gap1 = onsets[i] - onsets[i - 1];
    const gap2 = onsets[i + 1] - onsets[i];
    if (gap1 > 80 && gap1 < 350 && gap2 > 80 && gap2 < 350) fillerCount++;
  }
  return Math.min(1, fillerCount * 0.25);
}
