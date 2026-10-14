import type { MoodLevel } from "@/lib/types";

const INK = "#23204a";
const FILL: Record<MoodLevel | "rust", string> = { 1: "#ffb09f", 2: "#ffd3a8", 3: "#ffe59a", 4: "#a6ebd6", 5: "#c9d4ff", rust: "#c9d4ff" };

/** Klein gezichtje voor de stemming. Altijd met tekstlabel ernaast of als aria-label op de knop. */
export function MoodFace({ mood, size = 40 }: { mood: MoodLevel | "rust"; size?: number }) {
  const s = { stroke: INK, strokeWidth: 2.4, fill: "none", strokeLinecap: "round" as const };
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill={FILL[mood]} />
      {mood === 5 ? (
        <>
          <path d="M11 17 Q14 13 17 17 M23 17 Q26 13 29 17" {...s} />
          <path d="M12 23 Q20 33 28 23 Z" fill={INK} />
        </>
      ) : mood === "rust" ? (
        <>
          <path d="M11 18 Q14 21 17 18 M23 18 Q26 21 29 18" {...s} />
          <path d="M16 27 Q20 29 24 27" {...s} />
        </>
      ) : (
        <>
          <circle cx="14" cy="17" r="2.2" fill={INK} />
          <circle cx="26" cy="17" r="2.2" fill={INK} />
          {mood === 1 && <path d="M13 29 Q20 22 27 29" {...s} />}
          {mood === 2 && <path d="M14 27 Q20 24 26 27" {...s} />}
          {mood === 3 && <path d="M14 26 H26" {...s} />}
          {mood === 4 && <path d="M13 24 Q20 30 27 24" {...s} />}
        </>
      )}
    </svg>
  );
}
