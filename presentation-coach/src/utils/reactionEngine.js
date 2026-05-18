// Maps audio metrics to audience reactions with ripple propagation

const EXPRESSIONS = ['neutral', 'engaged', 'amused', 'bored', 'confused', 'distracted', 'concerned'];

// How each age group weights different signals
function ageGroupWeights(age) {
  if (age < 25) return { energy: 0.7, clarity: 0.3, formality: 0.2, pause: 0.4 };
  if (age < 40) return { energy: 0.5, clarity: 0.5, formality: 0.4, pause: 0.5 };
  return { energy: 0.35, clarity: 0.6, formality: 0.7, pause: 0.6 };
}

export function computeTargetExpression(face, metrics, enabledAspects) {
  const age = face.age;
  const gender = face.gender;
  const w = ageGroupWeights(age);
  const ms = metrics.malaysianScore;

  let engaged = 0, amused = 0, bored = 0, confused = 0, distracted = 0, concerned = 0;

  // Volume / energy
  if (enabledAspects.volume) {
    if (metrics.volume > 0.55) engaged += 0.5 * w.energy;
    else if (metrics.volume < 0.2 && metrics.isSpeaking) bored += 0.35 * w.energy;
  }

  // Speech rate
  if (enabledAspects.speechRate) {
    if (metrics.speechRate > 0.75) {
      confused += 0.4;
      if (age > 40) concerned += 0.2;
    } else if (metrics.speechRate > 0.35 && metrics.speechRate < 0.65) {
      engaged += 0.25;
    }
  }

  // Pitch / energy level
  if (enabledAspects.pitch) {
    const p = metrics.pitch;
    if (p > 0.6) {
      engaged += 0.2;
      if (age < 30) amused += 0.15;
    }
  }

  // Tonality / expressiveness
  if (enabledAspects.tonality) {
    if (metrics.tonality > 0.5) {
      engaged += 0.4 * w.energy;
      amused += 0.2;
    } else if (metrics.tonality < 0.15 && metrics.isSpeaking) {
      bored += 0.45;
      if (age > 35) concerned += 0.15;
    }
  }

  // Pauses
  if (enabledAspects.pauses) {
    if (metrics.pauseDuration > 0.6) {
      distracted += 0.5 * w.pause;
      if (age > 35) concerned += 0.25 * w.formality;
    } else if (metrics.pauseDuration > 0.1 && metrics.pauseDuration < 0.4) {
      // Strategic pauses — slightly positive
      engaged += 0.1;
    }
  }

  // Malaysian norms
  if (enabledAspects.malaysianNorms) {
    if (ms.tooSoft > 0.4) {
      bored += ms.tooSoft * 0.4;
      distracted += ms.tooSoft * 0.2;
    }
    if (ms.fillerRhythm > 0.3) {
      confused += ms.fillerRhythm * 0.3;
      amused += ms.fillerRhythm * 0.15 * (age < 28 ? 1.5 : 0.7);
    }
    if (ms.tooFast > 0.4) {
      confused += ms.tooFast * 0.5;
      concerned += ms.tooFast * 0.2 * (age > 35 ? 1.3 : 0.8);
    }
    if (ms.monotone > 0.5) {
      bored += ms.monotone * 0.55 * w.energy;
      distracted += ms.monotone * 0.2;
    }
    if (ms.longPause > 0.4) {
      distracted += ms.longPause * 0.4;
      concerned += ms.longPause * 0.25 * w.formality;
    }
  }

  // Not speaking at all
  if (!metrics.isSpeaking && metrics.pauseDuration > 0.15) {
    distracted += 0.2;
    bored += 0.1;
  }

  // Normalize scores and pick winner
  const scores = { engaged, amused, bored, confused, distracted, concerned };
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  if (total < 0.05) return { expression: 'neutral', intensity: 0 };

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  const intensity = Math.min(1, best[1] * 1.2);

  return { expression: best[0], intensity };
}

// Ripple: faces near the trigger point update first, then neighbors
export function triggerRipple(faces, epicenterIdx, updateFn) {
  const total = faces.length;
  const cols = Math.ceil(Math.sqrt(total));

  faces.forEach((face, i) => {
    const epicRow = Math.floor(epicenterIdx / cols);
    const epicCol = epicenterIdx % cols;
    const row = Math.floor(i / cols);
    const col = i % cols;
    const dist = Math.sqrt(Math.pow(row - epicRow, 2) + Math.pow(col - epicCol, 2));
    const delay = dist * 80 + Math.random() * 40;
    setTimeout(() => updateFn(i), delay);
  });
}

export function smoothTransitionExpression(current, target, alpha = 0.08) {
  if (current.expression === target.expression) {
    return {
      expression: current.expression,
      intensity: current.intensity + (target.intensity - current.intensity) * alpha,
    };
  }
  // Blend to neutral first, then shift
  if (current.intensity > 0.05) {
    return {
      expression: current.expression,
      intensity: current.intensity * (1 - alpha * 2),
    };
  }
  return { expression: target.expression, intensity: target.intensity * alpha };
}
