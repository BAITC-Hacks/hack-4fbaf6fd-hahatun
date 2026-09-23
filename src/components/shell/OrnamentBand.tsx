// Letterhead band with a simplified "qoshqar muiz" (ram's horn) motif.
export function OrnamentBand({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} preserveAspectRatio="none">
      <defs>
        <pattern id="ornament-qoshqar" width="28" height="12" patternUnits="userSpaceOnUse">
          <path
            d="M14 11.5V7C14 3.6 17.4 1.4 20.2 2.5C22.4 3.4 22.3 6.4 20.1 6.8C18.8 7 18 5.8 18.8 4.9
               M14 7C14 3.6 10.6 1.4 7.8 2.5C5.6 3.4 5.7 6.4 7.9 6.8C9.2 7 10 5.8 9.2 4.9
               M0 11.5H28"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#ornament-qoshqar)" />
    </svg>
  );
}
