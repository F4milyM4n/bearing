"use strict";
// Standalone build: React/ReactDOM are loaded as UMD globals via <script>
// tags in index.html (no bundler/build step, no Recharts dependency —
// charts are hand-rolled SVG below for reliability without a CDN). This
// file is compiled from JSX to plain React.createElement calls ahead of time.
const { useState, useEffect, useCallback, useRef } = React;
// localStorage shim matching the { get(key), set(key, value) } shape the
// rest of this file already uses, so no other code needed to change.
// Note: localStorage is per-browser/per-device, not tied to any account —
// each person who installs this on their own phone gets their own data,
// and there's no cloud sync between devices.
const storage = {
    get: async (key) => {
        const v = localStorage.getItem(key);
        return v === null ? null : { key, value: v };
    },
    set: async (key, value) => {
        localStorage.setItem(key, value);
        return { key, value };
    },
};
// Minimal original icon set (stroke-style, 24x24) standing in for the
// lucide-react icons used in the Claude-artifact version — avoids an
// extra CDN dependency for a handful of simple glyphs.
function Icon({ size = 16, className = '', children }) {
    return (React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: className }, children));
}
const Dumbbell = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "M4 9v6M20 9v6M2 10.5v3M22 10.5v3M6 12h12" }));
const Activity = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "M2 12h4l2.5 7 4-14 2.5 7H22" }));
const Zap = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "M13 2 4 14h6l-1 8 9-12h-6z" }));
const CheckCircle2 = (p) => React.createElement(Icon, { ...p },
    React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
    React.createElement("path", { d: "m8.5 12.5 2.3 2.3L15.5 10" }));
const SettingsIconIntl = (p) => React.createElement(Icon, { ...p },
    React.createElement("circle", { cx: "12", cy: "12", r: "3.2" }),
    React.createElement("path", { d: "M12 3v2.5M12 18.5V21M4.4 7.2l2.1 1.2M17.5 15.6l2.1 1.2M4.4 16.8l2.1-1.2M17.5 8.4l2.1-1.2" }));
const Settings = SettingsIconIntl;
const ClipboardList = (p) => React.createElement(Icon, { ...p },
    React.createElement("rect", { x: "5", y: "4", width: "14", height: "16", rx: "2" }),
    React.createElement("path", { d: "M9 3.5h6v2.5H9zM8.5 10h7M8.5 13.5h7M8.5 17h4" }));
const ChevronRight = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "m9 5 7 7-7 7" }));
const InfoIconIntl = (p) => React.createElement(Icon, { ...p },
    React.createElement("circle", { cx: "12", cy: "12", r: "9" }),
    React.createElement("path", { d: "M12 8.3v.01M11.3 11.5h.9v5h.9" }));
const Info = InfoIconIntl;
const Trash2 = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "M4.5 7h15M9.5 7V4.8a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1V7m-8.5 0 1 13.2a1 1 0 0 0 1 .9h6a1 1 0 0 0 1-.9L17 7" }));
const TrendingUp = (p) => React.createElement(Icon, { ...p },
    React.createElement("path", { d: "M3 16l6.5-6.5L14 14l7-7" }),
    React.createElement("path", { d: "M15 6.3h6V12.3" }));
