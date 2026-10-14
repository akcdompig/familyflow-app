import type { FamilyState } from "./types";

/*
  Stap voor stap vrijspelen, zodat een nieuw gezin niet alles tegelijk krijgt.
  Week 1: inchecken, taken en hulp bij ruzie. Week 2: oefenen. Week 3: gezinsoverleg en voortgang.
  Hulp bij ruzie en "Ik word boos" zijn er altijd: die zijn nodig op het moment zelf.
*/
export function weekVan(state: FamilyState): number {
  if (!state.startedAt) return 99;
  return Math.floor((Date.now() - new Date(state.startedAt).getTime()) / (7 * 864e5)) + 1;
}

export function features(state: FamilyState) {
  const w = weekVan(state);
  const alles = !!state.allesAan || w >= 99;
  return { oefenen: alles || w >= 2, overleg: alles || w >= 3, week: w };
}
