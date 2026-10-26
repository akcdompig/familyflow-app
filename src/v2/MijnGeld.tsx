"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CATS, IN_SOORTEN, SOORT_EMOJI, doelStand, euro, gewerkt, magZien, maand, minimumloonVoor, parseEuro, posten, saldo, uurloonVan, urenWerk, type GeldSoort, type UitgaveCat } from "@/lib/geld";
import { geldActies } from "@/lib/geldacties";
import { addDays, iso } from "@/lib/planner";
import type { FamilyState, Member } from "@/lib/types";
import { WatKostThuis } from "./WatKostThuis";

/*
  3.22 Mijn geld. Wat komt erbij, wat gaat eraf, waar spaar je voor. De ouder is de bank: de app houdt bij, betaalt niks.
  Kinderen zien alleen hun eigen geld. Ouders zien dat van elk kind en stellen het zakgeld in.
  Tweede tab: Zuinig thuis (douchen, apparaten, straks op jezelf).
*/

const maandNaam = (ym: string) => new Date(ym + "-15T12:00:00").toLocaleDateString("nl-NL", { month: "long" });
const datumKort = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
const urenTekst = (min: number) => `${(Math.round((min / 60) * 10) / 10).toLocaleString("nl-NL")} uur`;

type Invoer = { soort: "in" | "uit"; bedrag: string; wat: string; inSoort: Exclude<GeldSoort, "uitgave" | "zakgeld">; cat: UitgaveCat };

