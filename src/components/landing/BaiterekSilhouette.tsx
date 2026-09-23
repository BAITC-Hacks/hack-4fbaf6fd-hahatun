// Static outline shown while three.js loads or when WebGL is unavailable. Same proportions as the 3D model.
export function BaiterekSilhouette() {
  return (
    <svg viewBox="0 0 200 400" aria-hidden="true" className="size-full">
      <g fill="var(--border)">
        <rect x="23" y="386.7" width="154" height="5.3" rx="1" />
        <rect x="36.2" y="381.4" width="127.6" height="5.3" rx="1" />
        <rect x="49.4" y="376.2" width="101.2" height="5.3" rx="1" />
        <path d="M115.8 376.2 L110.6 330.4 L107.5 242.4 L109.7 176.4 L117.6 141.2 L134.3 114.8 L146.6 88.4 L151.9 64.2 L48.1 64.2 L53.4 88.4 L65.7 114.8 L82.4 141.2 L90.3 176.4 L92.5 242.4 L89.4 330.4 L84.2 376.2 Z" />
      </g>
      <circle cx="100" cy="79.6" r="39.6" fill="var(--gold)" opacity="0.55" />
    </svg>
  );
}
