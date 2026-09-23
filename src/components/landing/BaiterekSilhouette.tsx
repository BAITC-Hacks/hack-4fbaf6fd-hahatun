// Static outline shown while three.js loads or when WebGL is unavailable. Same proportions as the 3D model.
export function BaiterekSilhouette() {
  return (
    <svg viewBox="0 0 200 400" aria-hidden="true" className="size-full">
      <g fill="var(--border)">
        <rect x="14" y="388.4" width="172" height="3.6" rx="1" />
        <rect x="26" y="384.8" width="148" height="3.6" rx="1" />
        <rect x="39.2" y="381.2" width="121.6" height="3.6" rx="1" />
        <rect x="52" y="377.6" width="96" height="3.6" rx="1" />
        <path d="M129.6 377.6 L124 352 L120.4 312 L118.4 264 L118 220 L120 188 L128.8 160 L142.4 132 L152 112 L158 92 L160.8 64 L39.2 64 L42 92 L48 112 L57.6 132 L71.2 160 L80 188 L82 220 L81.6 264 L79.6 312 L76 352 L70.4 377.6 Z" />
      </g>
      <circle cx="100" cy="92" r="36" fill="var(--gold)" opacity="0.55" />
    </svg>
  );
}
