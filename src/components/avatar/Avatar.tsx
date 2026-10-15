"use client";

import type { CSSProperties } from "react";
import type { AvatarConfig, Bezig } from "@/lib/types";
import type { Expression } from "@/lib/mood";
import { shade, skinColor } from "./parts";

interface Props {
  config: AvatarConfig;
  expression?: Expression;
  /** 0–1. Hoog = meer glans en een vrolijkere beweging. Zegt niets over gevoel. */
  energy?: number;
  size?: number;
  animate?: boolean;
  /** Bepaalt het ritme van knipperen en bewegen, zodat niet iedereen tegelijk beweegt. */
  seed?: number;
  label?: string;
  /** Alleen het hoofd tonen (voor kleine rondjes). */
  headOnly?: boolean;
  /** Aan het werk: andere spullen of kleding. */
  bezig?: Bezig;
  /** Ochtendroutine niet gedaan: er komt een walmpje af. */
  walm?: boolean;
  /** Te weinig gedronken: een druppeltje boven het hoofd. */
  dorst?: boolean;
  /** Er is nog niet gegeten of er kookt niemand: een knorrend buikje. */
  honger?: boolean;
}

const INK = "#23204a";

export function Avatar({ config, expression = "neutraal", energy = 0.5, size = 140, animate = true, seed = 0, label, headOnly = false, bezig, walm = false, dorst = false, honger = false }: Props) {
  const skin = skinColor(config.skin);
  const skinDark = shade(skin, -22);
  const hair = config.hairColor;
  const has = (e: string) => config.extras.includes(e as never);
  const browColor = config.hair === "kaal" || config.hair === "hoofddoek" ? shade(skin, -70) : hair;
  const glow = energy >= 0.75 && !headOnly && !bezig && !["verdrietig", "rust", "moe", "boos", "slaap"].includes(expression);
  const mode = !animate ? "" : expression === "rust" || expression === "slaap" ? "ff-av-breathe" : "ff-av-bob";
  const bob = expression === "verdrietig" || expression === "moe" ? 5.2 : energy >= 0.75 ? 2.4 : 3.6;
  const style = {
    "--bob": `${bob}s`,
    "--delay": `${(seed % 7) * 0.37}s`,
    "--blink-delay": `${(seed % 5) * 0.9}s`,
  } as CSSProperties;

  const vb = headOnly ? "22 18 116 116" : "0 0 160 200";
  const h = headOnly ? size : size * 1.25;

  return (
    <span className={`ff-av ${mode}`} style={style}>
      <svg viewBox={vb} width={size} height={h} role="img" aria-label={label ?? "Avatar"} style={{ overflow: "visible", display: "block" }}>
        {glow && (
          <g>
            <circle cx="80" cy="112" r="78" fill="#ffc845" opacity=".28" />
            <path d="M146 34 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#ff8a1f" className="ff-av-sparkle" />
            <path d="M12 58 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z" fill="#6c8cff" className="ff-av-sparkle" style={{ animationDelay: ".8s" }} />
          </g>
        )}
        <g key={expression} className={animate ? "ff-av-react" : undefined}>
          {/* Haar achter */}
          {config.hair === "lang" && (
            <path d="M38 84 C34 40 58 28 80 28 C104 28 128 40 122 84 C126 112 126 140 124 158 C110 162 100 150 98 140 L62 140 C60 150 50 162 36 158 C34 140 34 112 38 84 Z" fill={hair} />
          )}
          {config.hair === "vlechtjes" && (
            <g fill={hair}>
              {[96, 108, 120, 132, 144].map((y) => (
                <g key={y}>
                  <circle cx="38" cy={y} r="7.5" />
                  <circle cx="122" cy={y} r="7.5" />
                </g>
              ))}
              <circle cx="38" cy="155" r="4" fill="#ff6b57" />
              <circle cx="122" cy="155" r="4" fill="#ff6b57" />
            </g>
          )}
          {config.hair === "hoofddoek" && (
            <path d="M34 90 C30 40 56 24 80 24 C104 24 130 40 126 90 C128 124 120 150 112 162 L48 162 C40 150 32 124 34 90 Z" fill={hair} />
          )}

          {/* Lichaam en kleding */}
          {!headOnly && <Outfit style={config.outfit} color={config.outfitColor} />}
          {!headOnly && <rect x="69" y="112" width="22" height="30" rx="6" fill={skinDark} />}
          {!headOnly && config.outfit === "overhemd" && (
            <g>
              <path d="M66 138 L80 153 L69 160 Z" fill="#ffffff" />
              <path d="M94 138 L80 153 L91 160 Z" fill="#ffffff" />
            </g>
          )}

          {/* Oren en hoofd */}
          {config.hair !== "hoofddoek" && (
            <>
              <circle cx="43" cy="88" r="7.5" fill={skin} />
              <circle cx="117" cy="88" r="7.5" fill={skin} />
            </>
          )}
          <ellipse cx="80" cy="82" rx="38" ry="42" fill={skin} />

          {/* Haar voor */}
          <HairFront style={config.hair} color={hair} />

          {/* Extra's op het gezicht */}
          {has("sproeten") && (
            <g fill={shade(skin, -48)}>
              {[[56, 96], [61, 100], [64, 95], [96, 95], [99, 100], [104, 96]].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />
              ))}
            </g>
          )}
          {has("baard") && (
            <path d="M44 92 C46 122 62 132 80 132 C98 132 114 122 116 92 C110 108 98 112 80 112 C62 112 50 108 44 92 Z" fill={browColor} />
          )}

          <Face expression={expression} brow={browColor} bearded={has("baard")} />

          {has("snor") && (
            <path d="M66 99 Q73 93 80 97 Q87 93 94 99 Q87 102 80 100 Q73 102 66 99 Z" fill={browColor} />
          )}
          {has("bril") && (
            <g fill="none" stroke={INK} strokeWidth="3">
              <circle cx="66" cy="86" r="10" fill="#ffffff" fillOpacity=".18" />
              <circle cx="94" cy="86" r="10" fill="#ffffff" fillOpacity=".18" />
              <path d="M76 86 H84 M56 84 L45 82 M104 84 L115 82" strokeLinecap="round" />
            </g>
          )}
          {has("koptelefoon") && (
            <g>
              <path d="M36 90 C34 32 126 32 124 90" stroke="#6c8cff" strokeWidth="7" fill="none" strokeLinecap="round" />
              <rect x="28" y="78" width="16" height="26" rx="7" fill="#4c64d9" />
              <rect x="116" y="78" width="16" height="26" rx="7" fill="#4c64d9" />
            </g>
          )}
          {has("pet") && (
            <g>
              <path d="M41 66 C40 38 60 27 80 27 C100 27 120 38 119 66 Z" fill="#3a3670" />
              <path d="M78 62 C98 58 126 60 136 67 C122 72 96 70 78 66 Z" fill="#2c2957" />
            </g>
          )}
        </g>
        {walm && expression !== "slaap" && (
          <g className={animate ? "ff-av-walm" : undefined} stroke="#8da35a" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".85">
            <path d="M22 120 c-6 -8 6 -14 0 -22 c-6 -8 6 -14 0 -22" />
            <path d="M138 120 c6 -8 -6 -14 0 -22 c6 -8 -6 -14 0 -22" />
            <path d="M40 40 c-5 -6 5 -10 0 -16" />
          </g>
        )}
        {dorst && expression !== "slaap" && (
          <g className={animate ? "ff-av-dorst" : undefined}>
            <path d="M140 52 C134 62 132 66 132 70 a8 8 0 0 0 16 0 c0 -4 -2 -8 -8 -18 z" fill="#5cb8ff" stroke="#2f8de0" strokeWidth="1.5" />
            <text x="140" y="74" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff">!</text>
          </g>
        )}
        {honger && expression !== "slaap" && (
          <g className={animate ? "ff-av-honger" : undefined}>
            <circle cx="22" cy="58" r="14" fill="#fff" stroke="#e8a24a" strokeWidth="2" />
            <text x="22" y="64" textAnchor="middle" fontSize="16">🍽️</text>
          </g>
        )}
        {bezig && expression !== "slaap" && <Werkspullen bezig={bezig} headOnly={headOnly} animate={animate} />}
        {expression === "slaap" && (
          <g className={animate ? "ff-av-zzz" : undefined} fill={INK} fontFamily="var(--ff-font-speels, sans-serif)" fontWeight="700">
            <text x="118" y="44" fontSize="22">Z</text>
            <text x="134" y="26" fontSize="16">z</text>
            <text x="146" y="12" fontSize="12">z</text>
          </g>
        )}
      </svg>
    </span>
  );
}

