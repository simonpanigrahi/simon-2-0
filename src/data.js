// Campaign data + pure derivation logic, ported verbatim from tracker-spec.jsx.
// No React, no storage, no DOM here — just constants and pure functions so the
// XP/streak/scorecard math stays testable and matches the spec's formulas.

export const SEASON_START = new Date(2026, 6, 20); // Mon Jul 20, 2026 (week 1)

export const SEASON = [
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

export const QUESTS = [
  { key: "anchor", name: "Anchor", desc: "Up by wake target + 10-min light", mvd: false },
  { key: "dw1", name: "Deep Work I", desc: "90 min GATE, phone in other room", mvd: true },
  { key: "dw2", name: "Deep Work II", desc: "60–90 min GATE", mvd: false },
  { key: "lab", name: "Lab Block", desc: "45–60 min CANDLE work", mvd: true },
  { key: "move", name: "Move", desc: "Strength session or 8k steps", mvd: false },
  { key: "bond", name: "Bond", desc: "20 min device-free quality time", mvd: true },
  { key: "shutdown", name: "Shutdown", desc: "5-line plan · screens off 10:30", mvd: false },
];

export const LEVELS = [
  { xp: 0, title: "Unranked" },
  { xp: 1000, title: "Initiate" },
  { xp: 2500, title: "Operator" },
  { xp: 4500, title: "Strategist" },
  { xp: 7000, title: "Commander" },
  { xp: 10000, title: "Sovereign" },
  { xp: 13500, title: "Elite" },
];

// Highest threshold — the ribbon scales against this (spec used the literal 13500).
export const MAX_XP = LEVELS[LEVELS.length - 1].xp;

// XP rules (from spec): quest ×10, side quest ×20, boss ×150.
export const XP_PER_QUEST = 10;
export const XP_PER_SIDE = 20;
export const XP_PER_BOSS = 150;

// ─── Date helpers ────────────────────────────────────────────────────────────
export const dISO = (d) => {
  const z = new Date(d);
  z.setMinutes(z.getMinutes() - z.getTimezoneOffset());
  return z.toISOString().slice(0, 10);
};

export const today = () => dISO(new Date());

export const weekOf = (date) => {
  const diff = Math.floor((new Date(date) - SEASON_START) / 86400000);
  if (diff < 0) return 0;
  return Math.min(26, Math.floor(diff / 7) + 1);
};

export const weekDates = (n) => {
  if (n === 0) return "Jul 16 – 19";
  const s = new Date(SEASON_START);
  s.setDate(s.getDate() + (n - 1) * 7);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  const f = (d) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  return `${f(s)} – ${f(e)}`;
};

// ─── Derivations (all pure; XP is always derived, never stored) ──────────────
export const mvdMet = (d) =>
  !!d && QUESTS.filter((q) => q.mvd).every((q) => d.q && d.q[q.key]);

export const questsDoneIn = (d) =>
  d && d.q ? Object.values(d.q).filter(Boolean).length : 0;

export const computeXp = (state) => {
  let xp = 0;
  for (const d of Object.values(state.days)) {
    xp += questsDoneIn(d) * XP_PER_QUEST + (d.side || 0) * XP_PER_SIDE;
  }
  for (const w of Object.values(state.weeks)) {
    if (w.boss) xp += XP_PER_BOSS;
  }
  return xp;
};

export const levelFor = (xp) => {
  const lvl = [...LEVELS].reverse().find((l) => xp >= l.xp);
  const next = LEVELS.find((l) => l.xp > xp);
  return { lvl, next };
};

// Consecutive days meeting the MVD rule, ending today or (if today isn't met) yesterday.
export const computeStreak = (days) => {
  let streak = 0;
  const cursor = new Date();
  if (!mvdMet(days[dISO(cursor)])) cursor.setDate(cursor.getDate() - 1);
  while (mvdMet(days[dISO(cursor)])) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const computeLast7 = (days, tISO) =>
  [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = dISO(d);
    const rec = days[iso];
    return {
      label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
      count: questsDoneIn(rec),
      mvd: mvdMet(rec),
      isToday: iso === tISO,
    };
  });
