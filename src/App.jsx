import { useEffect, useRef, useState } from "react";
import { loadState, saveState } from "./storage.js";
import {
  SEASON,
  QUESTS,
  LEVELS,
  MAX_XP,
  today,
  weekOf,
  weekDates,
  computeXp,
  levelFor,
  computeStreak,
  computeLast7,
  questsDoneIn,
} from "./data.js";

export default function App() {
  // localStorage is synchronous, so we can hydrate on first render — no loading state.
  const [state, setState] = useState(loadState);
  const [viewWeek, setViewWeek] = useState(() => weekOf(new Date()));
  const [saveNote, setSaveNote] = useState("");

  // Persist on every change, but skip the initial mount so we don't flash "saved" on load.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const ok = saveState(state);
    setSaveNote(ok ? "saved" : "save failed — retry an action");
    const t = setTimeout(() => setSaveNote(""), 1200);
    return () => clearTimeout(t);
  }, [state]);

  const tISO = today();
  const curWeek = weekOf(new Date());
  const day = state.days[tISO] || { q: {}, side: 0 };
  const wk = state.weeks[viewWeek] || { boss: false, hpLost: 0 };
  const curWkState = state.weeks[curWeek] || { boss: false, hpLost: 0 };

  const xp = computeXp(state);
  const { lvl, next } = levelFor(xp);
  const hp = 5 - (curWkState.hpLost || 0);
  const streak = computeStreak(state.days);
  const last7 = computeLast7(state.days, tISO);
  const questsDone = questsDoneIn(day);

  // ── Actions (state shape kept exactly: days[ISO]={q,side}, weeks[n]={boss,hpLost}) ──
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

  return (
    <div className="app">
      <div className="container">
        {/* ── Header / campaign ribbon ── */}
        <header className="fade-in">
          <div className="ribbon-head">
            <div className="eyebrow">THE 26-WEEK CAMPAIGN</div>
            <div className="save-note mono">{saveNote}</div>
          </div>
          <h1 className="disp title">Simon <span className="title-v">2.0</span></h1>

          <div className="level">
            <div className="level-head">
              <span className="mono level-title">{lvl.title.toUpperCase()}</span>
              <span className="mono level-xp">
                {xp} XP{next ? ` · ${next.xp - xp} to ${next.title}` : " · max rank"}
              </span>
            </div>
            <div className="ribbon">
              <div className="ribbon-fill" style={{ width: `${Math.min(100, (xp / MAX_XP) * 100)}%` }} />
              {LEVELS.slice(1).map((l) => (
                <div
                  key={l.xp}
                  className={`ribbon-notch${xp >= l.xp ? " is-on" : ""}`}
                  style={{ left: `${(l.xp / MAX_XP) * 100}%` }}
                  title={`${l.title} · ${l.xp} XP`}
                />
              ))}
            </div>
          </div>

          <div className="stat-row">
            <div className="mono streak">
              <span className={`streak-count${streak > 0 ? " is-active" : ""}`}>◆ {streak}-day streak</span>
              <span className="streak-note">(MVD: DW I + Lab + Bond)</span>
            </div>
            <div className="hp">
              <span className="mono hp-label">HP</span>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`disp hp-pip${i < hp ? " is-full" : ""}`}>{i < hp ? "♦" : "◇"}</span>
              ))}
              <button className="mono hp-btn hp-btn--lose" onClick={loseHP} title="Wake >9:30 or sleep <6h">−1</button>
              <button className="mono hp-btn" onClick={restoreHP} title="Undo">+</button>
            </div>
          </div>
          {hp === 0 && (
            <div className="mono hp-warning">
              HP 0 → run the 72-Hour Reset: fixed wake · morning light · no naps · caffeine before noon · MVDs only.
            </div>
          )}
        </header>

        {/* ── Boss fight ── */}
        <section className={`fade-in panel boss${wk.boss ? " is-shipped" : ""}`}>
          <div className="panel-bar">
            <div className="week-nav">
              <button className="mono nav-btn" onClick={() => setViewWeek((w) => Math.max(0, w - 1))} aria-label="Previous week">‹</button>
              <span className="mono week-label">
                WEEK {viewWeek} <span className="week-dates">· {weekDates(viewWeek)}</span>
                {viewWeek === curWeek && <span className="week-now"> · NOW</span>}
              </span>
              <button className="mono nav-btn" onClick={() => setViewWeek((w) => Math.min(26, w + 1))} aria-label="Next week">›</button>
            </div>
            {viewWeek !== curWeek && (
              <button className="mono today-btn" onClick={() => setViewWeek(curWeek)}>today</button>
            )}
          </div>
          <div className="boss-body">
            <div className="mono boss-tag">BOSS FIGHT · 150 XP</div>
            <p className={`disp boss-title${wk.boss ? " is-shipped" : ""}`}>{SEASON[viewWeek].boss}</p>
            <p className="mono boss-focus">{SEASON[viewWeek].focus}</p>
            <button className={`mono boss-btn${wk.boss ? " is-shipped" : ""}`} onClick={toggleBoss}>
              {wk.boss ? "✓ Shipped — tap to undo" : "Mark shipped"}
            </button>
          </div>
        </section>

        {/* ── Today's quests ── */}
        <section className="fade-in section">
          <div className="section-head">
            <h2 className="mono section-title">
              TODAY · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </h2>
            <span className={`mono today-xp${questsDone === 7 ? " is-complete" : ""}`}>
              {questsDone}/7 · {questsDone * 10 + (day.side || 0) * 20} XP
            </span>
          </div>
          <div className="quest-list">
            {QUESTS.map((q) => {
              const on = !!(day.q && day.q[q.key]);
              return (
                <button key={q.key} className={`quest${on ? " is-on" : ""}`} onClick={() => toggleQuest(q.key)}>
                  <span className="mono quest-check">{on ? "✓" : "○"}</span>
                  <span className="quest-body">
                    <span className="quest-name">{q.name}</span>
                    {q.mvd && <span className="mono quest-mvd">MVD</span>}
                    <span className="quest-desc">{q.desc}</span>
                  </span>
                  <span className="mono quest-xp">+10</span>
                </button>
              );
            })}
          </div>
          <div className="side-row">
            <button className="mono side-btn" onClick={() => addSide(1)}>+ Side quest · 20 XP</button>
            {day.side > 0 && (
              <>
                <span className="mono side-count">×{day.side} today</span>
                <button className="mono side-undo" onClick={() => addSide(-1)}>undo</button>
              </>
            )}
            <span className="mono side-hint">passport step · family ops · brand batch · tutoring</span>
          </div>
        </section>

        {/* ── Last 7 days ── */}
        <section className="fade-in section">
          <h2 className="mono section-title scorecard-title">LAST 7 DAYS</h2>
          <div className="scorecard">
            {last7.map((d, i) => {
              const tone = d.count === 7 ? "is-full" : d.mvd ? "is-mvd" : d.count > 0 ? "is-some" : "is-none";
              return (
                <div key={i} className={`score-cell${d.isToday ? " is-today" : ""}`}>
                  <div className="mono score-label">{d.label}</div>
                  <div className={`disp score-count ${tone}`}>{d.count}</div>
                  <div className={`mono score-mvd${d.mvd ? " is-mvd" : ""}`}>{d.mvd ? "MVD" : "—"}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Laws footer ── */}
        <footer className="laws">
          <p className="mono laws-text">
            LAW 1 — planning only Sundays 5–6 PM · LAW 2 — nothing new after 10 PM · LAW 4 — the Minimum Viable Day always counts · LAW 8 — career decision closed until Nov 1.
          </p>
        </footer>
      </div>
    </div>
  );
}
