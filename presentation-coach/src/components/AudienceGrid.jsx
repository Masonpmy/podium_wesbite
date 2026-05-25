import FaceCanvas from './FaceCanvas';

const EXPRESSION_EMOJI = {
  neutral: '',
  engaged: '✨',
  amused: '😄',
  bored: '😴',
  confused: '🤔',
  distracted: '👀',
  concerned: '😟',
};

export default function AudienceGrid({ faces }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))' }}>
      {faces.map(face => (
        <div
          key={face.id}
          className="relative group"
          title={`${face.gender}, ${face.age}y, ${face.ethnicity} — ${face.expression}`}
        >
          <FaceCanvas face={face} size={72} />
          {face.expressionIntensity > 0.25 && face.expression !== 'neutral' && (
            <div
              className="absolute -top-1 -right-1 text-xs leading-none pointer-events-none"
              style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)', fontSize: '11px' }}
            >
              {EXPRESSION_EMOJI[face.expression] || ''}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
