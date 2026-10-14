"use client";

import { Avatar } from "@/components/avatar/Avatar";
import { Icon } from "@/components/ui/Icon";
import { expressionFor } from "@/lib/mood";
import { actions } from "@/lib/store";
import type { FamilyState } from "@/lib/types";

/** Alleen voor de demo: snel kijken door de ogen van iedereen. In de echte app heeft iedereen een eigen login. */
export function DemoBar({ state, onSwitch }: { state: FamilyState; onSwitch: () => void }) {
  const go = (id: string) => {
    actions.switchMe(id);
    onSwitch();
  };
  return (
    <div className="ff-demobar" role="toolbar" aria-label="Demo: bekijk de app als">
      <span className="ff-demobar-l">Bekijk als</span>
      <div className="ff-demobar-list">
        {state.members.map((m) => (
          <button key={m.id} className="ff-demobar-b" aria-pressed={state.me === m.id} onClick={() => go(m.id)}>
            <Avatar config={m.avatar} expression={expressionFor(state.checkins[m.id])} headOnly size={26} animate={false} label="" />
            {m.name}
          </button>
        ))}
        {state.pros.map((p) => (
          <button key={p.id} className={`ff-demobar-b ff-demobar-${p.id}`} aria-pressed={state.me === p.id} onClick={() => go(p.id)}>
            <span className="ff-demobar-ic"><Icon name={p.id} size={16} /></span>
            {p.id === "school" ? "School" : "Zorg"}
          </button>
        ))}
      </div>
    </div>
  );
}
