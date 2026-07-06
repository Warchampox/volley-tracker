/* ================================ Volley Tracker ================================
   App de registro de entrenamientos de vóleibol.
   HTML/CSS/JS plano · localStorage · Chart.js por CDN.
================================================================================ */
"use strict";

/* ---------------------------------- Datos base --------------------------------- */

const TYPES = {
  weight:     { label: "Peso × reps" },
  bodyweight: { label: "Peso corporal" },
  time:       { label: "Tiempo (s)" },
};

const GROUPS = ["Piernas", "Pliometría", "Empuje", "Tracción", "Hombro", "Core", "Custom"];

const GROUP_COLORS = {
  Piernas: "var(--amber)",
  "Pliometría": "var(--green)",
  Empuje: "var(--blue)",
  "Tracción": "var(--blue)",
  Hombro: "var(--red)",
  Core: "var(--text-dim)",
  Custom: "var(--text-dim)",
};

const DEFAULT_EXERCISES = [
  { id: "ex_sentadilla_trasera", name: "Sentadilla trasera", group: "Piernas", type: "weight" },
  { id: "ex_sentadilla_frontal", name: "Sentadilla frontal", group: "Piernas", type: "weight" },
  { id: "ex_peso_muerto_rumano", name: "Peso muerto rumano", group: "Piernas", type: "weight" },
  { id: "ex_zancada_bulgara", name: "Zancada búlgara", group: "Piernas", type: "weight" },
  { id: "ex_hip_thrust", name: "Hip thrust", group: "Piernas", type: "weight" },
  { id: "ex_prensa", name: "Prensa", group: "Piernas", type: "weight" },
  { id: "ex_salto_cajon", name: "Salto al cajón", group: "Pliometría", type: "bodyweight" },
  { id: "ex_salto_contramov", name: "Salto con contramovimiento", group: "Pliometría", type: "bodyweight" },
  { id: "ex_salto_una_pierna", name: "Salto a una pierna", group: "Pliometría", type: "bodyweight" },
  { id: "ex_press_banca", name: "Press banca", group: "Empuje", type: "weight" },
  { id: "ex_press_militar", name: "Press militar", group: "Empuje", type: "weight" },
  { id: "ex_fondos", name: "Fondos", group: "Empuje", type: "bodyweight" },
  { id: "ex_dominadas", name: "Dominadas", group: "Tracción", type: "bodyweight" },
  { id: "ex_remo_barra", name: "Remo con barra", group: "Tracción", type: "weight" },
  { id: "ex_jalon_pecho", name: "Jalón al pecho", group: "Tracción", type: "weight" },
  { id: "ex_face_pull", name: "Face pull", group: "Hombro", type: "weight" },
  { id: "ex_manguito_rotador", name: "Manguito rotador externo", group: "Hombro", type: "weight" },
  { id: "ex_plancha", name: "Plancha", group: "Core", type: "time" },
  { id: "ex_rueda_abdominal", name: "Rueda abdominal", group: "Core", type: "bodyweight" },
  { id: "ex_pallof_press", name: "Pallof press", group: "Core", type: "weight" },
];

/* ---------------------------------- Utilidades --------------------------------- */

const uid = (p = "id") => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateShort = (iso) =>
  new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

/* ----------------------------------- Storage ----------------------------------- */

const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

let routines = load("routines", []);
let sessions = load("sessions", []);
let exercises = load("custom-exercises", null);
if (!Array.isArray(exercises) || exercises.length === 0) {
  exercises = DEFAULT_EXERCISES.map((e) => ({ ...e }));
  save("custom-exercises", exercises);
}
let settings = Object.assign({ restSeconds: 90, sound: true, vibrate: true }, load("settings", {}));

const persistRoutines = () => save("routines", routines);
const persistSessions = () => save("sessions", sessions);
const persistExercises = () => save("custom-exercises", exercises);
const persistSettings = () => save("settings", settings);

/* ---------------------------------- Estado UI ---------------------------------- */

const ui = {
  tab: "rutinas",
  editingRoutine: null,   // copia de la rutina en edición, o null
  activeSession: null,    // sesión en curso, o null
  picker: null,           // null | "editor" | "session"
  pickerQuery: "",
  openHistory: null,
  progressEx: null,
  progressMetric: null,
  manageExercises: false,
  exerciseModal: null,    // null | {id|null, name, group, type}
  openNotes: new Set(),   // "exIdx:setIdx" con línea RPE/nota abierta
};

const exMap = () => Object.fromEntries(exercises.map((e) => [e.id, e]));
const exType = (id) => exMap()[id]?.type || "weight";
const exName = (id) => exMap()[id]?.name || "(ejercicio eliminado)";
const exGroup = (id) => exMap()[id]?.group || "Custom";

/* ------------------------------------ Íconos ------------------------------------ */

const PATHS = {
  barbell: '<path d="M6.5 5.5v13"/><path d="M17.5 5.5v13"/><path d="M3 8.5v7"/><path d="M21 8.5v7"/><path d="M6.5 12h11"/>',
  play: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  chevDown: '<polyline points="6 9 12 15 18 9"/>',
  chevUp: '<polyline points="18 15 12 9 6 15"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  note: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
};

const icon = (name, s = 18) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;

/* --------------------------- Volumen, PRs y "última vez" -------------------------- */

// Volumen = solo peso externo: peso×reps (normal), lastre×reps (corporal), 0 (tiempo).
const setVol = (type, s) => (type === "time" ? 0 : (num(s.weight)) * (num(s.reps)));

const sessionVolume = (session, onlyDone) =>
  session.exercises.reduce((acc, e) => {
    const t = exType(e.exerciseId);
    return acc + e.sets.reduce((a, st) => {
      if (onlyDone && !st.done) return a;
      return a + setVol(t, st);
    }, 0);
  }, 0);

// Máximos históricos (solo sesiones guardadas) para detectar PRs.
function priorStats(exId) {
  let maxW = 0, maxR = 0, maxS = 0, anyLastre = false;
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.exerciseId === exId)
        for (const st of e.sets) {
          if (st.warmup) continue; // los máximos históricos solo consideran series efectivas
          maxW = Math.max(maxW, num(st.weight));
          maxR = Math.max(maxR, num(st.reps));
          maxS = Math.max(maxS, num(st.seconds));
          if (num(st.weight) > 0) anyLastre = true;
        }
  return { maxW, maxR, maxS, anyLastre };
}

