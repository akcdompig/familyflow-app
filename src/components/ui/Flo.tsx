/** Flo, de mascotte. Neutraal: geen jongen of meisje, geen dier, geen huidskleur. */
export function Flo({ size = 44, mood = "blij", color = "#ff6b57" }: { size?: number; mood?: "blij" | "rustig"; color?: string }) {
  const INK = "#23204a";
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <path d="M60 14 C70 6 84 10 80 22 C100 30 108 50 106 70 C104 96 84 110 60 110 C36 110 16 96 14 70 C12 46 28 24 50 20 C50 14 54 10 60 14 Z" fill={color} />
      {mood === "blij" ? (
        <>
          <ellipse cx="46" cy="60" rx="7" ry="9" fill={INK} />
          <ellipse cx="74" cy="60" rx="7" ry="9" fill={INK} />
          <path d="M50 76 Q60 86 70 76" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M39 60 Q46 65 53 60 M67 60 Q74 65 81 60" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M53 77 Q60 81 67 77" stroke={INK} strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
