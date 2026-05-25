import { useState, useEffect, useRef, useCallback } from 'react';

// Hysteresis thresholds — enter speech state only above the high bar,
// exit only when RMS drops below the low bar. This prevents noise bursts
// from registering as speech at all.
const SPEECH_ENTER_RMS = 0.038;   // must exceed this to start speaking
const SPEECH_EXIT_RMS  = 0.016;   // must fall below this to stop speaking

// Minimum silence between two syllable onsets — prevents one continuous
// utterance from registering as hundreds of onsets.
const MIN_ONSET_GAP_MS = 120;

// Minimum speech duration before we accept it as a real onset (rejects
// brief noise transients).
const MIN_SPEECH_DURATION_MS = 55;

// Voice band: fundamental + first few harmonics of human speech (Hz).
// Energy outside this band is likely noise, HVAC, keyboard clicks, etc.
const VOICE_BAND_HZ = { min: 85, max: 3200 };

// Minimum fraction of total spectral energy that must fall in the voice
// band for the signal to count as speech.
const VOICE_BAND_RATIO_MIN = 0.30;

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
      tooFast: 0,
      monotone: 0,
      longPause: 0,
      overall: 0,
    },
  });

  const ctxRef      = useRef(null);
  const analyserRef = useRef(null);
  const streamRef   = useRef(null);
  const rafRef      = useRef(null);
  const stateRef    = useRef({
    // VAD state machine
    speaking: false,           // current hysteresis state
    speechStartTime: null,     // when the current utterance began
    lastOnsetTime: -Infinity,  // timestamp of the most recent accepted onset
    // History buffers (pruned to WINDOW ms)
    volumes: [],
    pitchHistory: [],
    pauseHistory: [],
    speechOnsets: [],          // one entry per syllable-like onset
    silenceStart: null,
  });

  const [error, setError] = useState(null);
  const [active, setActive] = useState(false);

  const stopMic = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    analyserRef.current = null;
    setActive(false);
    setMetrics(prev => ({ ...prev, volume: 0, isSpeaking: false, speechRate: 0 }));
  }, []);

  useEffect(() => {
    if (!enabled) { stopMic(); return; }
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.5;  // less smoothing = faster RMS response
        analyserRef.current = analyser;
        audioCtx.createMediaStreamSource(stream).connect(analyser);
        setActive(true);
        setError(null);
      } catch (e) {
        setError(e.message || 'Microphone access denied');
      }
    })();
    return stopMic;
  }, [enabled]);

  useEffect(() => {
    if (!active || !analyserRef.current) return;

    const analyser  = analyserRef.current;
    const fftSize   = analyser.fftSize;
    const binCount  = analyser.frequencyBinCount;
    const tdBuf     = new Float32Array(fftSize);
    const freqBuf   = new Float32Array(binCount);
    const st        = stateRef.current;
    const WINDOW    = 4000; // ms of history to keep
    let lastFrame   = performance.now();

    function analyze() {
      rafRef.current = requestAnimationFrame(analyze);
      const now = performance.now();
      if (now - lastFrame < 16) return; // cap at ~60fps
      lastFrame = now;

      analyser.getFloatTimeDomainData(tdBuf);
      analyser.getFloatFrequencyData(freqBuf);

      // ── RMS ──────────────────────────────────────────────────────────────
      let sum = 0;
      for (const v of tdBuf) sum += v * v;
      const rms    = Math.sqrt(sum / fftSize);
      const normVol = Math.min(1, rms * 7);

      // ── Voice-band frequency check ───────────────────────────────────────
      // freqBuf values are in dB (negative). Convert to linear power, then
      // compare the voice-band slice against the full spectrum.
      const sampleRate = ctxRef.current?.sampleRate || 44100;
      const hzPerBin   = sampleRate / fftSize;
      const voiceMinBin = Math.floor(VOICE_BAND_HZ.min / hzPerBin);
      const voiceMaxBin = Math.ceil(VOICE_BAND_HZ.max  / hzPerBin);

      let totalPower = 0, voicePower = 0;
      for (let i = 1; i < binCount; i++) {
        const power = Math.pow(10, freqBuf[i] / 10);
        totalPower += power;
        if (i >= voiceMinBin && i <= voiceMaxBin) voicePower += power;
      }
      const voiceRatio = totalPower > 0 ? voicePower / totalPower : 0;
      const isVoiceLike = voiceRatio >= VOICE_BAND_RATIO_MIN;

      // ── Hysteresis VAD ───────────────────────────────────────────────────
      const prevSpeaking = st.speaking;
      if (!st.speaking && rms > SPEECH_ENTER_RMS && isVoiceLike) {
        st.speaking       = true;
        st.speechStartTime = now;
      } else if (st.speaking && rms < SPEECH_EXIT_RMS) {
        st.speaking       = false;
        st.speechStartTime = null;
      }
      const isSpeaking = st.speaking;

      // ── Onset detection (silence → speech transitions only) ──────────────
      if (!prevSpeaking && isSpeaking) {
        // New utterance started — wait until it's sustained long enough,
        // then check minimum gap from last onset.
        // We record the potential onset now; gap check happens after the
        // speech has been sustained for MIN_SPEECH_DURATION_MS.
        st._pendingOnset = now;
      }
      if (st._pendingOnset && isSpeaking) {
        const sustained = now - st._pendingOnset;
        if (sustained >= MIN_SPEECH_DURATION_MS) {
          const gap = st._pendingOnset - st.lastOnsetTime;
          if (gap >= MIN_ONSET_GAP_MS) {
            st.speechOnsets.push(st._pendingOnset);
            st.lastOnsetTime = st._pendingOnset;
          }
          st._pendingOnset = null;
        }
      }
      if (!isSpeaking) st._pendingOnset = null;

      // ── Pause / silence tracking ─────────────────────────────────────────
      if (!isSpeaking) {
        if (!st.silenceStart) st.silenceStart = now;
      } else {
        if (st.silenceStart) {
          st.pauseHistory.push({ time: now, duration: now - st.silenceStart });
          st.silenceStart = null;
        }
      }

      // ── Pitch (autocorrelation, only when voice-like) ────────────────────
      let pitch = 0;
      if (isSpeaking && isVoiceLike) {
        pitch = estimatePitch(tdBuf, sampleRate);
      }
      if (pitch > 0) st.pitchHistory.push({ time: now, pitch });

      // ── Prune history ────────────────────────────────────────────────────
      const cutoff = now - WINDOW;
      st.pitchHistory  = st.pitchHistory.filter(p => p.time > cutoff);
      st.pauseHistory  = st.pauseHistory.filter(p => p.time > cutoff);
      st.speechOnsets  = st.speechOnsets.filter(t => t > cutoff);
      st.volumes.push({ time: now, v: normVol });
      st.volumes = st.volumes.filter(v => v.time > cutoff);

      // ── Speech rate ──────────────────────────────────────────────────────
      // onsets / sec mapped so ~2.5 syl/sec (Vinh ideal) → 0.40
      const onsetRate  = st.speechOnsets.length / (WINDOW / 1000); // onsets/sec
      const speechRate = Math.min(1, onsetRate * 0.18);

      // ── Pitch stats ──────────────────────────────────────────────────────
      const avgPitch = st.pitchHistory.length > 0
        ? st.pitchHistory.reduce((a, b) => a + b.pitch, 0) / st.pitchHistory.length
        : 0;
      let pitchVariance = 0;
      if (st.pitchHistory.length > 4) {
        const variance = st.pitchHistory.reduce((a, b) => a + Math.pow(b.pitch - avgPitch, 2), 0) / st.pitchHistory.length;
        pitchVariance = Math.sqrt(variance);
      }
      const tonality = Math.min(1, pitchVariance / 80);

      // ── Pause duration ───────────────────────────────────────────────────
      const pauseDuration = st.silenceStart ? Math.min(1, (now - st.silenceStart) / 4000) : 0;

      // ── Malaysian norms ──────────────────────────────────────────────────
      const avgVol     = st.volumes.reduce((a, b) => a + b.v, 0) / Math.max(1, st.volumes.length);
      const tooSoft    = avgVol < 0.25 && isSpeaking ? Math.min(1, (0.25 - avgVol) * 5) : 0;
      const tooFast    = speechRate > 0.75 ? Math.min(1, (speechRate - 0.75) * 3) : 0;
      const monotone   = isSpeaking ? Math.max(0, 1 - tonality * 2.5) : 0;
      const longPause  = pauseDuration > 0.6 ? (pauseDuration - 0.6) * 2.5 : 0;

      // Filler rhythm: look for rapid on/off/on patterns in recent onsets
      const recentOnsets = st.speechOnsets.filter(t => t > now - 2000);
      const fillerRhythm = detectFillerRhythm(recentOnsets);

      const overall = Math.min(1, tooSoft * 0.25 + tooFast * 0.2 + monotone * 0.25 + longPause * 0.2 + fillerRhythm * 0.1);

      setMetrics({
        volume:       normVol,
        speechRate,
        pitch:        Math.min(1, avgPitch / 300),
        tonality,
        pauseDuration,
        isSpeaking,
        malaysianScore: { tooSoft, fillerRhythm, tooFast, monotone, longPause, overall },
      });
    }

    rafRef.current = requestAnimationFrame(analyze);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [active]);

  return { metrics, error, active };
}

function estimatePitch(buffer, sampleRate) {
  const SIZE       = buffer.length;
  const MAX        = Math.floor(SIZE / 2);
  const rms        = Math.sqrt(buffer.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.012) return 0;

  let bestCorr = 0, bestPeriod = -1;
  for (let offset = 80; offset < MAX; offset++) {
    let c = 0;
    for (let i = 0; i < MAX; i++) c += buffer[i] * buffer[i + offset];
    if (c > bestCorr) { bestCorr = c; bestPeriod = offset; }
  }
  if (bestPeriod < 0 || bestCorr < 0.015) return 0;
  return sampleRate / bestPeriod;
}

function detectFillerRhythm(onsets) {
  if (onsets.length < 3) return 0;
  let count = 0;
  for (let i = 1; i < onsets.length - 1; i++) {
    const g1 = onsets[i] - onsets[i - 1];
    const g2 = onsets[i + 1] - onsets[i];
    if (g1 > 80 && g1 < 350 && g2 > 80 && g2 < 350) count++;
  }
  return Math.min(1, count * 0.25);
}
