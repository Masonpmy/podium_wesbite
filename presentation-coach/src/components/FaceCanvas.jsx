import { useEffect, useRef } from 'react';
import { drawFace } from '../utils/faceRenderer';

const FACE_SIZE = 72;

export default function FaceCanvas({ face, size = FACE_SIZE }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawFace(ctx, face, size, size, face.expression || 'neutral', face.expressionIntensity || 0);
  }, [face, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      style={{ imageRendering: 'crisp-edges' }}
    />
  );
}
