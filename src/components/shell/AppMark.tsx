// Dial with the first five hours filled: the akim's term in this game.
const FIVE_HOURS_END = { x: 16 + 11 * Math.sin((5 * Math.PI) / 6), y: 16 - 11 * Math.cos((5 * Math.PI) / 6) };

export function AppMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="var(--primary)" strokeWidth="1.5" />
      <path
        d={`M16 16 L16 5 A11 11 0 0 1 ${FIVE_HOURS_END.x.toFixed(2)} ${FIVE_HOURS_END.y.toFixed(2)} Z`}
        fill="var(--gold)"
      />
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="16"
          y1="2.5"
          x2="16"
          y2="5"
          stroke="var(--primary)"
          strokeWidth="1.5"
          transform={`rotate(${deg} 16 16)`}
        />
      ))}
      <circle cx="16" cy="16" r="1.6" fill="var(--primary)" />
    </svg>
  );
}