export function MijnGeld({ state, me, onClose, onToast, onWerk }: { state: FamilyState; me: Member; onClose: () => void; onToast: (m: string) => void; onWerk?: () => void }) {
  const isOuder = me.role === "ouder";
  const kinderen = state.members.filter((m) => m.role !== "ouder");
  const [wie, setWie] = useState(isOuder ? kinderen[0]?.id ?? me.id : me.id);
  const [tab, setTab] = useState<"geld" | "thuis">("geld");
  const [invoer, setInvoer] = useState<Invoer | null>(null);
  const [doelBewerk, setDoelBewerk] = useState<{ wat: string; bedrag: string } | null>(null);
  const [alles, setAlles] = useState(false);
  const lid = state.members.find((m) => m.id === wie) ?? me;
  const eigen = wie === me.id;
  const nu = new Date();
  const vandaag = iso(nu);
  const ym = vandaag.slice(0, 7);
  const vorigeYm = addDays(ym + "-01", -1).slice(0, 7);

  if (!magZien(state, me.id, wie)) return null;

  const s = saldo(state, wie, nu);
  const m = maand(state, wie, ym, nu);
  const doel = doelStand(state, wie, nu);
  const lijst = posten(state, wie, nu);
  const uurloon = uurloonVan(state, wie);
  const heeftBaan = (state.werk?.[wie] ?? []).some((w) => w.inkomen);
  const dezeMaand = gewerkt(state, wie, ym + "-01", vandaag, nu);
  const vorige = gewerkt(state, wie, vorigeYm + "-01", addDays(ym + "-01", -1), nu);
  const zak = state.geld?.[wie]?.zakgeld;
  const naam = eigen ? "Jij" : lid.name;

  const opslaan = () => {
    if (!invoer) return;
    const cents = parseEuro(invoer.bedrag.replace(/^€?\s*/, ""));
    if (!cents) return onToast("Vul een bedrag in, bijvoorbeeld 12,50");
    const ok = geldActies.boek(wie, me.id, invoer.soort === "uit" ? { cents, soort: "uitgave", wat: invoer.wat, cat: invoer.cat } : { cents, soort: invoer.inSoort, wat: invoer.wat || IN_SOORTEN.find((x) => x.id === invoer.inSoort)!.label });
    if (!ok) return onToast("Dat lukte niet");
    setInvoer(null);
    onToast(invoer.soort === "uit" ? `${euro(cents)} eraf. Je hebt nu ${euro(s - cents)}` : `${euro(cents)} erbij 💶`);
  };

  const openLoon = () => setInvoer({ soort: "in", bedrag: vorige.cents ? (vorige.cents / 100).toFixed(2).replace(".", ",") : "", wat: `Loon ${maandNaam(vorigeYm)}`, inSoort: "loon", cat: "anders" });

  return (
    <div className="ff-screen v2-screen v2-geld">
      <header className="ff-top">
        <div>
          <div className="ff-eyebrow">Geld</div>
          <h1 className="ff-h2">{eigen ? "Mijn geld" : `Geld van ${lid.name}`}</h1>
        </div>
        <button className="ff-iconbtn" onClick={onClose} aria-label="Terug"><Icon name="terug" /></button>
      </header>

      {isOuder && kinderen.length > 1 && (
        <div className="ff-chips" role="group" aria-label="Kies een kind">
          {kinderen.map((k) => <button key={k.id} className="ff-chip" aria-pressed={wie === k.id} onClick={() => { setWie(k.id); setInvoer(null); setDoelBewerk(null); }}>{k.name}</button>)}
        </div>
      )}

      <div className="ff-seg" role="tablist">
        <button role="tab" aria-selected={tab === "geld"} onClick={() => setTab("geld")}>💶 Geld</button>
        <button role="tab" aria-selected={tab === "thuis"} onClick={() => setTab("thuis")}>🌱 Zuinig thuis</button>
      </div>

      {tab === "thuis" ? <WatKostThuis state={state} lid={lid} /> : (
        <>
          <section className={`ff-card v2-geld-saldo${s < 0 ? " is-rood" : ""}`} aria-label="Saldo">
            <span className="ff-eyebrow">{eigen ? "Je hebt nu" : `${lid.name} heeft nu`}</span>
            <b className="v2-geld-bedrag">{euro(s)}</b>
            <span className="ff-small ff-muted">In {maandNaam(ym)}: <span className="v2-geld-in">{euro(m.inn, true)}</span> erbij · <span className="v2-geld-uit">{euro(-m.uit)}</span> eraf</span>
            {s < 0 && <span className="ff-small v2-geld-let">Je hebt meer uitgegeven dan je had. In het echt kan dat niet zomaar, of je betaalt er rente over.</span>}
            <div className="v2-geld-knoppen">
              <button className="ff-btn ff-btn-primary" onClick={() => setInvoer({ soort: "in", bedrag: "", wat: "", inSoort: heeftBaan ? "loon" : "cadeau", cat: "anders" })}>＋ Erbij</button>
              <button className="ff-btn ff-btn-ghost" onClick={() => setInvoer({ soort: "uit", bedrag: "", wat: "", inSoort: "anders", cat: "eten" })}>− Uitgegeven</button>
            </div>
          </section>

          {invoer && (
            <section className="ff-card ff-stack v2-geld-invoer" aria-label={invoer.soort === "uit" ? "Uitgave invoeren" : "Geld erbij invoeren"}>
              <b>{invoer.soort === "uit" ? "Wat heb je gekocht?" : "Wat kwam erbij?"}</b>
              <label className="ff-field">
                <span className="ff-eyebrow">Bedrag</span>
                <input id="geld-bedrag" inputMode="decimal" placeholder="12,50" value={invoer.bedrag} onChange={(e) => setInvoer({ ...invoer, bedrag: e.target.value })} autoFocus />
              </label>
              {invoer.soort === "uit" && (() => {
                const c = parseEuro(invoer.bedrag);
                const u = c ? urenWerk(c, uurloon) : undefined;
                return u ? <span className="ff-small v2-geld-uren">⏱️ Dat is {u}{uurloon ? ` voor ${euro(uurloon)} per uur` : ""}.</span> : null;
              })()}
              <label className="ff-field">
                <span className="ff-eyebrow">{invoer.soort === "uit" ? "Wat was het?" : "Waarvoor? (mag leeg)"}</span>
                <input id="geld-wat" maxLength={60} placeholder={invoer.soort === "uit" ? "Bijv. snacks na school" : "Bijv. verjaardag oma"} value={invoer.wat} onChange={(e) => setInvoer({ ...invoer, wat: e.target.value })} />
              </label>
              <div className="ff-chips">
                {invoer.soort === "uit"
                  ? CATS.map((c) => <button key={c.id} className="ff-chip" aria-pressed={invoer.cat === c.id} onClick={() => setInvoer({ ...invoer, cat: c.id })}>{c.emoji} {c.label}</button>)
                  : IN_SOORTEN.map((c) => <button key={c.id} className="ff-chip" aria-pressed={invoer.inSoort === c.id} onClick={() => setInvoer({ ...invoer, inSoort: c.id })}>{c.emoji} {c.label}</button>)}
              </div>
              <div className="ff-row">
                <button className="ff-btn ff-btn-primary ff-grow" onClick={opslaan}>{invoer.soort === "uit" ? "Eraf halen" : "Erbij zetten"}</button>
                <button className="ff-btn ff-btn-ghost" onClick={() => setInvoer(null)}>Annuleren</button>
              </div>
            </section>
          )}

          <section className="ff-card ff-stack-s" aria-label="Spaardoel">
            <div className="ff-row"><b className="ff-grow">🎯 Spaardoel</b>{(eigen || isOuder) && !doelBewerk && <button className="ff-link ff-small" onClick={() => setDoelBewerk({ wat: doel?.wat ?? "", bedrag: doel ? (doel.cents / 100).toString().replace(".", ",") : "" })}>{doel ? "Aanpassen" : "Kiezen"}</button>}</div>
            {doelBewerk ? (
              <>
                <label className="ff-field"><span className="ff-eyebrow">Waar spaar je voor?</span><input id="doel-wat" maxLength={40} placeholder="Bijv. nieuwe sneakers" value={doelBewerk.wat} onChange={(e) => setDoelBewerk({ ...doelBewerk, wat: e.target.value })} /></label>
                <label className="ff-field"><span className="ff-eyebrow">Hoeveel kost het?</span><input id="doel-bedrag" inputMode="decimal" placeholder="90" value={doelBewerk.bedrag} onChange={(e) => setDoelBewerk({ ...doelBewerk, bedrag: e.target.value })} /></label>
                <div className="ff-row">
                  <button className="ff-btn ff-btn-primary ff-grow" onClick={() => { const c = parseEuro(doelBewerk.bedrag); if (!c || !doelBewerk.wat.trim()) return onToast("Vul in waarvoor en hoeveel"); geldActies.setDoel(wie, me.id, { wat: doelBewerk.wat, cents: c }); setDoelBewerk(null); onToast("Spaardoel staat erin 🎯"); }}>Opslaan</button>
                  {doel && <button className="ff-btn ff-btn-ghost" onClick={() => { geldActies.setDoel(wie, me.id, null); setDoelBewerk(null); }}>Weghalen</button>}
                </div>
              </>
            ) : doel ? (
              <>
                <span><b>{doel.wat}</b> <span className="ff-muted">· {euro(doel.cents)}</span></span>
                <span className="ff-bezig-balk"><i style={{ width: `${doel.pct}%` }} /></span>
                <span className="ff-small ff-muted">
                  {doel.nog === 0 ? "Je hebt genoeg! 🎉 Nog steeds zin in? Dan kun je het kopen." : `Nog ${euro(doel.nog)}. ${doel.weken ? `Zo doorgaan: nog ongeveer ${doel.weken} ${doel.weken === 1 ? "week" : "weken"}.` : "Er gaat nu meer af dan erbij komt."}`}
                  {doel.nog > 0 && urenWerk(doel.nog, uurloon) ? ` Of ${urenWerk(doel.nog, uurloon)}.` : ""}
                </span>
              </>
            ) : <span className="ff-small ff-muted">{eigen ? "Kies iets waar je voor spaart. Dan zie je hoe lang het nog duurt." : `${lid.name} heeft nog geen spaardoel.`}</span>}
          </section>

          {heeftBaan ? (
            <section className="ff-card ff-stack-s" aria-label="Bijbaan">
              <b>💼 Bijbaan</b>
              {uurloon ? (
                <>
                  <div className="v2-geld-baan">
                    <span className="ff-stat"><span>{maandNaam(ym)}</span><b>{urenTekst(dezeMaand.minuten)}</b><span>± {euro(dezeMaand.cents)} bruto</span></span>
                    <span className="ff-stat"><span>{maandNaam(vorigeYm)}</span><b>{urenTekst(vorige.minuten)}</b><span>± {euro(vorige.cents)} bruto</span></span>
                  </div>
                  <span className="ff-small ff-muted">Uurloon {euro(uurloon)} bruto. Wat er echt op je rekening komt (netto) kan iets minder zijn. Kijk op je loonstrook.</span>
                  <button className="ff-btn ff-btn-ghost" onClick={openLoon}>Loon ontvangen? Zet het erbij</button>
                </>
              ) : (
                <>
                  <span className="ff-small ff-muted">Vul je uurloon in, dan rekent de app uit wat je verdient met je diensten.{minimumloonVoor(lid.age) ? ` Het minimumloon voor ${lid.age} jaar is ${euro(minimumloonVoor(lid.age)!)} per uur (bruto).` : ""}</span>
                  {eigen && onWerk && <button className="ff-btn ff-btn-ghost" onClick={onWerk}>Uurloon invullen</button>}
                </>
              )}
            </section>
          ) : (lid.age ?? 0) >= 15 && (
            <section className="ff-card ff-stack-s" aria-label="Bijbaan">
              <b>💼 Bijbaan?</b>
              <span className="ff-small ff-muted">Vanaf 15 mag je een bijbaantje. Het minimumloon voor {lid.age} jaar is {minimumloonVoor(lid.age) ? euro(minimumloonVoor(lid.age)!) : "–"} per uur (bruto). Zet je werk en uurloon bij School en bijbaan, dan zie je hier wat je verdient.</span>
              {eigen && onWerk && <button className="ff-btn ff-btn-ghost" onClick={onWerk}>Bijbaan toevoegen</button>}
            </section>
          )}

          {m.cats.length > 0 && (
            <section className="ff-card ff-stack-s" aria-label="Waar ging het heen">
              <b>🧾 Waar ging het heen in {maandNaam(ym)}?</b>
              {m.cats.map(([c, cents]) => {
                const cat = CATS.find((x) => x.id === c) ?? CATS[CATS.length - 1];
                return (
                  <div key={c} className="v2-geld-cat">
                    <span className="ff-grow">{cat.emoji} {cat.label}</span>
                    <b>{euro(cents)}</b>
                    <span className="ff-bezig-balk is-klein"><i style={{ width: `${Math.round((cents / m.cats[0][1]) * 100)}%` }} /></span>
                  </div>
                );
              })}
              {uurloon && <span className="ff-small ff-muted">Samen {urenWerk(m.uit, uurloon)}.</span>}
            </section>
          )}

          {isOuder && (
            <section className="ff-card ff-stack-s" aria-label="Zakgeld">
              <b>💰 Zakgeld van {lid.name}</b>
              <span className="ff-small ff-muted">{zak ? `${euro(zak.cents)} per ${zak.per}. Komt vanzelf binnen, ${zak.per === "week" ? "elke maandag" : "elke 1e van de maand"}.` : "Nog geen zakgeld ingesteld. Zakgeld krijg je altijd, het is leergeld, geen beloning (Nibud)."}</span>
              <Zakgeld huidig={zak} onOpslaan={(cents, per) => { geldActies.setZakgeld(wie, me.id, cents ? { cents, per } : null); onToast(cents ? `Zakgeld ${euro(cents)} per ${per}` : "Zakgeld uitgezet"); }} />
            </section>
          )}

          <section className="ff-card ff-stack-s" aria-label="Wat er gebeurde">
            <b>📒 Wat er gebeurde</b>
            {lijst.length ? (
              <ul className="v2-geld-lijst">
                {(alles ? lijst : lijst.slice(0, 8)).map((p) => {
                  const mag = !p.id.startsWith("zg:") && !p.id.startsWith("bonus:") && (p.door === me.id || isOuder);
                  const cat = p.cents < 0 ? CATS.find((c) => c.id === p.cat) : undefined;
                  return (
                    <li key={p.id}>
                      <span aria-hidden="true">{cat?.emoji ?? SOORT_EMOJI[p.soort]}</span>
                      <span className="ff-grow"><span className="ff-block">{p.wat}</span><span className="ff-small ff-muted">{datumKort(p.datum)}</span></span>
                      <b className={p.cents < 0 ? "v2-geld-uit" : "v2-geld-in"}>{euro(p.cents, true)}</b>
                      {mag && <button className="ff-link ff-small" aria-label={`${p.wat} weghalen`} onClick={() => { geldActies.weg(wie, me.id, p.id); onToast("Weggehaald"); }}>✕</button>}
                    </li>
                  );
                })}
              </ul>
            ) : <span className="ff-small ff-muted">Nog niks. Zet erbij wat je krijgt en haal eraf wat je uitgeeft.</span>}
            {!alles && lijst.length > 8 && <button className="ff-link ff-small" onClick={() => setAlles(true)}>Alles bekijken ({lijst.length})</button>}
          </section>

          <p className="ff-small ff-muted">{naam === "Jij" ? "Alleen jij en je ouders zien dit." : `Alleen ${lid.name} en de ouders zien dit.`} De app betaalt niks: je ouders zijn de bank.</p>
        </>
      )}
    </div>
  );
}

