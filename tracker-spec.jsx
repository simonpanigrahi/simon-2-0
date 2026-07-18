import { useState, useEffect, useRef } from "react";

// ─── Season data (from the 26-week masterplan) ───────────────────────────────
const SEASON_START = new Date(2026, 6, 20); // Mon Jul 20, 2026 (week 1)
const SEASON = [
  { boss: "Install the game — survey skeleton · passport ARN verified · Commitment Page signed", focus: "Tutorial: sleep anchor + system setup" },
  { boss: "Literature survey v1 sent to mentor (by Wed Jul 22) + meeting requested", focus: "Linear Algebra · aptitude 20m/day · C refresh" },
  { boss: "Mentor meeting done → baseline task locked + Friday cadence agreed", focus: "Probability & Statistics" },
  { boss: "Baseline code runs end-to-end", focus: "Calculus + Discrete Math I" },
  { boss: "Math topic test ≥60% + 3 Friday updates streak", focus: "Discrete Math II + math revision" },
  { boss: "Tutoring engine live (first paid student)", focus: "DSA-1: arrays, lists, stacks, queues" },
  { boss: "DSA-1 topic test ≥60%", focus: "DSA-2: trees, heaps, hashing" },
  { boss: "Baseline reproduced → mini-report to mentor", focus: "DSA-3: graphs" },
  { boss: "IEEE paper: figures + results frozen", focus: "Algorithms-1: greedy, D&C, complexity" },
  { boss: "IEEE paper full draft complete", focus: "Algorithms-2: dynamic programming" },
  { boss: "IEEE paper SUBMITTED + Scholar/ORCID live", focus: "Algorithms test + PYQs" },
  { boss: "DBMS-1 done", focus: "ER, relational algebra, SQL daily" },
  { boss: "Baseline full mock #1 taken + error log created", focus: "DBMS-2 + DA/ML thread starts" },
  { boss: "Survive Puja week on Minimum Viable Days", focus: "Deload: revision + flashcards only" },
  { boss: "OS-1 done", focus: "Processes, scheduling, sync" },
  { boss: "OS test ≥60% + Nov 1 career checkpoint", focus: "Memory mgmt, virtual memory, FS" },
  { boss: "COA-1 done (backlog leverage — go fast)", focus: "Instructions, ALU, pipelining · Diwali day off" },
  { boss: "Full mock #2 + COA/DL test ≥65%", focus: "Cache, I/O + digital logic" },
  { boss: "The Ask: Project Associate / paper-scope conversation", focus: "TOC-1: regular languages, automata" },
  { boss: "TOC test ≥60%", focus: "CFGs, PDAs, decidability" },
  { boss: "Full mock #3 + negotiate lab load-down", focus: "CN-1: OSI, IP, routing" },
  { boss: "FULL SYLLABUS COMPLETE (CN-2 + compiler)", focus: "Transport/app layer + parsing basics" },
  { boss: "Revision cycle A + 2 full mocks", focus: "War mode: mock / surgery alternation" },
  { boss: "3 mocks + error log ≤8 weak topics + LOR request sent", focus: "Weak-topic surgery" },
  { boss: "Revision cycle B + 2 mocks", focus: "Formula sheets · Dec 31–Jan 1 off" },
  { boss: "3 mocks (incl. 1 DA) · weak topics ≤5", focus: "Timing strategy locked" },
  { boss: "3 mocks + exam-day simulation", focus: "Nothing new. Rhythm only. GATE ~3 wks out" },
];

const QUESTS = [
  { key: "anchor", name: "Anchor", desc: "Up by wake target + 10-min light", mvd: false },
  { key: "dw1", name: "Deep Work I", desc: "90 min GATE, phone in other room", mvd: true },
  { key: "dw2", name: "Deep Work II", desc: "60–90 min GATE", mvd: false },
  { key: "lab", name: "Lab Block", desc: "45–60 min CANDLE work", mvd: true },
  { key: "move", name: "Move", desc: "Strength session or 8k steps", mvd: false },
  { key: "bond", name: "Bond", desc: "20 min device-free quality time", mvd: true },
  { key: "shutdown", name: "Shutdown", desc: "5-line plan · screens off 10:30", mvd: false },
];

