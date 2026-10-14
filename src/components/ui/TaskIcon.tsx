import type { TaskIcon as T } from "@/lib/types";

const P: Record<T, string> = {
  pen: "M15 4l5 5L9 20H4v-5z",
  boek: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5M8 7h7",
  sport: "M14 4a2 2 0 1 0 0 .1M7 21l3-6 3 2 1 4M6 11l3-3 4 1 3 3h3M10 15l2-6",
  huis: "M3 11l9-7 9 7M5 10v10h14V10",
  bord: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  afval: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  poot: "M7.5 17c0-3 2.2-5 4.7-5s4.8 2 4.8 5c0 2-2.3 2.5-4.8 2.5S7.5 19 7.5 17zM6.5 10a1.7 1.7 0 1 0 0 .1M10 6a1.7 1.7 0 1 0 0 .1M14.5 6a1.7 1.7 0 1 0 0 .1M18 10a1.7 1.7 0 1 0 0 .1",
  bed: "M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3H10v3M6 11a1.5 1.5 0 1 0 0 .1",
  telefoon: "M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2",
  zon: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  kar: "M3 4h2l2.5 11h10L20 7H6.5M9 20a1 1 0 1 0 0-.1M17 20a1 1 0 1 0 0-.1",
  post: "M3 6h18v12H3zM3 7l9 6 9-6",
};

export function TaskIcon({ name, size = 24 }: { name: T; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.huis} />
    </svg>
  );
}