function Outfit({ style, color }: { style: AvatarConfig["outfit"]; color: string }) {
  const dark = shade(color, -32);
  return (
    <g>
      <path d="M26 200 C26 156 52 138 80 138 C108 138 134 156 134 200 Z" fill={color} stroke={color === "#ffffff" ? "#e4dcd3" : "none"} strokeWidth="2" />
      {style === "hoodie" && (
        <g>
          <path d="M50 146 C56 130 104 130 110 146 C100 153 60 153 50 146 Z" fill={dark} />
          <path d="M72 150 L70 174 M88 150 L90 174" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          <path d="M60 184 H100" stroke={dark} strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {style === "tshirt" && <path d="M66 141 Q80 156 94 141" stroke={dark} strokeWidth="4" fill="none" strokeLinecap="round" />}
      {style === "trui" && <path d="M63 141 Q80 152 97 141" stroke={dark} strokeWidth="7" fill="none" strokeLinecap="round" />}
      {style === "overhemd" && (
        <g fill={dark}>
          <circle cx="80" cy="166" r="2.2" />
          <circle cx="80" cy="180" r="2.2" />
          <circle cx="80" cy="194" r="2.2" />
        </g>
      )}
    </g>
  );
}

function HairFront({ style, color }: { style: AvatarConfig["hair"]; color: string }) {
  switch (style) {
    case "kort":
      return <path d="M42 80 C40 44 60 34 80 34 C102 34 122 46 118 80 C114 64 100 56 80 56 C62 56 48 64 42 80 Z" fill={color} />;
    case "krullen":
      return (
        <g fill={color}>
          {[[50, 60, 14], [66, 46, 15], [84, 42, 16], [102, 48, 15], [114, 64, 12], [45, 75, 9], [117, 78, 8]].map(([x, y, r]) => (
            <circle key={`${x}`} cx={x} cy={y} r={r} />
          ))}
        </g>
      );
    case "lang":
      return <path d="M42 82 C42 50 60 38 82 38 C104 38 120 50 118 82 C108 62 92 58 76 60 C62 62 50 70 42 82 Z" fill={color} />;
    case "knot":
      return (
        <g fill={color}>
          <circle cx="80" cy="30" r="16" />
          <path d="M42 82 C40 48 60 38 80 38 C100 38 120 48 118 82 C112 64 98 58 80 58 C62 58 48 64 42 82 Z" />
        </g>
      );
    case "vlechtjes":
      return <path d="M40 84 C38 44 60 32 80 32 C100 32 122 44 120 84 C116 62 100 54 80 54 C60 54 44 62 40 84 Z" fill={color} />;
    case "opgeschoren":
      return <path d="M46 72 C46 48 62 40 80 40 C98 40 114 48 114 72 C106 60 94 56 80 56 C66 56 54 60 46 72 Z" fill={color} opacity=".85" />;
    case "hoofddoek":
      return (
        <g fill={color}>
          <path d="M43 72 C44 46 62 34 80 34 C98 34 116 46 117 72 C108 58 96 52 80 52 C64 52 52 58 43 72 Z" />
          <path d="M44 100 C48 128 64 140 80 140 C96 140 112 128 116 100 C120 124 108 150 80 154 C52 150 40 124 44 100 Z" />
        </g>
      );
    case "kaal":
      return <ellipse cx="96" cy="50" rx="9" ry="5" fill="#ffffff" opacity=".22" />;
    default:
      return null;
  }
}

function Face({ expression, brow, bearded }: { expression: Expression; brow: string; bearded: boolean }) {
  const mouthStroke = bearded ? "#f3d7c4" : INK;
  const stroke = { stroke: INK, strokeWidth: 3.2, fill: "none", strokeLinecap: "round" as const };
  const openEyes = (
    <g className="ff-av-eyes">
      <ellipse cx="66" cy="86" rx="4.5" ry="5.5" fill={INK} />
      <ellipse cx="94" cy="86" rx="4.5" ry="5.5" fill={INK} />
      <circle cx="67.5" cy="84" r="1.6" fill="#ffffff" />
      <circle cx="95.5" cy="84" r="1.6" fill="#ffffff" />
    </g>
  );
  const cheeks = (
    <g fill="#ff8fa3" opacity=".45">
      <circle cx="57" cy="99" r="6" />
      <circle cx="103" cy="99" r="6" />
    </g>
  );
  const brows = (d: string) => <path d={d} stroke={brow} strokeWidth="3" fill="none" strokeLinecap="round" />;

  switch (expression) {
    case "blij":
      return (
        <g>
          {brows("M59 73 Q66 69 72 73 M88 73 Q94 69 101 73")}
          <path d="M60 87 Q66 80 72 87 M88 87 Q94 80 100 87" {...stroke} />
          {cheeks}
          <path d="M68 100 Q80 115 92 100 Z" fill="#7a2e2e" />
          <path d="M73 107 Q80 111 87 107" fill="#ff8fa3" />
        </g>
      );
    case "goed":
      return (
        <g>
          {brows("M59 74 Q66 71 72 74 M88 74 Q94 71 101 74")}
          {openEyes}
          {cheeks}
          <path d="M70 101 Q80 109 90 101" {...stroke} stroke={mouthStroke} />
        </g>
      );
    case "verdrietig":
      return (
        <g>
          {brows("M59 75 L71 70 M89 70 L101 75")}
          {openEyes}
          <path d="M70 107 Q80 99 90 107" {...stroke} stroke={mouthStroke} />
        </g>
      );
    case "boos":
      return (
        <g>
          {brows("M59 70 L71 75 M89 75 L101 70")}
          {openEyes}
          <path d="M70 106 Q80 101 90 106" {...stroke} stroke={mouthStroke} />
        </g>
      );
    case "rust":
      return (
        <g>
          {brows("M59 75 Q66 73 72 75 M88 75 Q94 73 101 75")}
          <path d="M60 86 Q66 90 72 86 M88 86 Q94 90 100 86" {...stroke} />
          <path d="M74 104 Q80 107 86 104" {...stroke} stroke={mouthStroke} />
        </g>
      );
    case "slaap":
      return (
        <g>
          {brows("M59 76 Q66 75 72 76 M88 76 Q94 75 101 76")}
          <path d="M60 87 Q66 92 72 87 M88 87 Q94 92 100 87" {...stroke} />
          <ellipse cx="80" cy="105" rx="3.5" ry="4" fill="#7a2e2e" opacity=".8" />
        </g>
      );
    case "moe":
      return (
        <g>
          {brows("M59 75 H72 M88 75 H101")}
          <path d="M60 86 H72 M88 86 H100" {...stroke} />
          <path d="M73 105 H87" {...stroke} stroke={mouthStroke} />
        </g>
      );
    default:
      return (
        <g>
          {brows("M59 74 Q66 72 72 74 M88 74 Q94 72 101 74")}
          {openEyes}
          <path d="M72 104 H88" {...stroke} stroke={mouthStroke} />
        </g>
      );
  }
}

/** Spullen en kleding tijdens werk. Getekend over de avatar heen (viewBox 0 0 160 200). */
function Werkspullen({ bezig, headOnly, animate }: { bezig: Bezig; headOnly: boolean; animate: boolean }) {
  switch (bezig) {
    case "bouw":
      return (
        <g>
          <path d="M36 58 C36 22 124 22 124 58 Z" fill="#ffc845" stroke="#d99a00" strokeWidth="2" />
          <path d="M78 26 h4 v32 h-4 z" fill="#e8ad10" />
          <path d="M28 58 H132" stroke="#d99a00" strokeWidth="6" strokeLinecap="round" />
          {!headOnly && <path d="M40 150 L120 150 L126 200 L34 200 Z" fill="#ff8a1f" opacity=".9" />}
          {!headOnly && <path d="M38 170 H122 M36 186 H124" stroke="#f4f4f4" strokeWidth="5" />}
        </g>
      );
    case "school":
      // Rugzak en een boek
      return headOnly ? null : (
        <g>
          <path d="M30 150 C30 136 40 130 50 132 L54 196 L34 196 C30 186 30 170 30 150 Z" fill="#5b6bff" stroke="#3b47c4" strokeWidth="2" />
          <path d="M60 156 L100 156 L100 186 L60 186 Z" fill="#ffd23f" stroke="#d9a800" strokeWidth="2" />
          <path d="M80 156 V186" stroke="#d9a800" strokeWidth="2" />
          <path d="M66 164 H76 M66 170 H76 M84 164 H94 M84 170 H94" stroke="#a87f00" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case "keuken":
      return (
        <g>
          <path d="M44 52 C30 40 40 16 58 22 C62 6 98 6 102 22 C120 16 130 40 116 52 Z" fill="#ffffff" stroke="#e4dcd3" strokeWidth="2" />
          <rect x="46" y="48" width="68" height="12" rx="3" fill="#ffffff" stroke="#e4dcd3" strokeWidth="2" />
          {!headOnly && <path d="M58 142 L102 142 L108 200 L52 200 Z" fill="#ffffff" stroke="#e4dcd3" strokeWidth="2" />}
        </g>
      );
    case "sport":
      return (
        <g>
          <rect x="38" y="60" width="84" height="9" rx="4" fill="#ff6b57" />
          {!headOnly && (
            <g className={animate ? "ff-av-lift" : undefined}>
              <path d="M140 150 V120" stroke="#3b3a4a" strokeWidth="4" strokeLinecap="round" />
              <rect x="131" y="112" width="18" height="9" rx="3" fill="#3b3a4a" />
              <rect x="131" y="148" width="18" height="9" rx="3" fill="#3b3a4a" />
            </g>
          )}
        </g>
      );
    case "security":
      return headOnly ? (
        <path d="M120 84 c8 2 8 14 2 18 l-4 14" stroke="#23204a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <path d="M30 200 C32 162 50 146 66 141 L74 200 Z M130 200 C128 162 110 146 94 141 L86 200 Z" fill="#1f1f2b" />
          <path d="M34 182 L72 182 M88 182 L126 182" stroke="#ffd23f" strokeWidth="4" />
          <text x="80" y="196" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff" letterSpacing="1">SECURITY</text>
          <path d="M120 84 c8 2 8 14 2 18 l-4 14" stroke="#23204a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </g>
      );
    default:
      // Kantoor: laptop voor zich
      return headOnly ? null : (
        <g>
          <path d="M46 150 H114 L110 182 H50 Z" fill="#c9cfdf" stroke="#9aa3b8" strokeWidth="2" />
          <rect x="52" y="154" width="56" height="22" rx="2" fill="#8fd3ff" className={animate ? "ff-av-scherm" : undefined} />
          <path d="M60 160 H86 M60 166 H98 M60 171 H78" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity=".85" />
          <path d="M38 184 H122 L116 192 H44 Z" fill="#aeb6c9" />
        </g>
      );
  }
}