const LEVELS = [
  { xp: 0, title: "Unranked" },
  { xp: 1000, title: "Initiate" },
  { xp: 2500, title: "Operator" },
  { xp: 4500, title: "Strategist" },
  { xp: 7000, title: "Commander" },
  { xp: 10000, title: "Sovereign" },
  { xp: 13500, title: "Elite" },
];

// ─── Palette: quiet-luxury campaign ledger ───────────────────────────────────
const C = {
  bg: "#191B14", // deep olive-ink
  panel: "#22251C",
  panelEdge: "#313527",
  bone: "#EBE5D6",
  boneDim: "#9B9788",
  brass: "#C7A44E",
  brassDim: "#7A6836",
  sage: "#93A67C",
  clay: "#B0563C",
  ink2: "#14160F",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dISO = (d) => {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 10);
};
const today = () => dISO(new Date());
const weekOf = (date) => {
  const diff = Math.floor((new Date(date) - SEASON_START) / 86400000);
  if (diff < 0) return 0;
  return Math.min(26, Math.floor(diff / 7) + 1);
};
const weekDates = (n) => {
  if (n === 0) return "Jul 16 – 19";
  const s = new Date(SEASON_START);
  s.setDate(s.getDate() + (n - 1) * 7);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const f = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${f(s)} – ${f(e)}`;
};

const DEFAULT = { days: {}, weeks: {} };

export default function Simon2Tracker() {
  const [state, setState] = useState(null);
  const [viewWeek, setViewWeek] = useState(weekOf(new Date()));
  const [saveNote, setSaveNote] = useState("");
  const loaded = useRef(false);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get("simon2_campaign_v1");
        setState(r && r.value ? JSON.parse(r.value) : DEFAULT);
      } catch {
        setState(DEFAULT);
      }
      loaded.current = true;
    })();
  }, []);

  // Save
  useEffect(() => {
    if (!loaded.current || !state) return;
    (async () => {
      try {
        await window.storage.set("simon2_campaign_v1", JSON.stringify(state));
        setSaveNote("saved");
        setTimeout(() => setSaveNote(""), 1200);
      } catch {
        setSaveNote("save failed — retry an action");
      }
    })();
  }, [state]);

  if (!state)
    return (
      <div style={{ background: C.bg, color: C.boneDim, minHeight: "100vh" }} className="flex items-center justify-center font-mono text-sm">
        loading campaign…
      </div>
    );

  const tISO = today();
  const curWeek = weekOf(new Date());
  const day = state.days[tISO] || { q: {}, side: 0 };
  const wk = state.weeks[viewWeek] || { boss: false, hpLost: 0 };
  const curWkState = state.weeks[curWeek] || { boss: false, hpLost: 0 };

  // Derived XP
  let xp = 0;
  Object.values(state.days).forEach((d) => {
    xp += Object.values(d.q || {}).filter(Boolean).length * 10 + (d.side || 0) * 20;
  });
  Object.values(state.weeks).forEach((w) => { if (w.boss) xp += 150; });

  const lvl = [...LEVELS].reverse().find((l) => xp >= l.xp);
  const next = LEVELS.find((l) => l.xp > xp);
  const hp = 5 - (curWkState.hpLost || 0);

  // Streak: consecutive days (ending today or yesterday) meeting MVD
  const mvdMet = (d) => d && QUESTS.filter((q) => q.mvd).every((q) => d.q && d.q[q.key]);
  let streak = 0;
  const cursor = new Date();
  if (!mvdMet(state.days[dISO(cursor)])) cursor.setDate(cursor.getDate() - 1);
  while (mvdMet(state.days[dISO(cursor)])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // Last 7 days for scorecard
  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = dISO(d);
    const rec = state.days[iso];
    return {
      label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
      count: rec ? Object.values(rec.q || {}).filter(Boolean).length : 0,
      mvd: mvdMet(rec),
      isToday: iso === tISO,
    };
  });

  const toggleQuest = (key) =>
    setState((s) => {
      const d = s.days[tISO] || { q: {}, side: 0 };
      return { ...s, days: { ...s.days, [tISO]: { ...d, q: { ...d.q, [key]: !d.q[key] } } } };
    });
  const addSide = (n) =>
    setState((s) => {
      const d = s.days[tISO] || { q: {}, side: 0 };
      return { ...s, days: { ...s.days, [tISO]: { ...d, side: Math.max(0, (d.side || 0) + n) } } };
    });
  const toggleBoss = () =>
    setState((s) => {
      const w = s.weeks[viewWeek] || { boss: false, hpLost: 0 };
      return { ...s, weeks: { ...s.weeks, [viewWeek]: { ...w, boss: !w.boss } } };
    });
  const loseHP = () =>
    setState((s) => {
      const w = s.weeks[curWeek] || { boss: false, hpLost: 0 };
      return { ...s, weeks: { ...s.weeks, [curWeek]: { ...w, hpLost: Math.min(5, (w.hpLost || 0) + 1) } } };
    });
  const restoreHP = () =>
    setState((s) => {
      const w = s.weeks[curWeek] || { boss: false, hpLost: 0 };
      return { ...s, weeks: { ...s.weeks, [curWeek]: { ...w, hpLost: Math.max(0, (w.hpLost || 0) - 1) } } };
    });

  const questsDone = Object.values(day.q || {}).filter(Boolean).length;
  const pct = next ? Math.round(((xp - lvl.xp) / (next.xp - lvl.xp)) * 100) : 100;

  return (
    <div style={{ background: C.bg, color: C.bone, minHeight: "100vh", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .disp { font-family: 'Cormorant Garamond', Georgia, serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        .fade-in { animation: fi .5s ease both; }
        @keyframes fi { from { opacity: 0; transform: translateY(6px);} to { opacity:1; transform:none;} }
        @media (prefers-reduced-motion: reduce) { .fade-in { animation: none; } }
        button:focus-visible { outline: 2px solid ${C.brass}; outline-offset: 2px; }
      `}</style>

      <div className="max-w-2xl mx-auto px-4 pb-16 pt-6">
        {/* ── Header / campaign ribbon ── */}
        <header className="fade-in">
          <div className="flex items-baseline justify-between">
            <div className="mono text-xs tracking-widest" style={{ color: C.brassDim }}>THE 26-WEEK CAMPAIGN</div>
            <div className="mono text-xs" style={{ color: C.boneDim }}>{saveNote}</div>
          </div>
          <h1 className="disp text-4xl mt-1" style={{ letterSpacing: "0.02em" }}>Simon <span style={{ color: C.brass }}>2.0</span></h1>

          <div className="mt-4">
            <div className="flex items-baseline justify-between mb-1">
              <span className="mono text-sm" style={{ color: C.brass }}>{lvl.title.toUpperCase()}</span>
              <span className="mono text-xs" style={{ color: C.boneDim }}>
                {xp} XP{next ? ` · ${next.xp - xp} to ${next.title}` : " · max rank"}
              </span>
            </div>
            {/* ribbon with level notches */}
            <div className="relative h-2 rounded-full" style={{ background: C.panelEdge }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (xp / 13500) * 100)}%`, background: `linear-gradient(90deg, ${C.brassDim}, ${C.brass})` }} />
              {LEVELS.slice(1).map((l) => (
                <div key={l.xp} className="absolute top-1/2 -translate-y-1/2 w-1 h-3 rounded-sm" style={{ left: `${(l.xp / 13500) * 100}%`, background: xp >= l.xp ? C.brass : C.bg, border: `1px solid ${xp >= l.xp ? C.brass : C.panelEdge}` }} title={`${l.title} · ${l.xp} XP`} />
              ))}
            </div>
          </div>

          {/* streak + hp row */}
          <div className="flex items-center justify-between mt-4">
            <div className="mono text-sm">
              <span style={{ color: streak > 0 ? C.sage : C.boneDim }}>◆ {streak}-day streak</span>
              <span className="text-xs ml-2" style={{ color: C.boneDim }}>(MVD: DW I + Lab + Bond)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="mono text-xs" style={{ color: C.boneDim }}>HP</span>
              {[...Array(5)].map((_, i) => (
                <span key={i} className="disp text-lg leading-none" style={{ color: i < hp ? C.clay : C.panelEdge }}>{i < hp ? "♦" : "◇"}</span>
              ))}
              <button onClick={loseHP} className="mono text-xs px-2 py-1 rounded ml-1" style={{ background: C.panel, color: C.clay, border: `1px solid ${C.panelEdge}` }} title="Wake >9:30 or sleep <6h">−1</button>
              <button onClick={restoreHP} className="mono text-xs px-2 py-1 rounded" style={{ background: C.panel, color: C.boneDim, border: `1px solid ${C.panelEdge}` }} title="Undo">+</button>
            </div>
          </div>
          {hp === 0 && (
            <div className="mono text-xs mt-2 px-3 py-2 rounded" style={{ background: "#2A1D17", color: C.clay, border: `1px solid ${C.clay}` }}>
              HP 0 → run the 72-Hour Reset: fixed wake · morning light · no naps · caffeine before noon · MVDs only.
            </div>
          )}
        </header>

        {/* ── Boss fight (signature panel) ── */}
        <section className="fade-in mt-6 rounded-lg overflow-hidden" style={{ border: `1px solid ${wk.boss ? C.sage : C.brassDim}`, background: C.panel }}>
          <div className="flex items-center justify-between px-4 py-2" style={{ background: C.ink2, borderBottom: `1px solid ${C.panelEdge}` }}>
            <div className="flex items-center gap-2">
              <button onClick={() => setViewWeek((w) => Math.max(0, w - 1))} className="mono text-sm px-2 rounded" style={{ color: C.boneDim }} aria-label="Previous week">‹</button>
              <span className="mono text-xs tracking-widest" style={{ color: C.brass }}>
                WEEK {viewWeek} <span style={{ color: C.boneDim }}>· {weekDates(viewWeek)}</span>
                {viewWeek === curWeek && <span style={{ color: C.sage }}> · NOW</span>}
              </span>
              <button onClick={() => setViewWeek((w) => Math.min(26, w + 1))} className="mono text-sm px-2 rounded" style={{ color: C.boneDim }} aria-label="Next week">›</button>
            </div>
            {viewWeek !== curWeek && (
              <button onClick={() => setViewWeek(curWeek)} className="mono text-xs" style={{ color: C.sage }}>today</button>
            )}
          </div>
          <div className="px-4 py-4">
            <div className="mono text-xs mb-1" style={{ color: C.clay }}>BOSS FIGHT · 150 XP</div>
            <p className="disp text-xl leading-snug" style={{ color: wk.boss ? C.sage : C.bone, textDecoration: wk.boss ? "line-through" : "none" }}>
              {SEASON[viewWeek].boss}
            </p>
            <p className="mono text-xs mt-2" style={{ color: C.boneDim }}>{SEASON[viewWeek].focus}</p>
            <button
              onClick={toggleBoss}
              className="mono text-sm mt-4 w-full py-2.5 rounded"
              style={wk.boss
                ? { background: "transparent", color: C.sage, border: `1px solid ${C.sage}` }
                : { background: C.brass, color: C.ink2, border: `1px solid ${C.brass}` }}
            >
              {wk.boss ? "✓ Shipped — tap to undo" : "Mark shipped"}
            </button>
          </div>
        </section>

        {/* ── Today's quests ── */}
        <section className="fade-in mt-6">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="mono text-xs tracking-widest" style={{ color: C.brassDim }}>
              TODAY · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </h2>
            <span className="mono text-xs" style={{ color: questsDone === 7 ? C.sage : C.boneDim }}>{questsDone}/7 · {questsDone * 10 + (day.side || 0) * 20} XP</span>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.panelEdge}` }}>
            {QUESTS.map((q, i) => {
              const on = !!(day.q && day.q[q.key]);
              return (
                <button
                  key={q.key}
                  onClick={() => toggleQuest(q.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: on ? "#242A1E" : C.panel, borderTop: i ? `1px solid ${C.panelEdge}` : "none" }}
                >
                  <span className="mono text-base w-5 text-center" style={{ color: on ? C.sage : C.panelEdge }}>{on ? "✓" : "○"}</span>
                  <span className="flex-1">
                    <span className="text-base" style={{ color: on ? C.sage : C.bone }}>{q.name}</span>
                    {q.mvd && <span className="mono text-[10px] ml-2 px-1.5 py-0.5 rounded" style={{ background: C.ink2, color: C.brassDim, border: `1px solid ${C.panelEdge}` }}>MVD</span>}
                    <span className="block text-xs mt-0.5" style={{ color: C.boneDim }}>{q.desc}</span>
                  </span>
                  <span className="mono text-xs" style={{ color: on ? C.brass : C.panelEdge }}>+10</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => addSide(1)} className="mono text-xs px-3 py-2 rounded" style={{ background: C.panel, color: C.brass, border: `1px solid ${C.panelEdge}` }}>
              + Side quest · 20 XP
            </button>
            {day.side > 0 && (
              <>
                <span className="mono text-xs" style={{ color: C.boneDim }}>×{day.side} today</span>
                <button onClick={() => addSide(-1)} className="mono text-xs px-2 py-2 rounded" style={{ background: C.panel, color: C.boneDim, border: `1px solid ${C.panelEdge}` }}>undo</button>
              </>
            )}
            <span className="mono text-[10px] ml-auto" style={{ color: C.boneDim }}>passport step · family ops · brand batch · tutoring</span>
          </div>
        </section>

        {/* ── Last 7 days ── */}
        <section className="fade-in mt-6">
          <h2 className="mono text-xs tracking-widest mb-2" style={{ color: C.brassDim }}>LAST 7 DAYS</h2>
          <div className="grid grid-cols-7 gap-2">
            {last7.map((d, i) => (
              <div key={i} className="rounded px-1 py-2 text-center" style={{ background: C.panel, border: `1px solid ${d.isToday ? C.brass : C.panelEdge}` }}>
                <div className="mono text-[10px]" style={{ color: C.boneDim }}>{d.label}</div>
                <div className="disp text-lg" style={{ color: d.count === 7 ? C.brass : d.mvd ? C.sage : d.count > 0 ? C.bone : C.panelEdge }}>{d.count}</div>
                <div className="text-[9px] mono" style={{ color: d.mvd ? C.sage : C.panelEdge }}>{d.mvd ? "MVD" : "—"}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Laws footer ── */}
        <footer className="mt-8 pt-4" style={{ borderTop: `1px solid ${C.panelEdge}` }}>
          <p className="mono text-[11px] leading-relaxed" style={{ color: C.boneDim }}>
            LAW 1 — planning only Sundays 5–6 PM · LAW 2 — nothing new after 10 PM · LAW 4 — the Minimum Viable Day always counts · LAW 8 — career decision closed until Nov 1.
          </p>
        </footer>
      </div>
    </div>
  );
}