// PR según tipo: peso máx / lastre máx (o reps máx si nunca hubo lastre) / tiempo máx.
function isPR(type, st, prior) {
  if (!st.done || st.warmup) return false;
  if (type === "time") return num(st.seconds) > 0 && num(st.seconds) > prior.maxS;
  if (type === "bodyweight") {
    if (num(st.weight) > 0) return num(st.weight) > prior.maxW;
    return !prior.anyLastre && num(st.reps) > 0 && num(st.reps) > prior.maxR;
  }
  return num(st.weight) > 0 && num(st.weight) > prior.maxW;
}

function lastSetsFor(exId) {
  for (const s of sessions) {
    const found = s.exercises.find((e) => e.exerciseId === exId && e.sets.length > 0);
    if (found) return found.sets;
  }
  return null;
}

function fmtSet(type, s) {
  const w = s.warmup ? "c" : "";
  const rpe = s.rpe ? ` @${s.rpe}` : "";
  if (type === "time") return `${w}${num(s.seconds)}s${rpe}`;
  if (type === "bodyweight")
    return num(s.weight) > 0 ? `${w}+${num(s.weight)}kg×${num(s.reps)}${rpe}` : `${w}${num(s.reps)}${rpe}`;
  return `${w}${num(s.weight)}×${num(s.reps)}${rpe}`;
}

/* -------------------------- Cronómetro de descanso ------------------------------- */

let rest = null; // { ends, total, timer }
let audioCtx = null;

function startRest(seconds) {
  stopRest();
  // Prioridad: descanso del ejercicio (si es > 0), si no el global de Ajustes.
  const own = Math.round(num(seconds));
  const secs = own > 0 ? own : Math.round(num(settings.restSeconds));
  if (secs <= 0) return;
  rest = { ends: Date.now() + secs * 1000, total: secs, timer: setInterval(tickRest, 250) };
  updateRestBar();
}

function stopRest() {
  if (rest) { clearInterval(rest.timer); rest = null; }
  updateRestBar();
}

function tickRest() {
  if (!rest) return;
  if (Date.now() >= rest.ends) {
    clearInterval(rest.timer);
    rest = null;
    beep();
    if (settings.vibrate && navigator.vibrate) navigator.vibrate([250, 100, 250]);
    updateRestBar();
    return;
  }
  updateRestBar();
}

function updateRestBar() {
  const el = document.getElementById("restbar");
  if (!el) return;
  if (!rest) { el.className = "is-hidden"; el.innerHTML = ""; return; }
  const leftMs = Math.max(0, rest.ends - Date.now());
  const left = Math.ceil(leftMs / 1000);
  const pct = Math.max(0, Math.min(100, (leftMs / (rest.total * 1000)) * 100));
  el.className = "";
  el.innerHTML = `
    <div>
      <div class="vt-rest-label">Descanso</div>
      <div class="vt-rest-time">${left}s</div>
    </div>
    <div class="vt-rest-track"><div class="vt-rest-fill" style="width:${pct}%"></div></div>
    <button class="vt-btn-ghost" data-a="rest-cancel" aria-label="Cancelar descanso">${icon("x", 18)}</button>`;
}

function beep() {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const t = audioCtx.currentTime;
    [0, 0.28, 0.56].forEach((off) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, t + off);
      g.gain.exponentialRampToValueAtTime(0.35, t + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.22);
      o.start(t + off); o.stop(t + off + 0.25);
    });
  } catch (e) { /* sin audio disponible */ }
}

/* --------------------------------- Render raíz ---------------------------------- */

const $app = document.getElementById("app");
let chart = null;

const NAV_ITEMS = [
  { id: "rutinas", label: "Rutinas", ic: "barbell" },
  { id: "entrenar", label: "Entrenar", ic: "play" },
  { id: "historial", label: "Historial", ic: "history" },
  { id: "progreso", label: "Progreso", ic: "trend" },
  { id: "ajustes", label: "Ajustes", ic: "sliders" },
];

function render() {
  let view = "";
  if (ui.tab === "rutinas") view = ui.editingRoutine ? editorHTML() : routinesHTML();
  else if (ui.tab === "entrenar") view = ui.activeSession ? trainActiveHTML() : trainIdleHTML();
  else if (ui.tab === "historial") view = historyHTML();
  else if (ui.tab === "progreso") view = progressHTML();
  else if (ui.tab === "ajustes") view = ui.manageExercises ? exercisesManagerHTML() : settingsHTML();

  $app.innerHTML = `
    <div class="vt-frame">
      <div class="vt-content">${view}</div>
      <div id="restbar" class="is-hidden"></div>
      <nav class="vt-nav">
        ${NAV_ITEMS.map((n) => `
          <button class="vt-nav-item ${ui.tab === n.id ? "is-active" : ""}" data-a="tab" data-tab="${n.id}">
            ${icon(n.ic, 20)}<span>${n.label}</span>
            ${n.id === "entrenar" && ui.activeSession ? '<span class="vt-dot"></span>' : ""}
          </button>`).join("")}
      </nav>
    </div>
    ${ui.picker ? pickerHTML() : ""}
    ${ui.exerciseModal ? exerciseModalHTML() : ""}`;

  updateRestBar();
  if (ui.tab === "progreso") mountChart();
}

/* --------------------------------- Vista Rutinas -------------------------------- */

