// Generates realistic-looking Malaysian face parameters for Canvas rendering

const ETHNICITY_PROFILES = {
  malay: {
    skinRange: [{ h: 25, s: 55, l: 52 }, { h: 28, s: 60, l: 48 }],
    eyeType: ['almond', 'almond', 'double'],
    noseWidth: [0.48, 0.56],
    lipFullness: [0.52, 0.62],
    jawWidth: [0.72, 0.82],
    hairColors: ['#1a0a00', '#0d0500', '#1e1208'],
    weight: 0.4,
  },
  chinese: {
    skinRange: [{ h: 22, s: 45, l: 62 }, { h: 25, s: 50, l: 68 }],
    eyeType: ['monolid', 'monolid', 'almond'],
    noseWidth: [0.40, 0.48],
    lipFullness: [0.42, 0.52],
    jawWidth: [0.68, 0.76],
    hairColors: ['#0a0500', '#1a1000', '#2a1800'],
    weight: 0.35,
  },
  indian: {
    skinRange: [{ h: 20, s: 60, l: 38 }, { h: 24, s: 65, l: 45 }],
    eyeType: ['double', 'almond', 'double'],
    noseWidth: [0.50, 0.60],
    lipFullness: [0.58, 0.70],
    jawWidth: [0.74, 0.84],
    hairColors: ['#0d0500', '#050200', '#180c05'],
    weight: 0.25,
  },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hslToRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pickEthnicity(rand) {
  const r = rand();
  if (r < 0.4) return 'malay';
  if (r < 0.75) return 'chinese';
  return 'indian';
}

export function generateFace(id, genderHint = 'mixed') {
  const rand = seededRandom(id * 31337 + 7);
  const ethnicity = pickEthnicity(rand);
  const profile = ETHNICITY_PROFILES[ethnicity];

  let gender;
  if (genderHint === 'male') gender = 'male';
  else if (genderHint === 'female') gender = 'female';
  else gender = rand() > 0.5 ? 'male' : 'female';

  const age = Math.floor(rand() * 45) + 15; // 15–60

  const skinT = rand();
  const s0 = profile.skinRange[0];
  const s1 = profile.skinRange[1];
  const [sr, sg, sb] = hslToRgb(
    lerp(s0.h, s1.h, skinT),
    lerp(s0.s, s1.s, skinT),
    lerp(s0.l, s1.l, skinT)
  );
  const skinColor = rgbToHex(sr, sg, sb);

  const eyeType = profile.eyeType[Math.floor(rand() * profile.eyeType.length)];
  const noseWidth = lerp(profile.noseWidth[0], profile.noseWidth[1], rand());
  const lipFullness = lerp(profile.lipFullness[0], profile.lipFullness[1], rand());
  const jawWidth = lerp(profile.jawWidth[0], profile.jawWidth[1], rand());
  const hairColor = profile.hairColors[Math.floor(rand() * profile.hairColors.length)];

  // Gender morphs
  const femaleJaw = gender === 'female' ? -0.06 : 0;
  const maleJaw = gender === 'male' ? 0.04 : 0;

  // Age morphs
  const ageT = (age - 15) / 45;
  const wrinkleAmount = ageT > 0.6 ? (ageT - 0.6) * 2.5 : 0;
  const eyeDroop = ageT * 0.3;
  const hairGrey = ageT > 0.7 ? (ageT - 0.7) * 3.0 : 0;
  const greyHairColor = (() => {
    if (hairGrey <= 0) return hairColor;
    const [hr, hg, hb] = [parseInt(hairColor.slice(1,3),16), parseInt(hairColor.slice(3,5),16), parseInt(hairColor.slice(5,7),16)];
    const gr = Math.round(lerp(hr, 160, hairGrey));
    const gg = Math.round(lerp(hg, 155, hairGrey));
    const gb = Math.round(lerp(hb, 155, hairGrey));
    return rgbToHex(gr, gg, gb);
  })();

  // Hair style
  const hairStyles = gender === 'female'
    ? ['long-straight', 'long-wavy', 'shoulder', 'bun', 'ponytail']
    : ['short-side', 'short-crop', 'short-fade', 'medium-back'];
  const hairStyle = hairStyles[Math.floor(rand() * hairStyles.length)];

  // Unique micro-variations
  const faceWidth = lerp(0.78, 0.92, rand());
  const faceHeight = lerp(0.88, 1.05, rand());
  const cheekProm = lerp(0.3, 0.6, rand());
  const eyeSpacing = lerp(0.36, 0.46, rand());
  const eyeSize = lerp(0.09, 0.14, rand());
  const eyebrowArch = lerp(0.3, 0.7, rand());
  const browThickness = gender === 'male' ? lerp(0.55, 0.8, rand()) : lerp(0.35, 0.55, rand());
  const hasBeard = gender === 'male' && age > 18 && rand() > 0.45;
  const beardStyle = hasBeard ? (['stubble', 'goatee', 'full'][Math.floor(rand() * 3)]) : null;
  const beardColor = greyHairColor;
  const earSize = lerp(0.12, 0.18, rand());
  const noseBridge = lerp(0.3, 0.6, rand());

  // Glasses
  const hasGlasses = rand() > (age > 35 ? 0.55 : 0.8);
  const glassesStyle = hasGlasses ? (['rectangle', 'round', 'rectangle'][Math.floor(rand() * 3)]) : null;

  return {
    id,
    ethnicity,
    gender,
    age,
    skinColor,
    eyeType,
    noseWidth,
    lipFullness,
    jawWidth: jawWidth + femaleJaw + maleJaw,
    hairColor: greyHairColor,
    hairStyle,
    faceWidth,
    faceHeight,
    cheekProm,
    eyeSpacing,
    eyeSize,
    eyebrowArch,
    browThickness,
    hasBeard,
    beardStyle,
    beardColor,
    earSize,
    noseBridge,
    hasGlasses,
    glassesStyle,
    wrinkleAmount,
    eyeDroop,
    expression: 'neutral',
    expressionIntensity: 0,
    reactionDelay: 0,
  };
}

export function regenerateFaces(count, genderMode, ageMin, ageMax, existingFaces = []) {
  return Array.from({ length: count }, (_, i) => {
    const base = generateFace(i + Date.now() % 10000, genderMode);
    // Clamp age to slider range
    const ageRange = ageMax - ageMin;
    const face = { ...base, age: ageMin + Math.floor(Math.random() * (ageRange + 1)) };
    // Recompute age morphs
    const ageT = (face.age - 15) / 45;
    face.wrinkleAmount = ageT > 0.6 ? (ageT - 0.6) * 2.5 : 0;
    face.eyeDroop = ageT * 0.3;
    return face;
  });
}
