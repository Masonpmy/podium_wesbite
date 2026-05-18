// Canvas rendering for realistic-ish Malaysian faces

function lerp(a, b, t) { return a + (b - a) * t; }

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.max(0, r - amount)},${Math.max(0, g - amount)},${Math.max(0, b - amount)})`;
}

function lighten(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  return `rgb(${Math.min(255, r + amount)},${Math.min(255, g + amount)},${Math.min(255, b + amount)})`;
}

function hexAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Expression offsets applied to facial features
const EXPRESSION_PARAMS = {
  neutral:    { mouthCurve: 0,    eyeOpen: 0,    browRaise: 0,    browFurrow: 0,    eyeSquint: 0 },
  engaged:    { mouthCurve: 0.35, eyeOpen: 0.25, browRaise: 0.2,  browFurrow: 0,    eyeSquint: 0 },
  amused:     { mouthCurve: 0.55, eyeOpen: 0.1,  browRaise: 0.15, browFurrow: 0,    eyeSquint: 0.3 },
  confused:   { mouthCurve: -0.1, eyeOpen: 0.1,  browRaise: 0.3,  browFurrow: 0.5,  eyeSquint: 0 },
  bored:      { mouthCurve: -0.15,eyeOpen: -0.35,browRaise: -0.1, browFurrow: 0,    eyeSquint: 0.1 },
  distracted: { mouthCurve: 0,    eyeOpen: -0.1, browRaise: 0,    browFurrow: 0,    eyeSquint: 0 },
  concerned:  { mouthCurve: -0.2, eyeOpen: 0.05, browRaise: 0.1,  browFurrow: 0.6,  eyeSquint: 0 },
};

export function drawFace(ctx, face, w, h, expression = 'neutral', intensity = 0) {
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h * 0.52;
  const rx = (w * face.faceWidth) / 2;
  const ry = (h * face.faceHeight) / 2;

  const expr = EXPRESSION_PARAMS[expression] || EXPRESSION_PARAMS.neutral;
  const blended = {};
  const neutral = EXPRESSION_PARAMS.neutral;
  for (const k in expr) {
    blended[k] = lerp(neutral[k], expr[k], intensity);
  }

  drawNeck(ctx, cx, cy + ry * 0.72, rx * 0.28, h, face);
  drawEars(ctx, cx, cy, rx, ry, face);
  drawFaceShape(ctx, cx, cy, rx, ry, face, blended);
  drawHair(ctx, cx, cy, rx, ry, face, w, h);
  drawEyebrows(ctx, cx, cy, rx, ry, face, blended);
  drawEyes(ctx, cx, cy, rx, ry, face, blended);
  drawNose(ctx, cx, cy, rx, ry, face);
  drawMouth(ctx, cx, cy, rx, ry, face, blended);
  if (face.hasBeard) drawBeard(ctx, cx, cy, rx, ry, face);
  if (face.hasGlasses) drawGlasses(ctx, cx, cy, rx, ry, face);
  if (face.wrinkleAmount > 0) drawWrinkles(ctx, cx, cy, rx, ry, face, blended);
}

function drawNeck(ctx, x, topY, neckRx, h, face) {
  const neckColor = darken(face.skinColor, 15);
  ctx.fillStyle = neckColor;
  ctx.beginPath();
  ctx.ellipse(x, topY + (h - topY) * 0.5, neckRx, (h - topY) * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawEars(ctx, cx, cy, rx, ry, face) {
  const earRx = rx * face.earSize * 0.65;
  const earRy = ry * face.earSize;
  const earY = cy - ry * 0.05;
  const skinGrad = (lx) => {
    const g = ctx.createRadialGradient(lx, earY, 0, lx, earY, earRx * 2);
    g.addColorStop(0, lighten(face.skinColor, 5));
    g.addColorStop(1, darken(face.skinColor, 20));
    return g;
  };
  for (const side of [-1, 1]) {
    const ex = cx + side * (rx - earRx * 0.2);
    ctx.fillStyle = skinGrad(ex);
    ctx.beginPath();
    ctx.ellipse(ex, earY, earRx, earRy, 0, 0, Math.PI * 2);
    ctx.fill();
    // inner ear detail
    ctx.strokeStyle = darken(face.skinColor, 30);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(ex, earY, earRx * 0.55, earRy * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFaceShape(ctx, cx, cy, rx, ry, face, expr) {
  // Skin gradient
  const grad = ctx.createRadialGradient(cx - rx * 0.2, cy - ry * 0.25, rx * 0.1, cx, cy, rx * 1.4);
  grad.addColorStop(0, lighten(face.skinColor, 18));
  grad.addColorStop(0.5, face.skinColor);
  grad.addColorStop(1, darken(face.skinColor, 22));

  const jawNarrow = face.gender === 'female' ? 0.82 : 0.92;

  ctx.fillStyle = grad;
  ctx.beginPath();
  // Top of head
  ctx.ellipse(cx, cy - ry * 0.1, rx, ry * 1.05, 0, Math.PI, 0);
  // Cheeks + jaw using bezier
  const jawY = cy + ry * 0.72;
  const chinY = cy + ry * 0.98;
  const lx = cx - rx;
  const rx2 = cx + rx;
  ctx.bezierCurveTo(rx2, cy + ry * 0.3, cx + rx * jawNarrow * face.jawWidth, jawY, cx, chinY);
  ctx.bezierCurveTo(cx - rx * jawNarrow * face.jawWidth, jawY, lx, cy + ry * 0.3, lx, cy - ry * 0.1);
  ctx.fill();

  // Cheek blush subtle
  if (face.gender === 'female') {
    for (const side of [-1, 1]) {
      const bx = cx + side * rx * 0.55;
      const by = cy + ry * 0.25;
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, rx * 0.22);
      bg.addColorStop(0, 'rgba(220,120,110,0.12)');
      bg.addColorStop(1, 'rgba(220,120,110,0)');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.ellipse(bx, by, rx * 0.22, ry * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawHair(ctx, cx, cy, rx, ry, face, w, h) {
  const hc = face.hairColor;
  const style = face.hairStyle;

  ctx.fillStyle = hc;
  ctx.strokeStyle = darken(hc, 20);
  ctx.lineWidth = 1;

  const topY = cy - ry * 1.05;

  if (style === 'short-crop' || style === 'short-fade' || style === 'short-side') {
    // Short male hair — cap shape
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.01, ry * 0.58, 0, Math.PI, 0);
    ctx.bezierCurveTo(cx + rx * 1.01, topY + ry * 0.28, cx + rx * 0.92, topY + ry * 0.05, cx, topY + ry * 0.02);
    ctx.bezierCurveTo(cx - rx * 0.92, topY + ry * 0.05, cx - rx * 1.01, topY + ry * 0.28, cx - rx * 1.01, topY + ry * 0.28);
    ctx.fill();
    // Hairline variation
    ctx.fillStyle = darken(hc, 10);
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.55, rx * 1.0, ry * 0.2, 0, 0, Math.PI);
    ctx.fill();
  } else if (style === 'medium-back') {
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.3, rx * 1.02, ry * 0.65, 0, Math.PI, 0);
    ctx.bezierCurveTo(cx + rx * 1.02, topY + ry * 0.3, cx + rx * 1.02, cy, cx + rx * 1.08, cy + ry * 0.5);
    ctx.bezierCurveTo(cx - rx * 1.08, cy + ry * 0.5, cx - rx * 1.02, cy, cx - rx * 1.02, topY + ry * 0.3);
    ctx.fill();
  } else if (style === 'long-straight') {
    // Body of long hair first (behind face)
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.1, cy - ry * 0.3);
    ctx.bezierCurveTo(cx - rx * 1.15, cy + ry * 0.8, cx - rx * 0.95, h * 0.98, cx - rx * 0.6, h);
    ctx.lineTo(cx + rx * 0.6, h);
    ctx.bezierCurveTo(cx + rx * 0.95, h * 0.98, cx + rx * 1.15, cy + ry * 0.8, cx + rx * 1.1, cy - ry * 0.3);
    ctx.fill();
    // Top cap
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.05, ry * 0.6, 0, Math.PI, 0);
    ctx.bezierCurveTo(cx + rx * 1.05, topY + ry * 0.28, cx + rx * 1.1, cy - ry * 0.3, cx + rx * 1.1, cy - ry * 0.3);
    ctx.lineTo(cx - rx * 1.1, cy - ry * 0.3);
    ctx.bezierCurveTo(cx - rx * 1.1, cy - ry * 0.3, cx - rx * 1.05, topY + ry * 0.28, cx - rx * 1.05, topY + ry * 0.28);
    ctx.fill();
  } else if (style === 'long-wavy') {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.12, cy - ry * 0.25);
    for (let i = 0; i < 6; i++) {
      const t = i / 6;
      const wy = cy - ry * 0.25 + (h - cy + ry * 0.25) * t;
      const wx = cx - rx * 1.12 - Math.sin(t * Math.PI * 3) * rx * 0.12;
      ctx.lineTo(wx, wy);
    }
    ctx.lineTo(cx - rx * 0.5, h);
    ctx.lineTo(cx + rx * 0.5, h);
    for (let i = 6; i >= 0; i--) {
      const t = i / 6;
      const wy = cy - ry * 0.25 + (h - cy + ry * 0.25) * t;
      const wx = cx + rx * 1.12 + Math.sin(t * Math.PI * 3) * rx * 0.12;
      ctx.lineTo(wx, wy);
    }
    ctx.fill();
    // Top cap
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.06, ry * 0.62, 0, Math.PI, 0);
    ctx.fill();
  } else if (style === 'shoulder') {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.08, cy - ry * 0.3);
    ctx.bezierCurveTo(cx - rx * 1.1, cy + ry * 0.6, cx - rx * 0.85, cy + ry * 0.9, cx - rx * 0.65, cy + ry * 1.1);
    ctx.lineTo(cx + rx * 0.65, cy + ry * 1.1);
    ctx.bezierCurveTo(cx + rx * 0.85, cy + ry * 0.9, cx + rx * 1.1, cy + ry * 0.6, cx + rx * 1.08, cy - ry * 0.3);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.05, ry * 0.6, 0, Math.PI, 0);
    ctx.fill();
  } else if (style === 'bun') {
    // Bun on top
    ctx.beginPath();
    ctx.ellipse(cx, topY - ry * 0.08, rx * 0.38, ry * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.02, ry * 0.58, 0, Math.PI, 0);
    ctx.fill();
    // Sides pulled back
    ctx.beginPath();
    ctx.moveTo(cx - rx * 1.0, cy - ry * 0.4);
    ctx.bezierCurveTo(cx - rx * 0.9, cy - ry * 0.55, cx - rx * 0.3, topY + ry * 0.25, cx, topY + ry * 0.1);
    ctx.bezierCurveTo(cx + rx * 0.3, topY + ry * 0.25, cx + rx * 0.9, cy - ry * 0.55, cx + rx * 1.0, cy - ry * 0.4);
    ctx.stroke();
  } else if (style === 'ponytail') {
    ctx.beginPath();
    ctx.ellipse(cx, topY + ry * 0.28, rx * 1.02, ry * 0.58, 0, Math.PI, 0);
    ctx.fill();
    // Ponytail
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.12, cy - ry * 0.7);
    ctx.bezierCurveTo(cx + rx * 0.4, cy - ry * 0.3, cx + rx * 0.5, cy + ry * 0.3, cx + rx * 0.3, cy + ry * 0.9);
    ctx.lineWidth = rx * 0.13;
    ctx.strokeStyle = hc;
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawEyebrows(ctx, cx, cy, rx, ry, face, expr) {
  const browY = cy - ry * (0.28 + expr.browRaise * 0.1);
  const spacing = face.eyeSpacing;

  for (const side of [-1, 1]) {
    const bx = cx + side * rx * spacing;
    const ew = rx * 0.22;
    const arch = face.eyebrowArch * ry * 0.07 - expr.browFurrow * ry * 0.04 * side;

    const skinDark = darken(face.skinColor, 35);
    const browColor = face.hairColor;

    ctx.strokeStyle = browColor;
    ctx.lineWidth = ry * 0.055 * face.browThickness * (face.gender === 'male' ? 1.1 : 0.9);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(bx - ew * 0.8, browY + arch * 0.2);
    ctx.quadraticCurveTo(bx, browY - arch, bx + ew * 0.8, browY + arch * 0.3);
    ctx.stroke();

    if (face.wrinkleAmount > 0.3) {
      // Furrowed brow line
      ctx.strokeStyle = darken(face.skinColor, 40);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(bx - ew * 0.3, browY + ry * 0.07);
      ctx.bezierCurveTo(bx, browY + ry * 0.05, bx + ew * 0.3, browY + ry * 0.07, bx + ew * 0.4, browY + ry * 0.09);
      ctx.stroke();
    }
  }
}

function drawEyes(ctx, cx, cy, rx, ry, face, expr) {
  const eyeY = cy - ry * 0.1;
  const spacing = face.eyeSpacing;
  const eSize = face.eyeSize * rx;
  const droop = face.eyeDroop * ry * 0.08;
  const openMod = 1 + expr.eyeOpen * 0.4 - expr.eyeSquint * 0.3;
  const eH = eSize * 0.52 * openMod;

  for (const side of [-1, 1]) {
    const ex = cx + side * rx * spacing;
    const ey = eyeY + droop;

    // Eye white
    ctx.fillStyle = '#f8f6f0';
    ctx.beginPath();
    if (face.eyeType === 'monolid') {
      ctx.ellipse(ex, ey, eSize, eH * 0.8, 0, 0, Math.PI * 2);
    } else if (face.eyeType === 'almond') {
      ctx.moveTo(ex - eSize, ey);
      ctx.bezierCurveTo(ex - eSize * 0.5, ey - eH, ex + eSize * 0.5, ey - eH, ex + eSize, ey);
      ctx.bezierCurveTo(ex + eSize * 0.5, ey + eH * 0.7, ex - eSize * 0.5, ey + eH * 0.7, ex - eSize, ey);
    } else {
      // double eyelid
      ctx.moveTo(ex - eSize, ey);
      ctx.bezierCurveTo(ex - eSize * 0.5, ey - eH * 1.1, ex + eSize * 0.5, ey - eH * 1.1, ex + eSize, ey);
      ctx.bezierCurveTo(ex + eSize * 0.5, ey + eH * 0.8, ex - eSize * 0.5, ey + eH * 0.8, ex - eSize, ey);
    }
    ctx.closePath();
    ctx.fill();

    // Iris
    const irisR = eSize * 0.48;
    const irisColor = face.ethnicity === 'chinese' ? '#3d2b1f' : face.ethnicity === 'indian' ? '#2a1a0e' : '#2e1a0f';
    const irisGrad = ctx.createRadialGradient(ex - irisR * 0.25, ey - irisR * 0.2, irisR * 0.05, ex, ey, irisR);
    irisGrad.addColorStop(0, lighten(irisColor, 30));
    irisGrad.addColorStop(0.4, irisColor);
    irisGrad.addColorStop(1, darken(irisColor, 20));

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(ex, ey, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#0a0505';
    ctx.beginPath();
    ctx.arc(ex, ey, irisR * 0.52, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlight
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(ex + irisR * 0.28, ey - irisR * 0.28, irisR * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Eye outline / lash line
    ctx.strokeStyle = darken(face.skinColor, 50);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (face.eyeType === 'monolid') {
      ctx.ellipse(ex, ey, eSize, eH * 0.8, 0, 0, Math.PI * 2);
    } else if (face.eyeType === 'almond') {
      ctx.moveTo(ex - eSize, ey);
      ctx.bezierCurveTo(ex - eSize * 0.5, ey - eH, ex + eSize * 0.5, ey - eH, ex + eSize, ey);
    } else {
      ctx.moveTo(ex - eSize, ey);
      ctx.bezierCurveTo(ex - eSize * 0.5, ey - eH * 1.1, ex + eSize * 0.5, ey - eH * 1.1, ex + eSize, ey);
    }
    ctx.stroke();

    // Eyelid crease for double/almond
    if (face.eyeType !== 'monolid') {
      ctx.strokeStyle = darken(face.skinColor, 18);
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(ex - eSize * 0.6, ey - eH * 0.9);
      ctx.bezierCurveTo(ex, ey - eH * 1.35, ex + eSize * 0.6, ey - eH * 0.9, ex + eSize * 0.8, ey - eH * 0.4);
      ctx.stroke();
    }

    // Lower lash line
    ctx.strokeStyle = '#1a0a00';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(ex - eSize, ey);
    ctx.bezierCurveTo(ex - eSize * 0.5, ey + eH * 0.7, ex + eSize * 0.5, ey + eH * 0.7, ex + eSize, ey);
    ctx.stroke();
  }
}

function drawNose(ctx, cx, cy, rx, ry, face) {
  const noseTop = cy + ry * 0.05;
  const noseBottom = cy + ry * 0.38;
  const noseW = rx * face.noseWidth * 0.48;
  const bridge = face.noseBridge;

  // Nose bridge subtle highlight
  ctx.strokeStyle = darken(face.skinColor, 12);
  ctx.lineWidth = rx * 0.04;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.02, noseTop);
  ctx.bezierCurveTo(cx - rx * bridge * 0.05, noseTop + (noseBottom - noseTop) * 0.5, cx, noseBottom - ry * 0.06, cx, noseBottom - ry * 0.04);
  ctx.stroke();

  // Nostrils
  const nostrilY = noseBottom;
  ctx.fillStyle = darken(face.skinColor, 25);
  ctx.beginPath();
  ctx.ellipse(cx - noseW * 0.5, nostrilY, noseW * 0.35, ry * 0.07, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + noseW * 0.5, nostrilY, noseW * 0.35, ry * 0.07, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // Nostril holes
  ctx.fillStyle = darken(face.skinColor, 55);
  ctx.beginPath();
  ctx.ellipse(cx - noseW * 0.48, nostrilY + ry * 0.01, noseW * 0.18, ry * 0.045, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + noseW * 0.48, nostrilY + ry * 0.01, noseW * 0.18, ry * 0.045, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Nose tip
  ctx.fillStyle = lighten(face.skinColor, 8);
  ctx.beginPath();
  ctx.ellipse(cx, nostrilY - ry * 0.04, noseW * 0.38, ry * 0.065, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMouth(ctx, cx, cy, rx, ry, face, expr) {
  const mouthY = cy + ry * 0.6;
  const mouthW = rx * (face.lipFullness * 0.55 + 0.18);
  const curve = expr.mouthCurve;
  const lipH = ry * face.lipFullness * 0.075;

  // Upper lip darker, lower lighter
  const upperLip = darken(face.skinColor, 18);
  const lowerLip = lighten(face.skinColor, 5);

  // Upper lip
  ctx.fillStyle = upperLip;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY + curve * lipH * 0.5);
  ctx.bezierCurveTo(
    cx - mouthW * 0.5, mouthY - lipH * 0.6,
    cx - mouthW * 0.15, mouthY - lipH * 0.9,
    cx, mouthY - lipH * 0.7
  );
  ctx.bezierCurveTo(
    cx + mouthW * 0.15, mouthY - lipH * 0.9,
    cx + mouthW * 0.5, mouthY - lipH * 0.6,
    cx + mouthW, mouthY + curve * lipH * 0.5
  );
  ctx.bezierCurveTo(
    cx + mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx - mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx - mouthW, mouthY + curve * lipH * 0.5
  );
  ctx.fill();

  // Lower lip
  ctx.fillStyle = lowerLip;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY + curve * lipH * 0.5);
  ctx.bezierCurveTo(
    cx - mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx + mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx + mouthW, mouthY + curve * lipH * 0.5
  );
  ctx.bezierCurveTo(
    cx + mouthW * 0.5, mouthY + lipH * 1.5 + curve * lipH * 0.8,
    cx - mouthW * 0.5, mouthY + lipH * 1.5 + curve * lipH * 0.8,
    cx - mouthW, mouthY + curve * lipH * 0.5
  );
  ctx.fill();

  // Lip line
  ctx.strokeStyle = darken(face.skinColor, 28);
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - mouthW, mouthY + curve * lipH * 0.5);
  ctx.bezierCurveTo(
    cx - mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx + mouthW * 0.4, mouthY + lipH * 0.2 + curve * lipH,
    cx + mouthW, mouthY + curve * lipH * 0.5
  );
  ctx.stroke();

  // If very amused/smiling — show teeth
  if (curve > 0.45) {
    ctx.fillStyle = '#f5f0e8';
    ctx.beginPath();
    ctx.ellipse(cx, mouthY + lipH * 0.6 + curve * lipH * 0.5, mouthW * 0.55, lipH * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4c8b8';
    ctx.lineWidth = 0.4;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * mouthW * 0.18, mouthY + curve * lipH * 0.5);
      ctx.lineTo(cx + i * mouthW * 0.18, mouthY + lipH * 1.1 + curve * lipH * 0.5);
      ctx.stroke();
    }
  }
}

function drawBeard(ctx, cx, cy, rx, ry, face) {
  const beardColor = hexAlpha(face.beardColor, 0.7);
  const jawY = cy + ry * 0.72;
  const chinY = cy + ry * 0.98;
  const style = face.beardStyle;

  ctx.fillStyle = beardColor;

  if (style === 'stubble') {
    // Stippled stubble effect
    for (let i = 0; i < 120; i++) {
      const angle = Math.random() * Math.PI;
      const r = Math.random();
      const sx = cx + (r * rx * 0.85 - rx * 0.425) * (1 - Math.abs(Math.random() - 0.5) * 0.3);
      const sy = cy + ry * 0.3 + Math.random() * ry * 0.7;
      if (sy > jawY * 0.85 && sy < chinY * 1.02) {
        ctx.fillStyle = hexAlpha(face.beardColor, 0.25 + Math.random() * 0.2);
        ctx.beginPath();
        ctx.arc(sx, sy, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (style === 'goatee') {
    ctx.fillStyle = beardColor;
    ctx.beginPath();
    ctx.ellipse(cx, chinY - ry * 0.06, rx * 0.22, ry * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Moustache
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.56, rx * 0.28, ry * 0.055, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'full') {
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.75, cy + ry * 0.35);
    ctx.bezierCurveTo(cx - rx * 0.85, jawY, cx - rx * 0.55, chinY, cx, chinY + ry * 0.06);
    ctx.bezierCurveTo(cx + rx * 0.55, chinY, cx + rx * 0.85, jawY, cx + rx * 0.75, cy + ry * 0.35);
    ctx.fill();
    // Moustache
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.56, rx * 0.3, ry * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGlasses(ctx, cx, cy, rx, ry, face) {
  const eyeY = cy - ry * 0.1 + face.eyeDroop * ry * 0.08;
  const spacing = face.eyeSpacing;
  const gx1 = cx - rx * spacing;
  const gx2 = cx + rx * spacing;
  const gR = rx * 0.22;
  const gStyle = face.glassesStyle;

  ctx.strokeStyle = '#3a3028';
  ctx.lineWidth = 1.2;
  ctx.fillStyle = 'rgba(200,230,255,0.08)';

  if (gStyle === 'rectangle') {
    const hw = gR * 1.05;
    const hh = gR * 0.65;
    for (const gx of [gx1, gx2]) {
      ctx.beginPath();
      ctx.roundRect(gx - hw, eyeY - hh, hw * 2, hh * 2, 3);
      ctx.fill();
      ctx.stroke();
    }
  } else {
    for (const gx of [gx1, gx2]) {
      ctx.beginPath();
      ctx.arc(gx, eyeY, gR * 0.88, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Bridge
  ctx.beginPath();
  ctx.moveTo(gx1 + gR * (gStyle === 'rectangle' ? 1.05 : 0.88), eyeY);
  ctx.lineTo(gx2 - gR * (gStyle === 'rectangle' ? 1.05 : 0.88), eyeY);
  ctx.stroke();

  // Temples
  ctx.beginPath();
  ctx.moveTo(gx1 - gR * (gStyle === 'rectangle' ? 1.05 : 0.88), eyeY);
  ctx.lineTo(cx - rx * 0.9, eyeY - ry * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(gx2 + gR * (gStyle === 'rectangle' ? 1.05 : 0.88), eyeY);
  ctx.lineTo(cx + rx * 0.9, eyeY - ry * 0.02);
  ctx.stroke();
}

function drawWrinkles(ctx, cx, cy, rx, ry, face, expr) {
  const amount = face.wrinkleAmount;
  ctx.strokeStyle = darken(face.skinColor, 22);
  ctx.lineWidth = 0.55;
  ctx.lineCap = 'round';

  // Forehead lines
  for (let i = 0; i < Math.floor(amount * 3); i++) {
    const wy = cy - ry * (0.48 - i * 0.08);
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.4, wy);
    ctx.bezierCurveTo(cx - rx * 0.1, wy - ry * 0.015, cx + rx * 0.1, wy - ry * 0.015, cx + rx * 0.4, wy);
    ctx.stroke();
  }

  // Nasolabial folds
  if (amount > 0.2) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + side * rx * 0.28, cy + ry * 0.1);
      ctx.bezierCurveTo(
        cx + side * rx * 0.42, cy + ry * 0.28,
        cx + side * rx * 0.38, cy + ry * 0.5,
        cx + side * rx * 0.28, cy + ry * 0.58
      );
      ctx.stroke();
    }
  }

  // Eye corner lines (crow's feet)
  if (amount > 0.4) {
    const eyeY = cy - ry * 0.1 + face.eyeDroop * ry * 0.08;
    for (const side of [-1, 1]) {
      const ex = cx + side * rx * face.eyeSpacing + side * rx * face.eyeSize;
      for (let i = 0; i < 3; i++) {
        const angle = (i - 1) * 0.3;
        ctx.beginPath();
        ctx.moveTo(ex, eyeY);
        ctx.lineTo(ex + side * rx * 0.12 * Math.cos(angle), eyeY + ry * 0.1 * Math.sin(angle));
        ctx.stroke();
      }
    }
  }
}
