/*
  Klein plaatje bij een afspraak, alleen als het iets zegt (zie beeldVoor in lib/agenda):
  - eten:     twee mensen tegenover elkaar aan een tafeltje, met kopjes en praatlijntjes
  - zakelijk: hetzelfde tafeltje, rustiger, met een laptop en één kopje
  - gesprek:  twee mensen met een praatwolkje, zonder tafel
  Geen gezichten of echte personen: eenvoudige figuren in de kleuren van de app. De tekst ernaast zegt alles,
  dus voor schermlezers is het plaatje stil.
*/

type Soort = "eten" | "zakelijk" | "gesprek";

const ACHTER: Record<Soort, string> = { eten: "var(--ff-zon-zacht)", zakelijk: "var(--ff-lucht-zacht)", gesprek: "var(--ff-munt-zacht)" };

function Figuur({ x, kleur, kijkt }: { x: number; kleur: string; kijkt: "rechts" | "links" }) {
  const d = kijkt === "rechts" ? 1 : -1;
  return (
    <g fill={kleur}>
      <circle cx={x} cy={33} r={10} />
      <path d={`M${x - 15} 80 v-16 q0 -14 15 -14 q15 0 15 14 v16 z`} />
      {/* arm naar de tafel */}
      <path d={`M${x + 6 * d} 58 q${12 * d} 2 ${20 * d} 4`} stroke={kleur} strokeWidth={7} strokeLinecap="round" fill="none" />
    </g>
  );
}

function Praat({ x, y, kant }: { x: number; y: number; kant: 1 | -1 }) {
  return (
    <g stroke="var(--ff-tekst-zacht)" strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.7}>
      <path d={`M${x} ${y} l${6 * kant} -4`} />
      <path d={`M${x + 1 * kant} ${y + 6} l${8 * kant} 0`} />
      <path d={`M${x} ${y + 12} l${6 * kant} 4`} />
    </g>
  );
}

function Tafel() {
  return (
    <g>
      <rect x={77} y={62} width={6} height={18} rx={2} fill="var(--ff-tekst-zacht)" opacity={0.55} />
      <ellipse cx={80} cy={81} rx={13} ry={3} fill="var(--ff-tekst-zacht)" opacity={0.35} />
      <ellipse cx={80} cy={61} rx={31} ry={6} fill="var(--ff-vlak)" stroke="var(--ff-lijn)" strokeWidth={2} />
    </g>
  );
}

function Kopje({ x, damp }: { x: number; damp?: boolean }) {
  return (
    <g>
      {damp && <path className="ff-beeld-damp" d={`M${x + 3} 44 q-3 -4 0 -8 M${x + 8} 44 q-3 -4 0 -8`} stroke="var(--ff-tekst-zacht)" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.6} />}
      <path d={`M${x} 47 h11 v6 q0 4 -4 4 h-3 q-4 0 -4 -4 z`} fill="var(--ff-vlak)" stroke="var(--ff-nacht-2)" strokeWidth={1.6} />
      <path d={`M${x + 11} 49 q4 0 4 3 q0 3 -4 3`} stroke="var(--ff-nacht-2)" strokeWidth={1.6} fill="none" />
    </g>
  );
}

export function AfspraakBeeld({ soort, size = 96 }: { soort: Soort; size?: number }) {
  return (
    <svg className="ff-afspraak-beeld" viewBox="0 0 160 90" width={size} height={(size * 90) / 160} aria-hidden="true" focusable="false">
      <rect x={0} y={0} width={160} height={90} rx={16} fill={ACHTER[soort]} />
      <Figuur x={38} kleur="var(--ff-koraal)" kijkt="rechts" />
      <Figuur x={122} kleur="var(--ff-lucht)" kijkt="links" />
      {soort === "gesprek" ? (
        <g>
          <rect x={62} y={14} width={36} height={20} rx={10} fill="var(--ff-vlak)" stroke="var(--ff-lijn)" strokeWidth={2} />
          <path d="M72 34 l-4 7 l10 -7 z" fill="var(--ff-vlak)" />
          <g fill="var(--ff-tekst-zacht)"><circle cx={72} cy={24} r={2} /><circle cx={80} cy={24} r={2} /><circle cx={88} cy={24} r={2} /></g>
        </g>
      ) : (
        <>
          <Tafel />
          {soort === "eten" ? (
            <>
              <Kopje x={60} damp />
              <Kopje x={88} damp />
              <Praat x={54} y={20} kant={1} />
              <Praat x={106} y={20} kant={-1} />
            </>
          ) : (
            <>
              <path d="M70 55 l4 -14 h20 l-4 14 z" fill="var(--ff-nacht-2)" />
              <rect x={66} y={54} width={30} height={3} rx={1.5} fill="var(--ff-nacht-2)" />
              <Kopje x={98} />
              <Praat x={54} y={22} kant={1} />
            </>
          )}
        </>
      )}
    </svg>
  );
}