function routinesHTML() {
  const map = exMap();
  const lastUsed = (rid) => { const s = sessions.find((s) => s.routineId === rid); return s ? s.date : null; };

  const list = routines.length === 0
    ? emptyHTML("Aún no armas ninguna rutina",
        "Crea tu primera rutina de entrenamiento — sin límite de cuántas puedes guardar, aunque las cambies cada mes.",
        `<button class="vt-btn-primary" data-a="routine-new">Crear rutina</button>`)
    : `<div class="vt-list">${routines.map((r) => {
        const last = lastUsed(r.id);
        return `<div class="vt-card">
          <div class="vt-card-top"><div>
            <h3>${esc(r.name) || "Sin nombre"}</h3>
            <p class="vt-muted">${r.exercises.length} ejercicio${r.exercises.length !== 1 ? "s" : ""}${last ? ` · última vez ${fmtDateShort(last)}` : " · sin usar"}</p>
          </div></div>
          <div class="vt-tags">
            ${r.exercises.slice(0, 4).map((re) =>
              `<span class="vt-tag" style="border-color:${GROUP_COLORS[map[re.exerciseId]?.group] || "var(--line)"}">${esc(map[re.exerciseId]?.name || "Ejercicio")}</span>`).join("")}
            ${r.exercises.length > 4 ? `<span class="vt-tag vt-tag-more">+${r.exercises.length - 4}</span>` : ""}
          </div>
          <div class="vt-card-actions">
            <button class="vt-btn-primary vt-flex" data-a="routine-start" data-id="${r.id}">${icon("play", 18)} Iniciar</button>
            <button class="vt-btn-ghost" data-a="routine-edit" data-id="${r.id}" aria-label="Editar">${icon("pencil", 16)}</button>
            <button class="vt-btn-ghost" data-a="routine-dup" data-id="${r.id}" aria-label="Duplicar">${icon("copy", 16)}</button>
            <button class="vt-btn-ghost vt-danger" data-a="routine-del" data-id="${r.id}" aria-label="Eliminar">${icon("trash", 16)}</button>
          </div>
        </div>`;
      }).join("")}</div>`;

  return `
    <header class="vt-header">
      <div><p class="vt-eyebrow">Set 01 · Preparación</p><h1>Rutinas</h1></div>
      <button class="vt-btn-icon" data-a="routine-new" aria-label="Nueva rutina">${icon("plus", 22)}</button>
    </header>${list}`;
}

/* -------------------------------- Editor de rutina ------------------------------- */

