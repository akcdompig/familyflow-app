const PATHS = {
  huis: "M3 11l9-7 9 7v9H5z",
  thuis: "M4 20V10l8-6 8 6v10M9 20v-6h6v6M15 7V4h3v5",
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
  boek: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7",
  gezin: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 20c0-3 3-5 6-5s6 2 6 5M16 14.5c3 0 5 1.8 5 4.5",
  school: "M2 9l10-5 10 5-10 5zM6 11v5c3.5 2.5 8.5 2.5 12 0v-5M22 9v6",
  zorg: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  groei: "M12 21v-8M12 13c0-4.5 3-7.5 8-7.5 0 5-3 7.5-8 7.5zM12 15.5c0-3.5-2.5-5.5-7-5.5 0 4 2.5 5.5 7 5.5",
  kalender: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4",
  rust: "M3 10c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
  oefenen: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
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
