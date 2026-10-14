import type { Extra, HairStyle, OutfitStyle, SkinId } from "@/lib/types";

export const SKINS: { id: SkinId; color: string; label: string }[] = [
  { id: "s1", color: "#fbd9c0", label: "Heel licht" },
  { id: "s2", color: "#f0c29c", label: "Licht" },
  { id: "s3", color: "#dda27a", label: "Licht getint" },
  { id: "s4", color: "#c68a5c", label: "Getint" },
  { id: "s5", color: "#a86b43", label: "Donker getint" },
  { id: "s6", color: "#6e4428", label: "Donker" },
];

export const skinColor = (id: SkinId) => SKINS.find((s) => s.id === id)?.color ?? SKINS[3].color;

/** Iets donkerdere tint van de huid voor schaduw en oren. */
export function shade(hex: string, amount = -18): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: "kort", label: "Kort" },
  { id: "krullen", label: "Krullen" },
  { id: "lang", label: "Lang" },
  { id: "knot", label: "Knot" },
  { id: "vlechtjes", label: "Vlechtjes" },
  { id: "opgeschoren", label: "Opgeschoren" },
  { id: "kaal", label: "Kaal" },
  { id: "hoofddoek", label: "Hoofddoek" },
];

export const HAIR_COLORS = ["#2b1b14", "#5a3825", "#8b5a2b", "#e2b866", "#b5432f", "#a7a3b8", "#6c8cff", "#ff8fb1"];

export const EXTRAS: { id: Extra; label: string }[] = [
  { id: "sproeten", label: "Sproeten" },
  { id: "bril", label: "Bril" },
  { id: "baard", label: "Baard" },
  { id: "snor", label: "Snor" },
  { id: "koptelefoon", label: "Koptelefoon" },
  { id: "pet", label: "Pet" },
];

export const OUTFITS: { id: OutfitStyle; label: string }[] = [
  { id: "hoodie", label: "Hoodie" },
  { id: "tshirt", label: "T-shirt" },
  { id: "trui", label: "Trui" },
  { id: "overhemd", label: "Overhemd" },
];

export const OUTFIT_COLORS = ["#ff6b57", "#3cc6a0", "#6c8cff", "#ffc845", "#3a3670", "#8fa6ff", "#ff8fb1", "#ffffff"];