function editorHTML() {
  const r = ui.editingRoutine;
  const map = exMap();
  return `
    <header class="vt-header">
      <button class="vt-btn-icon" data-a="editor-cancel" aria-label="Volver">${icon("back", 20)}</button>
      <h1 class="vt-header-title">${r.isNew ? "Nueva rutina" : "Editar rutina"}</h1>
      <div style="width:40px"></div>
    </header>
    <input class="vt-input vt-input-title" placeholder="Nombre de la rutina (ej: Fuerza semana 1)"
      value="${esc(r.name)}" data-i="editor-name">
    <div class="vt-list">
      ${r.exercises.map((it, idx) => {
        const ex = map[it.exerciseId];
        const t = ex?.type || "weight";
        let fields = `
          ${numFieldHTML("Series", "targetSets", idx, it.targetSets, 1)}
          ${numFieldHTML("Reps", "targetReps", idx, it.targetReps, 1)}`;
        if (t === "weight") fields += numFieldHTML("Kg", "targetWeight", idx, it.targetWeight, 2.5);
        else if (t === "bodyweight") fields += numFieldHTML("Lastre kg", "targetWeight", idx, it.targetWeight, 2.5);
        else fields = `
          ${numFieldHTML("Series", "targetSets", idx, it.targetSets, 1)}
          ${numFieldHTML("Segundos", "targetSeconds", idx, it.targetSeconds ?? 30, 5)}`;
        fields += numFieldHTML("Descanso s", "restSeconds", idx, it.restSeconds, 15);
        return `<div class="vt-card">
          <div class="vt-card-top">
            <h3 style="color:${GROUP_COLORS[ex?.group] || "var(--text)"}">${esc(ex?.name || "(eliminado)")}</h3>
            <button class="vt-btn-ghost vt-danger" data-a="editor-remove" data-idx="${idx}" aria-label="Quitar">${icon("trash", 16)}</button>
          </div>
          <div class="vt-target-row">${fields}</div>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-flex-center" data-a="picker-open" data-ctx="editor">${icon("plus", 18)} Agregar ejercicio</button>
    <div class="vt-sticky-footer">
      <button class="vt-btn-primary vt-full" data-a="editor-save">Guardar rutina</button>
    </div>`;
}

function numFieldHTML(label, field, idx, value, step) {
  return `<label class="vt-numfield"><span>${label}</span>
    <input type="number" inputmode="decimal" class="vt-input vt-mono" value="${num(value)}" step="${step}"
      data-i="editor-target" data-field="${field}" data-idx="${idx}"></label>`;
}

/* --------------------------------- Vista Entrenar -------------------------------- */

function trainIdleHTML() {
  const list = routines.length === 0
    ? emptyHTML("No tienes rutinas todavía", "Puedes partir con una sesión libre o crear una rutina primero.", "")
    : `<div class="vt-list">${routines.map((r) => `
        <button class="vt-card vt-card-button" data-a="train-start" data-id="${r.id}" style="border:1px solid var(--line);background:var(--surface)">
          <h3>${esc(r.name)}</h3>
          <p class="vt-muted">${r.exercises.length} ejercicios</p>
        </button>`).join("")}</div>`;
  return `
    <header class="vt-header">
      <div><p class="vt-eyebrow">Set 02 · Ejecución</p><h1>Entrenar</h1></div>
    </header>${list}
    <button class="vt-btn-outline vt-flex-center" data-a="train-free">${icon("plus", 18)} Sesión libre</button>`;
}

function trainActiveHTML() {
  const s = ui.activeSession;
  const map = exMap();
  const vol = sessionVolume(s, true);

  return `
    <header class="vt-header">
      <div>
        <p class="vt-eyebrow">${fmtDate(s.date)}</p>
        <h1 class="vt-header-title-sm">${esc(s.routineName)}</h1>
      </div>
      <div style="display:flex;gap:8px">
        <span class="vt-scoreboard"><span id="live-clock">${fmtClock((Date.now() - new Date(s.date).getTime()) / 1000)}</span><small>TIEMPO</small></span>
        <span class="vt-scoreboard"><span id="live-vol">${Math.round(vol).toLocaleString("es-CL")}</span> kg<small>VOLUMEN</small></span>
      </div>
    </header>
    <div class="vt-list">
      ${s.exercises.map((e, exIdx) => {
        const ex = map[e.exerciseId];
        const t = ex?.type || "weight";
        const last = lastSetsFor(e.exerciseId);
        const prior = priorStats(e.exerciseId);
        return `<div class="vt-card">
          <div class="vt-card-top">
            <h3 style="color:${GROUP_COLORS[ex?.group] || "var(--text)"}">${esc(ex?.name || "(eliminado)")}</h3>
            <span class="vt-rest-mini vt-muted-sm">Descanso
              <input type="number" inputmode="numeric" class="vt-input vt-mono" min="0" step="15"
                value="${num(e.restSeconds) > 0 ? num(e.restSeconds) : ""}" placeholder="${num(settings.restSeconds)}"
                data-i="ex-rest" data-ex="${exIdx}"> s
            </span>
          </div>
          ${last ? `<p class="vt-lasttime">Última vez: ${last.map((x) => fmtSet(t, x)).join(", ")}</p>` : ""}
          <div class="vt-sets">
            ${e.sets.length ? setCapsHTML(t) : ""}
            ${(() => {
              let n = 0; // las efectivas se numeran 1..n; las de calentamiento muestran "C"
              return e.sets.map((st, setIdx) =>
                setRowHTML(t, st, exIdx, setIdx, prior, st.warmup ? "C" : String(++n))).join("");
            })()}
          </div>
          <button class="vt-btn-outline vt-small" data-a="set-add" data-ex="${exIdx}">${icon("plus", 14)} Agregar serie</button>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-flex-center" data-a="picker-open" data-ctx="session">${icon("plus", 18)} Agregar ejercicio</button>
    <div class="vt-sticky-footer vt-footer-split">
      <button class="vt-btn-ghost vt-danger" data-a="session-discard">Descartar</button>
      <button class="vt-btn-primary vt-flex" data-a="session-finish">${icon("check", 18)} Finalizar sesión</button>
    </div>`;
}

// Encabezados de columnas sobre la primera serie, alineados con los inputs
// replicando la estructura de la fila (check 30px + número 16px + inputs 58px).
function setCapsHTML(type) {
  const cap = (t) => `<span class="vt-cap">${t}</span>`;
  const gap = (t) => `<span class="vt-x" style="visibility:hidden">${t}</span>`;
  let inner;
  if (type === "time") inner = cap("seg");
  else if (type === "bodyweight") inner = cap("reps") + gap("reps") + cap("lastre kg") + gap("+kg");
  else inner = cap("kg") + gap("×") + cap("reps");
  return `<div class="vt-set-caps" aria-hidden="true"><span class="vt-cap-check"></span><span class="vt-cap-warm"></span><span class="vt-set-num"></span>${inner}</div>`;
}

// "MM:SS" o "H:MM:SS" para el cronómetro de sesión.
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// "47 min" o "1 h 12 min" para el historial.
function fmtDurationMin(sec) {
  const min = Math.max(1, Math.round(num(sec) / 60));
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

// Reloj único y global: escribe directo en el span para no re-dibujar (patrón #live-vol).
setInterval(() => {
  const el = document.getElementById("live-clock");
  if (!el || !ui.activeSession) return;
  el.textContent = fmtClock((Date.now() - new Date(ui.activeSession.date).getTime()) / 1000);
}, 1000);

function setRowHTML(type, st, exIdx, setIdx, prior, label) {
  const pr = isPR(type, st, prior);
  const open = ui.openNotes.has(`${exIdx}:${setIdx}`);
  const attrs = (f) => `data-i="set" data-f="${f}" data-ex="${exIdx}" data-set="${setIdx}"`;

  let fields = "";
  if (type === "time") {
    fields = `
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input" value="${num(st.seconds)}" ${attrs("seconds")}>
      <span class="vt-x">seg</span>`;
  } else if (type === "bodyweight") {
    fields = `
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input" value="${num(st.reps)}" ${attrs("reps")}>
      <span class="vt-x">reps</span>
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input" value="${num(st.weight)}" ${attrs("weight")}>
      <span class="vt-x">+kg</span>`;
  } else {
    fields = `
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input" value="${num(st.weight)}" ${attrs("weight")}>
      <span class="vt-x">×</span>
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input" value="${num(st.reps)}" ${attrs("reps")}>`;
  }

  return `
    <div class="vt-set-row ${st.warmup ? "is-warmup" : ""} ${st.done ? "is-done" : ""} ${pr ? "is-pr" : ""}">
      <button class="vt-check" data-a="set-check" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Marcar serie">${icon("check", 15)}</button>
      <button class="vt-warmup ${st.warmup ? "is-on" : ""}" data-a="set-warmup" data-ex="${exIdx}" data-set="${setIdx}" title="Calentamiento" aria-label="Alternar calentamiento">C</button>
      <span class="vt-set-num">${label}</span>
      ${fields}
      ${pr ? `<span class="vt-pr" title="¡PR!">${icon("trophy", 16)}</span>` : ""}
      <button class="vt-btn-ghost" data-a="set-notes" data-ex="${exIdx}" data-set="${setIdx}" aria-label="RPE y nota" style="${st.rpe || st.note ? "color:var(--amber)" : ""}">${icon("note", 15)}</button>
      <button class="vt-btn-ghost vt-danger" data-a="set-del" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Eliminar serie">${icon("x", 14)}</button>
    </div>
    ${open ? `<div class="vt-setline2">
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-rpe-input" placeholder="RPE" min="1" max="10" step="0.5"
        value="${st.rpe ?? ""}" ${attrs("rpe")}>
      <input type="text" class="vt-input vt-note-input" placeholder="Nota (opcional)" value="${esc(st.note || "")}" ${attrs("note")}>
    </div>` : ""}`;
}

/* --------------------------------- Vista Historial ------------------------------- */

function historyHTML() {
  const list = sessions.length === 0
    ? emptyHTML("Sin sesiones registradas", "Cuando termines un entrenamiento, va a aparecer acá.", "")
    : `<div class="vt-list">${sessions.map((s) => {
        const open = ui.openHistory === s.id;
        const volume = sessionVolume(s, false);
        return `<div class="vt-card">
          <button class="vt-full-btn" data-a="hist-toggle" data-id="${s.id}">
            <div>
              <h3>${esc(s.routineName)}</h3>
              <p class="vt-muted">${icon("calendar", 12)} ${fmtDate(s.date)} · ${Math.round(volume).toLocaleString("es-CL")} kg vol.${s.durationSec ? ` · ${fmtDurationMin(s.durationSec)}` : ""}</p>
            </div>
            ${icon(open ? "chevUp" : "chevDown", 18)}
          </button>
          ${open ? `<div class="vt-session-detail">
            ${s.exercises.map((e) => {
              const t = exType(e.exerciseId);
              const notes = e.sets.filter((st) => st.note).map((st) => esc(st.note));
              return `<div class="vt-detail-row">
                  <span style="color:${GROUP_COLORS[exGroup(e.exerciseId)]}">${esc(exName(e.exerciseId))}</span>
                  <span class="vt-mono vt-muted-sm">${e.sets.map((st) => fmtSet(t, st)).join(", ")}</span>
                </div>
                ${notes.length ? `<div class="vt-note-line">— ${notes.join(" · ")}</div>` : ""}`;
            }).join("")}
            <button class="vt-btn-ghost vt-danger vt-small" data-a="hist-del" data-id="${s.id}">${icon("trash", 14)} Eliminar sesión</button>
          </div>` : ""}
        </div>`;
      }).join("")}</div>`;

  return `
    <header class="vt-header">
      <div><p class="vt-eyebrow">Set 03 · Registro</p><h1>Historial</h1></div>
    </header>${list}`;
}

/* --------------------------------- Vista Progreso -------------------------------- */

function exercisesWithHistory() {
  const ids = new Set();
  sessions.forEach((s) => s.exercises.forEach((e) => { if (e.sets.length) ids.add(e.exerciseId); }));
  return Array.from(ids);
}

function metricOptions(exId) {
  const t = exType(exId);
  const prior = priorStats(exId);
  if (t === "time") return [{ id: "seconds", label: "Tiempo máx." }];
  if (t === "bodyweight")
    return [
      prior.anyLastre ? { id: "weight", label: "Lastre máx." } : { id: "reps", label: "Reps máx." },
      { id: "volume", label: "Volumen" },
    ];
  return [{ id: "weight", label: "Peso máx." }, { id: "volume", label: "Volumen" }];
}

function progressData(exId, metric) {
  const t = exType(exId);
  const pts = [];
  [...sessions].reverse().forEach((s) => {
    const e = s.exercises.find((x) => x.exerciseId === exId);
    if (!e || e.sets.length === 0) return;
    let v;
    if (metric === "volume") v = Math.round(e.sets.reduce((a, st) => a + setVol(t, st), 0));
    else {
      // Los máximos se calculan solo con series efectivas; el volumen incluye todo.
      const eff = e.sets.filter((st) => !st.warmup);
      if (!eff.length) return;
      v = Math.max(...eff.map((st) => num(st[metric])));
    }
    pts.push({ date: fmtDateShort(s.date), v });
  });
  return pts;
}

const metricUnit = (m) => (m === "seconds" ? "s" : m === "reps" ? "reps" : "kg");

function progressHTML() {
  const ids = exercisesWithHistory();
  const head = `<header class="vt-header">
    <div><p class="vt-eyebrow">Set 04 · Análisis</p><h1>Progreso</h1></div>
  </header>`;

  if (ids.length === 0)
    return head + emptyHTML("Todavía no hay datos", "Registra al menos una sesión para ver tu progreso acá.", "");

  if (!ui.progressEx || !ids.includes(ui.progressEx)) ui.progressEx = ids[0];
  const options = metricOptions(ui.progressEx);
  if (!ui.progressMetric || !options.some((o) => o.id === ui.progressMetric)) ui.progressMetric = options[0].id;

  const data = progressData(ui.progressEx, ui.progressMetric);
  const current = data[data.length - 1];
  const first = data[0];
  const unit = metricUnit(ui.progressMetric);

  let stats = "";
  if (current) {
    const delta = data.length > 1 ? current.v - first.v : null;
    stats = `<div class="vt-stat-row">
      <div class="vt-stat"><span class="vt-stat-label">Actual</span>
        <span class="vt-stat-value">${current.v} ${unit}</span></div>
      ${delta !== null ? `<div class="vt-stat"><span class="vt-stat-label">Desde el inicio</span>
        <span class="vt-stat-value vt-stat-delta">${delta >= 0 ? "+" : ""}${Math.round(delta * 10) / 10} ${unit}</span></div>` : ""}
    </div>`;
  }

  return `${head}
    <select class="vt-input vt-select" data-c="prog-ex">
      ${ids.map((id) => `<option value="${id}" ${id === ui.progressEx ? "selected" : ""}>${esc(exName(id))}</option>`).join("")}
    </select>
    <div class="vt-metric-toggle">
      ${options.map((o) => `<button class="${ui.progressMetric === o.id ? "is-active" : ""}" data-a="prog-metric" data-m="${o.id}">${o.label}</button>`).join("")}
    </div>
    ${stats}
    <div class="vt-chart"><canvas id="prog-canvas" height="240"></canvas></div>`;
}

function mountChart() {
  const canvas = document.getElementById("prog-canvas");
  if (!canvas || typeof Chart === "undefined") return;
  if (chart) { chart.destroy(); chart = null; }
  const data = progressData(ui.progressEx, ui.progressMetric);
  chart = new Chart(canvas, {
    type: "line",
    data: {
      labels: data.map((p) => p.date),
      datasets: [{
        data: data.map((p) => p.v),
        borderColor: "#E8A33D",
        backgroundColor: "#E8A33D",
        borderWidth: 2.5,
        pointRadius: 3.5,
        tension: 0.3,
      }],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "rgba(44,55,66,0.6)" }, ticks: { color: "#8FA0AC", font: { size: 11 } } },
        y: { grid: { color: "rgba(44,55,66,0.6)" }, ticks: { color: "#8FA0AC", font: { size: 11 } } },
      },
    },
  });
}

/* ---------------------------------- Vista Ajustes -------------------------------- */

function settingsHTML() {
  return `
    <header class="vt-header">
      <div><p class="vt-eyebrow">Set 05 · Configuración</p><h1>Ajustes</h1></div>
    </header>
    <div class="vt-card">
      <div class="vt-settings-row">
        <div class="vt-settings-label">Descanso entre series<small>Se usa cuando el ejercicio no define el suyo</small></div>
        <input type="number" inputmode="numeric" class="vt-input vt-mono" value="${num(settings.restSeconds)}" min="0" step="15" data-i="set-rest">
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Sonido<small>Pitido al terminar el descanso</small></div>
        <input type="checkbox" class="vt-switch" ${settings.sound ? "checked" : ""} data-c="set-sound">
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Vibración<small>Si tu teléfono lo permite</small></div>
        <input type="checkbox" class="vt-switch" ${settings.vibrate ? "checked" : ""} data-c="set-vibrate">
      </div>
    </div>
    <div class="vt-card" style="margin-top:12px">
      <div class="vt-settings-row">
        <div class="vt-settings-label">Ejercicios<small>Crear, editar tipo y grupo, eliminar</small></div>
        <button class="vt-btn-icon" data-a="manage-open">${icon("pencil", 16)} Gestionar</button>
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Exportar datos<small>Descarga un respaldo JSON de todo</small></div>
        <button class="vt-btn-icon" data-a="export">${icon("download", 16)}</button>
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Importar datos<small>Respaldo completo o rutinas nuevas</small></div>
        <label class="vt-btn-icon" style="cursor:pointer">${icon("upload", 16)}
          <input type="file" accept=".json,application/json" data-c="import-file">
        </label>
      </div>
    </div>
    <p class="vt-muted" style="text-align:center;margin-top:16px">Volley Tracker · datos guardados en este dispositivo</p>`;
}

/* ----------------------------- Gestión de ejercicios ------------------------------ */

function exercisesManagerHTML() {
  const byGroup = {};
  exercises.forEach((e) => { (byGroup[e.group] = byGroup[e.group] || []).push(e); });
  const groups = Object.keys(byGroup);

  return `
    <header class="vt-header">
      <button class="vt-btn-icon" data-a="manage-close" aria-label="Volver">${icon("back", 20)}</button>
      <h1 class="vt-header-title">Ejercicios</h1>
      <button class="vt-btn-icon" data-a="ex-new" aria-label="Nuevo ejercicio">${icon("plus", 20)}</button>
    </header>
    <div class="vt-list">
      ${groups.map((g) => `<div class="vt-card">
        <h3 style="color:${GROUP_COLORS[g] || "var(--text)"};margin-bottom:4px">${esc(g)}</h3>
        ${byGroup[g].map((e) => `
          <div class="vt-ex-row">
            <span class="vt-dotgroup" style="background:${GROUP_COLORS[g] || "var(--text-dim)"}"></span>
            <span class="vt-ex-name">${esc(e.name)}</span>
            <span class="vt-badge">${TYPES[e.type]?.label || e.type}</span>
            <button class="vt-btn-ghost" data-a="ex-edit" data-id="${e.id}" aria-label="Editar">${icon("pencil", 15)}</button>
            <button class="vt-btn-ghost vt-danger" data-a="ex-del" data-id="${e.id}" aria-label="Eliminar">${icon("trash", 15)}</button>
          </div>`).join("")}
      </div>`).join("")}
    </div>`;
}

function exerciseModalHTML() {
  const m = ui.exerciseModal;
  return `
    <div class="vt-modal-backdrop" data-a="ex-modal-cancel">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">${m.id ? "Editar ejercicio" : "Nuevo ejercicio"}</h2>
          <button class="vt-btn-ghost" data-a="ex-modal-cancel">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-form">
          <label>Nombre
            <input type="text" class="vt-input" id="exm-name" value="${esc(m.name)}" placeholder="Ej: Curl femoral">
          </label>
          <label>Grupo muscular
            <select class="vt-input" id="exm-group">
              ${GROUPS.map((g) => `<option value="${g}" ${m.group === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </label>
          <label>Tipo de registro
            <select class="vt-input" id="exm-type">
              ${Object.entries(TYPES).map(([id, t]) => `<option value="${id}" ${m.type === id ? "selected" : ""}>${t.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="vt-modal-actions">
          <button class="vt-btn-primary" data-a="ex-modal-save">Guardar</button>
        </div>
      </div>
    </div>`;
}

/* ------------------------------ Selector de ejercicio ----------------------------- */

function pickerHTML() {
  return `
    <div class="vt-modal-backdrop" data-a="picker-close">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <div class="vt-search">${icon("search", 16)}
            <input placeholder="Buscar ejercicio…" value="${esc(ui.pickerQuery)}" data-i="picker-q" autofocus>
          </div>
          <button class="vt-btn-ghost" data-a="picker-close">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-body" id="picker-list">${pickerListHTML()}</div>
      </div>
    </div>`;
}

function pickerListHTML() {
  const q = ui.pickerQuery.trim().toLowerCase();
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q));
  let html = filtered.map((ex) => `
    <button class="vt-modal-row" data-a="picker-pick" data-id="${ex.id}">
      <span class="vt-dotgroup" style="background:${GROUP_COLORS[ex.group] || "var(--text-dim)"}"></span>
      ${esc(ex.name)}
      <span class="vt-muted-sm">${esc(ex.group)}</span>
    </button>`).join("");
  if (q && !filtered.some((e) => e.name.toLowerCase() === q)) {
    html += `<button class="vt-modal-row vt-modal-add" data-a="picker-create">
      ${icon("plus", 16)} Crear "${esc(ui.pickerQuery.trim())}" (peso × reps — edítalo en Ajustes)
    </button>`;
  }
  return html;
}

/* ----------------------------------- Compartido ---------------------------------- */

function emptyHTML(title, detail, action) {
  return `<div class="vt-empty"><h3>${title}</h3><p>${detail}</p>${action}</div>`;
}

/* -------------------------------- Lógica de sesión -------------------------------- */

function defaultSet(type, target, prevSet) {
  // Si la serie anterior es calentamiento, la nueva nace calentamiento (otro aproche).
  const warmup = !!(prevSet && prevSet.warmup);
  if (type === "time")
    return { done: false, warmup, seconds: num(prevSet?.seconds) || num(target?.seconds) || 30, rpe: null, note: "" };
  return {
    done: false, warmup,
    reps: num(prevSet?.reps) || num(target?.reps) || 8,
    weight: prevSet ? num(prevSet.weight) : num(target?.weight) || 0,
    rpe: null, note: "",
  };
}

function buildSessionFromRoutine(r) {
  return {
    id: uid("ses"),
    routineId: r.id,
    routineName: r.name,
    date: new Date().toISOString(),
    exercises: r.exercises.map((re) => {
      const t = exType(re.exerciseId);
      const target = { sets: re.targetSets, reps: re.targetReps, weight: re.targetWeight, seconds: re.targetSeconds };
      const n = Math.max(1, Math.round(num(re.targetSets)) || 3);
      return {
        exerciseId: re.exerciseId,
        target,
        restSeconds: num(re.restSeconds) || 0,
        sets: Array.from({ length: n }, () => defaultSet(t, target, null)),
      };
    }),
  };
}

function finishSession() {
  const s = ui.activeSession;
  const total = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = s.exercises.reduce((a, e) => a + e.sets.filter((st) => st.done).length, 0);

  if (done === 0) {
    if (confirm("No marcaste ninguna serie. ¿Descartar la sesión completa?")) {
      ui.activeSession = null; stopRest(); render();
    }
    return;
  }
  const unchecked = total - done;
  if (unchecked > 0 &&
      !confirm(`Hay ${unchecked} serie${unchecked !== 1 ? "s" : ""} sin marcar que se descartará${unchecked !== 1 ? "n" : ""}. ¿Finalizar y guardar las ${done} marcadas?`)) {
    return;
  }
  const cleaned = {
    ...s,
    durationSec: Math.round((Date.now() - new Date(s.date).getTime()) / 1000),
    exercises: s.exercises
      .map((e) => ({ ...e, sets: e.sets.filter((st) => st.done) }))
      .filter((e) => e.sets.length > 0),
  };
  sessions = [cleaned, ...sessions];
  persistSessions();
  ui.activeSession = null;
  ui.openNotes.clear();
  stopRest();
  ui.tab = "historial";
  render();
}

/* --------------------------------- Export / Import -------------------------------- */

function exportJSON() {
  const data = {
    app: "volley-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    sessions,
    "custom-exercises": exercises,
    settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `volley-tracker-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch { alert("El archivo no es un JSON válido."); return; }

    const inExercises = data["custom-exercises"] || data.exercises || null;

    if (Array.isArray(data.sessions)) {
      // Respaldo completo: reemplaza todo.
      if (!confirm("Este archivo es un respaldo completo. Se REEMPLAZARÁN todos los datos actuales. ¿Continuar?")) return;
      if (Array.isArray(data.routines)) { routines = data.routines; persistRoutines(); }
      sessions = data.sessions; persistSessions();
      if (Array.isArray(inExercises) && inExercises.length) { exercises = inExercises; persistExercises(); }
      if (data.settings) { settings = Object.assign(settings, data.settings); persistSettings(); }
      alert("Respaldo restaurado ✔");
    } else if (Array.isArray(data.routines) || Array.isArray(inExercises)) {
      // Solo rutinas y/o ejercicios nuevos: se agregan sin borrar nada.
      let nEx = 0, nRt = 0;
      if (Array.isArray(inExercises)) {
        for (const e of inExercises) {
          if (!e.id || !e.name) continue;
          const i = exercises.findIndex((x) => x.id === e.id);
          if (i >= 0) exercises[i] = { ...exercises[i], ...e };
          else { exercises.push({ group: "Custom", type: "weight", ...e }); nEx++; }
        }
        persistExercises();
      }
      if (Array.isArray(data.routines)) {
        for (const r of data.routines) {
          if (!r.id || !r.name || !Array.isArray(r.exercises)) continue;
          const i = routines.findIndex((x) => x.id === r.id);
          if (i >= 0) routines[i] = r; else { routines.unshift(r); nRt++; }
        }
        persistRoutines();
      }
      alert(`Importado ✔  ${nRt} rutina(s) y ${nEx} ejercicio(s) nuevos.`);
    } else {
      alert("El archivo no tiene rutinas, ejercicios ni un respaldo reconocible.");
    }
    render();
  };
  reader.readAsText(file);
}

/* ------------------------------------ Eventos ------------------------------------ */

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  // El fondo oscuro cierra el modal, pero un clic dentro del panel no debe cerrarlo.
  if (el.classList.contains("vt-modal-backdrop") && e.target.closest(".vt-modal")) return;
  const a = el.dataset.a;
  const id = el.dataset.id;

  switch (a) {
    case "tab":
      ui.tab = el.dataset.tab;
      ui.editingRoutine = null;
      ui.manageExercises = false;
      render();
      break;

    /* Rutinas */
    case "routine-new":
      ui.tab = "rutinas";
      ui.editingRoutine = { id: uid("rt"), name: "", exercises: [], isNew: true };
      render();
      break;
    case "routine-edit": {
      const r = routines.find((x) => x.id === id);
      if (r) ui.editingRoutine = { ...r, exercises: r.exercises.map((x) => ({ ...x })), isNew: false };
      render();
      break;
    }
    case "routine-dup": {
      const r = routines.find((x) => x.id === id);
      if (r) {
        routines = [{ ...r, id: uid("rt"), name: r.name + " (copia)", exercises: r.exercises.map((x) => ({ ...x })) }, ...routines];
        persistRoutines(); render();
      }
      break;
    }
    case "routine-del":
      if (confirm("¿Eliminar esta rutina? (el historial no se borra)")) {
        routines = routines.filter((r) => r.id !== id);
        persistRoutines(); render();
      }
      break;
    case "routine-start": case "train-start": {
      const r = routines.find((x) => x.id === id);
      if (r) {
        if (ui.activeSession && !confirm("Ya hay una sesión en curso. ¿Descartarla y empezar otra?")) break;
        ui.activeSession = buildSessionFromRoutine(r);
        ui.openNotes.clear();
        ui.tab = "entrenar";
        render();
      }
      break;
    }

    /* Editor de rutina */
    case "editor-cancel": ui.editingRoutine = null; render(); break;
    case "editor-remove":
      ui.editingRoutine.exercises.splice(+el.dataset.idx, 1);
      render();
      break;
    case "editor-save": {
      const r = ui.editingRoutine;
      if (!r.name.trim()) { alert("Ponle un nombre a la rutina."); break; }
      if (r.exercises.length === 0) { alert("Agrega al menos un ejercicio."); break; }
      const stamped = { id: r.id, name: r.name.trim(), exercises: r.exercises, updatedAt: new Date().toISOString() };
      const i = routines.findIndex((x) => x.id === r.id);
      if (i >= 0) routines[i] = stamped; else routines = [stamped, ...routines];
      persistRoutines();
      ui.editingRoutine = null;
      render();
      break;
    }

    /* Selector de ejercicios */
    case "picker-open": ui.picker = el.dataset.ctx; ui.pickerQuery = ""; render(); break;
    case "picker-close": ui.picker = null; render(); break;
    case "picker-pick": pickExercise(id); break;
    case "picker-create": {
      const name = ui.pickerQuery.trim();
      if (!name) break;
      const ex = { id: uid("cex"), name, group: "Custom", type: "weight" };
      exercises.push(ex); persistExercises();
      pickExercise(ex.id);
      break;
    }

    /* Sesión activa */
    case "train-free":
      if (ui.activeSession && !confirm("Ya hay una sesión en curso. ¿Descartarla y empezar otra?")) break;
      ui.activeSession = { id: uid("ses"), routineId: null, routineName: "Sesión libre", date: new Date().toISOString(), exercises: [] };
      ui.openNotes.clear();
      render();
      break;
    case "set-add": {
      const ex = ui.activeSession.exercises[+el.dataset.ex];
      const t = exType(ex.exerciseId);
      ex.sets.push(defaultSet(t, ex.target, ex.sets[ex.sets.length - 1]));
      render();
      break;
    }
    case "set-del": {
      const ex = ui.activeSession.exercises[+el.dataset.ex];
      ex.sets.splice(+el.dataset.set, 1);
      render();
      break;
    }
    case "set-check": {
      const ex = ui.activeSession.exercises[+el.dataset.ex];
      const st = ex.sets[+el.dataset.set];
      st.done = !st.done;
      if (st.done) startRest(ex.restSeconds);
      render();
      break;
    }
    case "set-warmup": {
      const st = ui.activeSession.exercises[+el.dataset.ex].sets[+el.dataset.set];
      st.warmup = !st.warmup;
      render();
      break;
    }
    case "set-notes": {
      const key = `${el.dataset.ex}:${el.dataset.set}`;
      ui.openNotes.has(key) ? ui.openNotes.delete(key) : ui.openNotes.add(key);
      render();
      break;
    }
    case "session-discard":
      if (confirm("¿Descartar la sesión completa? No se guardará nada.")) {
        ui.activeSession = null; ui.openNotes.clear(); stopRest(); render();
      }
      break;
    case "session-finish": finishSession(); break;
    case "rest-cancel": stopRest(); break;

    /* Historial */
    case "hist-toggle": ui.openHistory = ui.openHistory === id ? null : id; render(); break;
    case "hist-del":
      if (confirm("¿Eliminar esta sesión del historial?")) {
        sessions = sessions.filter((s) => s.id !== id);
        persistSessions(); render();
      }
      break;

    /* Progreso */
    case "prog-metric": ui.progressMetric = el.dataset.m; render(); break;

    /* Ajustes / ejercicios */
    case "manage-open": ui.manageExercises = true; render(); break;
    case "manage-close": ui.manageExercises = false; render(); break;
    case "ex-new": ui.exerciseModal = { id: null, name: "", group: "Custom", type: "weight" }; render(); break;
    case "ex-edit": {
      const ex = exercises.find((x) => x.id === id);
      if (ex) ui.exerciseModal = { ...ex };
      render();
      break;
    }
    case "ex-del": {
      const usedRoutines = routines.filter((r) => r.exercises.some((x) => x.exerciseId === id));
      const msg = usedRoutines.length
        ? `Este ejercicio está en ${usedRoutines.length} rutina(s); también se quitará de ellas. El historial se conserva. ¿Eliminar?`
        : "¿Eliminar este ejercicio? El historial se conserva.";
      if (confirm(msg)) {
        exercises = exercises.filter((x) => x.id !== id);
        persistExercises();
        routines = routines.map((r) => ({ ...r, exercises: r.exercises.filter((x) => x.exerciseId !== id) }));
        persistRoutines();
        render();
      }
      break;
    }
    case "ex-modal-cancel": ui.exerciseModal = null; render(); break;
    case "ex-modal-save": {
      const name = document.getElementById("exm-name").value.trim();
      const group = document.getElementById("exm-group").value;
      const type = document.getElementById("exm-type").value;
      if (!name) { alert("Ponle un nombre al ejercicio."); break; }
      const m = ui.exerciseModal;
      if (m.id) {
        const i = exercises.findIndex((x) => x.id === m.id);
        if (i >= 0) exercises[i] = { ...exercises[i], name, group, type };
      } else {
        exercises.push({ id: uid("cex"), name, group, type });
      }
      persistExercises();
      ui.exerciseModal = null;
      render();
      break;
    }
    case "export": exportJSON(); break;
  }
});

function pickExercise(id) {
  if (ui.picker === "editor" && ui.editingRoutine) {
    const t = exType(id);
    ui.editingRoutine.exercises.push({
      exerciseId: id, targetSets: 3, targetReps: 8, targetWeight: 0,
      targetSeconds: t === "time" ? 30 : undefined,
    });
  } else if (ui.picker === "session" && ui.activeSession) {
    const t = exType(id);
    ui.activeSession.exercises.push({ exerciseId: id, target: null, sets: [defaultSet(t, null, null)] });
  }
  ui.picker = null;
  ui.pickerQuery = "";
  render();
}

document.addEventListener("input", (e) => {
  const el = e.target.closest("[data-i]");
  if (!el) return;
  switch (el.dataset.i) {
    case "editor-name":
      if (ui.editingRoutine) ui.editingRoutine.name = el.value;
      break;
    case "editor-target": {
      const it = ui.editingRoutine?.exercises[+el.dataset.idx];
      if (it) it[el.dataset.field] = num(el.value);
      break;
    }
    case "set": {
      const st = ui.activeSession?.exercises[+el.dataset.ex]?.sets[+el.dataset.set];
      if (!st) break;
      const f = el.dataset.f;
      if (f === "note") st.note = el.value;
      else if (f === "rpe") st.rpe = el.value === "" ? null : num(el.value);
      else st[f] = num(el.value);
      // Actualiza el contador de volumen en vivo sin re-dibujar (para no perder el foco).
      const live = document.getElementById("live-vol");
      if (live && ui.activeSession) live.textContent = Math.round(sessionVolume(ui.activeSession, true)).toLocaleString("es-CL");
      break;
    }
    case "picker-q": {
      ui.pickerQuery = el.value;
      const list = document.getElementById("picker-list");
      if (list) list.innerHTML = pickerListHTML();
      break;
    }
    case "set-rest":
      settings.restSeconds = Math.max(0, Math.round(num(el.value)));
      persistSettings();
      break;
    case "ex-rest": {
      // Solo afecta la sesión en curso, no la rutina guardada.
      const ex = ui.activeSession?.exercises[+el.dataset.ex];
      if (ex) ex.restSeconds = Math.max(0, Math.round(num(el.value)));
      break;
    }
  }
});

document.addEventListener("change", (e) => {
  const el = e.target.closest("[data-c]");
  if (!el) return;
  switch (el.dataset.c) {
    case "set-sound": settings.sound = el.checked; persistSettings(); break;
    case "set-vibrate": settings.vibrate = el.checked; persistSettings(); break;
    case "prog-ex": ui.progressEx = el.value; ui.progressMetric = null; render(); break;
    case "import-file":
      if (el.files && el.files[0]) importJSON(el.files[0]);
      el.value = "";
      break;
  }
});

// Aviso si intenta cerrar la pestaña con una sesión sin guardar.
window.addEventListener("beforeunload", (e) => {
  if (ui.activeSession && ui.activeSession.exercises.some((x) => x.sets.some((st) => st.done))) {
    e.preventDefault();
    e.returnValue = "";
  }
});

render();
