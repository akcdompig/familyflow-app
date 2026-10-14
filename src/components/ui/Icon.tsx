const PATHS = {
  huis: "M3 11l9-7 9 7v9H5z",
  taken: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM8 12l3 3 5-6",
  voortgang: "M4 19V5M4 19h16M8 15l4-4 3 3 5-6",
  ik: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  bel: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  terug: "M15 5l-7 7 7 7",
  sluit: "M6 6l12 12M18 6L6 18",
  check: "M5 12l5 5 9-10",
  chat: "M4 5h16v11H9l-5 4z",
  schild: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  dobbel: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z",
  wissel: "M4 8h14l-3-3M20 16H6l3 3",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill={filled ? "currentColor" : "none"} fillOpacity={filled ? 0.15 : undefined} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
      {name === "dobbel" && (
        <g fill="currentColor" stroke="none">
          <circle cx="9" cy="9" r="1.4" />
          <circle cx="15" cy="15" r="1.4" />
          <circle cx="15" cy="9" r="1.4" />
          <circle cx="9" cy="15" r="1.4" />
        </g>
      )}
    </svg>
  );
}