/* ---------------------------------------------------------------------
   REFERENCE DATA — transcribed from the article "Training Through Chaos"
   and the verified VDOT chart.

   - VDOT_TABLE: outdoor mile paces (seconds) at VDOT 30-65. Values
     between integers are computed via linear interpolation, not looked up.
   - STRENGTH_WEEKS: Session 1's 3-week Accumulation/Transmutation/
     Realization wave. Top set + 2 back-offs use the SAME weight, only
     reps drop. topPct varies by rep capacity in Weeks 1-2; Week 3 is
     90% either way.
   - STAMINA_WEEKS: Session 2's matching 3-week wave. Threshold(-)/
     Threshold/Threshold(+) = threshold pace at VDOT-1/VDOT/VDOT+1.
--------------------------------------------------------------------- */
const VDOT_TABLE = [
    [30, 760, 618, 539], [31, 743, 605, 527], [32, 727, 593, 515], [33, 711, 581, 503],
    [34, 697, 570, 493], [35, 683, 560, 483], [36, 670, 550, 474], [37, 659, 541, 465],
    [38, 647, 532, 457], [39, 637, 524, 450], [40, 626, 516, 443], [41, 616, 508, 436],
    [42, 606, 501, 429], [43, 596, 494, 423], [44, 587, 487, 417], [45, 578, 480, 410],
    [46, 570, 473, 404], [47, 561, 467, 397], [48, 554, 461, 391], [49, 546, 455, 384],
    [50, 539, 449, 378], [51, 532, 443, 372], [52, 526, 438, 366], [53, 519, 433, 362],
    [54, 513, 428, 358], [55, 507, 423, 354], [56, 501, 418, 350], [57, 495, 413, 346],
    [58, 489, 409, 342], [59, 483, 404, 338], [60, 478, 400, 334], [61, 473, 396, 330],
    [62, 468, 392, 326], [63, 463, 388, 322], [64, 459, 385, 318], [65, 455, 382, 314],
].map(([v, easy, thr, rep]) => ({ v, easy, thr, rep }));
const STRENGTH_WEEKS = [
    { name: 'Accumulation', warmupPct: [50, 60], workReps: 8, backoffReps: [5, 5], topPct: { lower: 70, higher: 75 } },
    { name: 'Transmutation', warmupPct: [50, 60, 70], workReps: 5, backoffReps: [3, 3], topPct: { lower: 80, higher: 82.5 } },
    { name: 'Realization', warmupPct: [50, 60, 70, 80], workReps: 2, backoffReps: [1, 1], topPct: { lower: 90, higher: 90 } },
];
// Session 3 warm-up: fixed regardless of week or rep capacity.
const SESSION3_WARMUP = [
    { pct: 50, reps: 5 },
    { pct: 60, reps: 5 },
    { pct: 70, reps: 3 },
];
const STAMINA_WEEKS = [
    { name: 'Threshold(-)', vdotDelta: -1, workMin: 13, restMin: 3, reps: 3, targetRPE: 6, warmupMin: 5 },
    { name: 'Threshold', vdotDelta: 0, workMin: 8, restMin: 2, reps: 4, targetRPE: 7, warmupMin: 10 },
    { name: 'Threshold(+)', vdotDelta: 1, workMin: 5, restMin: 1, reps: 5, targetRPE: 8, warmupMin: 15 },
];
const THEMES = {
    nightvision: {
        name: 'Night Vision',
        bgDeep: '#131515', bgPanel: '#1c201f', bgInset: '#23282a', border: '#2a2f2d', borderLight: '#384039',
        textPrimary: '#e3ede4', textSecondary: '#b9c9ba', textTertiary: '#7f9482', textOnAccent: '#0c1410',
        accent: '#4AFF6B', accentSolid: '#39E85C', accentSolidHover: '#52FF7D', accentBorder: '#4AFF6B',
        accentBgTint: '#17301f', accentTextOnTint: '#7CFFA0', accentBorderDim: '#2f5c3d', accentTextDim: '#4AFF6B',
        secondary: '#34D399', secondaryLight: '#6EE7C0', secondaryBorder: '#34D399', secondaryBgTint: '#133328',
        success: '#86EFAC', successBorder: '#4ADE80', successBgTint: '#14301f', successSolidTint: '#1f5c34',
        warning: '#FF5757', warningBorder: '#FF5757', warningBgTint: '#3a1414', warningSolid: '#E33A3A',
    },
    naval: {
        name: 'Sea',
        bgDeep: '#0b111a', bgPanel: '#131b27', bgInset: '#1a2432', border: '#223044', borderLight: '#2c3d54',
        textPrimary: '#e4ecf5', textSecondary: '#aebdd0', textTertiary: '#7c8ca3', textOnAccent: '#071019',
        accent: '#5FA3D0', accentSolid: '#4E90BE', accentSolidHover: '#6FB2DE', accentBorder: '#5FA3D0',
        accentBgTint: '#16283a', accentTextOnTint: '#8FC1E3', accentBorderDim: '#2c4a63', accentTextDim: '#5FA3D0',
        secondary: '#93A3B3', secondaryLight: '#B7C3CF', secondaryBorder: '#93A3B3', secondaryBgTint: '#1c242c',
        success: '#5ECBB0', successBorder: '#3B9C8A', successBgTint: '#10281f', successSolidTint: '#1c4438',
        warning: '#E1685A', warningBorder: '#E1685A', warningBgTint: '#351616', warningSolid: '#C5473C',
    },
    multicam: {
        name: 'Land',
        bgDeep: '#16130e', bgPanel: '#201b14', bgInset: '#29231a', border: '#33291d', borderLight: '#453824',
        textPrimary: '#ede6d6', textSecondary: '#cbbfa4', textTertiary: '#9c8f74', textOnAccent: '#1a150d',
        accent: '#C2A36B', accentSolid: '#B8975E', accentSolidHover: '#CDAE7C', accentBorder: '#C2A36B',
        accentBgTint: '#302a1c', accentTextOnTint: '#D9BE8B', accentBorderDim: '#4a3e28', accentTextDim: '#C2A36B',
        secondary: '#8A9A6B', secondaryLight: '#ACBB8E', secondaryBorder: '#8A9A6B', secondaryBgTint: '#232a1a',
        success: '#9CB87E', successBorder: '#7C9A5E', successBgTint: '#202b18', successSolidTint: '#384a28',
        warning: '#C25A45', warningBorder: '#C25A45', warningBgTint: '#351f18', warningSolid: '#A6432F',
    },
    blackout: {
        name: 'Blackout',
        bgDeep: '#0a0a0a', bgPanel: '#141414', bgInset: '#1c1c1c', border: '#262626', borderLight: '#333333',
        textPrimary: '#f0f0f0', textSecondary: '#c2c2c2', textTertiary: '#8a8a8a', textOnAccent: '#160a0a',
        accent: '#E8384A', accentSolid: '#DB2839', accentSolidHover: '#F0505F', accentBorder: '#E8384A',
        accentBgTint: '#301316', accentTextOnTint: '#F27680', accentBorderDim: '#4a1e22', accentTextDim: '#E8384A',
        secondary: '#6B7A88', secondaryLight: '#94A2AE', secondaryBorder: '#6B7A88', secondaryBgTint: '#1c2126',
        // Warning uses amber here (not red) since red is already the primary accent in this theme.
        success: '#6FCF7A', successBorder: '#4CAF58', successBgTint: '#16261a', successSolidTint: '#234a2c',
        warning: '#F5A623', warningBorder: '#F5A623', warningBgTint: '#332715', warningSolid: '#D68C1A',
    },
};
const THEME_ROLES = Object.keys(THEMES.nightvision).filter((r) => r !== 'name');
function ThemeStyle() {
    const themeVarBlocks = Object.entries(THEMES).map(([key, roles]) => {
        const vars = THEME_ROLES.map((r) => `--tt-${r}: ${roles[r]};`).join(' ');
        return `[data-theme="${key}"] { ${vars} }`;
    }).join('\n');
    const classRules = `
    .tt-bg-deep { background-color: var(--tt-bgDeep); }
    .tt-bg-panel { background-color: var(--tt-bgPanel); }
    .tt-bg-inset { background-color: var(--tt-bgInset); }
    .tt-border { border-color: var(--tt-border); }
    .tt-border-light { border-color: var(--tt-borderLight); }
    .tt-text-primary { color: var(--tt-textPrimary); }
    .tt-text-secondary { color: var(--tt-textSecondary); }
    .tt-text-tertiary { color: var(--tt-textTertiary); }
    .tt-text-onaccent { color: var(--tt-textOnAccent); }
    .tt-accent { color: var(--tt-accent); }
    .tt-bg-accent-solid { background-color: var(--tt-accentSolid); }
    .tt-bg-accent-solid:hover { background-color: var(--tt-accentSolidHover); }
    .tt-border-accent { border-color: var(--tt-accentBorder); }
    .tt-bg-accent-tint { background-color: var(--tt-accentBgTint); }
    .tt-text-accent-tint { color: var(--tt-accentTextOnTint); }
    .tt-border-accent-dim { border-color: var(--tt-accentBorderDim); }
    .tt-text-accent-dim { color: var(--tt-accentTextDim); }
    .tt-secondary { color: var(--tt-secondary); }
    .tt-secondary-light { color: var(--tt-secondaryLight); }
    .tt-border-secondary { border-color: var(--tt-secondaryBorder); }
    .tt-bg-secondary-tint { background-color: var(--tt-secondaryBgTint); }
    .tt-success { color: var(--tt-success); }
    .tt-border-success { border-color: var(--tt-successBorder); }
    .tt-bg-success-tint { background-color: var(--tt-successBgTint); }
    .tt-bg-success-solid-tint { background-color: var(--tt-successSolidTint); }
    .tt-warning { color: var(--tt-warning); }
    .tt-border-warning { border-color: var(--tt-warningBorder); }
    .tt-bg-warning-tint { background-color: var(--tt-warningBgTint); }
    .tt-bg-warning-solid { background-color: var(--tt-warningSolid); }
    .tt-hover-accent:hover { color: var(--tt-accent); }
    .tt-hover-warning:hover { color: var(--tt-warning); }
    .tt-focus-accent:focus { border-color: var(--tt-accentBorder); }
  `;
    return React.createElement("style", null, themeVarBlocks + '\n' + classRules);
}
const SESSION_LABEL = {
    1: 'Session 1 · Strength',
    2: 'Session 2 · Threshold',
    3: 'Session 3 · Stamina',
    4: 'Session 4 · Endurance',
    extra: 'Aerobic Accumulation',
};
/* ---------------------------------------------------------------------
   MATH HELPERS — everything below is computed, not pattern-matched.
--------------------------------------------------------------------- */
const roundTo5 = (n) => Math.round(n / 5) * 5;
const tmWeight = (tm, pct) => roundTo5((tm * pct) / 100);
function fmtPace(totalSeconds) {
    const t = Math.round(totalSeconds);
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
// Converts a pace (seconds/mile) to speed in mph: 3600 sec/hr ÷ sec/mile.
function fmtMph(totalSeconds) {
    return (3600 / totalSeconds).toFixed(1);
}
// Linear interpolation between tabulated VDOT rows (30–65). Treadmill @1%
// is derived mathematically: treadmill speed = outdoor speed ÷ 1.045,
// i.e. treadmill pace (time/mile) = outdoor pace × 1.045.
function paceFromVdot(vdot) {
    if (!vdot || isNaN(vdot))
        return null;
    const clamped = Math.max(30, Math.min(65, vdot));
    const lo = Math.floor(clamped);
    const hi = Math.ceil(clamped);
    const frac = clamped - lo;
    const rowLo = VDOT_TABLE.find((r) => r.v === lo);
    const rowHi = VDOT_TABLE.find((r) => r.v === hi);
    const lerp = (a, b) => a + (b - a) * frac;
    const easy = lo === hi ? rowLo.easy : lerp(rowLo.easy, rowHi.easy);
    const thr = lo === hi ? rowLo.thr : lerp(rowLo.thr, rowHi.thr);
    const rep = lo === hi ? rowLo.rep : lerp(rowLo.rep, rowHi.rep);
    return {
        outOfRange: vdot < 30 || vdot > 65,
        easy: { out: easy, tm: easy * 1.045 },
        thr: { out: thr, tm: thr * 1.045 },
        rep: { out: rep, tm: rep * 1.045 },
    };
}
// Session 1 prescription for one lift: warm-ups + top set + back-offs
// (top + both back-offs share the same weight — only reps drop).
function strengthPrescription(tm, weekIdx, repCapacity) {
    const w = STRENGTH_WEEKS[weekIdx];
    const topPct = w.topPct[repCapacity];
    return {
        weekName: w.name,
        warmups: w.warmupPct.map((pct) => ({ pct, weight: tmWeight(tm, pct), reps: w.workReps })),
        topPct,
        topWeight: tmWeight(tm, topPct),
        topReps: w.workReps,
        backoffReps: w.backoffReps,
    };
}
// Session 2 prescription: threshold pace shifted by the week's VDOT delta.
function staminaPrescription(vdot, weekIdx) {
    const w = STAMINA_WEEKS[weekIdx];
    const p = paceFromVdot((vdot || 0) + w.vdotDelta);
    return { ...w, paceOut: p ? p.thr.out : null, paceTm: p ? p.thr.tm : null, outOfRange: p ? p.outOfRange : false };
}
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Returns the ISO date (YYYY-MM-DD) of the most recent occurrence of
// `startDay` (0=Sun..6=Sat) on/before the given date, in the browser's
// local timezone — used to anchor the weekly reset to whichever day the
// person has chosen as "Day 1" (defaults to Monday, startDay=1).
function weekAnchorOf(d, startDay) {
    const date = new Date(d);
    const day = date.getDay(); // 0 = Sun ... 6 = Sat
    const diff = (day - startDay + 7) % 7;
    const anchor = new Date(date);
    anchor.setDate(date.getDate() - diff);
    anchor.setHours(0, 0, 0, 0);
    return anchor.toISOString().slice(0, 10);
}
// YYYY-MM-DD in the browser's local timezone (not UTC) — used to default
// date inputs to "today" without an off-by-one near midnight.
function todayLocalStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
// Converts a date-input string (YYYY-MM-DD) into an ISO timestamp, anchored
// at noon local time to avoid day-shift issues in later date math. Falls
// back to right now if no date string is given.
function entryDate(dateStr) {
    return dateStr ? new Date(`${dateStr}T12:00:00`).toISOString() : new Date().toISOString();
}
function fmtDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
// Shared Long-Term Progression rule, applied independently to the Strength
// track (-> Training Max) and the Threshold track (-> VDOT):
//   - Above target, 2 cycles running  -> hold (no change) while it lasts.
//   - At target                       -> advance 1 row.
//   - Below target, 2 cycles running  -> advance 2 rows instead of 1.
//   - A single above/below (not yet a streak) still advances 1 row.
function evaluateProgression(band, consecutiveHigh, consecutiveLow) {
    let rows = 0, hold = false, note;
    if (band === 'above') {
        consecutiveHigh += 1;
        consecutiveLow = 0;
        hold = consecutiveHigh >= 2;
        rows = hold ? 0 : 1;
        note = hold
            ? 'Held — Week 3 RPE was above target for 2 cycles in a row.'
            : 'Advanced 1 row — Week 3 RPE was above target (not yet 2 in a row).';
    }
    else if (band === 'below') {
        consecutiveLow += 1;
        consecutiveHigh = 0;
        hold = false;
        if (consecutiveLow >= 2) {
            rows = 2;
            consecutiveLow = 0;
            note = 'Advanced 2 rows — Week 3 RPE was below target for 2 cycles in a row.';
        }
        else {
            rows = 1;
            note = 'Advanced 1 row — Week 3 RPE was below target (not yet 2 in a row).';
        }
    }
    else {
        consecutiveHigh = 0;
        consecutiveLow = 0;
        hold = false;
        rows = 1;
        note = 'Advanced 1 row — Week 3 RPE was at target.';
    }
    return { consecutiveHigh, consecutiveLow, hold, rows, note };
}
/* ---------------------------------------------------------------------
   (COROS auto-sync removed — manual entry only.)
--------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   SMALL UI PIECES
--------------------------------------------------------------------- */
function Tip({ text }) {
    return (React.createElement("span", { title: text, className: "inline-flex items-center tt-text-secondary tt-hover-accent cursor-help ml-1" },
        React.createElement(Info, { size: 12 })));
}
function TabButton({ active, onClick, icon: Icon, children }) {
    return (React.createElement("button", { onClick: onClick, className: `flex items-center gap-1.5 px-3 py-2 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${active ? 'tt-border-accent tt-accent' : 'border-transparent tt-text-secondary'}` },
        React.createElement(Icon, { size: 14 }),
        children));
}
function LabeledInput({ label, value, onChange, placeholder, full, big }) {
    return (React.createElement("label", { className: `block ${full ? 'col-span-3' : ''}` },
        React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" }, label),
        React.createElement("input", { type: "text", value: value, placeholder: placeholder, onChange: (e) => onChange(e.target.value), className: `tt-bg-inset border tt-border-light rounded w-full focus:outline-none tt-focus-accent ${big ? 'px-3 py-2.5 text-3xl font-bold font-mono' : 'px-2 py-1.5 text-sm font-mono'}` })));
}
function NotesAndSubmit({ notes, setNotes, onSubmit }) {
    const [dateStr, setDateStr] = useState(todayLocalStr);
    return (React.createElement("div", { className: "mt-2" },
        React.createElement("label", { className: "block mb-2" },
            React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" }, "Date"),
            React.createElement("input", { type: "date", value: dateStr, onChange: (e) => setDateStr(e.target.value), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono focus:outline-none tt-focus-accent" })),
        React.createElement("label", { className: "block mb-2" },
            React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" }, "Notes"),
            React.createElement("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm w-full focus:outline-none tt-focus-accent" })),
        React.createElement("button", { onClick: () => onSubmit(dateStr), className: "flex items-center gap-1.5 tt-bg-accent-solid tt-text-onaccent font-bold text-sm uppercase tracking-widest px-4 py-2 rounded" },
            React.createElement(CheckCircle2, { size: 14 }),
            " Complete Session")));
}
const RPE_BAND_LABEL = { below: 'Below', at: 'At target', above: 'Above' };
function RPESelector({ value, onChange, target, exercise }) {
    const options = [
        { key: 'below', label: 'Below' },
        { key: 'at', label: 'At' },
        { key: 'above', label: 'Above' },
    ];
    const bandStyle = {
        below: 'tt-border-secondary tt-bg-secondary-tint tt-secondary-light',
        at: 'tt-border-success tt-bg-success-tint tt-success',
        above: 'tt-border-warning tt-bg-warning-tint tt-warning',
    };
    return (React.createElement("div", null,
        React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" },
            exercise ? `${exercise} RPE` : 'RPE',
            " vs target (",
            target,
            ")"),
        React.createElement("div", { className: "flex gap-1.5" }, options.map((o) => (React.createElement("button", { key: o.key, type: "button", onClick: () => onChange(o.key), className: `flex-1 text-sm px-2 py-1.5 rounded border font-semibold ${value === o.key ? bandStyle[o.key] : 'tt-border-light tt-text-secondary'}` }, o.label))))));
}
function SetupNudge({ text }) {
    return (React.createElement("div", { className: "tt-bg-accent-tint border tt-border-accent-dim tt-text-accent-tint text-base rounded-lg p-3 mb-4" }, text));
}
function RotationTrack({ nextType, sessionsThisWeek, weekMonday, cycleWeek, cycleCount, weekStartDay }) {
    const nodes = [1, 2, 3, 4];
    const nodeLabel = { 1: 'Strength', 2: 'Threshold', 3: 'Stamina', 4: 'Endurance' };
    const weekName = STRENGTH_WEEKS[cycleWeek]?.name;
    const dayName = DAY_NAMES[weekStartDay ?? 1];
    return (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4 mb-4" },
        React.createElement("div", { className: "flex items-center justify-between text-xs uppercase tracking-widest tt-text-secondary mb-1" },
            React.createElement("span", null,
                "Week of ",
                weekMonday ? fmtDate(weekMonday) : '—'),
            React.createElement("span", null,
                sessionsThisWeek,
                "/4 this week")),
        React.createElement("div", { className: "text-xs uppercase tracking-widest tt-text-accent-dim mb-3" },
            "Cycle ",
            cycleCount,
            " \u00B7 Week ",
            cycleWeek + 1,
            " of 3 \u2014 ",
            weekName),
        React.createElement("div", { className: "flex items-center" }, nodes.map((n, i) => {
            const done = n <= sessionsThisWeek;
            const isNext = n === nextType;
            return (React.createElement(React.Fragment, { key: n },
                React.createElement("div", { className: "flex flex-col items-center gap-1 flex-1" },
                    React.createElement("div", { className: `w-9 h-9 rounded-full flex items-center justify-center text-base font-bold border-2 ${isNext
                            ? 'tt-bg-accent-solid tt-border-accent tt-text-onaccent animate-pulse'
                            : done
                                ? 'tt-bg-success-solid-tint tt-border-success tt-success'
                                : 'tt-bg-inset tt-border-light tt-text-secondary'}` }, done ? React.createElement(CheckCircle2, { size: 16 }) : n),
                    React.createElement("span", { className: `text-[11px] uppercase tracking-tight text-center leading-tight ${isNext ? 'tt-accent font-bold' : 'tt-text-tertiary'}` }, nodeLabel[n])),
                i < 3 && React.createElement(ChevronRight, { size: 16, className: "tt-text-tertiary -mt-4" })));
        })),
        React.createElement("p", { className: "text-sm tt-text-tertiary mt-3" },
            "Session rotation resets to Session 1 every ",
            dayName,
            "; the 3-week strength/stamina cycle advances every ",
            dayName,
            " regardless of adherence.")));
}
/* ---------------------------------------------------------------------
   MAIN APP
--------------------------------------------------------------------- */
const DEFAULT_PROGRESS = {
    weekMonday: null,
    sessionsThisWeek: 0,
    cycleWeek: 0,
    cycleCount: 1,
    lastWeek3RPEStrength: null,
    lastWeek3CycleStrength: null,
    consecutiveHighStrength: 0,
    consecutiveLowStrength: 0,
    holdStrength: false,
    strengthProgressionNote: null,
    lastWeek3RPEStamina: null,
    lastWeek3CycleStamina: null,
    consecutiveHighStamina: 0,
    consecutiveLowStamina: 0,
    holdStamina: false,
    staminaProgressionNote: null,
};
/* ---------------------------------------------------------------------
   PWA INSTALL — captures the browser's install prompt (Android/Chrome)
   outside React so it's available whenever it fires; iOS has no such
   API, so it gets manual "Add to Home Screen" instructions instead.
--------------------------------------------------------------------- */
let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    window.dispatchEvent(new Event('pwa-install-available'));
});
window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
});
function InstallButton() {
    const [, setAvailable] = useState(!!deferredInstallPrompt);
    const [showHelp, setShowHelp] = useState(false);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    useEffect(() => {
        function onAvailable() { setAvailable(true); }
        window.addEventListener('pwa-install-available', onAvailable);
        return () => window.removeEventListener('pwa-install-available', onAvailable);
    }, []);
    if (isStandalone)
        return null;
    async function handleClick() {
        if (deferredInstallPrompt) {
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            setAvailable(false);
        }
        else {
            setShowHelp(true);
        }
    }
    return (React.createElement("div", { className: "text-right relative" },
        React.createElement("button", { onClick: handleClick, className: "text-xs tt-border-accent-dim border tt-accent rounded px-2 py-1 uppercase tracking-widest whitespace-nowrap" }, "Install"),
        showHelp && (React.createElement("div", { className: "absolute right-0 mt-2 z-10 tt-bg-panel border tt-border rounded-lg p-3 text-sm tt-text-secondary w-[220px] shadow-lg text-left" },
            isIOS
                ? React.createElement(React.Fragment, null,
                    "Tap the Share icon, then ",
                    React.createElement("strong", null, "Add to Home Screen"),
                    ".")
                : React.createElement(React.Fragment, null,
                    "Open your browser menu and choose ",
                    React.createElement("strong", null, "Add to Home Screen"),
                    " or ",
                    React.createElement("strong", null, "Install App"),
                    "."),
            React.createElement("button", { onClick: () => setShowHelp(false), className: "block mt-2 tt-accent underline" }, "Got it")))));
}
/* ---------------------------------------------------------------------
   ONBOARDING — first-run landing screen to set maxes/VDOT/theme before
   ever seeing the tabbed app. Reachable again later via Setup > "Run
   setup again".
--------------------------------------------------------------------- */
function OnboardingScreen({ profile, onComplete }) {
    const [local, setLocal] = useState(profile);
    return (React.createElement("div", { className: "min-h-screen tt-bg-deep tt-text-primary font-sans flex items-center justify-center px-4 py-10", "data-theme": local.theme || 'nightvision' },
        React.createElement(ThemeStyle, null),
        React.createElement("div", { className: "max-w-md w-full" },
            React.createElement("div", { className: "text-center mb-6" },
                React.createElement("h1", { className: "text-2xl font-bold uppercase tracking-widest tt-accent" }, "Bearing"),
                React.createElement("p", { className: "text-base tt-text-secondary mt-1" }, "Chaos-tolerant strength & endurance tracker")),
            React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4 mb-4" },
                React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-3" }, "Theme"),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" }, Object.entries(THEMES).map(([key, t]) => {
                    const isActive = (local.theme || 'nightvision') === key;
                    return (React.createElement("button", { key: key, onClick: () => setLocal({ ...local, theme: key }), className: "text-center rounded-lg py-3 font-bold text-sm uppercase tracking-wide", style: { background: t.bgInset, color: t.accent, border: `2px solid ${isActive ? t.accent : t.border}` } }, t.name));
                }))),
            React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4 mb-4" },
                React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-3" }, "Set your starting numbers"),
                React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                    React.createElement(LabeledInput, { label: "Bench TM (lb)", value: local.benchTM, onChange: (v) => setLocal({ ...local, benchTM: v }) }),
                    React.createElement(LabeledInput, { label: "Squat TM (lb)", value: local.squatTM, onChange: (v) => setLocal({ ...local, squatTM: v }) })),
                React.createElement(LabeledInput, { label: "VDOT", value: local.vdot, onChange: (v) => setLocal({ ...local, vdot: v }), full: true }),
                React.createElement("div", { className: "mt-3" },
                    React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" }, "Bench rep capacity"),
                    React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: () => setLocal({ ...local, benchRepCapacity: 'lower' }), className: `text-sm px-3 py-1.5 rounded border ${(local.benchRepCapacity || 'lower') === 'lower' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Lower (70/80/90)"),
                        React.createElement("button", { onClick: () => setLocal({ ...local, benchRepCapacity: 'higher' }), className: `text-sm px-3 py-1.5 rounded border ${local.benchRepCapacity === 'higher' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Higher (75/82.5/90)"))),
                React.createElement("div", { className: "mt-3" },
                    React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" }, "Squat rep capacity"),
                    React.createElement("div", { className: "flex gap-2" },
                        React.createElement("button", { onClick: () => setLocal({ ...local, squatRepCapacity: 'lower' }), className: `text-sm px-3 py-1.5 rounded border ${(local.squatRepCapacity || 'lower') === 'lower' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Lower (70/80/90)"),
                        React.createElement("button", { onClick: () => setLocal({ ...local, squatRepCapacity: 'higher' }), className: `text-sm px-3 py-1.5 rounded border ${local.squatRepCapacity === 'higher' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Higher (75/82.5/90)"))),
                React.createElement("div", { className: "mt-3" },
                    React.createElement("label", { className: "block" },
                        React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" }, "Day 1 (weekly reset day)"),
                        React.createElement("select", { value: local.weekStartDay ?? 1, onChange: (e) => setLocal({ ...local, weekStartDay: parseInt(e.target.value, 10) }), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono focus:outline-none tt-focus-accent" }, DAY_NAMES.map((name, idx) => React.createElement("option", { key: idx, value: idx }, name)))))),
            React.createElement("p", { className: "text-sm tt-text-secondary mb-4" }, "You can leave any of this blank and fill it in later from Setup \u2014 the app will prompt you wherever a number's needed."),
            React.createElement("button", { onClick: () => onComplete(local), className: "w-full tt-bg-accent-solid tt-text-onaccent font-bold text-sm uppercase tracking-widest px-4 py-3 rounded" }, "Get Started"))));
}
function TrainingTracker() {
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('today');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [profile, setProfile] = useState({ squatTM: '', benchTM: '', vdot: '', squatRepCapacity: 'lower', benchRepCapacity: 'lower', weekStartDay: 1, theme: 'nightvision' });
    const [progress, setProgress] = useState(DEFAULT_PROGRESS);
    const [log, setLog] = useState([]);
    const [maxHistory, setMaxHistory] = useState([]);
    const [resetArmed, setResetArmed] = useState(false);
    // ---- load from persistent storage ----
    useEffect(() => {
        (async () => {
            try {
                const p = await storage.get('profile');
                if (p?.value)
                    setProfile((prev) => ({ ...prev, ...JSON.parse(p.value) }));
            }
            catch (e) { }
            try {
                const pr = await storage.get('progress');
                if (pr?.value)
                    setProgress((prev) => ({ ...DEFAULT_PROGRESS, ...JSON.parse(pr.value) }));
            }
            catch (e) { }
            try {
                const l = await storage.get('log');
                if (l?.value)
                    setLog(JSON.parse(l.value));
            }
            catch (e) { }
            try {
                const mh = await storage.get('maxHistory');
                if (mh?.value)
                    setMaxHistory(JSON.parse(mh.value));
            }
            catch (e) { }
            try {
                const ob = await storage.get('onboarded');
                if (!ob?.value)
                    setShowOnboarding(true);
            }
            catch (e) {
                setShowOnboarding(true);
            }
            setLoading(false);
        })();
    }, []);
    function completeOnboarding(next) {
        persistProfile(next);
        storage.set('onboarded', 'true').catch(() => { });
        setShowOnboarding(false);
    }
    const persistProfile = useCallback(async (next) => {
        setProfile(next);
        try {
            await storage.set('profile', JSON.stringify(next), false);
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    const persistProgress = useCallback(async (next) => {
        setProgress(next);
        try {
            await storage.set('progress', JSON.stringify(next), false);
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    const persistLog = useCallback(async (next) => {
        setLog(next);
        try {
            await storage.set('log', JSON.stringify(next), false);
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    const persistMaxHistory = useCallback(async (next) => {
        setMaxHistory(next);
        try {
            await storage.set('maxHistory', JSON.stringify(next), false);
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    // Every "Day 1" (configurable in Setup, defaults to Monday): reset the
    // weekly 1-4 session rotation to Session 1, and advance the 3-week
    // strength/stamina cycle by one week — regardless of how much (or how
    // little) got done the prior week. When the cycle wraps Realization ->
    // Accumulation, evaluate Long-Term Progression for the Strength track
    // (Session 1 top-set RPE -> Training Max) and the Threshold track
    // (Session 2 interval RPE -> VDOT) completely independently of one
    // another — each has its own streak counters and hold state.
    useEffect(() => {
        if (loading)
            return;
        const todayMonday = weekAnchorOf(new Date(), profile.weekStartDay ?? 1);
        if (progress.weekMonday !== todayMonday) {
            const wrapping = progress.cycleWeek === 2;
            let { cycleCount, lastWeek3RPEStrength, lastWeek3CycleStrength, consecutiveHighStrength, consecutiveLowStrength, holdStrength, strengthProgressionNote, lastWeek3RPEStamina, lastWeek3CycleStamina, consecutiveHighStamina, consecutiveLowStamina, holdStamina, staminaProgressionNote, } = progress;
            if (wrapping) {
                let tmRows = 0;
                let vdotRows = 0;
                // Strength (Session 1) -> Training Max. Either lift reading "above"
                // counts the week as above (conservative); both must read "below"
                // for the week to count as below.
                if (lastWeek3RPEStrength && lastWeek3CycleStrength === cycleCount) {
                    const squatBand = lastWeek3RPEStrength.squat;
                    const benchBand = lastWeek3RPEStrength.bench;
                    let band;
                    if (squatBand === 'above' || benchBand === 'above')
                        band = 'above';
                    else if (squatBand === 'below' && benchBand === 'below')
                        band = 'below';
                    else
                        band = 'at';
                    const r = evaluateProgression(band, consecutiveHighStrength, consecutiveLowStrength);
                    consecutiveHighStrength = r.consecutiveHigh;
                    consecutiveLowStrength = r.consecutiveLow;
                    holdStrength = r.hold;
                    strengthProgressionNote = r.note;
                    tmRows = r.rows;
                }
                else {
                    strengthProgressionNote = 'No Week 3 data recorded last cycle — training max left unchanged.';
                }
                // Threshold (Session 2) -> VDOT.
                if (lastWeek3RPEStamina && lastWeek3CycleStamina === cycleCount) {
                    const r = evaluateProgression(lastWeek3RPEStamina, consecutiveHighStamina, consecutiveLowStamina);
                    consecutiveHighStamina = r.consecutiveHigh;
                    consecutiveLowStamina = r.consecutiveLow;
                    holdStamina = r.hold;
                    staminaProgressionNote = r.note;
                    vdotRows = r.rows;
                }
                else {
                    staminaProgressionNote = 'No Week 3 data recorded last cycle — VDOT left unchanged.';
                }
                if (tmRows > 0 || vdotRows > 0) {
                    const nextProfile = { ...profile };
                    if (tmRows > 0) {
                        nextProfile.squatTM = String(roundTo5((parseFloat(profile.squatTM) || 0) + 5 * tmRows));
                        nextProfile.benchTM = String(roundTo5((parseFloat(profile.benchTM) || 0) + 5 * tmRows));
                    }
                    if (vdotRows > 0) {
                        nextProfile.vdot = String((parseFloat(profile.vdot) || 0) + vdotRows);
                    }
                    persistProfile(nextProfile);
                    const noteParts = [];
                    if (tmRows > 0)
                        noteParts.push(`TM +${tmRows} row${tmRows > 1 ? 's' : ''}`);
                    if (vdotRows > 0)
                        noteParts.push(`VDOT +${vdotRows} row${vdotRows > 1 ? 's' : ''}`);
                    persistMaxHistory([{
                            date: new Date().toISOString(),
                            squatTM: nextProfile.squatTM,
                            benchTM: nextProfile.benchTM,
                            vdot: nextProfile.vdot,
                            note: `Auto-progression — ${noteParts.join(', ')}`,
                        }, ...maxHistory]);
                }
                cycleCount = (cycleCount || 1) + 1;
            }
            persistProgress({
                weekMonday: todayMonday,
                sessionsThisWeek: 0,
                cycleWeek: (progress.cycleWeek + 1) % 3,
                cycleCount,
                lastWeek3RPEStrength, lastWeek3CycleStrength, consecutiveHighStrength, consecutiveLowStrength, holdStrength, strengthProgressionNote,
                lastWeek3RPEStamina, lastWeek3CycleStamina, consecutiveHighStamina, consecutiveLowStamina, holdStamina, staminaProgressionNote,
            });
        }
    }, [loading]); // eslint-disable-line
    // Manual edits from Setup also get recorded to history, but only when a
    // TM or VDOT value actually changed (not on every keystroke/save).
    function saveProfileManual(next) {
        const changed = next.squatTM !== profile.squatTM || next.benchTM !== profile.benchTM || next.vdot !== profile.vdot;
        persistProfile(next);
        if (changed) {
            persistMaxHistory([{
                    date: new Date().toISOString(),
                    squatTM: next.squatTM,
                    benchTM: next.benchTM,
                    vdot: next.vdot,
                    note: 'Manual update',
                }, ...maxHistory]);
        }
    }
    const nextType = progress.sessionsThisWeek < 4 ? progress.sessionsThisWeek + 1 : null;
    const squatTM = parseFloat(profile.squatTM) || 0;
    const benchTM = parseFloat(profile.benchTM) || 0;
    const vdot = parseFloat(profile.vdot) || 0;
    const paces = paceFromVdot(vdot);
    function completeSession(payload, notes, dateStr) {
        const entry = { id: Date.now(), date: entryDate(dateStr), type: nextType, payload, notes: notes || '' };
        persistLog([entry, ...log]);
        const next = { ...progress, sessionsThisWeek: Math.min(4, progress.sessionsThisWeek + 1) };
        if (nextType === 1 && progress.cycleWeek === 2) {
            next.lastWeek3RPEStrength = {
                squat: payload.lifts?.squat?.topRPE ?? null,
                bench: payload.lifts?.bench?.topRPE ?? null,
            };
            next.lastWeek3CycleStrength = progress.cycleCount;
        }
        if (nextType === 2 && progress.cycleWeek === 2) {
            next.lastWeek3RPEStamina = payload.intervalRPE ?? null;
            next.lastWeek3CycleStamina = progress.cycleCount;
        }
        persistProgress(next);
    }
    // Extra/optional work once the week's 4 sessions are done — logged for
    // the record but doesn't advance the rotation or the cycle.
    function completeExtra(payload, notes, dateStr) {
        const entry = { id: Date.now(), date: entryDate(dateStr), type: 'extra', payload, notes: notes || '' };
        persistLog([entry, ...log]);
    }
    // Log a session for a type/week other than what's live right now (e.g.
    // catching up on last week's Week 2 after the app has already moved on
    // to Week 3). Recorded in history but does NOT touch sessionsThisWeek,
    // cycleWeek, or automatic TM/VDOT progression — use the manual overrides
    // in Setup if a backfilled entry should also shift those.
    function completeBackfill(type, weekIdx, payload, notes, dateStr) {
        const entry = {
            id: Date.now(),
            date: entryDate(dateStr),
            type,
            payload,
            notes: notes || '',
            backfilled: true,
        };
        persistLog([entry, ...log]);
    }
    // Move the rotation pointer forward one slot without logging anything —
    // for a session that was simply missed and won't be made up.
    function skipSession() {
        persistProgress({ ...progress, sessionsThisWeek: Math.min(4, progress.sessionsThisWeek + 1) });
    }
    function deleteEntry(id) {
        persistLog(log.filter((e) => e.id !== id));
    }
    if (loading) {
        return React.createElement("div", { className: "min-h-[400px] flex items-center justify-center tt-bg-deep tt-text-secondary text-base" }, "Loading\u2026");
    }
    if (showOnboarding) {
        return React.createElement(OnboardingScreen, { profile: profile, onComplete: completeOnboarding });
    }
    return (React.createElement("div", { className: "min-h-screen tt-bg-deep tt-text-primary font-sans", "data-theme": profile.theme || 'nightvision' },
        React.createElement(ThemeStyle, null),
        React.createElement("div", { className: "max-w-2xl mx-auto px-4 py-5" },
            React.createElement("header", { className: "mb-4 flex items-start justify-between" },
                React.createElement("div", null,
                    React.createElement("h1", { className: "text-xl font-bold uppercase tracking-widest tt-text-primary" }, "Bearing"),
                    React.createElement("p", { className: "text-base tt-text-secondary mt-0.5" }, "Chaos-tolerant strength & endurance tracker")),
                React.createElement(InstallButton, null)),
            React.createElement("nav", { className: "flex border-b tt-border mb-4" },
                React.createElement(TabButton, { active: tab === 'today', onClick: () => setTab('today'), icon: Zap }, "Today"),
                React.createElement(TabButton, { active: tab === 'log', onClick: () => setTab('log'), icon: ClipboardList }, "Log"),
                React.createElement(TabButton, { active: tab === 'progress', onClick: () => setTab('progress'), icon: TrendingUp }, "Progress"),
                React.createElement(TabButton, { active: tab === 'setup', onClick: () => setTab('setup'), icon: Settings }, "Setup")),
            tab === 'today' && (React.createElement(TodayTab, { nextType: nextType, cycleWeek: progress.cycleWeek, cycleCount: progress.cycleCount, squatRepCapacity: profile.squatRepCapacity || 'lower', benchRepCapacity: profile.benchRepCapacity || 'lower', weekStartDay: profile.weekStartDay ?? 1, squatTM: squatTM, benchTM: benchTM, vdot: vdot, paces: paces, sessionsThisWeek: progress.sessionsThisWeek, weekMonday: progress.weekMonday, onComplete: completeSession, onCompleteExtra: completeExtra, onCompleteBackfill: completeBackfill, onSkip: skipSession })),
            tab === 'log' && React.createElement(LogTab, { log: log, onDelete: deleteEntry }),
            tab === 'progress' && React.createElement(ProgressTab, { log: log, maxHistory: maxHistory, weekStartDay: profile.weekStartDay ?? 1 }),
            tab === 'setup' && (React.createElement(SetupTab, { profile: profile, onSave: saveProfileManual, progress: progress, onUpdateProgress: (patch) => persistProgress({ ...progress, ...patch }), resetArmed: resetArmed, setResetArmed: setResetArmed, onReset: () => { persistProgress({ ...progress, weekMonday: weekAnchorOf(new Date(), profile.weekStartDay ?? 1), sessionsThisWeek: 0 }); setResetArmed(false); }, onRerunSetup: () => setShowOnboarding(true) })))));
}
/* ---------------------------------------------------------------------
   TODAY TAB
--------------------------------------------------------------------- */
function TodayTab({ nextType, cycleWeek, cycleCount, squatRepCapacity, benchRepCapacity, weekStartDay, squatTM, benchTM, vdot, paces, sessionsThisWeek, weekMonday, onComplete, onCompleteExtra, onCompleteBackfill, onSkip }) {
    const needsLifts = nextType === 1 && (!squatTM || !benchTM);
    const needsRun = (nextType === 2 || nextType === 4) && !vdot;
    const needsBoth = nextType === 3 && (!squatTM || !benchTM || !vdot);
    const [skipArmed, setSkipArmed] = useState(false);
    const dayName = DAY_NAMES[weekStartDay ?? 1];
    return (React.createElement("div", null,
        React.createElement(RotationTrack, { nextType: nextType, sessionsThisWeek: sessionsThisWeek, weekMonday: weekMonday, cycleWeek: cycleWeek, cycleCount: cycleCount, weekStartDay: weekStartDay }),
        needsLifts && React.createElement(SetupNudge, { text: "Set your Bench and Squat training maxes in Setup to see today's numbers." }),
        needsRun && React.createElement(SetupNudge, { text: "Set your VDOT in Setup to see today's paces." }),
        needsBoth && React.createElement(SetupNudge, { text: "Session 3 uses both training maxes and VDOT \u2014 set both in Setup to see today's numbers." }),
        nextType === 1 && !needsLifts && (React.createElement(Session1, { weekIdx: cycleWeek, squatRepCapacity: squatRepCapacity, benchRepCapacity: benchRepCapacity, squatTM: squatTM, benchTM: benchTM, onComplete: onComplete })),
        nextType === 2 && !needsRun && React.createElement(Session2, { weekIdx: cycleWeek, vdot: vdot, onComplete: onComplete }),
        nextType === 3 && !needsBoth && (React.createElement(Session3, { squatTM: squatTM, benchTM: benchTM, squatRepCapacity: squatRepCapacity, benchRepCapacity: benchRepCapacity, vdot: vdot, paces: paces, onComplete: onComplete })),
        nextType === 4 && !needsRun && (React.createElement(EasyRun, { paces: paces, onComplete: onComplete, label: SESSION_LABEL[4], contextNote: "Best placed the day after Session 3. Check cardiac drift (~5% or less in the first hour) afterward to confirm the effort stayed easy." })),
        nextType === null && (React.createElement("div", null,
            React.createElement("div", { className: "tt-bg-success-tint border tt-border-success tt-success text-base rounded-lg p-3 mb-4" },
                "All 4 sessions logged for this week. Anything else before ",
                dayName,
                " is optional and won't touch the rotation."),
            React.createElement(EasyRun, { paces: paces, onComplete: onCompleteExtra, label: SESSION_LABEL.extra, contextNote: `Extra opportunities should stay low-intensity (RPE 3–4) — omit entirely if it would compromise recovery before ${dayName}'s Session 1.` }))),
        nextType !== null && (React.createElement("div", { className: "mt-3" }, !skipArmed ? (React.createElement("button", { onClick: () => setSkipArmed(true), className: "text-base tt-text-secondary border tt-border rounded px-3 py-1.5" }, "Skip this session (missed it \u2014 don't log anything)")) : (React.createElement("div", { className: "flex gap-2" },
            React.createElement("button", { onClick: () => { onSkip(); setSkipArmed(false); }, className: "text-sm tt-bg-warning-solid text-white rounded px-3 py-1.5 font-bold" }, "Confirm skip"),
            React.createElement("button", { onClick: () => setSkipArmed(false), className: "text-base tt-text-tertiary border tt-border-light rounded px-3 py-1.5" }, "Cancel"))))),
        React.createElement(BackfillPanel, { cycleWeek: cycleWeek, squatRepCapacity: squatRepCapacity, benchRepCapacity: benchRepCapacity, squatTM: squatTM, benchTM: benchTM, vdot: vdot, paces: paces, onComplete: onCompleteBackfill })));
}
/* ---- Backfill: log a session for any type/week without touching the live rotation ---- */
function BackfillPanel({ cycleWeek, squatRepCapacity, benchRepCapacity, squatTM, benchTM, vdot, paces, onComplete }) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState(1);
    const [weekIdx, setWeekIdx] = useState(cycleWeek);
    const typeOptions = [
        { type: 1, label: 'Strength' },
        { type: 2, label: 'Threshold' },
        { type: 3, label: 'Stamina' },
        { type: 4, label: 'Endurance' },
    ];
    function handleComplete(payload, notes, dateStr) {
        onComplete(type, weekIdx, payload, notes, dateStr);
    }
    const backfillLabel = (type === 1 || type === 2)
        ? `Backfill · ${SESSION_LABEL[type]} (Week ${weekIdx + 1} — ${STRENGTH_WEEKS[weekIdx].name})`
        : `Backfill · ${SESSION_LABEL[type]}`;
    return (React.createElement("div", { className: "mt-4 border-t tt-border pt-4" },
        React.createElement("button", { onClick: () => setOpen((o) => !o), className: "text-base tt-text-tertiary underline decoration-slate-700 underline-offset-4" }, open ? 'Hide' : 'Log a past or different session'),
        open && (React.createElement("div", { className: "mt-3" },
            React.createElement("p", { className: "text-base tt-text-secondary mb-2" }, "Records to history only \u2014 it won't touch the live rotation, cycle position, or automatic TM/VDOT progression. Use the Date field on the form below to place it on the correct day."),
            React.createElement("div", { className: "flex gap-1.5 mb-2 flex-wrap" }, typeOptions.map((o) => (React.createElement("button", { key: o.type, onClick: () => setType(o.type), className: `text-sm px-2.5 py-1.5 rounded border ${type === o.type ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, o.label)))),
            (type === 1 || type === 2) && (React.createElement("div", { className: "flex gap-1.5 mb-3" }, [0, 1, 2].map((w) => (React.createElement("button", { key: w, onClick: () => setWeekIdx(w), className: `text-sm px-2.5 py-1.5 rounded border ${weekIdx === w ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` },
                "Week ",
                w + 1,
                " \u2014 ",
                STRENGTH_WEEKS[w].name))))),
            type === 1 && React.createElement(Session1, { weekIdx: weekIdx, squatRepCapacity: squatRepCapacity, benchRepCapacity: benchRepCapacity, squatTM: squatTM, benchTM: benchTM, onComplete: handleComplete, label: backfillLabel }),
            type === 2 && React.createElement(Session2, { weekIdx: weekIdx, vdot: vdot, onComplete: handleComplete, label: backfillLabel }),
            type === 3 && React.createElement(Session3, { squatTM: squatTM, benchTM: benchTM, squatRepCapacity: squatRepCapacity, benchRepCapacity: benchRepCapacity, vdot: vdot, paces: paces, onComplete: handleComplete, label: backfillLabel }),
            type === 4 && React.createElement(EasyRun, { paces: paces, onComplete: handleComplete, label: backfillLabel, contextNote: "Backfilled entry \u2014 logged for the record." })))));
}
/* ---- Session 1: Strength — Accumulation/Transmutation/Realization wave ---- */
function Session1({ weekIdx, squatRepCapacity, benchRepCapacity, squatTM, benchTM, onComplete, label }) {
    const week = STRENGTH_WEEKS[weekIdx];
    const lifts = [
        { key: 'bench', label: 'Bench', tm: benchTM, repCapacity: benchRepCapacity },
        { key: 'squat', label: 'Squat', tm: squatTM, repCapacity: squatRepCapacity },
    ];
    const buildDefaults = () => {
        const obj = {};
        lifts.forEach((l) => {
            const rx = strengthPrescription(l.tm, weekIdx, l.repCapacity);
            obj[l.key] = {
                topWeight: rx.topWeight,
                topReps: rx.topReps,
                topRPE: 'at',
                backoff1Reps: rx.backoffReps[0],
                backoff2Reps: rx.backoffReps[1],
            };
        });
        return obj;
    };
    const [fields, setFields] = useState(buildDefaults);
    const [accessories, setAccessories] = useState('');
    const [notes, setNotes] = useState('');
    useEffect(() => { setFields(buildDefaults()); }, [weekIdx, squatRepCapacity, benchRepCapacity, squatTM, benchTM]); // eslint-disable-line
    function update(lift, field, value) {
        setFields((prev) => ({ ...prev, [lift]: { ...prev[lift], [field]: value } }));
    }
    function submit(dateStr) {
        onComplete({ weekIdx, weekName: week.name, squatRepCapacity, benchRepCapacity, lifts: fields, accessories }, notes, dateStr);
        setNotes('');
        setAccessories('');
    }
    return (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement(Dumbbell, { size: 16, className: "tt-accent" }),
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide" }, label || SESSION_LABEL[1])),
        React.createElement("p", { className: "text-base tt-text-secondary mb-3" },
            "Week ",
            weekIdx + 1,
            " \u00B7 ",
            week.name,
            ' ',
            React.createElement(Tip, { text: "Top set and both back-off sets use the same weight, per the article \u2014 only reps drop. Target RPE 8.5\u20139 (velocity loss ~30\u201335%) on the top set." })),
        lifts.map((l) => {
            const rx = strengthPrescription(l.tm, weekIdx, l.repCapacity);
            return (React.createElement("div", { key: l.key, className: "mb-3 border-t tt-border pt-3 first:border-0 first:pt-0" },
                React.createElement("div", { className: "text-sm font-semibold tt-text-secondary mb-1" },
                    l.label,
                    " ",
                    React.createElement("span", { className: "tt-text-tertiary font-normal" },
                        "TM ",
                        l.tm,
                        " \u00B7 ",
                        l.repCapacity === 'higher' ? 'Higher' : 'Lower',
                        " capacity")),
                React.createElement("div", { className: "mb-2" },
                    React.createElement("div", { className: "text-sm tt-text-tertiary uppercase tracking-wide mb-0.5" }, "Warm-up"),
                    rx.warmups.map((w, i) => (React.createElement("div", { key: i, className: "flex justify-between items-baseline py-0.5" },
                        React.createElement("span", { className: "text-sm tt-text-tertiary" },
                            "Set ",
                            i + 1),
                        React.createElement("span", { className: "text-xl font-mono" },
                            React.createElement("span", { className: "font-bold tt-accent" }, w.weight),
                            React.createElement("span", { className: "tt-text-secondary" },
                                " \u00D7 ",
                                w.reps)))))),
                React.createElement("div", { className: "mb-2" },
                    React.createElement("div", { className: "text-sm tt-text-tertiary uppercase tracking-wide mb-0.5" },
                        "Work ",
                        React.createElement("span", { className: "normal-case tt-text-tertiary" },
                            "(",
                            rx.topPct,
                            "%, same weight)")),
                    React.createElement("div", { className: "flex justify-between items-baseline py-0.5" },
                        React.createElement("span", { className: "text-sm tt-text-tertiary" }, "Top set"),
                        React.createElement("span", { className: "text-xl font-mono" },
                            React.createElement("span", { className: "font-bold tt-accent" },
                                rx.topWeight,
                                " lb"),
                            React.createElement("span", { className: "tt-text-secondary" },
                                " \u00D7 ",
                                rx.topReps))),
                    React.createElement("div", { className: "flex justify-between items-baseline py-0.5" },
                        React.createElement("span", { className: "text-sm tt-text-tertiary" }, "Back-off 1"),
                        React.createElement("span", { className: "text-xl font-mono" },
                            React.createElement("span", { className: "font-bold tt-accent" },
                                rx.topWeight,
                                " lb"),
                            React.createElement("span", { className: "tt-text-secondary" },
                                " \u00D7 ",
                                rx.backoffReps[0]))),
                    React.createElement("div", { className: "flex justify-between items-baseline py-0.5" },
                        React.createElement("span", { className: "text-sm tt-text-tertiary" }, "Back-off 2"),
                        React.createElement("span", { className: "text-xl font-mono" },
                            React.createElement("span", { className: "font-bold tt-accent" },
                                rx.topWeight,
                                " lb"),
                            React.createElement("span", { className: "tt-text-secondary" },
                                " \u00D7 ",
                                rx.backoffReps[1])))),
                React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                    React.createElement(LabeledInput, { big: true, label: "Top set wt", value: fields[l.key]?.topWeight, onChange: (v) => update(l.key, 'topWeight', v) }),
                    React.createElement(LabeledInput, { label: "Top set reps", value: fields[l.key]?.topReps, onChange: (v) => update(l.key, 'topReps', v) })),
                React.createElement("div", { className: "mb-2" },
                    React.createElement(RPESelector, { value: fields[l.key]?.topRPE, onChange: (v) => update(l.key, 'topRPE', v), target: "8.5\u20139" })),
                React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                    React.createElement(LabeledInput, { label: `Back-off 1 reps (of ${rx.backoffReps[0]})`, value: fields[l.key]?.backoff1Reps, onChange: (v) => update(l.key, 'backoff1Reps', v) }),
                    React.createElement(LabeledInput, { label: `Back-off 2 reps (of ${rx.backoffReps[1]})`, value: fields[l.key]?.backoff2Reps, onChange: (v) => update(l.key, 'backoff2Reps', v) }))));
        }),
        React.createElement(LabeledInput, { label: "Accessories (optional \u2014 pull-ups, TGU, planks, carries, etc.)", value: accessories, onChange: setAccessories, full: true }),
        React.createElement(NotesAndSubmit, { notes: notes, setNotes: setNotes, onSubmit: submit })));
}
/* ---- Session 2: Threshold — VDOT-relative threshold intervals ---- */
function Session2({ weekIdx, vdot, onComplete, label }) {
    const week = STAMINA_WEEKS[weekIdx];
    const rx = staminaPrescription(vdot, weekIdx);
    const easyPaces = paceFromVdot(vdot);
    const [intervalsCompleted, setIntervalsCompleted] = useState(week.reps);
    const [avgPace, setAvgPace] = useState('');
    const [distance, setDistance] = useState('');
    const [durMin, setDurMin] = useState('');
    const [durSec, setDurSec] = useState('');
    const [intervalRPE, setIntervalRPE] = useState('at');
    const [notes, setNotes] = useState('');
    useEffect(() => { setIntervalsCompleted(week.reps); setIntervalRPE('at'); }, [weekIdx]); // eslint-disable-line
    function submit(dateStr) {
        onComplete({
            weekIdx,
            weekName: week.name,
            vdotDelta: week.vdotDelta,
            targetPaceOut: rx.paceOut,
            targetRPE: week.targetRPE,
            intervalsCompleted: parseInt(intervalsCompleted, 10),
            intervalRPE,
            avgPace,
            distanceMiles: parseFloat(distance) || null,
            durationSeconds: (parseFloat(durMin) || 0) * 60 + (parseFloat(durSec) || 0),
        }, notes, dateStr);
        setNotes('');
        setAvgPace('');
        setDistance('');
        setDurMin('');
        setDurSec('');
    }
    return (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement(Activity, { size: 16, className: "tt-secondary" }),
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide" }, label || SESSION_LABEL[2])),
        React.createElement("p", { className: "text-base tt-text-secondary mb-3" },
            "Week ",
            weekIdx + 1,
            " \u00B7 ",
            week.name,
            " pace (VDOT ",
            vdot,
            week.vdotDelta > 0 ? `+${week.vdotDelta}` : week.vdotDelta,
            ") \u00B7 target RPE ",
            week.targetRPE,
            ", rest RPE 3",
            ' ',
            React.createElement(Tip, { text: "Threshold(-) = threshold pace at VDOT-1, Threshold(+) = at VDOT+1 \u2014 intensity rises and duration drops each week of the cycle, per the article." })),
        React.createElement("div", { className: "text-xl mb-2 font-mono" },
            React.createElement("span", { className: "tt-text-secondary" },
                "Warm-up: ",
                week.warmupMin,
                " min easy"),
            easyPaces && React.createElement("span", { className: "font-bold tt-accent" },
                " @ ",
                fmtPace(easyPaces.easy.out),
                "/mi (",
                fmtMph(easyPaces.easy.tm),
                " mph)")),
        React.createElement("div", { className: "tt-bg-deep border tt-border rounded-lg p-3 mb-3" },
            React.createElement("div", { className: "text-3xl font-mono" },
                React.createElement("span", { className: "font-bold tt-accent" },
                    rx.paceOut ? fmtPace(rx.paceOut) : '—',
                    " /mi",
                    rx.paceTm ? ` (${fmtMph(rx.paceTm)} mph)` : ''),
                rx.outOfRange && React.createElement("span", { className: "tt-warning text-xs ml-2" }, "(extrapolated beyond 30\u201365)")),
            React.createElement("div", { className: "text-base tt-text-tertiary mt-1" },
                week.workMin,
                " min work / ",
                week.restMin,
                " min rest \u00D7 ",
                week.reps)),
        React.createElement("div", { className: "mb-3" },
            React.createElement("label", { className: "block mb-2" },
                React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" },
                    "Intervals completed (of ",
                    week.reps,
                    ")"),
                React.createElement("select", { value: intervalsCompleted, onChange: (e) => setIntervalsCompleted(e.target.value), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono w-full focus:outline-none tt-focus-accent" }, Array.from({ length: week.reps + 1 }, (_, n) => n).map((n) => React.createElement("option", { key: n, value: n }, n)))),
            React.createElement(LabeledInput, { label: "Average interval pace (optional)", value: avgPace, onChange: setAvgPace, placeholder: "e.g. 8:05", full: true }),
            React.createElement("div", { className: "mt-2" },
                React.createElement(RPESelector, { value: intervalRPE, onChange: setIntervalRPE, target: String(week.targetRPE) }))),
        React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-2" },
            React.createElement(LabeledInput, { label: "Distance (mi)", value: distance, onChange: setDistance }),
            React.createElement(LabeledInput, { label: "Min", value: durMin, onChange: setDurMin }),
            React.createElement(LabeledInput, { label: "Sec", value: durSec, onChange: setDurSec })),
        React.createElement(NotesAndSubmit, { notes: notes, setNotes: setNotes, onSubmit: submit })));
}
/* ---- Session 3: Stamina — 1-2-3 ladder EMOM + repetition-pace surges ---- */
/* ---- EMOM timer: one set every minute, 9 sets, 1-2-3 rep pattern ---- */
function playTone(ctx, freq, duration) {
    if (!ctx)
        return;
    try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    }
    catch (e) { }
}
function playTransitionCue(ctx) {
    playTone(ctx, 880, 0.15);
    try {
        if (navigator.vibrate)
            navigator.vibrate(200);
    }
    catch (e) { }
}
// Distinct double-beep, lower pitch, so it's clearly different from the
// single transition beep at the top of each minute.
function playWarningCue(ctx) {
    playTone(ctx, 660, 0.1);
    setTimeout(() => playTone(ctx, 660, 0.1), 180);
    try {
        if (navigator.vibrate)
            navigator.vibrate([80, 60, 80]);
    }
    catch (e) { }
}
// Single short beep, used for the 3-2-1 countdown into prep and each set.
function playCountdownBeep(ctx) {
    playTone(ctx, 1000, 0.08);
    try {
        if (navigator.vibrate)
            navigator.vibrate(60);
    }
    catch (e) { }
}
function EMOMTimer() {
    const [lift, setLift] = useState('bench');
    const [running, setRunning] = useState(false);
    const [currentSet, setCurrentSet] = useState(0); // 0 = prep, 1-9 = sets
    const [secondsLeft, setSecondsLeft] = useState(15);
    const [finished, setFinished] = useState(false);
    const prevSetRef = useRef(0);
    const warnedSetRef = useRef(null);
    const countedRef = useRef('');
    // One AudioContext, created/resumed only from a direct tap (below) — most
    // mobile browsers silently block audio from a context created inside a
    // setInterval/useEffect callback, which is why nothing played before.
    const audioCtxRef = useRef(null);
    function unlockAudio() {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
            }
            catch (e) { }
        }
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume().catch(() => { });
        }
    }
    useEffect(() => {
        if (!running || finished)
            return;
        const id = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    setCurrentSet((set) => {
                        if (set >= 9) {
                            setFinished(true);
                            setRunning(false);
                            return set;
                        }
                        return set + 1;
                    });
                    return 60; // every phase after prep runs a full 60s
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [running, finished]);
    // Transition cue: fires once on every set change, including prep -> Set 1.
    useEffect(() => {
        if (currentSet !== prevSetRef.current) {
            prevSetRef.current = currentSet;
            playTransitionCue(audioCtxRef.current);
        }
    }, [currentSet]);
    // 10-second warning ahead of Sets 2-9 (Set 1 already gets its lead-in via
    // the prep countdown, so it's excluded here). Fires once per set via the
    // warnedSetRef guard, independent of pause/resume toggling.
    useEffect(() => {
        if (currentSet >= 1 && currentSet <= 8 && secondsLeft === 10 && warnedSetRef.current !== currentSet) {
            warnedSetRef.current = currentSet;
            playWarningCue(audioCtxRef.current);
        }
    }, [secondsLeft, currentSet]);
    // 3-2-1 single-beep countdown into Set 1 (end of prep) and into every
    // subsequent set (end of Sets 1-8). Set 9 has no next set, so it's excluded.
    useEffect(() => {
        if (currentSet <= 8 && secondsLeft <= 3 && secondsLeft >= 1) {
            const key = `${currentSet}-${secondsLeft}`;
            if (countedRef.current !== key) {
                countedRef.current = key;
                playCountdownBeep(audioCtxRef.current);
            }
        }
    }, [secondsLeft, currentSet]);
    function reset(nextLift) {
        if (nextLift)
            setLift(nextLift);
        setRunning(false);
        setFinished(false);
        setCurrentSet(0);
        setSecondsLeft(15);
        prevSetRef.current = 0;
        warnedSetRef.current = null;
        countedRef.current = '';
    }
    function toggleRunning() {
        if (!running)
            unlockAudio();
        setRunning((r) => !r);
    }
    const isPrep = currentSet === 0;
    const isWarning = !isPrep && currentSet <= 8 && secondsLeft <= 10;
    const repTarget = isPrep ? null : ((currentSet - 1) % 3) + 1;
    return (React.createElement("div", { className: "tt-bg-deep border tt-border rounded-lg p-3 mb-3" },
        React.createElement("div", { className: "flex items-center justify-between mb-2" },
            React.createElement("span", { className: "text-xs uppercase tracking-widest tt-text-secondary" }, "EMOM Timer"),
            React.createElement("div", { className: "flex gap-1" },
                React.createElement("button", { onClick: () => reset('bench'), className: `text-xs px-2 py-1 rounded border ${lift === 'bench' ? 'tt-border-accent tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Bench"),
                React.createElement("button", { onClick: () => reset('squat'), className: `text-xs px-2 py-1 rounded border ${lift === 'squat' ? 'tt-border-accent tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Squat"))),
        finished ? (React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("div", { className: "tt-success text-sm font-bold" },
                "All 9 sets complete \u2014 ",
                lift),
            React.createElement("button", { onClick: () => reset(), className: "text-sm border tt-border-light tt-text-tertiary px-3 py-1.5 rounded" }, "Reset"))) : (React.createElement("div", { className: "flex items-center justify-between" },
            React.createElement("div", null,
                React.createElement("div", { className: `text-3xl font-mono ${isPrep ? 'tt-accent' : isWarning ? 'tt-warning' : 'tt-text-primary'}` },
                    Math.floor(secondsLeft / 60),
                    ":",
                    (secondsLeft % 60).toString().padStart(2, '0')),
                React.createElement("div", { className: "text-sm tt-text-secondary" }, isPrep ? 'Prep — get in position' : `Set ${currentSet} of 9 · ${repTarget} rep${repTarget > 1 ? 's' : ''}`)),
            React.createElement("div", { className: "flex gap-2" },
                React.createElement("button", { onClick: toggleRunning, className: "text-sm tt-bg-accent-solid tt-text-onaccent font-bold px-3 py-1.5 rounded" }, running ? 'Pause' : 'Start'),
                React.createElement("button", { onClick: () => reset(), className: "text-sm border tt-border-light tt-text-tertiary px-3 py-1.5 rounded" }, "Reset"))))));
}
function Session3({ squatTM, benchTM, squatRepCapacity, benchRepCapacity, vdot, paces, onComplete, label }) {
    const pctForCapacity = (cap) => (cap === 'higher' ? 80 : 75);
    const lifts = [
        { key: 'bench', label: 'Bench', tm: benchTM, repCapacity: benchRepCapacity },
        { key: 'squat', label: 'Squat', tm: squatTM, repCapacity: squatRepCapacity },
    ];
    const buildDefaults = () => ({
        bench: { weight: tmWeight(benchTM, pctForCapacity(benchRepCapacity)), laddersCompleted: 3, rpe: 'at' },
        squat: { weight: tmWeight(squatTM, pctForCapacity(squatRepCapacity)), laddersCompleted: 3, rpe: 'at' },
    });
    const [fields, setFields] = useState(buildDefaults);
    const [surgesCompleted, setSurgesCompleted] = useState(8);
    const [runDistance, setRunDistance] = useState('');
    const [runDurMin, setRunDurMin] = useState('');
    const [notes, setNotes] = useState('');
    useEffect(() => { setFields(buildDefaults()); }, [squatRepCapacity, benchRepCapacity, squatTM, benchTM]); // eslint-disable-line
    function updateField(lift, field, value) {
        setFields((prev) => ({ ...prev, [lift]: { ...prev[lift], [field]: value } }));
    }
    function submit(dateStr) {
        onComplete({
            ladder: { targetRPE: 6, fields },
            surges: { target: 8, completed: surgesCompleted, repPaceOut: paces ? paces.rep.out : null },
            runDistanceMiles: parseFloat(runDistance) || null,
            runDurationMin: parseFloat(runDurMin) || null,
        }, notes, dateStr);
        setNotes('');
    }
    return (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement(Zap, { size: 16, className: "tt-accent" }),
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide" }, label || SESSION_LABEL[3])),
        React.createElement("p", { className: "text-base tt-text-secondary mb-3" },
            "Neural exposure, not fatigue accumulation",
            ' ',
            React.createElement(Tip, { text: "Stop the ladder early if bar speed or explosiveness noticeably drops \u2014 the stop condition is the article's autoregulation cue, not a fixed rep target." })),
        React.createElement("div", { className: "mb-3" },
            React.createElement("div", { className: "text-sm font-semibold tt-text-tertiary uppercase tracking-wide mb-2" }, "1-2-3 Ladder \u2014 EMOM, 3 ladders (9 sets / 9 min), RPE 6"),
            React.createElement(EMOMTimer, null),
            lifts.map((l) => {
                const pct = pctForCapacity(l.repCapacity);
                return (React.createElement("div", { key: l.key, className: "mb-2 border-t tt-border pt-2 first:border-0 first:pt-0" },
                    React.createElement("div", { className: "text-sm font-semibold tt-text-secondary mb-1" },
                        l.label,
                        " ",
                        React.createElement("span", { className: "tt-text-tertiary font-normal" },
                            "TM ",
                            l.tm,
                            " \u00B7 ",
                            l.repCapacity === 'higher' ? 'Higher' : 'Lower',
                            " capacity")),
                    React.createElement("div", { className: "mb-2" },
                        React.createElement("div", { className: "text-sm tt-text-tertiary uppercase tracking-wide mb-0.5" }, "Warm-up"),
                        SESSION3_WARMUP.map((w, i) => (React.createElement("div", { key: i, className: "flex justify-between items-baseline py-0.5" },
                            React.createElement("span", { className: "text-sm tt-text-tertiary" },
                                "Set ",
                                i + 1),
                            React.createElement("span", { className: "text-xl font-mono" },
                                React.createElement("span", { className: "font-bold tt-accent" }, tmWeight(l.tm, w.pct)),
                                React.createElement("span", { className: "tt-text-secondary" },
                                    " \u00D7 ",
                                    w.reps)))))),
                    React.createElement("div", { className: "mb-2" },
                        React.createElement("div", { className: "text-sm tt-text-tertiary uppercase tracking-wide mb-0.5" }, "Work"),
                        React.createElement("div", { className: "flex justify-between items-baseline py-0.5" },
                            React.createElement("span", { className: "text-sm tt-text-tertiary" },
                                "Ladder (",
                                pct,
                                "%)"),
                            React.createElement("span", { className: "text-xl font-mono" },
                                React.createElement("span", { className: "font-bold tt-accent" },
                                    tmWeight(l.tm, pct),
                                    " lb"),
                                React.createElement("span", { className: "tt-text-secondary" }, " \u00D7 1-2-3")))),
                    React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
                        React.createElement(LabeledInput, { big: true, label: "Weight used", value: fields[l.key].weight, onChange: (v) => updateField(l.key, 'weight', v) }),
                        React.createElement("label", { className: "block" },
                            React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" }, "Ladders completed (of 3)"),
                            React.createElement("select", { value: fields[l.key].laddersCompleted, onChange: (e) => updateField(l.key, 'laddersCompleted', e.target.value), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono w-full focus:outline-none tt-focus-accent" }, [0, 1, 2, 3].map((n) => React.createElement("option", { key: n, value: n }, n))))),
                    React.createElement(RPESelector, { value: fields[l.key].rpe, onChange: (v) => updateField(l.key, 'rpe', v), target: "6" })));
            })),
        React.createElement("div", { className: "mb-3 border-t tt-border pt-3" },
            React.createElement("div", { className: "text-sm font-semibold tt-text-tertiary uppercase tracking-wide mb-2" }, "Repetition-Pace Surges on an Easy Run"),
            React.createElement("p", { className: "text-base tt-text-secondary mb-2" },
                "30 sec @ ",
                React.createElement("span", { className: "font-mono font-bold text-xl tt-accent" },
                    paces ? fmtPace(paces.rep.out) : '—',
                    "/mi",
                    paces ? ` (${fmtMph(paces.rep.tm)} mph)` : ''),
                " every 5 min (4.5 min easy between), \u00D7 8, embedded in a continuous easy run."),
            React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-2" },
                React.createElement(LabeledInput, { label: "Run distance (mi)", value: runDistance, onChange: setRunDistance }),
                React.createElement(LabeledInput, { label: "Run duration (min)", value: runDurMin, onChange: setRunDurMin }),
                React.createElement("label", { className: "block" },
                    React.createElement("span", { className: "text-sm tt-text-secondary block mb-0.5" }, "Surges (of 8)"),
                    React.createElement("select", { value: surgesCompleted, onChange: (e) => setSurgesCompleted(e.target.value), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono w-full focus:outline-none tt-focus-accent" }, Array.from({ length: 9 }, (_, n) => n).map((n) => React.createElement("option", { key: n, value: n }, n)))))),
        React.createElement(NotesAndSubmit, { notes: notes, setNotes: setNotes, onSubmit: submit })));
}
/* ---- Session 4 / Extra: Easy Run — duration & consistency, not pace ---- */
function EasyRun({ paces, onComplete, label, contextNote }) {
    const [durMin, setDurMin] = useState('');
    const [distance, setDistance] = useState('');
    const [rpe, setRpe] = useState('at');
    const [notes, setNotes] = useState('');
    function submit(dateStr) {
        onComplete({
            easyPaceOut: paces ? paces.easy.out : null,
            durationMin: parseFloat(durMin) || null,
            distanceMiles: parseFloat(distance) || null,
            rpe,
        }, notes, dateStr);
        setDurMin('');
        setDistance('');
        setNotes('');
    }
    return (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
        React.createElement("div", { className: "flex items-center gap-2 mb-1" },
            React.createElement(Activity, { size: 16, className: "tt-secondary" }),
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide" }, label)),
        React.createElement("p", { className: "text-base tt-text-secondary mb-3" },
            contextNote,
            " ",
            React.createElement(Tip, { text: "Duration and consistency matter more than pace here \u2014 the article treats this as the most fatigue-resilient session, so success is showing up, not splits." })),
        React.createElement("div", { className: "tt-bg-deep border tt-border rounded-lg p-3 mb-3" },
            React.createElement("div", { className: "text-3xl font-mono" },
                React.createElement("span", { className: "font-bold tt-accent" },
                    paces ? fmtPace(paces.easy.out) : '—',
                    " /mi",
                    paces ? ` (${fmtMph(paces.easy.tm)} mph)` : ''),
                React.createElement("span", { className: "tt-text-tertiary text-xl" }, " easy")),
            React.createElement("div", { className: "text-base tt-text-tertiary mt-1" }, "RPE 3\u20134 \u00B7 40\u2013300 min (start 30\u201340, extend as fitness allows)")),
        React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-2" },
            React.createElement(LabeledInput, { label: "Duration (min)", value: durMin, onChange: setDurMin }),
            React.createElement(LabeledInput, { label: "Distance (mi, optional)", value: distance, onChange: setDistance })),
        React.createElement("div", { className: "mb-2" },
            React.createElement(RPESelector, { value: rpe, onChange: setRpe, target: "3\u20134" })),
        React.createElement(NotesAndSubmit, { notes: notes, setNotes: setNotes, onSubmit: submit })));
}
/* ---------------------------------------------------------------------
   LOG TAB
--------------------------------------------------------------------- */
function LogTab({ log, onDelete }) {
    if (log.length === 0) {
        return React.createElement("p", { className: "text-base tt-text-secondary" }, "No sessions logged yet. Complete one from the Today tab.");
    }
    return (React.createElement("div", { className: "space-y-2" }, log.map((entry) => (React.createElement("div", { key: entry.id, className: "tt-bg-panel border tt-border rounded-lg p-3 flex justify-between items-start" },
        React.createElement("div", null,
            React.createElement("div", { className: "text-sm font-bold uppercase tracking-wide tt-text-secondary" },
                SESSION_LABEL[entry.type],
                entry.backfilled && React.createElement("span", { className: "ml-2 text-[11px] font-semibold normal-case tracking-normal tt-accent border tt-border-accent-dim rounded px-1.5 py-0.5" }, "Backfilled")),
            React.createElement("div", { className: "text-sm tt-text-secondary mb-1" }, fmtDate(entry.date)),
            React.createElement("div", { className: "text-base tt-text-tertiary font-mono" }, summarize(entry)),
            entry.notes && React.createElement("div", { className: "text-base tt-text-secondary mt-1 italic" },
                "\"",
                entry.notes,
                "\"")),
        React.createElement("button", { onClick: () => onDelete(entry.id), className: "tt-text-tertiary tt-hover-warning p-1" },
            React.createElement(Trash2, { size: 14 })))))));
}
function summarize(entry) {
    const p = entry.payload;
    if (entry.type === 1) {
        const s = p.lifts?.squat, b = p.lifts?.bench;
        return `${p.weekName} — Bench ${b?.topWeight}×${b?.topReps} (${RPE_BAND_LABEL[b?.topRPE] || '—'}), Squat ${s?.topWeight}×${s?.topReps} (${RPE_BAND_LABEL[s?.topRPE] || '—'})`;
    }
    if (entry.type === 2) {
        const target = STAMINA_WEEKS[p.weekIdx]?.reps;
        return `${p.weekName} — ${p.intervalsCompleted}${target != null ? `/${target}` : ''} intervals${p.targetPaceOut ? ` @ ~${fmtPace(p.targetPaceOut)}/mi` : ''} (${RPE_BAND_LABEL[p.intervalRPE] || '—'})`;
    }
    if (entry.type === 3) {
        const sq = p.ladder?.fields?.squat, be = p.ladder?.fields?.bench;
        return `Ladders — Bench ${be?.weight} (${be?.laddersCompleted}/3, ${RPE_BAND_LABEL[be?.rpe] || '—'}), Squat ${sq?.weight} (${sq?.laddersCompleted}/3, ${RPE_BAND_LABEL[sq?.rpe] || '—'}) · Surges ${p.surges?.completed}/8`;
    }
    if (entry.type === 4 || entry.type === 'extra') {
        return `${p.durationMin ?? '?'} min${p.distanceMiles ? `, ${p.distanceMiles} mi` : ''} easy (${RPE_BAND_LABEL[p.rpe] || '—'})`;
    }
    return '';
}
/* ---------------------------------------------------------------------
   PROGRESS TAB — weekly session-completion chart + TM/VDOT history
--------------------------------------------------------------------- */
const SESSION_COLORS = {
    session1: '#f59e0b', // amber — Strength
    session2: '#38bdf8', // sky — Threshold
    session3: '#a78bfa', // violet — Stamina
    session4: '#10b981', // emerald — Endurance
    extra1: '#6ee7b7', // emerald, lighter — 5th (aerobic accumulation)
    extra2: '#065f46', // emerald, darker — 6th (aerobic accumulation)
};
function buildWeeklyData(log, weekStartDay) {
    const buckets = {};
    log.forEach((entry) => {
        const wk = weekAnchorOf(entry.date, weekStartDay);
        if (!buckets[wk])
            buckets[wk] = { week: wk, session1: 0, session2: 0, session3: 0, session4: 0, extraCount: 0 };
        if (entry.type === 1)
            buckets[wk].session1 += 1;
        else if (entry.type === 2)
            buckets[wk].session2 += 1;
        else if (entry.type === 3)
            buckets[wk].session3 += 1;
        else if (entry.type === 4)
            buckets[wk].session4 += 1;
        else if (entry.type === 'extra')
            buckets[wk].extraCount += 1;
    });
    const weeks = Object.values(buckets).sort((a, b) => a.week.localeCompare(b.week));
    return weeks.map((w) => ({
        week: w.week,
        label: fmtDate(w.week),
        session1: w.session1,
        session2: w.session2,
        session3: w.session3,
        session4: w.session4,
        extra1: Math.min(w.extraCount, 1),
        extra2: Math.max(w.extraCount - 1, 0),
    }));
}
function buildMaxHistoryData(maxHistory) {
    return [...maxHistory].reverse().map((h) => ({
        date: fmtDate(h.date),
        squatTM: parseFloat(h.squatTM) || null,
        benchTM: parseFloat(h.benchTM) || null,
        vdot: parseFloat(h.vdot) || null,
    }));
}
/* ---- Dependency-free SVG charts (no Recharts/CDN needed) ---- */
function StackedBarChart({ data, series, vbWidth, vbHeight }) {
    const padding = { top: 10, right: 8, bottom: 22, left: 8 };
    const chartW = vbWidth - padding.left - padding.right;
    const chartH = vbHeight - padding.top - padding.bottom;
    const n = Math.max(data.length, 1);
    const slot = chartW / n;
    const barW = Math.min(slot * 0.55, 28);
    const maxTotal = Math.max(1, ...data.map((row) => series.reduce((sum, s) => sum + (row[s.key] || 0), 0)));
    return (React.createElement("div", null,
        React.createElement("svg", { viewBox: `0 0 ${vbWidth} ${vbHeight}`, width: "100%", height: vbHeight, preserveAspectRatio: "xMidYMid meet" },
            React.createElement("line", { x1: padding.left, y1: padding.top + chartH, x2: vbWidth - padding.right, y2: padding.top + chartH, stroke: "#3a3f45", strokeWidth: "1" }),
            data.map((row, i) => {
                const cx = padding.left + slot * (i + 0.5);
                let yCursor = padding.top + chartH;
                return (React.createElement("g", { key: i },
                    series.map((s) => {
                        const val = row[s.key] || 0;
                        if (val <= 0)
                            return null;
                        const segH = (val / maxTotal) * chartH;
                        const y = yCursor - segH;
                        yCursor -= segH;
                        return React.createElement("rect", { key: s.key, x: cx - barW / 2, y: y, width: barW, height: Math.max(segH, 0), fill: s.color });
                    }),
                    React.createElement("text", { x: cx, y: padding.top + chartH + 13, fontSize: "7.5", fill: "#8a8f96", textAnchor: "middle" }, row.label)));
            })),
        React.createElement("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2" }, series.map((s) => (React.createElement("div", { key: s.key, className: "flex items-center gap-1 text-xs tt-text-tertiary" },
            React.createElement("span", { className: "inline-block w-2.5 h-2.5 rounded-sm", style: { background: s.color } }),
            s.label))))));
}
function DualLineChart({ data, series, vbWidth, vbHeight }) {
    const padding = { top: 10, right: 10, bottom: 22, left: 10 };
    const chartW = vbWidth - padding.left - padding.right;
    const chartH = vbHeight - padding.top - padding.bottom;
    const n = data.length;
    const leftKeys = series.filter((s) => s.axis === 'left').map((s) => s.key);
    const leftVals = data.flatMap((row) => leftKeys.map((k) => row[k]).filter((v) => v != null));
    const leftMin = leftVals.length ? Math.min(...leftVals) * 0.95 : 0;
    const leftMax = leftVals.length ? Math.max(...leftVals) * 1.05 : 1;
    const rightMin = 30, rightMax = 65; // VDOT table range, kept fixed for consistency with the rest of the app
    function xAt(i) { return n > 1 ? padding.left + (chartW * i) / (n - 1) : padding.left + chartW / 2; }
    function yAtLeft(v) { return padding.top + chartH - ((v - leftMin) / (leftMax - leftMin || 1)) * chartH; }
    function yAtRight(v) { return padding.top + chartH - ((v - rightMin) / (rightMax - rightMin || 1)) * chartH; }
    function stepPath(key, axis) {
        const yFn = axis === 'left' ? yAtLeft : yAtRight;
        let d = '';
        let started = false;
        data.forEach((row, i) => {
            const v = row[key];
            if (v == null)
                return;
            const x = xAt(i);
            const y = yFn(v);
            d += started ? ` H ${x} V ${y}` : `M ${x} ${y}`;
            started = true;
        });
        return d;
    }
    return (React.createElement("div", null,
        React.createElement("svg", { viewBox: `0 0 ${vbWidth} ${vbHeight}`, width: "100%", height: vbHeight, preserveAspectRatio: "xMidYMid meet" },
            React.createElement("line", { x1: padding.left, y1: padding.top + chartH, x2: vbWidth - padding.right, y2: padding.top + chartH, stroke: "#3a3f45", strokeWidth: "1" }),
            series.map((s) => React.createElement("path", { key: s.key, d: stepPath(s.key, s.axis), fill: "none", stroke: s.color, strokeWidth: "2" })),
            series.map((s) => data.map((row, i) => {
                const v = row[s.key];
                if (v == null)
                    return null;
                const y = (s.axis === 'left' ? yAtLeft : yAtRight)(v);
                return React.createElement("circle", { key: `${s.key}-${i}`, cx: xAt(i), cy: y, r: "2.5", fill: s.color });
            })),
            n > 0 && React.createElement("text", { x: xAt(0), y: vbHeight - 6, fontSize: "7.5", fill: "#8a8f96", textAnchor: "start" }, data[0].date),
            n > 1 && React.createElement("text", { x: xAt(n - 1), y: vbHeight - 6, fontSize: "7.5", fill: "#8a8f96", textAnchor: "end" }, data[n - 1].date)),
        React.createElement("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-2" }, series.map((s) => (React.createElement("div", { key: s.key, className: "flex items-center gap-1 text-xs tt-text-tertiary" },
            React.createElement("span", { className: "inline-block w-2.5 h-2.5 rounded-sm", style: { background: s.color } }),
            s.label))))));
}
function ProgressTab({ log, maxHistory, weekStartDay }) {
    const weeklyData = buildWeeklyData(log, weekStartDay ?? 1).slice(-12);
    const historyData = buildMaxHistoryData(maxHistory);
    return (React.createElement("div", { className: "space-y-4" },
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-1" }, "Sessions per Week"),
            React.createElement("p", { className: "text-base tt-text-secondary mb-3" },
                "Stacked by session \u2014 Sessions 5/6 (lighter/darker green) are optional aerobic accumulation beyond the core 4. Last ",
                weeklyData.length,
                " week",
                weeklyData.length === 1 ? '' : 's',
                " with data shown."),
            weeklyData.length === 0 ? (React.createElement("p", { className: "text-base tt-text-secondary" }, "No sessions logged yet.")) : (React.createElement(StackedBarChart, { data: weeklyData, vbWidth: 320, vbHeight: 220, series: [
                    { key: 'session1', color: SESSION_COLORS.session1, label: '1 Strength' },
                    { key: 'session2', color: SESSION_COLORS.session2, label: '2 Threshold' },
                    { key: 'session3', color: SESSION_COLORS.session3, label: '3 Stamina' },
                    { key: 'session4', color: SESSION_COLORS.session4, label: '4 Endurance' },
                    { key: 'extra1', color: SESSION_COLORS.extra1, label: '5 Extra' },
                    { key: 'extra2', color: SESSION_COLORS.extra2, label: '6 Extra' },
                ] }))),
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-1" }, "Training Max & VDOT History"),
            React.createElement("p", { className: "text-base tt-text-secondary mb-3" }, "TM on the left axis, VDOT on the right \u2014 updates whenever auto-progression or a manual Setup edit changes a value."),
            historyData.length === 0 ? (React.createElement("p", { className: "text-base tt-text-secondary" }, "No changes recorded yet \u2014 set your maxes in Setup to start tracking.")) : (React.createElement(React.Fragment, null,
                React.createElement(DualLineChart, { data: historyData, vbWidth: 320, vbHeight: 200, series: [
                        { key: 'benchTM', color: SESSION_COLORS.session2, label: 'Bench TM', axis: 'left' },
                        { key: 'squatTM', color: SESSION_COLORS.session1, label: 'Squat TM', axis: 'left' },
                        { key: 'vdot', color: SESSION_COLORS.session4, label: 'VDOT', axis: 'right' },
                    ] }),
                React.createElement("div", { className: "mt-3 space-y-1.5 max-h-56 overflow-y-auto" }, [...maxHistory].map((h, i) => (React.createElement("div", { key: i, className: "flex justify-between text-sm font-mono border-b tt-border pb-1" },
                    React.createElement("span", { className: "tt-text-secondary" }, fmtDate(h.date)),
                    React.createElement("span", { className: "tt-text-secondary" },
                        "Bn ",
                        h.benchTM,
                        " \u00B7 Sq ",
                        h.squatTM,
                        " \u00B7 V ",
                        h.vdot),
                    React.createElement("span", { className: "tt-text-tertiary truncate max-w-[35%] text-right" }, h.note))))))))));
}
/* ---------------------------------------------------------------------
   SETUP TAB
--------------------------------------------------------------------- */
function SetupTab({ profile, onSave, progress, onUpdateProgress, resetArmed, setResetArmed, onReset, onRerunSetup }) {
    const [local, setLocal] = useState(profile);
    useEffect(() => setLocal(profile), [profile]);
    const refPercents = [90, 82.5, 80, 75, 70, 60, 50];
    const weekName = STRENGTH_WEEKS[progress.cycleWeek]?.name;
    return (React.createElement("div", { className: "space-y-4" },
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4 flex items-center justify-between" },
            React.createElement("div", null,
                React.createElement("div", { className: "font-bold text-base uppercase tracking-wide" }, "Setup"),
                React.createElement("p", { className: "text-sm tt-text-secondary mt-0.5" }, "Revisit the initial landing screen to set everything at once.")),
            React.createElement("button", { onClick: onRerunSetup, className: "text-sm border tt-border-light tt-text-secondary rounded px-3 py-1.5 whitespace-nowrap" }, "Run setup again")),
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-3" }, "Training Maxes"),
            React.createElement("div", { className: "grid grid-cols-2 gap-3 mb-3" },
                React.createElement(LabeledInput, { label: "Bench TM (lb)", value: local.benchTM, onChange: (v) => setLocal({ ...local, benchTM: v }) }),
                React.createElement(LabeledInput, { label: "Squat TM (lb)", value: local.squatTM, onChange: (v) => setLocal({ ...local, squatTM: v }) })),
            React.createElement(LabeledInput, { label: "VDOT", value: local.vdot, onChange: (v) => setLocal({ ...local, vdot: v }), full: true }),
            React.createElement("div", { className: "mt-3" },
                React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" },
                    "Bench rep capacity ",
                    React.createElement(Tip, { text: "Determines Session 1's top-set % in Weeks 1\u20132 (Week 3 is 90% either way) and Session 3's ladder % (75% Lower, 80% Higher). If you tend to get more reps at a given %1RM, use Higher." })),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => setLocal({ ...local, benchRepCapacity: 'lower' }), className: `text-sm px-3 py-1.5 rounded border ${(local.benchRepCapacity || 'lower') === 'lower' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Lower (70/80/90)"),
                    React.createElement("button", { onClick: () => setLocal({ ...local, benchRepCapacity: 'higher' }), className: `text-sm px-3 py-1.5 rounded border ${local.benchRepCapacity === 'higher' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Higher (75/82.5/90)"))),
            React.createElement("div", { className: "mt-3" },
                React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" },
                    "Squat rep capacity ",
                    React.createElement(Tip, { text: "Set independently from Bench \u2014 your squat and bench don't have to use the same capacity profile." })),
                React.createElement("div", { className: "flex gap-2" },
                    React.createElement("button", { onClick: () => setLocal({ ...local, squatRepCapacity: 'lower' }), className: `text-sm px-3 py-1.5 rounded border ${(local.squatRepCapacity || 'lower') === 'lower' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Lower (70/80/90)"),
                    React.createElement("button", { onClick: () => setLocal({ ...local, squatRepCapacity: 'higher' }), className: `text-sm px-3 py-1.5 rounded border ${local.squatRepCapacity === 'higher' ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, "Higher (75/82.5/90)"))),
            React.createElement("div", { className: "mt-3" },
                React.createElement("label", { className: "block" },
                    React.createElement("span", { className: "text-sm tt-text-secondary block mb-1" },
                        "Day 1 ",
                        React.createElement(Tip, { text: "Which day of the week the rotation resets to Session 1 and the 3-week cycle advances. Defaults to Monday \u2014 change it if your schedule lines up better starting on a different day." })),
                    React.createElement("select", { value: local.weekStartDay ?? 1, onChange: (e) => setLocal({ ...local, weekStartDay: parseInt(e.target.value, 10) }), className: "tt-bg-inset border tt-border-light rounded px-2 py-1.5 text-sm font-mono focus:outline-none tt-focus-accent" }, DAY_NAMES.map((name, idx) => (React.createElement("option", { key: idx, value: idx }, name)))))),
            React.createElement("button", { onClick: () => onSave(local), className: "mt-3 tt-bg-accent-solid tt-text-onaccent font-bold text-sm uppercase tracking-widest px-4 py-2 rounded" }, "Save")),
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-3" }, "Theme"),
            React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" }, Object.entries(THEMES).map(([key, t]) => {
                const isActive = (local.theme || 'nightvision') === key;
                return (React.createElement("button", { key: key, onClick: () => setLocal({ ...local, theme: key }), className: "text-center rounded-lg py-3 font-bold text-sm uppercase tracking-wide", style: {
                        background: t.bgInset,
                        color: t.accent,
                        border: `2px solid ${isActive ? t.accent : t.border}`,
                    } }, t.name));
            })),
            React.createElement("button", { onClick: () => onSave(local), className: "tt-bg-accent-solid tt-text-onaccent font-bold text-sm uppercase tracking-widest px-4 py-2 rounded" }, "Save")),
        (local.squatTM || local.benchTM) && (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-2" },
                "Quick % Reference ",
                React.createElement(Tip, { text: "TM \u00D7 % rounded to nearest 5 lb, computed live from your current TMs." })),
            React.createElement("table", { className: "w-full text-sm font-mono" },
                React.createElement("thead", null,
                    React.createElement("tr", { className: "tt-text-secondary text-xs uppercase" },
                        React.createElement("th", { className: "text-left" }, "Lift"),
                        refPercents.map((p) => React.createElement("th", { key: p },
                            p,
                            "%")))),
                React.createElement("tbody", null, ['benchTM', 'squatTM'].map((key) => (parseFloat(local[key]) > 0 && (React.createElement("tr", { key: key },
                    React.createElement("td", { className: "text-left tt-text-tertiary" }, key === 'squatTM' ? 'Squat' : 'Bench'),
                    refPercents.map((p) => React.createElement("td", { key: p, className: "text-center tt-text-secondary" }, tmWeight(parseFloat(local[key]), p))))))))))),
        parseFloat(local.vdot) > 0 && (React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-2" },
                "Quick VDOT Reference ",
                React.createElement(Tip, { text: "Outdoor pace linearly interpolated between tabulated VDOT values (30\u201365); treadmill @1% = outdoor pace \u00D7 1.045. Threshold(-)/(+) use VDOT\u22131, matching Session 2's weekly shift." })),
            React.createElement("table", { className: "w-full text-sm font-mono" },
                React.createElement("thead", null,
                    React.createElement("tr", { className: "tt-text-secondary text-xs uppercase" },
                        React.createElement("th", { className: "text-left" }, "Zone"),
                        React.createElement("th", null, "Outdoor /mi"),
                        React.createElement("th", null, "Treadmill @1% (mph)"))),
                React.createElement("tbody", null, [
                    { label: 'Easy', v: parseFloat(local.vdot), key: 'easy' },
                    { label: 'Threshold(-)', v: parseFloat(local.vdot) - 1, key: 'thr' },
                    { label: 'Threshold', v: parseFloat(local.vdot), key: 'thr' },
                    { label: 'Threshold(+)', v: parseFloat(local.vdot) + 1, key: 'thr' },
                    { label: 'Repetition', v: parseFloat(local.vdot), key: 'rep' },
                ].map((row) => {
                    const p = paceFromVdot(row.v);
                    return (React.createElement("tr", { key: row.label },
                        React.createElement("td", { className: "text-left tt-text-tertiary" }, row.label),
                        React.createElement("td", { className: "text-center tt-text-secondary" }, p ? fmtPace(p[row.key].out) : '—'),
                        React.createElement("td", { className: "text-center tt-text-secondary" }, p ? fmtMph(p[row.key].tm) : '—')));
                }))))),
        React.createElement("div", { className: "tt-bg-panel border tt-border rounded-lg p-4" },
            React.createElement("h2", { className: "font-bold text-base uppercase tracking-wide mb-2" },
                "Cycle & Progression ",
                React.createElement(Tip, { text: "Strength (Session 1) and Threshold (Session 2) advance independently, each on its own Week 3 RPE: at target = +1 row, below target twice in a row = +2 rows, above target twice in a row = hold." })),
            React.createElement("p", { className: "text-base tt-text-tertiary mb-2" },
                "Cycle ",
                progress.cycleCount,
                " \u00B7 Week ",
                progress.cycleWeek + 1,
                " of 3 \u2014 ",
                weekName),
            React.createElement("div", { className: "tt-bg-deep border tt-border rounded-lg p-3 mb-3" },
                React.createElement("div", { className: "text-sm tt-text-secondary mb-2" },
                    "Manual override ",
                    React.createElement(Tip, { text: `Use this if the automatic ${DAY_NAMES[profile.weekStartDay ?? 1]} rollover ever falls out of sync with reality — e.g. the app skipped ahead or fell behind while you weren't logging in. This changes the app's current position; it doesn't touch history.` })),
                React.createElement("div", { className: "mb-2" },
                    React.createElement("span", { className: "text-sm tt-text-tertiary block mb-1" }, "Cycle week"),
                    React.createElement("div", { className: "flex gap-1.5" }, [0, 1, 2].map((w) => (React.createElement("button", { key: w, onClick: () => onUpdateProgress({ cycleWeek: w }), className: `text-sm px-2.5 py-1.5 rounded border ${progress.cycleWeek === w ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` },
                        "Week ",
                        w + 1))))),
                React.createElement("div", { className: "mb-2" },
                    React.createElement("span", { className: "text-sm tt-text-tertiary block mb-1" }, "Next session in this week's rotation"),
                    React.createElement("div", { className: "flex gap-1.5" }, [0, 1, 2, 3, 4].map((n) => (React.createElement("button", { key: n, onClick: () => onUpdateProgress({ sessionsThisWeek: n }), className: `text-sm px-2.5 py-1.5 rounded border ${progress.sessionsThisWeek === n ? 'tt-border-accent tt-bg-accent-tint tt-text-accent-tint' : 'tt-border-light tt-text-secondary'}` }, n < 4 ? `Session ${n + 1}` : 'Done'))))),
                React.createElement("div", { className: "flex items-center gap-2" },
                    React.createElement("span", { className: "text-sm tt-text-tertiary" }, "Cycle number"),
                    React.createElement("button", { onClick: () => onUpdateProgress({ cycleCount: Math.max(1, progress.cycleCount - 1) }), className: "text-sm border tt-border-light tt-text-tertiary w-6 h-6 rounded" }, "\u2212"),
                    React.createElement("span", { className: "text-sm font-mono tt-text-secondary" }, progress.cycleCount),
                    React.createElement("button", { onClick: () => onUpdateProgress({ cycleCount: progress.cycleCount + 1 }), className: "text-sm border tt-border-light tt-text-tertiary w-6 h-6 rounded" }, "+"))),
            React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "text-xs uppercase tracking-widest tt-text-secondary mb-1" }, "Strength \u2192 Training Max"),
                progress.lastWeek3RPEStrength && (React.createElement("p", { className: "text-base tt-text-tertiary mb-1" },
                    "Last Week 3 top-set RPE \u2014 Bench ",
                    progress.lastWeek3RPEStrength.bench ? RPE_BAND_LABEL[progress.lastWeek3RPEStrength.bench] : '—',
                    ", Squat ",
                    progress.lastWeek3RPEStrength.squat ? RPE_BAND_LABEL[progress.lastWeek3RPEStrength.squat] : '—',
                    " (target 8.5\u20139)")),
                progress.strengthProgressionNote && (React.createElement("div", { className: `text-base rounded-lg p-3 border ${progress.holdStrength ? 'tt-bg-warning-tint tt-border-warning tt-warning' : 'tt-bg-success-tint tt-border-success tt-success'}` }, progress.strengthProgressionNote))),
            React.createElement("div", { className: "mb-3" },
                React.createElement("div", { className: "text-xs uppercase tracking-widest tt-text-secondary mb-1" }, "Threshold \u2192 VDOT"),
                progress.lastWeek3RPEStamina && (React.createElement("p", { className: "text-base tt-text-tertiary mb-1" },
                    "Last Week 3 interval RPE \u2014 ",
                    RPE_BAND_LABEL[progress.lastWeek3RPEStamina] || '—',
                    " (target 8)")),
                progress.staminaProgressionNote && (React.createElement("div", { className: `text-base rounded-lg p-3 border ${progress.holdStamina ? 'tt-bg-warning-tint tt-border-warning tt-warning' : 'tt-bg-success-tint tt-border-success tt-success'}` }, progress.staminaProgressionNote))),
            React.createElement("p", { className: "text-sm tt-text-tertiary mb-3" },
                "The cycle advances one week every ",
                DAY_NAMES[profile.weekStartDay ?? 1],
                " regardless of adherence; only the weekly 1\u20134 session rotation resets to Session 1. Changes from these rules apply automatically \u2014 adjust the fields above directly if you ever want to override."),
            !resetArmed ? (React.createElement("button", { onClick: () => setResetArmed(true), className: "text-sm tt-warning border tt-border-warning rounded px-3 py-1.5" }, "Reset this week's rotation to Session 1")) : (React.createElement("div", { className: "flex gap-2" },
                React.createElement("button", { onClick: onReset, className: "text-sm tt-bg-warning-solid text-white rounded px-3 py-1.5 font-bold" }, "Confirm reset"),
                React.createElement("button", { onClick: () => setResetArmed(false), className: "text-base tt-text-tertiary border tt-border-light rounded px-3 py-1.5" }, "Cancel"))))));
}
/* ---------------------------------------------------------------------
   MOUNT
--------------------------------------------------------------------- */
const rootEl = document.getElementById('root');
if (ReactDOM.createRoot) {
    ReactDOM.createRoot(rootEl).render(React.createElement(TrainingTracker, null));
}
else {
    ReactDOM.render(React.createElement(TrainingTracker, null), rootEl);
}