function Zakgeld({ huidig, onOpslaan }: { huidig?: { cents: number; per: "week" | "maand" }; onOpslaan: (cents: number, per: "week" | "maand") => void }) {
  const [bedrag, setBedrag] = useState(huidig ? (huidig.cents / 100).toString().replace(".", ",") : "");
  const [per, setPer] = useState<"week" | "maand">(huidig?.per ?? "week");
  return (
    <div className="ff-stack-s">
      <div className="ff-row">
        <input id="zakgeld-bedrag" className="v2-geld-klein" inputMode="decimal" placeholder="5,00" aria-label="Bedrag zakgeld" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
        <div className="ff-chips">
          <button className="ff-chip" aria-pressed={per === "week"} onClick={() => setPer("week")}>per week</button>
          <button className="ff-chip" aria-pressed={per === "maand"} onClick={() => setPer("maand")}>per maand</button>
        </div>
      </div>
      <div className="ff-row">
        <button className="ff-btn ff-btn-primary ff-btn-s" onClick={() => onOpslaan(parseEuro(bedrag) ?? 0, per)}>Opslaan</button>
        {huidig && <button className="ff-link ff-small" onClick={() => { setBedrag(""); onOpslaan(0, per); }}>Geen zakgeld meer</button>}
      </div>
    </div>
  );
}
