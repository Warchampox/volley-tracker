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

// Semilla de grupos (solo se usa la primera vez que corre la app, para no
// romper nada existente). Después de eso, la fuente de verdad es
// exerciseGroups (persistido) — ver más abajo.
const DEFAULT_GROUPS = [
  { name: "Piernas", color: "var(--amber)" },
  { name: "Pliometría", color: "var(--green)" },
  { name: "Empuje", color: "var(--blue)" },
  { name: "Tracción", color: "var(--blue)" },
  { name: "Hombro", color: "var(--red)" },
  { name: "Core", color: "var(--text-dim)" },
  { name: "Custom", color: "var(--text-dim)" },
];

// Paleta para grupos NUEVOS creados por el usuario — excluye ámbar y verde,
// reservados exclusivamente para PR y serie completada (ver CLAUDE.md).
const GROUP_PALETTE = ["#3B6FE0", "#C1594F", "#8FA0AC", "#9B6FE0", "#4FB8C1", "#E0763B", "#C14FA0"];

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

// Kg objetivo a partir de %1RM, redondeado al disco de 2.5 kg más cercano.
const pctKg = (oneRM, pct) => Math.round(num(oneRM) * num(pct) / 100 / 2.5) * 2.5;

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
let settings = Object.assign({ restSeconds: 90, sound: true, vibrate: true, featuredExercises: [], openFolders: [] }, load("settings", {}));
let routineFolders = load("routine-folders", []); // [{id, name}] — routine.folderId null = suelta
let exerciseGroups = load("exercise-groups", null); // [{name, color}]
if (!Array.isArray(exerciseGroups) || exerciseGroups.length === 0) {
  exerciseGroups = DEFAULT_GROUPS.map((g) => ({ ...g }));
  save("exercise-groups", exerciseGroups);
}

const persistRoutines = () => save("routines", routines);
const persistSessions = () => save("sessions", sessions);
const persistExercises = () => save("custom-exercises", exercises);
const persistSettings = () => save("settings", settings);
const persistFolders = () => save("routine-folders", routineFolders);
const persistGroups = () => save("exercise-groups", exerciseGroups);

// El grupo se identifica por nombre (no hay id) — mismo modelo que ya usaban
// GROUPS/GROUP_COLORS antes de persistirse. Sin fallback baked-in: cada
// call site decide su propio valor por defecto, igual que antes.
const groupNames = () => exerciseGroups.map((g) => g.name);
const groupColor = (name) => exerciseGroups.find((g) => g.name === name)?.color;

/* ---------------------------------- Estado UI ---------------------------------- */

const ui = {
  tab: "rutinas",
  editingRoutine: null,   // copia de la rutina en edición, o null
  activeSession: null,    // sesión en curso, o null
  sessionMinimized: false, // sesión activa pero minimizada a la barra flotante
  picker: null,           // null | "editor" | "session" | "featured" | "replace"
  pickerQuery: "",
  openHistory: null,
  progressEx: null,
  progressMetric: null,
  manageExercises: false,
  manageGroups: false,
  exerciseModal: null,    // null | {id|null, name, group, type, pickerCtx?}
  groupModal: null,       // null | {originalName|null, name, color}
  openNotes: new Set(),   // "exIdx:setIdx" con línea RPE abierta
  openExNotes: new Set(), // exIdx con la nota de ejercicio (sessionNote) abierta
  openTypeSelector: null, // "exIdx:setIdx" con el selector de tipo de serie abierto, o null
  sessionSummary: null,   // null | {routineName, date, durationSec, volume, setsCount, prHits, appliedUpdates}
  confirmDialog: null,    // null | {message, danger, onYes}
  folderModal: null,      // null | {id|null, name}
  movingRoutineId: null,  // id de la rutina que se está moviendo a otra carpeta, o null
  pasteJsonModal: false,  // modal de "Pegar JSON"
  exerciseEditMode: false,     // modo "Organizar ejercicios" (editor de rutina o sesión activa)
  selectedExercises: new Set(), // índices seleccionados en modo Organizar
  replaceExerciseIdx: null,     // índice del ejercicio a reemplazar (picker en contexto "replace")
  collapsedExercises: new Set(), // exIdx colapsados en la sesión activa — no persiste
};

// Reemplaza confirm() nativo por un modal propio (mismo lenguaje visual que
// el resto de la app). onYes se guarda y se ejecuta recién si el usuario
// toca "Confirmar"/"Eliminar"; si cancela o cierra, no pasa nada.
function askConfirm(message, onYes, danger = false) {
  ui.confirmDialog = { message, danger, onYes };
  render();
}

const exMap = () => Object.fromEntries(exercises.map((e) => [e.id, e]));
const exType = (id) => exMap()[id]?.type || "weight";
const exName = (id) => exMap()[id]?.name || "(ejercicio eliminado)";
const exGroup = (id) => exMap()[id]?.group || "Custom";
const exUnilateral = (id) => !!exMap()[id]?.unilateral;

// Reps por lado de una serie unilateral. Si el set es viejo (de antes de que
// el ejercicio pasara a unilateral) y solo tiene `reps`, ambos lados caen a
// ese valor — fallback de compatibilidad, no migra ni borra el dato original.
const repsL = (st) => num(st.repsL ?? st.reps);
const repsR = (st) => num(st.repsR ?? st.reps);

// Tipo de serie: null (normal) | "warmup" | "dropset" | "failed". Un set
// viejo con warmup=true y sin setType se lee como "warmup" — fallback de
// lectura en runtime, nunca se migra el dato guardado. Los sets nuevos
// siempre escriben setType (nunca warmup).
const getSetType = (st) => st.setType ?? (st.warmup ? "warmup" : null);
const typePrefix = (t) => t === "warmup" ? "c" : t === "dropset" ? "D" : t === "failed" ? "F" : "";

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
  playBtn: '<polygon points="6 4 20 12 6 20 6 4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  tag: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/>',
  clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" y1="12" x2="16" y2="12"/>',
};

const icon = (name, s = 18) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;

/* --------------------------- Volumen, PRs y "última vez" -------------------------- */

// Volumen = solo peso externo: peso×reps (normal), lastre×reps (corporal), 0 (tiempo).
// Unilateral: el peso es compartido, pero suma las reps de ambos lados.
const setVol = (type, s, unilateral) => {
  if (type === "time") return 0;
  if (unilateral) return num(s.weight) * (repsL(s) + repsR(s));
  return num(s.weight) * num(s.reps);
};

const sessionVolume = (session, onlyDone) =>
  session.exercises.reduce((acc, e) => {
    const t = exType(e.exerciseId);
    const uni = exUnilateral(e.exerciseId);
    return acc + e.sets.reduce((a, st) => {
      if (onlyDone && !st.done) return a;
      return a + setVol(t, st, uni);
    }, 0);
  }, 0);

// Máximos históricos (solo sesiones guardadas) para detectar PRs. En
// unilateral, "reps" usa el lado más débil de cada serie — el logro real es
// lo que se logró del lado que menos dio, no el más fuerte.
function priorStats(exId) {
  const uni = exUnilateral(exId);
  let maxW = 0, maxR = 0, maxS = 0, anyLastre = false;
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.exerciseId === exId)
        for (const st of e.sets) {
          if (getSetType(st)) continue; // C/D/F quedan fuera de los máximos históricos
          maxW = Math.max(maxW, num(st.weight));
          maxR = Math.max(maxR, uni ? Math.min(repsL(st), repsR(st)) : num(st.reps));
          maxS = Math.max(maxS, num(st.seconds));
          if (num(st.weight) > 0) anyLastre = true;
        }
  return { maxW, maxR, maxS, anyLastre };
}

// PR según tipo: peso máx / lastre máx (o reps máx si nunca hubo lastre) / tiempo máx.
// En bodyweight sin lastre, unilateral compara con el lado más débil.
// Calentamiento/drop set/fallida no cuentan para PR (mismo criterio para los 3).
function isPR(type, st, prior, unilateral) {
  if (!st.done || getSetType(st)) return false;
  if (type === "time") return num(st.seconds) > 0 && num(st.seconds) > prior.maxS;
  if (type === "bodyweight") {
    if (num(st.weight) > 0) return num(st.weight) > prior.maxW;
    const r = unilateral ? Math.min(repsL(st), repsR(st)) : num(st.reps);
    return !prior.anyLastre && r > 0 && r > prior.maxR;
  }
  return num(st.weight) > 0 && num(st.weight) > prior.maxW;
}

// Superseries: por índice devuelve null (suelto) o {letter, pos, isLast}.
// Un grupo parte donde linkPrev es false y se extiende mientras el siguiente tenga linkPrev.
// Solo los grupos de 2+ ejercicios llevan etiqueta (A1, A2..., B1...).
function computeSupersetLabels(items) {
  const labels = new Array(items.length).fill(null);
  let letterIdx = 0, i = 0;
  while (i < items.length) {
    let j = i;
    while (j + 1 < items.length && items[j + 1].linkPrev) j++;
    if (j > i) {
      const letter = String.fromCharCode(65 + letterIdx++);
      for (let k = i; k <= j; k++) labels[k] = { letter, pos: k - i + 1, isLast: k === j };
    }
    i = j + 1;
  }
  return labels;
}

// Color de acento del bloque de un ejercicio: morado de superserie si
// pertenece a un grupo (todo el bloque, no solo la etiqueta A1/A2), si no
// el color de su grupo muscular — igual dentro y fuera del modo Organizar.
const blockAccentColor = (ex, lbl) => lbl ? "var(--superset)" : (groupColor(ex?.group) || "var(--line)");

/* ------------------------- Modo "Organizar ejercicios" --------------------------- */
// Compartido entre editorHTML (rutina) y trainActiveHTML (sesión activa): es
// la ÚNICA forma de reordenar (junto al drag-handle ya existente), eliminar,
// agrupar en superserie o reemplazar un ejercicio.

function organizeToggleHTML() {
  return `<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
    <button class="vt-btn-icon" data-a="exercise-editmode-toggle">${ui.exerciseEditMode ? "Listo" : "Organizar"}</button>
  </div>`;
}

// Fila compacta que reemplaza el bloque completo mientras se organiza:
// manija + acento + nombre + círculo de selección.
function exerciseOrganizeRowHTML(idx, ex, lbl) {
  const selected = ui.selectedExercises.has(idx);
  return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${blockAccentColor(ex, lbl)}">
    <div class="vt-block-row">
      <button type="button" class="vt-drag-handle" aria-label="Reordenar ejercicio">${icon("grip", 16)}</button>
      <span class="vt-organize-name" style="color:${groupColor(ex?.group) || "var(--text)"}">${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}</span>
      <button type="button" class="vt-select-circle ${selected ? "is-on" : ""}" data-a="exercise-select-toggle" data-idx="${idx}" aria-label="Seleccionar ejercicio"></button>
    </div>
  </div>`;
}

// Barra sticky con las acciones sobre lo seleccionado — vacía si no hay nada elegido.
function organizeActionBarHTML() {
  const n = ui.selectedExercises.size;
  if (n === 0) return "";
  return `<div class="vt-organize-bar">
    <span class="vt-organize-count">${n} seleccionado${n !== 1 ? "s" : ""}</span>
    <div class="vt-organize-actions">
      <button class="vt-btn-ghost vt-danger" data-a="organize-delete">${icon("trash", 16)} Eliminar</button>
      ${n >= 2 ? `<button class="vt-btn-ghost" data-a="organize-group">${icon("link", 16)} Agrupar</button>` : ""}
      ${n === 1 ? `<button class="vt-btn-ghost" data-a="organize-replace">${icon("repeat", 16)} Reemplazar</button>` : ""}
    </div>
  </div>`;
}

// Agrupa los índices seleccionados en una superserie consecutiva a partir de
// la posición del primero. Si alguno venía de otro grupo, el que quedaba
// justo después de él (si no está también seleccionado) pierde su linkPrev
// — su "anterior" se está por ir, así que empieza un grupo propio nuevo.
function groupAsSuperset(list, indices) {
  const sel = new Set(indices);
  for (let i = 1; i < list.length; i++) {
    if (!sel.has(i) && list[i].linkPrev && sel.has(i - 1)) list[i].linkPrev = false;
  }
  const sortedSel = [...indices].sort((a, b) => a - b);
  const insertAt = sortedSel[0];
  const items = sortedSel.map((i) => list[i]);
  for (let k = sortedSel.length - 1; k >= 0; k--) list.splice(sortedSel[k], 1);
  list.splice(insertAt, 0, ...items);
  items.forEach((it, k) => { it.linkPrev = k > 0; });
}

function lastSetsFor(exId) {
  for (const s of sessions) {
    const found = s.exercises.find((e) => e.exerciseId === exId && e.sets.length > 0);
    if (found) return found.sets;
  }
  return null;
}

function fmtSet(type, s, unilateral) {
  const w = typePrefix(getSetType(s));
  const rpe = s.rpe ? ` @${s.rpe}` : "";
  if (type === "time") return `${w}${fmtClock(num(s.seconds))}${num(s.weight) > 0 ? ` +${num(s.weight)}kg` : ""}${rpe}`;
  if (unilateral) {
    const sides = `I${repsL(s)} D${repsR(s)}`;
    return num(s.weight) > 0 ? `${w}${num(s.weight)}kg · ${sides}${rpe}` : `${w}${sides}${rpe}`;
  }
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
  el.style.setProperty("--rest-pct", pct + "%");
  el.innerHTML = `
    <div class="vt-rest-info">
      <div class="vt-rest-label">Descanso</div>
      <div class="vt-rest-time">${fmtClock(left)}</div>
    </div>
    <button class="vt-rest-cancel" data-a="rest-cancel" aria-label="Cancelar descanso">${icon("x", 20)}</button>`;
}

// Barra flotante de sesión minimizada — mismo nivel visual que #restbar
// (ambas viven en #floating-stack, ver render()). Reloj propio (id
// distinto de #live-clock) para que el tick de 1s lo actualice sin
// depender de render(); el volumen no necesita tick porque no cambia
// mientras la sesión está minimizada (sus inputs no están en el DOM).
function updateMinimizedBar() {
  const el = document.getElementById("minimized-bar");
  if (!el) return;
  if (!ui.activeSession || !ui.sessionMinimized) { el.className = "is-hidden"; el.innerHTML = ""; return; }
  const s = ui.activeSession;
  const vol = sessionVolume(s, true);
  el.className = "";
  el.innerHTML = `
    <button type="button" class="vt-minibar-btn" data-a="session-restore">
      <span class="vt-minibar-name">${esc(s.routineName)}</span>
      <span class="vt-minibar-stats">
        <span id="live-clock-mini">${fmtClock((Date.now() - new Date(s.date).getTime()) / 1000)}</span>
        <span>${Math.round(vol).toLocaleString("es-CL")} kg</span>
      </span>
    </button>`;
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

// "rutinas" fusiona lo que antes eran dos pestañas separadas (Rutinas +
// Entrenar): muestra la sesión activa cuando hay una y no está minimizada,
// si no la lista de rutinas (que a su vez incluye iniciar rutina y sesión
// libre — ver routinesHTML). El punto verde de sesión activa vive acá.
const NAV_ITEMS = [
  { id: "rutinas", label: "Entrenar", ic: "play" },
  { id: "historial", label: "Historial", ic: "history" },
  { id: "progreso", label: "Progreso", ic: "trend" },
  { id: "ajustes", label: "Ajustes", ic: "sliders" },
];

function render() {
  let view = "";
  if (ui.tab === "rutinas") {
    if (ui.editingRoutine) view = editorHTML();
    else if (ui.activeSession && !ui.sessionMinimized) view = trainActiveHTML();
    else view = routinesHTML();
  }
  else if (ui.tab === "historial") view = historyHTML();
  else if (ui.tab === "progreso") view = progressHTML();
  else if (ui.tab === "ajustes") view = ui.manageGroups ? groupsManagerHTML() : (ui.manageExercises ? exercisesManagerHTML() : settingsHTML());

  $app.innerHTML = `
    <div class="vt-frame">
      <div class="vt-content">${view}</div>
      <div id="floating-stack">
        <div id="minimized-bar" class="is-hidden"></div>
        <div id="restbar" class="is-hidden"></div>
      </div>
      <nav class="vt-nav">
        ${NAV_ITEMS.map((n) => `
          <button class="vt-nav-item ${ui.tab === n.id ? "is-active" : ""}" data-a="tab" data-tab="${n.id}">
            ${icon(n.ic, 20)}<span>${n.label}</span>
            ${n.id === "rutinas" && ui.activeSession ? '<span class="vt-dot"></span>' : ""}
          </button>`).join("")}
      </nav>
    </div>
    ${ui.picker ? pickerHTML() : ""}
    ${ui.exerciseModal ? exerciseModalHTML() : ""}
    ${ui.sessionSummary ? sessionSummaryHTML() : ""}
    ${ui.confirmDialog ? confirmDialogHTML() : ""}
    ${ui.folderModal ? folderModalHTML() : ""}
    ${ui.movingRoutineId && !ui.folderModal ? moveRoutineHTML() : ""}
    ${ui.groupModal ? groupModalHTML() : ""}
    ${ui.pasteJsonModal ? pasteJsonModalHTML() : ""}`;

  updateRestBar();
  updateMinimizedBar();
  if (ui.tab === "progreso") mountChart();
  mountSortables();
}

// Reordenar ejercicios por arrastre (manija .vt-drag-handle), en el editor de rutina
// y en la sesión activa. Cada render() reconstruye el DOM, así que las instancias
// anteriores se destruyen y se vuelven a crear sobre los nuevos contenedores.
let sortableEditor = null;
let sortableSession = null;

// El arrastre debe verse solo vertical (es una lista, no un tablero libre).
// SortableJS (en forceFallback) mueve el "fantasma" siguiendo X e Y del dedo
// escribiendo su transform en cada pointermove/touchmove/mousemove sobre
// document. Registramos nuestro propio listener para esos mismos eventos
// DESPUÉS de que Sortable arranca el drag (SortableJS ya registró los suyos
// en ese punto), así el nuestro corre justo después del suyo en cada evento
// y reescribe la matrix con e=0 (sin desplazamiento horizontal) antes de que
// el navegador pinte el frame.
function lockGhostVerticalOnce() {
  const ghost = typeof Sortable !== "undefined" ? Sortable.ghost : null;
  if (!ghost) return;
  const t = getComputedStyle(ghost).transform;
  if (t && t !== "none") {
    const m = new DOMMatrix(t);
    ghost.style.transform = `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, 0, ${m.f})`;
  }
}
function startGhostLock() {
  document.addEventListener("pointermove", lockGhostVerticalOnce);
  document.addEventListener("touchmove", lockGhostVerticalOnce);
  document.addEventListener("mousemove", lockGhostVerticalOnce);
}
function stopGhostLock() {
  document.removeEventListener("pointermove", lockGhostVerticalOnce);
  document.removeEventListener("touchmove", lockGhostVerticalOnce);
  document.removeEventListener("mousemove", lockGhostVerticalOnce);
}

function mountSortables() {
  if (sortableEditor) { sortableEditor.destroy(); sortableEditor = null; }
  if (sortableSession) { sortableSession.destroy(); sortableSession = null; }
  if (typeof Sortable === "undefined") return; // CDN aún no cargó (o sin conexión la primera vez)

  const editorList = document.getElementById("editor-exercise-list");
  if (editorList) {
    sortableEditor = Sortable.create(editorList, {
      handle: ".vt-drag-handle",
      animation: 150,
      forceFallback: true, // evita drag-and-drop nativo HTML5 (poco fiable en touch/PWA instalada)
      onStart: startGhostLock,
      onEnd: (evt) => {
        stopGhostLock();
        if (evt.oldIndex === evt.newIndex) return;
        const [moved] = ui.editingRoutine.exercises.splice(evt.oldIndex, 1);
        ui.editingRoutine.exercises.splice(evt.newIndex, 0, moved);
        render();
      },
    });
  }

  const sessionList = document.getElementById("session-exercise-list");
  if (sessionList) {
    sortableSession = Sortable.create(sessionList, {
      handle: ".vt-drag-handle",
      animation: 150,
      forceFallback: true,
      onStart: startGhostLock,
      onEnd: (evt) => {
        stopGhostLock();
        if (evt.oldIndex === evt.newIndex) return;
        const [moved] = ui.activeSession.exercises.splice(evt.oldIndex, 1);
        ui.activeSession.exercises.splice(evt.newIndex, 0, moved);
        render();
      },
    });
  }
}

/* --------------------------------- Vista Rutinas -------------------------------- */

function routineCardHTML(r, map, lastUsed) {
  const last = lastUsed(r.id);
  return `<div class="vt-block">
    <div class="vt-card-top"><div>
      <h3>${esc(r.name) || "Sin nombre"}</h3>
      <p class="vt-muted">${r.exercises.length} ejercicio${r.exercises.length !== 1 ? "s" : ""}${last ? ` · última vez ${fmtDateShort(last)}` : " · sin usar"}</p>
    </div></div>
    <div class="vt-tags">
      ${r.exercises.slice(0, 4).map((re) =>
        `<span class="vt-tag" style="border-color:${groupColor(map[re.exerciseId]?.group) || "var(--line)"}">${esc(map[re.exerciseId]?.name || "Ejercicio")}</span>`).join("")}
      ${r.exercises.length > 4 ? `<span class="vt-tag vt-tag-more">+${r.exercises.length - 4}</span>` : ""}
    </div>
    <div class="vt-card-actions">
      <button class="vt-btn-primary vt-flex" data-a="routine-start" data-id="${r.id}">${icon("play", 18)} Iniciar</button>
      <button class="vt-btn-ghost" data-a="routine-edit" data-id="${r.id}" aria-label="Editar">${icon("pencil", 16)}</button>
      <button class="vt-btn-ghost" data-a="routine-dup" data-id="${r.id}" aria-label="Duplicar">${icon("copy", 16)}</button>
      <button class="vt-btn-ghost" data-a="routine-move" data-id="${r.id}" aria-label="Mover a carpeta">${icon("folder", 16)}</button>
      <button class="vt-btn-ghost vt-danger" data-a="routine-del" data-id="${r.id}" aria-label="Eliminar">${icon("trash", 16)}</button>
    </div>
  </div>`;
}

function routinesHTML() {
  const map = exMap();
  const lastUsed = (rid) => { const s = sessions.find((s) => s.routineId === rid); return s ? s.date : null; };

  const loose = routines.filter((r) => !r.folderId);
  const looseHTML = loose.length ? `<div class="vt-list">${loose.map((r) => routineCardHTML(r, map, lastUsed)).join("")}</div>` : "";

  const foldersHTML = routineFolders.map((f) => {
    const inFolder = routines.filter((r) => r.folderId === f.id);
    // openFolders persiste en settings — por defecto (array vacío) todas colapsadas.
    const collapsed = !(settings.openFolders || []).includes(f.id);
    return `<div class="vt-folder">
      <div class="vt-folder-head-row">
        <button class="vt-folder-toggle" data-a="folder-toggle" data-id="${f.id}">
          ${icon(collapsed ? "chevDown" : "chevUp", 16)}
          <span class="vt-folder-name">${esc(f.name)}</span>
          <span class="vt-muted-sm">${inFolder.length} rutina${inFolder.length !== 1 ? "s" : ""}</span>
        </button>
        <button class="vt-btn-ghost" data-a="folder-edit" data-id="${f.id}" aria-label="Renombrar carpeta">${icon("pencil", 14)}</button>
        <button class="vt-btn-ghost vt-danger" data-a="folder-del" data-id="${f.id}" aria-label="Eliminar carpeta">${icon("trash", 14)}</button>
      </div>
      ${collapsed ? "" : (inFolder.length
        ? `<div class="vt-list">${inFolder.map((r) => routineCardHTML(r, map, lastUsed)).join("")}</div>`
        : `<p class="vt-muted" style="padding:0 4px 14px">Sin rutinas todavía — usa el ícono de carpeta en una rutina para moverla acá.</p>`)}
    </div>`;
  }).join("");

  const body = routines.length === 0 && routineFolders.length === 0
    ? emptyHTML("Aún no armas ninguna rutina",
        "Crea tu primera rutina de entrenamiento — sin límite de cuántas puedes guardar, aunque las cambies cada mes.",
        `<button class="vt-btn-primary" data-a="routine-new">Crear rutina</button>`)
    : looseHTML + foldersHTML;

  return `
    <header class="vt-header">
      ${tabHeaderHTML("Set 01 · Preparación", "Rutinas")}
      <div style="display:flex;gap:8px">
        <button class="vt-btn-icon" data-a="folder-new" aria-label="Nueva carpeta">${icon("folder", 20)}</button>
        <button class="vt-btn-icon" data-a="routine-new" aria-label="Nueva rutina">${icon("plus", 22)}</button>
      </div>
    </header>${body}
    <button class="vt-btn-outline vt-flex-center" data-a="train-free">${icon("plus", 18)} Sesión libre</button>`;
}

function folderModalHTML() {
  const m = ui.folderModal;
  return `
    <div class="vt-modal-backdrop" data-a="folder-modal-cancel">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">${m.id ? "Renombrar carpeta" : "Nueva carpeta"}</h2>
          <button class="vt-btn-ghost" data-a="folder-modal-cancel">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-form">
          <label>Nombre
            <input type="text" class="vt-input" id="fold-name" value="${esc(m.name)}" placeholder="Ej: Junio 2026" autocomplete="off">
          </label>
        </div>
        <div class="vt-modal-actions">
          <button class="vt-btn-primary" data-a="folder-modal-save">Guardar</button>
        </div>
      </div>
    </div>`;
}

function pasteJsonModalHTML() {
  return `
    <div class="vt-modal-backdrop" data-a="paste-json-cancel">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">Pegar JSON</h2>
          <button class="vt-btn-ghost" data-a="paste-json-cancel">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-form">
          <textarea class="vt-input vt-textarea" id="paste-json-text" rows="8"
            placeholder="Pega acá el JSON de un respaldo completo o de rutinas/ejercicios" autocomplete="off"></textarea>
        </div>
        <div class="vt-modal-actions">
          <button class="vt-btn-primary" data-a="paste-json-import">Importar</button>
        </div>
      </div>
    </div>`;
}

function moveRoutineHTML() {
  return `
    <div class="vt-modal-backdrop" data-a="move-close">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">Mover a carpeta</h2>
          <button class="vt-btn-ghost" data-a="move-close">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-body">
          <button class="vt-modal-row" data-a="move-pick" data-folder="">${icon("x", 15)} Sin carpeta</button>
          ${routineFolders.map((f) => `<button class="vt-modal-row" data-a="move-pick" data-folder="${f.id}">${icon("folder", 15)} ${esc(f.name)}</button>`).join("")}
          <button class="vt-modal-row vt-modal-add" data-a="move-new-folder">${icon("plus", 16)} Nueva carpeta</button>
        </div>
      </div>
    </div>`;
}

/* -------------------------------- Editor de rutina ------------------------------- */

function editorHTML() {
  const r = ui.editingRoutine;
  const map = exMap();
  const ssLabels = computeSupersetLabels(r.exercises);
  const editMode = ui.exerciseEditMode;
  return `
    <header class="vt-header">
      <button class="vt-btn-icon" data-a="editor-cancel" aria-label="Volver">${icon("back", 20)}</button>
      <h1 class="vt-header-title">${r.isNew ? "Nueva rutina" : "Editar rutina"}</h1>
      <div style="width:40px"></div>
    </header>
    <input class="vt-input vt-input-title" placeholder="Nombre de la rutina (ej: Fuerza semana 1)"
      value="${esc(r.name)}" data-i="editor-name" autocomplete="off">
    ${organizeToggleHTML()}
    <div class="vt-list" id="editor-exercise-list">
      ${r.exercises.map((it, idx) => {
        const ex = map[it.exerciseId];
        const lbl = ssLabels[idx];
        if (editMode) return exerciseOrganizeRowHTML(idx, ex, lbl);
        const t = ex?.type || "weight";
        const isPct = it.loadMode === "percent";
        const oneRM = num(map[it.exerciseId]?.oneRM);
        let fields = `
          ${numFieldHTML("Series", "targetSets", idx, it.targetSets, 1)}
          ${numFieldHTML("Reps", "targetReps", idx, it.targetReps, 1)}`;
        if (t === "weight" || t === "bodyweight") {
          fields += isPct
            ? numFieldHTML("% 1RM", "targetPercent", idx, it.targetPercent ?? 70, 5)
            : numFieldHTML(t === "weight" ? "Kg" : "Lastre kg", "targetWeight", idx, it.targetWeight, 2.5);
        } else {
          fields = `
          ${numFieldHTML("Series", "targetSets", idx, it.targetSets, 1)}
          ${numFieldHTML("Segundos", "targetSeconds", idx, it.targetSeconds ?? 30, 5, true)}
          ${numFieldHTML("Kg", "targetWeight", idx, it.targetWeight, 2.5)}`;
        }
        fields += numFieldHTML("Descanso s", "restSeconds", idx, it.restSeconds, 15);
        let loadmode = "";
        if (t !== "time") {
          const calc = !isPct ? "" : (oneRM > 0
            ? `= ${pctKg(oneRM, it.targetPercent ?? 70)} kg (1RM ${oneRM} kg)`
            : "Define el 1RM de este ejercicio en Ajustes → Ejercicios");
          loadmode = `<div class="vt-loadmode">
            <button class="${!isPct ? "is-active" : ""}" data-a="editor-loadmode" data-idx="${idx}" data-mode="kg">KG</button>
            <button class="${isPct ? "is-active" : ""}" data-a="editor-loadmode" data-idx="${idx}" data-mode="percent">%1RM</button>
            <span class="vt-muted-sm" id="pct-calc-${idx}" style="${oneRM > 0 ? "" : "color:var(--red)"}">${calc}</span>
          </div>`;
        }
        return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${blockAccentColor(ex, lbl)}">
          <div class="vt-block-row">
            <button type="button" class="vt-drag-handle" aria-label="Reordenar ejercicio">${icon("grip", 16)}</button>
            <div class="vt-block-body">
              <div class="vt-card-top">
                <h3 style="color:${groupColor(ex?.group) || "var(--text)"}">${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}</h3>
              </div>
              <div class="vt-target-row">${fields}</div>
              ${loadmode}
              <input type="text" class="vt-input" style="margin-top:10px" placeholder="Nota (ej: profunda, subir altura)"
                value="${esc(it.note || "")}" data-i="editor-note" data-idx="${idx}" autocomplete="off">
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-flex-center" data-a="picker-open" data-ctx="editor">${icon("plus", 18)} Agregar ejercicio</button>
    ${editMode ? organizeActionBarHTML() : `<div class="vt-sticky-footer">
      <button class="vt-btn-primary vt-full" data-a="editor-save">Guardar rutina</button>
    </div>`}`;
}

function numFieldHTML(label, field, idx, value, step, isClock = false) {
  const valueAttrs = isClock
    ? `type="text" inputmode="numeric" value="${fmtClock(num(value))}"`
    : `type="number" inputmode="decimal" value="${num(value)}" step="${step}"`;
  return `<label class="vt-numfield"><span>${label}</span>
    <input class="vt-input vt-mono" ${valueAttrs}
      data-i="editor-target" data-field="${field}" data-idx="${idx}"
      autocomplete="off" autocorrect="off" spellcheck="false" name="f_${field}_${idx}"></label>`;
}

/* --------------------------------- Vista Entrenar -------------------------------- */

// Un ejercicio está "completo" cuando todas sus series NO calentamiento
// tienen done=true y hay al menos una (drop set/fallida sí cuentan acá,
// solo calentamiento queda afuera).
function isExerciseComplete(e) {
  const effective = e.sets.filter((st) => getSetType(st) !== "warmup");
  return effective.length > 0 && effective.every((st) => st.done);
}

function trainActiveHTML() {
  const s = ui.activeSession;
  const map = exMap();
  const vol = sessionVolume(s, true);
  const ssLabels = computeSupersetLabels(s.exercises);
  const editMode = ui.exerciseEditMode;

  return `
    <header class="vt-header vt-header-sticky">
      <div class="vt-header-brand"><div>
        <p class="vt-eyebrow">${fmtDate(s.date)}</p>
        ${s.routineId === null
          ? `<input type="text" class="vt-session-name-input" value="${esc(s.routineName)}" data-i="session-name" autocomplete="off">`
          : `<h1 class="vt-header-title-sm">${esc(s.routineName)}</h1>`}
      </div></div>
      <div style="display:flex;align-items:center;gap:14px">
        <div style="display:flex;gap:22px">
          <span class="vt-scoreboard"><span id="live-clock">${fmtClock((Date.now() - new Date(s.date).getTime()) / 1000)}</span><small>TIEMPO</small></span>
          <span class="vt-scoreboard"><span id="live-vol">${Math.round(vol).toLocaleString("es-CL")}</span> kg<small>VOLUMEN</small></span>
        </div>
        <button class="vt-btn-ghost" data-a="session-minimize" aria-label="Minimizar sesión">${icon("chevDown", 20)}</button>
      </div>
    </header>
    ${organizeToggleHTML()}
    <div class="vt-list" id="session-exercise-list">
      ${s.exercises.map((e, exIdx) => {
        const ex = map[e.exerciseId];
        const lbl = ssLabels[exIdx];
        if (editMode) return exerciseOrganizeRowHTML(exIdx, ex, lbl);

        const t = ex?.type || "weight";
        const uni = !!ex?.unilateral;
        const prior = priorStats(e.exerciseId);
        const complete = isExerciseComplete(e);
        const anyPR = e.sets.some((st) => isPR(t, st, prior, uni));
        const accent = blockAccentColor(ex, lbl);

        if (ui.collapsedExercises.has(exIdx)) {
          return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${accent}">
            <button type="button" class="vt-collapsed-row" data-a="ex-toggle-collapse" data-ex="${exIdx}">
              <span class="vt-collapsed-name" style="color:${groupColor(ex?.group) || "var(--text)"}">${esc(ex?.name || "(eliminado)")}</span>
              ${complete ? `<span class="vt-collapsed-check">${icon("check", 12)}</span>` : ""}
              ${anyPR ? `<span class="vt-pr" title="¡PR!">${icon("trophy", 14)}</span>` : ""}
              ${icon("chevDown", 16)}
            </button>
          </div>`;
        }

        const last = lastSetsFor(e.exerciseId);
        return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${accent}">
          <div class="vt-block-row">
            <button type="button" class="vt-drag-handle" aria-label="Reordenar ejercicio">${icon("grip", 16)}</button>
            <div class="vt-block-body">
              <div class="vt-card-top">
                <h3 style="color:${groupColor(ex?.group) || "var(--text)"}">${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}${e.target?.percent ? `<span class="vt-badge" style="margin-left:7px">@${e.target.percent}%</span>` : ""}</h3>
                <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                  <span class="vt-rest-mini vt-muted-sm">Descanso
                    <input type="number" inputmode="numeric" class="vt-input vt-mono" min="0" step="15"
                      value="${num(e.restSeconds) > 0 ? num(e.restSeconds) : ""}" placeholder="${num(settings.restSeconds)}"
                      data-i="ex-rest" data-ex="${exIdx}"
                      autocomplete="off" autocorrect="off" spellcheck="false" name="f_exrest_${exIdx}"> s
                  </span>
                  <button class="vt-btn-ghost" data-a="session-note-toggle" data-ex="${exIdx}" aria-label="Nota del ejercicio" style="${e.sessionNote ? "color:var(--amber)" : ""}">${icon("note", 15)}</button>
                  <button class="vt-btn-ghost" data-a="ex-toggle-collapse" data-ex="${exIdx}" aria-label="Colapsar">${icon("chevUp", 16)}</button>
                </div>
              </div>
              ${e.note ? `<p class="vt-coach-note">${esc(e.note)}</p>` : ""}
              ${ui.openExNotes.has(exIdx) ? `<input type="text" class="vt-input" style="margin:6px 0" placeholder="Nota de este ejercicio hoy…" value="${esc(e.sessionNote || "")}" data-i="session-note" data-ex="${exIdx}" autocomplete="off">` : ""}
              ${last ? `<p class="vt-lasttime">Última vez: ${last.map((x) => fmtSet(t, x, uni)).join(", ")}</p>` : ""}
              <div class="vt-sets">
                ${e.sets.length ? setCapsHTML(t, uni) : ""}
                ${(() => {
                  let n = 0; // las efectivas se numeran 1..n; C/D/F muestran su letra
                  return e.sets.map((st, setIdx) => {
                    const stype = getSetType(st);
                    const label = stype === "warmup" ? "C" : stype === "dropset" ? "D" : stype === "failed" ? "F" : String(++n);
                    return setRowHTML(t, st, exIdx, setIdx, prior, label, uni);
                  }).join("");
                })()}
              </div>
              <button class="vt-btn-outline vt-small" data-a="set-add" data-ex="${exIdx}">${icon("plus", 14)} Agregar serie</button>
            </div>
          </div>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-flex-center" data-a="picker-open" data-ctx="session">${icon("plus", 18)} Agregar ejercicio</button>
    ${editMode ? organizeActionBarHTML() : `<div class="vt-sticky-footer vt-footer-split">
      <button class="vt-btn-ghost vt-danger" data-a="session-discard">Descartar</button>
      <button class="vt-btn-primary vt-flex" data-a="session-finish">${icon("check", 18)} Finalizar sesión</button>
    </div>`}`;
}

// Encabezados de columnas sobre la primera serie, alineados con los inputs.
// Los anchos de cada columna deben ser EXACTAMENTE los del input real que
// representan (no un ancho genérico) — ver .vt-set-input/-sm/-clock y
// .vt-timer-btn en estilos.css. El gap/padding del contenedor también debe
// calzar con el de .vt-set-row (o .vt-set-row-time) de ese mismo tipo.
function setCapsHTML(type, unilateral) {
  const cap = (t, w) => `<span class="vt-cap" style="width:${w}px">${t}</span>`;
  const gap = (t) => `<span class="vt-x" style="visibility:hidden">${t}</span>`;
  let inner, rowClass = "";
  if (type === "time") {
    // seg (60px, .vt-set-input-clock) + kg (30px, .vt-set-input-sm en fila
    // angosta) + hueco reservado para el botón de cronómetro (36px, .vt-timer-btn).
    inner = cap("tiempo", 60) + cap("+kg", 30) + `<span class="vt-cap-timerbtn" aria-hidden="true"></span>`;
    rowClass = "vt-set-caps-time";
  } else if (unilateral) {
    // kg (44px, .vt-set-input-uniw) + izq/der (36px c/u, .vt-set-input-uni).
    inner = cap("kg", 44) + cap("izq", 36) + cap("der", 36);
    rowClass = "vt-set-caps-uni";
  } else if (type === "bodyweight") {
    inner = cap("reps", 52) + cap("+kg", 52);
  } else {
    inner = cap("kg", 52) + gap("×") + cap("reps", 52);
  }
  // settype (30px, botón único) + check (30px) — reemplaza los viejos
  // spacers de warmup(28)+num(16) de cuando eran elementos separados.
  return `<div class="vt-set-caps ${rowClass}" aria-hidden="true"><span class="vt-cap-settype"></span><span class="vt-cap-check"></span>${inner}</div>`;
}

// "MM:SS" o "H:MM:SS" para el cronómetro de sesión.
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// Inverso de fmtClock: "1:30" o "1:02:03" → segundos totales. Sin ":" se
// trata como segundos puros (compatibilidad con quien tipea "90" directo).
// El almacenamiento siempre es en segundos; esto es solo parseo de entrada.
function parseClock(str) {
  const s = String(str ?? "").trim();
  if (!s.includes(":")) return Math.max(0, num(s));
  const parts = s.split(":").map((p) => num(p));
  if (parts.length === 2) return Math.max(0, parts[0] * 60 + parts[1]);
  if (parts.length === 3) return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
  return 0;
}

// "47 min" o "1 h 12 min" para el historial.
function fmtDurationMin(sec) {
  const min = Math.max(1, Math.round(num(sec) / 60));
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

// Cronómetro inline de una serie tipo "time". Fuera de `ui` para no forzar re-render.
// Solo una serie puede correr a la vez en toda la app.
let runningTimer = null; // { exIdx, setIdx, startedAt, baseValue }

const runningValue = () =>
  runningTimer ? runningTimer.baseValue + Math.floor((Date.now() - runningTimer.startedAt) / 1000) : 0;

// Detiene el cronómetro dejando el valor acumulado en la serie (editable a mano después).
function stopSetTimer() {
  if (!runningTimer) return;
  const st = ui.activeSession?.exercises[runningTimer.exIdx]?.sets[runningTimer.setIdx];
  if (st) st.seconds = runningValue();
  runningTimer = null;
}

// Tick único y global: escribe directo en el DOM por id/selector, nunca render() (patrón #live-vol).
setInterval(() => {
  const clock = document.getElementById("live-clock");
  if (clock && ui.activeSession)
    clock.textContent = fmtClock((Date.now() - new Date(ui.activeSession.date).getTime()) / 1000);
  const miniClock = document.getElementById("live-clock-mini");
  if (miniClock && ui.activeSession)
    miniClock.textContent = fmtClock((Date.now() - new Date(ui.activeSession.date).getTime()) / 1000);

  if (!runningTimer) return;
  const st = ui.activeSession?.exercises[runningTimer.exIdx]?.sets[runningTimer.setIdx];
  if (!st) { runningTimer = null; return; }
  st.seconds = runningValue();
  const input = document.querySelector(
    `input[data-i="set"][data-f="seconds"][data-ex="${runningTimer.exIdx}"][data-set="${runningTimer.setIdx}"]`);
  // Si el input no está en el DOM (otra pestaña) no pasa nada; el valor sigue acumulando en el estado.
  if (input && document.activeElement !== input) input.value = fmtClock(st.seconds);
}, 1000);

// Selector chico de tipo de serie: se expande bajo la fila (mismo patrón que
// la línea de RPE), un tap elige y cierra.
function typeSelectorHTML(exIdx, setIdx) {
  const opts = [
    { type: "", label: "1", cls: "", aria: "Normal" },
    { type: "warmup", label: "C", cls: "is-warmup", aria: "Calentamiento" },
    { type: "dropset", label: "D", cls: "is-dropset", aria: "Drop set" },
    { type: "failed", label: "F", cls: "is-failed", aria: "Fallida" },
  ];
  return `<div class="vt-type-picker">
    ${opts.map((o) => `<button type="button" class="vt-type-picker-opt ${o.cls}" data-a="settype-pick" data-ex="${exIdx}" data-set="${setIdx}" data-type="${o.type}" aria-label="${o.aria}">${o.label}</button>`).join("")}
  </div>`;
}

function setRowHTML(type, st, exIdx, setIdx, prior, label, unilateral) {
  const stype = getSetType(st);
  const pr = isPR(type, st, prior, unilateral);
  const open = ui.openNotes.has(`${exIdx}:${setIdx}`);
  const typeKey = `${exIdx}:${setIdx}`;
  const openType = ui.openTypeSelector === typeKey;
  const typeBtnClass = stype === "warmup" ? "is-warmup" : stype === "dropset" ? "is-dropset" : stype === "failed" ? "is-failed" : "";
  const attrs = (f) =>
    `data-i="set" data-f="${f}" data-ex="${exIdx}" data-set="${setIdx}" autocomplete="off" autocorrect="off" spellcheck="false" name="f_${f}_${exIdx}_${setIdx}"`;

  let fields = "";
  if (type === "time") {
    const running = !!(runningTimer && runningTimer.exIdx === exIdx && runningTimer.setIdx === setIdx);
    fields = `
      <input type="text" inputmode="numeric" class="vt-input vt-mono vt-set-input vt-set-input-clock ${running ? "is-running" : ""}" value="${fmtClock(num(st.seconds))}" ${attrs("seconds")}>
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input vt-set-input-sm" value="${num(st.weight)}" ${attrs("weight")}>
      <button class="vt-timer-btn ${running ? "is-running" : ""}" data-a="set-timer" data-ex="${exIdx}" data-set="${setIdx}"
        aria-label="${running ? "Pausar cronómetro" : "Cronometrar serie"}">${icon(running ? "pause" : "playBtn", 13)}</button>`;
  } else if (unilateral) {
    // Peso compartido + reps por lado (izq/der) en vez de un solo input de reps.
    fields = `
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input vt-set-input-uniw" value="${num(st.weight)}" ${attrs("weight")}>
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input vt-set-input-uni" value="${repsL(st)}" ${attrs("repsL")}>
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input vt-set-input-uni" value="${repsR(st)}" ${attrs("repsR")}>`;
  } else if (type === "bodyweight") {
    fields = `
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input" value="${num(st.reps)}" ${attrs("reps")}>
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input" value="${num(st.weight)}" ${attrs("weight")}>`;
  } else {
    fields = `
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-set-input" value="${num(st.weight)}" ${attrs("weight")}>
      <span class="vt-x">×</span>
      <input type="number" inputmode="numeric" class="vt-input vt-mono vt-set-input" value="${num(st.reps)}" ${attrs("reps")}>`;
  }

  return `
    <div class="vt-swipe-wrap" data-ex="${exIdx}" data-set="${setIdx}">
      <div class="vt-swipe-bg" aria-hidden="true">${icon("trash", 18)}</div>
      <div class="vt-set-row ${type === "time" ? "vt-set-row-time" : ""} ${unilateral ? "vt-set-row-uni" : ""} ${stype === "warmup" ? "is-warmup" : ""} ${st.done ? "is-done" : ""} ${pr ? "is-pr" : ""}">
        <button class="vt-settype-btn ${typeBtnClass}" data-a="settype-toggle" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Tipo de serie">${label}</button>
        <button class="vt-check" data-a="set-check" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Marcar serie">${icon("check", 15)}</button>
        ${fields}
        ${pr ? `<span class="vt-pr" title="¡PR!">${icon("trophy", 16)}</span>` : ""}
        <button class="vt-btn-ghost" data-a="set-notes" data-ex="${exIdx}" data-set="${setIdx}" aria-label="RPE" style="${st.rpe ? "color:var(--amber)" : ""}">${icon("gauge", 15)}</button>
      </div>
    </div>
    ${openType ? typeSelectorHTML(exIdx, setIdx) : ""}
    ${open ? `<div class="vt-setline2">
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-rpe-input" placeholder="RPE" min="1" max="10" step="0.5"
        value="${st.rpe ?? ""}" ${attrs("rpe")}>
    </div>` : ""}`;
}

/* --------------------------------- Vista Historial ------------------------------- */

function historyHTML() {
  const list = sessions.length === 0
    ? emptyHTML("Sin sesiones registradas", "Cuando termines un entrenamiento, va a aparecer acá.", "")
    : `<div class="vt-list">${sessions.map((s) => {
        const open = ui.openHistory === s.id;
        const volume = sessionVolume(s, false);
        return `<div class="vt-block">
          <div style="display:flex;align-items:center;gap:6px">
            <button class="vt-full-btn" data-a="hist-toggle" data-id="${s.id}">
              <div>
                <h3>${esc(s.routineName)}</h3>
                <p class="vt-muted">${icon("calendar", 12)} ${fmtDate(s.date)} · ${Math.round(volume).toLocaleString("es-CL")} kg vol.${s.durationSec ? ` · ${fmtDurationMin(s.durationSec)}` : ""}</p>
              </div>
              ${icon(open ? "chevUp" : "chevDown", 18)}
            </button>
            <button class="vt-btn-ghost" data-a="session-repeat" data-id="${s.id}" aria-label="Repetir esta sesión">${icon("repeat", 16)}</button>
          </div>
          ${open ? `<div class="vt-session-detail">
            ${s.exercises.map((e) => {
              const t = exType(e.exerciseId);
              const uni = exUnilateral(e.exerciseId);
              const notes = e.sets.filter((st) => st.note).map((st) => esc(st.note));
              return `<div class="vt-detail-row">
                  <span style="color:${groupColor(exGroup(e.exerciseId))}">${esc(exName(e.exerciseId))}</span>
                  <span class="vt-mono vt-muted-sm">${e.sets.map((st) => fmtSet(t, st, uni)).join(", ")}</span>
                </div>
                ${e.note ? `<div class="vt-coach-note">${esc(e.note)}</div>` : ""}
                ${e.sessionNote ? `<div class="vt-note-line">— ${esc(e.sessionNote)}</div>` : ""}
                ${notes.length ? `<div class="vt-note-line">— ${notes.join(" · ")}</div>` : ""}`;
            }).join("")}
            <button class="vt-btn-ghost vt-danger vt-small" data-a="hist-del" data-id="${s.id}">${icon("trash", 14)} Eliminar sesión</button>
          </div>` : ""}
        </div>`;
      }).join("")}</div>`;

  return `
    <header class="vt-header">
      ${tabHeaderHTML("Set 02 · Registro", "Historial")}
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
  const uni = exUnilateral(exId);
  const pts = [];
  [...sessions].reverse().forEach((s) => {
    const e = s.exercises.find((x) => x.exerciseId === exId);
    if (!e || e.sets.length === 0) return;
    let v;
    if (metric === "volume") v = Math.round(e.sets.reduce((a, st) => a + setVol(t, st, uni), 0));
    else {
      // Los máximos se calculan solo con series efectivas (sin C/D/F, mismo
      // criterio que priorStats); el volumen incluye todo.
      const eff = e.sets.filter((st) => !getSetType(st));
      if (!eff.length) return;
      // "reps" en unilateral usa el lado más débil, mismo criterio que el PR.
      v = Math.max(...eff.map((st) => metric === "reps" && uni ? Math.min(repsL(st), repsR(st)) : num(st[metric])));
    }
    pts.push({ date: fmtDateShort(s.date), v });
  });
  return pts;
}

const metricUnit = (m) => (m === "seconds" ? "s" : m === "reps" ? "reps" : "kg");

// Panel "Tus máximos": hasta 5 ejercicios destacados con su 1RM editable inline.
// El 1RM es el mismo dato del catálogo (exercises[i].oneRM), no una copia.
function featuredHTML() {
  const map = exMap();
  const ids = (settings.featuredExercises || []).filter((id) => map[id]); // ids huérfanos se ignoran
  const slots = ids.map((id) => `
    <div class="vt-max-slot">
      <span class="vt-max-name">${esc(map[id].name)}</span>
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-max-input" placeholder="—"
        value="${num(map[id].oneRM) > 0 ? num(map[id].oneRM) : ""}" data-i="featured-rm" data-id="${id}"
        autocomplete="off" autocorrect="off" spellcheck="false" name="f_maxrm_${id}">
      <span class="vt-muted-sm">kg</span>
      <button class="vt-btn-ghost vt-danger" data-a="featured-remove" data-id="${id}" aria-label="Quitar de destacados">${icon("x", 14)}</button>
    </div>`).join("");
  return `<div class="vt-card" style="margin-bottom:14px">
    <h3>Tus máximos</h3>
    ${slots || `<p class="vt-muted">Destaca hasta 5 ejercicios y edita su 1RM aquí mismo.</p>`}
    ${ids.length < 5 ? `<button class="vt-btn-outline vt-flex-center vt-small" style="width:100%" data-a="picker-open" data-ctx="featured">${icon("plus", 14)} Agregar</button>` : ""}
  </div>`;
}

function progressHTML() {
  const ids = exercisesWithHistory();
  const head = `<header class="vt-header">
    ${tabHeaderHTML("Set 03 · Análisis", "Progreso")}
  </header>` + featuredHTML();

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
      ${tabHeaderHTML("Set 04 · Configuración", "Ajustes")}
    </header>
    <div class="vt-card">
      <div class="vt-settings-row">
        <div class="vt-settings-label">Descanso entre series<small>Se usa cuando el ejercicio no define el suyo</small></div>
        <input type="number" inputmode="numeric" class="vt-input vt-mono" value="${num(settings.restSeconds)}" min="0" step="15" data-i="set-rest"
          autocomplete="off" autocorrect="off" spellcheck="false" name="f_restseconds">
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Sonido<small>Pitido al terminar el descanso</small></div>
        <input type="checkbox" class="vt-switch" ${settings.sound ? "checked" : ""} data-c="set-sound" autocomplete="off">
      </div>
      <div class="vt-settings-row">
        <div class="vt-settings-label">Vibración<small>Si tu teléfono lo permite</small></div>
        <input type="checkbox" class="vt-switch" ${settings.vibrate ? "checked" : ""} data-c="set-vibrate" autocomplete="off">
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
        <div style="display:flex;gap:8px">
          <label class="vt-btn-icon" style="cursor:pointer">${icon("upload", 16)}
            <input type="file" accept=".json,application/json" data-c="import-file" autocomplete="off">
          </label>
          <button class="vt-btn-icon" data-a="paste-json-open" aria-label="Pegar JSON">${icon("clipboard", 16)}</button>
        </div>
      </div>
    </div>
    <p class="vt-muted" style="text-align:center;margin-top:16px">GOAT · datos guardados en este dispositivo</p>`;
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
      <div style="display:flex;gap:8px">
        <button class="vt-btn-icon" data-a="groups-open" aria-label="Gestionar grupos">${icon("tag", 18)}</button>
        <button class="vt-btn-icon" data-a="ex-new" aria-label="Nuevo ejercicio">${icon("plus", 20)}</button>
      </div>
    </header>
    <div class="vt-list">
      ${groups.map((g) => `<div class="vt-group-block" style="border-left-color:${groupColor(g) || "var(--line)"}">
        <h3 class="vt-group-title">${esc(g)}</h3>
        ${byGroup[g].map((e) => `
          <div class="vt-ex-row">
            <div class="vt-ex-row-top">
              <span class="vt-ex-name">${esc(e.name)}</span>
              <button class="vt-btn-ghost" data-a="ex-edit" data-id="${e.id}" aria-label="Editar">${icon("pencil", 15)}</button>
              <button class="vt-btn-ghost vt-danger" data-a="ex-del" data-id="${e.id}" aria-label="Eliminar">${icon("trash", 15)}</button>
            </div>
            <div class="vt-ex-badges">
              ${num(e.oneRM) > 0 ? `<span class="vt-badge">1RM ${e.oneRM}kg</span>` : ""}
              <span class="vt-badge">${TYPES[e.type]?.label || e.type}</span>
            </div>
          </div>`).join("")}
      </div>`).join("")}
    </div>`;
}

function groupsManagerHTML() {
  return `
    <header class="vt-header">
      <button class="vt-btn-icon" data-a="groups-close" aria-label="Volver">${icon("back", 20)}</button>
      <h1 class="vt-header-title">Grupos</h1>
      <button class="vt-btn-icon" data-a="group-new" aria-label="Nuevo grupo">${icon("plus", 20)}</button>
    </header>
    <div class="vt-list">
      ${exerciseGroups.map((g) => `
        <div class="vt-ex-row">
          <div class="vt-ex-row-top">
            <span class="vt-dotgroup" style="background:${g.color}"></span>
            <span class="vt-ex-name">${esc(g.name)}</span>
            <button class="vt-btn-ghost" data-a="group-edit" data-name="${esc(g.name)}" aria-label="Editar">${icon("pencil", 15)}</button>
            ${g.name !== "Custom" ? `<button class="vt-btn-ghost vt-danger" data-a="group-del" data-name="${esc(g.name)}" aria-label="Eliminar">${icon("trash", 15)}</button>` : ""}
          </div>
        </div>`).join("")}
    </div>`;
}

function groupModalHTML() {
  const m = ui.groupModal;
  return `
    <div class="vt-modal-backdrop" data-a="group-modal-cancel">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">${m.originalName ? "Editar grupo" : "Nuevo grupo"}</h2>
          <button class="vt-btn-ghost" data-a="group-modal-cancel">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-form">
          <label>Nombre
            <input type="text" class="vt-input" id="grp-name" value="${esc(m.name)}" placeholder="Ej: Espalda" data-i="group-name" autocomplete="off">
          </label>
          <div class="vt-swatches">
            ${GROUP_PALETTE.map((c) => `<button type="button" class="vt-swatch ${m.color === c ? "is-active" : ""}" data-a="group-color-pick" data-color="${c}" style="background:${c}" aria-label="Elegir color"></button>`).join("")}
          </div>
        </div>
        <div class="vt-modal-actions">
          <button class="vt-btn-primary" data-a="group-modal-save">Guardar</button>
        </div>
      </div>
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
            <input type="text" class="vt-input" id="exm-name" value="${esc(m.name)}" placeholder="Ej: Curl femoral" autocomplete="off">
          </label>
          <label>Grupo muscular
            <select class="vt-input" id="exm-group">
              ${groupNames().map((g) => `<option value="${g}" ${m.group === g ? "selected" : ""}>${g}</option>`).join("")}
            </select>
          </label>
          <label>Tipo de registro
            <select class="vt-input" id="exm-type" data-c="exm-type">
              ${Object.entries(TYPES).map(([id, t]) => `<option value="${id}" ${m.type === id ? "selected" : ""}>${t.label}</option>`).join("")}
            </select>
          </label>
          <label id="exm-onerm-label" style="${m.type === "time" ? "display:none" : ""}">1RM estimado (kg) — opcional, para cargas por %
            <input type="number" inputmode="decimal" class="vt-input" id="exm-onerm" min="0" step="2.5" value="${m.oneRM ?? ""}"
              autocomplete="off" autocorrect="off" spellcheck="false" name="f_exmonerm">
          </label>
          <div class="vt-modal-toggle-row" id="exm-uni-row" style="${m.type === "time" ? "display:none" : ""}">
            <span>Ejercicio unilateral</span>
            <input type="checkbox" class="vt-switch" id="exm-unilateral" ${m.unilateral ? "checked" : ""} autocomplete="off">
          </div>
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
            <input placeholder="Buscar ejercicio…" value="${esc(ui.pickerQuery)}" data-i="picker-q" autofocus autocomplete="off">
          </div>
          <button class="vt-btn-ghost" data-a="picker-close">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-body" id="picker-list">${pickerListHTML()}</div>
      </div>
    </div>`;
}

function pickerListHTML() {
  const q = ui.pickerQuery.trim().toLowerCase();
  let pool = exercises;
  // Para "Tus máximos" solo tienen sentido ejercicios con peso, y no repetidos.
  if (ui.picker === "featured")
    pool = exercises.filter((e) => e.type !== "time" && !(settings.featuredExercises || []).includes(e.id));
  const filtered = pool.filter((e) => e.name.toLowerCase().includes(q));
  let html = filtered.map((ex) => `
    <button class="vt-modal-row" data-a="picker-pick" data-id="${ex.id}">
      <span class="vt-dotgroup" style="background:${groupColor(ex.group) || "var(--text-dim)"}"></span>
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

// Modal de confirmación propio (reemplaza confirm() nativo). Mismo lenguaje
// visual que exerciseModalHTML/pickerHTML: bottom sheet con backdrop.
function confirmDialogHTML() {
  const d = ui.confirmDialog;
  return `
    <div class="vt-modal-backdrop" data-a="confirm-cancel">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-form">
          <p style="margin:0">${esc(d.message)}</p>
        </div>
        <div class="vt-modal-actions">
          <button class="vt-btn-ghost" data-a="confirm-cancel">Cancelar</button>
          <button class="vt-btn-primary ${d.danger ? "vt-btn-danger" : ""}" data-a="confirm-yes">${d.danger ? "Eliminar" : "Confirmar"}</button>
        </div>
      </div>
    </div>`;
}

function emptyHTML(title, detail, action) {
  return `<div class="vt-empty"><h3>${title}</h3><p>${detail}</p>${action}</div>`;
}

// Encabezado de pestaña.
function tabHeaderHTML(eyebrow, title) {
  return `<div class="vt-header-brand"><div>
    <p class="vt-eyebrow">${eyebrow}</p><h1>${title}</h1>
  </div></div>`;
}

/* -------------------------------- Lógica de sesión -------------------------------- */

function defaultSet(type, target, prevSet, unilateral) {
  // Si la serie anterior es calentamiento, la nueva nace calentamiento (otro
  // aproche) — drop set/fallida no se heredan, son del intento puntual.
  const setType = prevSet && getSetType(prevSet) === "warmup" ? "warmup" : null;
  if (type === "time")
    return {
      done: false, setType,
      seconds: num(prevSet?.seconds) || num(target?.seconds) || 30,
      weight: prevSet ? num(prevSet.weight) : num(target?.weight) || 0,
      rpe: null,
    };
  if (unilateral)
    return {
      done: false, setType,
      repsL: (prevSet ? repsL(prevSet) : 0) || num(target?.reps) || 8,
      repsR: (prevSet ? repsR(prevSet) : 0) || num(target?.reps) || 8,
      weight: prevSet ? num(prevSet.weight) : num(target?.weight) || 0,
      rpe: null,
    };
  return {
    done: false, setType,
    reps: num(prevSet?.reps) || num(target?.reps) || 8,
    weight: prevSet ? num(prevSet.weight) : num(target?.weight) || 0,
    rpe: null,
  };
}

// Elimina una serie de la sesión activa. Compartido por el botón "×" y el swipe-to-delete.
function deleteSet(exI, setI) {
  // Mantiene el cronómetro apuntando a la serie correcta si cambian los índices.
  if (runningTimer && runningTimer.exIdx === exI) {
    if (runningTimer.setIdx === setI) runningTimer = null;
    else if (runningTimer.setIdx > setI) runningTimer.setIdx--;
  }
  ui.activeSession.exercises[exI].sets.splice(setI, 1);
  render();
}

function buildSessionFromRoutine(r) {
  return {
    id: uid("ses"),
    routineId: r.id,
    routineName: r.name,
    date: new Date().toISOString(),
    explicitlyRemoved: [], // {id, name} de ejercicios sacados con el botón de basura durante la sesión
    exercises: r.exercises.map((re) => {
      const t = exType(re.exerciseId);
      // En modo %1RM el peso se calcula AHORA con el 1RM vigente del catálogo,
      // nunca con un valor congelado en la rutina. Sin 1RM cae a 0 sin romper.
      let weight = re.targetWeight;
      let percent;
      if (re.loadMode === "percent") {
        const orm = num(exMap()[re.exerciseId]?.oneRM);
        percent = num(re.targetPercent);
        weight = orm > 0 ? pctKg(orm, percent) : 0;
      }
      const target = { sets: re.targetSets, reps: re.targetReps, weight, seconds: re.targetSeconds, percent };
      const n = Math.max(1, Math.round(num(re.targetSets)) || 3);
      return {
        exerciseId: re.exerciseId,
        target,
        restSeconds: num(re.restSeconds) || 0,
        linkPrev: !!re.linkPrev,
        note: re.note || "",
        sessionNote: "",
        sets: Array.from({ length: n }, () => defaultSet(t, target, null, exUnilateral(re.exerciseId))),
      };
    }),
  };
}

// Repetir una sesión pasada: arranca una sesión libre nueva (nunca vinculada
// a una rutina) con los mismos ejercicios y los pesos/reps/segundos que se
// hicieron esa vez, pero sin marcar, sin RPE y sin nota — lista para hoy.
function buildSessionFromPastSession(pastSession) {
  return {
    id: uid("ses"),
    routineId: null,
    routineName: pastSession.routineName,
    date: new Date().toISOString(),
    explicitlyRemoved: [],
    exercises: pastSession.exercises.map((e) => {
      const sets = e.sets.map((st) => ({
        done: false,
        // Mismo criterio que defaultSet: solo calentamiento se hereda.
        setType: getSetType(st) === "warmup" ? "warmup" : null,
        weight: st.weight,
        reps: st.reps,
        repsL: st.repsL,
        repsR: st.repsR,
        seconds: st.seconds,
        rpe: null,
      }));
      const lastSet = sets[sets.length - 1];
      const target = { sets: sets.length, reps: lastSet?.reps, weight: lastSet?.weight, seconds: lastSet?.seconds };
      return {
        exerciseId: e.exerciseId,
        target,
        restSeconds: num(e.restSeconds) || 0,
        linkPrev: !!e.linkPrev,
        note: e.note || "",
        sessionNote: "",
        sets,
      };
    }),
  };
}

function finishSession() {
  stopSetTimer(); // conserva lo acumulado de una serie cronometrándose
  const s = ui.activeSession;
  const total = s.exercises.reduce((a, e) => a + e.sets.length, 0);
  const done = s.exercises.reduce((a, e) => a + e.sets.filter((st) => st.done).length, 0);

  if (done === 0) {
    askConfirm("No marcaste ninguna serie. ¿Descartar la sesión completa?", () => {
      ui.activeSession = null;
      ui.exerciseEditMode = false; ui.selectedExercises.clear(); ui.collapsedExercises.clear();
      stopRest(); render();
    }, true);
    return;
  }

  // Todo lo que antes iba después del confirm() de "series sin marcar" vive
  // acá adentro: se ejecuta directo si no hay nada sin marcar, o como
  // callback del modal de confirmación si sí lo hay.
  const save = () => {
    // PRs: se calculan ANTES de meter esta sesión en `sessions`, si no el
    // ejercicio terminaría comparándose contra sí mismo.
    const map = exMap();
    const prHits = [];
    for (const e of s.exercises) {
      const type = exType(e.exerciseId);
      const uni = exUnilateral(e.exerciseId);
      const prior = priorStats(e.exerciseId);
      for (const st of e.sets) {
        if (!st.done || getSetType(st) || !isPR(type, st, prior, uni)) continue;
        // Unilateral: reps del hit usa el lado más débil (mismo criterio que
        // el PR); repsL/repsR se guardan aparte para el formato compacto de fmtSet.
        const hit = {
          exerciseId: e.exerciseId,
          exerciseName: map[e.exerciseId]?.name || "(ejercicio eliminado)",
          type,
          weight: num(st.weight),
          reps: uni ? Math.min(repsL(st), repsR(st)) : num(st.reps),
          repsL: uni ? repsL(st) : undefined,
          repsR: uni ? repsR(st) : undefined,
          seconds: num(st.seconds),
        };
        // Sugerencia de 1RM (Epley), solo confiable entre 1 y 12 reps.
        if (type !== "time" && hit.weight > 0 && hit.reps >= 1 && hit.reps <= 12) {
          const estimated = Math.round(hit.weight * (1 + hit.reps / 30) / 2.5) * 2.5;
          const currentOneRM = num(map[e.exerciseId]?.oneRM);
          if (estimated > currentOneRM) hit.suggestedOneRM = estimated;
        }
        prHits.push(hit);
      }
    }

    const cleaned = {
      ...s,
      durationSec: Math.round((Date.now() - new Date(s.date).getTime()) / 1000),
      exercises: s.exercises
        .map((e) => ({ ...e, sets: e.sets.filter((st) => st.done) }))
        .filter((e) => e.sets.length > 0),
    };

    // Diff contra la rutina guardada (si esta sesión vino de una): solo
    // informativo hasta que el usuario confirme sincronizarla desde el resumen.
    // Nunca toca `cleaned` ni las sesiones ya guardadas.
    let routineDiff = null;
    if (s.routineId) {
      const routine = routines.find((r) => r.id === s.routineId);
      if (routine) {
        const originalIds = new Set(routine.exercises.map((re) => re.exerciseId));
        const finalIds = new Set(cleaned.exercises.map((e) => e.exerciseId));
        const added = [...finalIds].filter((eid) => !originalIds.has(eid))
          .map((eid) => ({ id: eid, name: map[eid]?.name || "(ejercicio eliminado)" }));
        // "removed" es SOLO lo que se sacó a propósito con el botón de basura
        // durante la sesión (explicitlyRemoved) — no completar un ejercicio
        // (sin tocar ese botón) nunca ofrece "quitarlo" de la rutina.
        const removed = (s.explicitlyRemoved || []).filter((x) => originalIds.has(x.id));
        if (added.length > 0 || removed.length > 0) {
          routineDiff = { routineId: routine.id, routineName: routine.name, added, removed };
        }
      }
    }

    sessions = [cleaned, ...sessions];
    persistSessions();

    ui.sessionSummary = {
      routineId: cleaned.routineId,
      routineName: cleaned.routineName,
      date: cleaned.date,
      durationSec: cleaned.durationSec,
      volume: sessionVolume(cleaned, false),
      setsCount: done,
      prHits,
      appliedUpdates: new Set(),
      routineDiff,
      routineSynced: false,
      // Snapshot de los ejercicios ya guardados (solo sets hechos): para cuando
      // se muestra el resumen, ui.activeSession ya es null, así que "Guardar
      // como rutina" necesita de dónde armar la plantilla.
      exercisesSnapshot: cleaned.exercises,
      savedAsRoutine: false,
    };
    ui.activeSession = null;
    ui.openNotes.clear();
    ui.openExNotes.clear();
    ui.exerciseEditMode = false;
    ui.selectedExercises.clear();
    ui.collapsedExercises.clear();
    stopRest();
    render();
  };

  const unchecked = total - done;
  if (unchecked > 0) {
    askConfirm(`Hay ${unchecked} serie${unchecked !== 1 ? "s" : ""} sin marcar que se descartará${unchecked !== 1 ? "n" : ""}. ¿Finalizar y guardar las ${done} marcadas?`, save, false);
  } else {
    save();
  }
}

// Pantalla de resumen al finalizar sesión: overlay de pantalla completa
// (no el bottom-sheet chico de picker/exerciseModal).
function sessionSummaryHTML() {
  const sum = ui.sessionSummary;

  const prSection = sum.prHits.length === 0
    ? `<p class="vt-muted" style="text-align:center;margin-top:18px">Sin PRs esta vez</p>`
    : `<div class="vt-card" style="margin-top:18px">
        <h3>PRs de hoy</h3>
        ${sum.prHits.map((hit) => {
          const applied = sum.appliedUpdates.has(hit.exerciseId);
          return `<div class="vt-pr-hit">
            <div class="vt-pr-hit-row">
              <span class="vt-pr">${icon("trophy", 16)}</span>
              <span class="vt-pr-hit-name">${esc(hit.exerciseName)}</span>
              <span class="vt-pr-hit-value vt-mono">${esc(fmtSet(hit.type, hit, exUnilateral(hit.exerciseId)))}</span>
            </div>
            ${hit.suggestedOneRM ? (applied
              ? `<p class="vt-pr-hit-applied">${icon("check", 13)} 1RM actualizado</p>`
              : `<button class="vt-btn-outline vt-small" data-a="summary-apply-1rm" data-id="${hit.exerciseId}" data-value="${hit.suggestedOneRM}">Actualizar 1RM a ${hit.suggestedOneRM}kg</button>`
            ) : ""}
          </div>`;
        }).join("")}
      </div>`;

  const routineSection = !sum.routineDiff ? "" : `
    <div class="vt-card" style="margin-top:18px">
      <h3>Cambios respecto a tu rutina guardada</h3>
      <ul class="vt-diff-list">
        ${sum.routineDiff.added.map((x) => `<li class="vt-diff-added">+ ${esc(x.name)}</li>`).join("")}
        ${sum.routineDiff.removed.map((x) => `<li class="vt-diff-removed">− ${esc(x.name)}</li>`).join("")}
      </ul>
      ${sum.routineSynced
        ? `<p class="vt-pr-hit-applied">${icon("check", 13)} Rutina actualizada</p>`
        : `<button class="vt-btn-outline vt-small" data-a="summary-sync-routine">Actualizar rutina "${esc(sum.routineDiff.routineName)}" con estos cambios</button>`}
    </div>`;

  const saveAsRoutineSection = sum.routineId !== null ? "" : `
    <div class="vt-card" style="margin-top:18px">
      <h3>Esta fue una sesión libre</h3>
      ${sum.savedAsRoutine
        ? `<p class="vt-pr-hit-applied">${icon("check", 13)} Guardada como rutina</p>`
        : `<button class="vt-btn-outline vt-small" data-a="summary-save-as-routine">${icon("plus", 14)} Guardar como rutina</button>`}
    </div>`;

  return `
    <div class="vt-summary-overlay">
      <div class="vt-summary-inner">
        <p class="vt-eyebrow">${fmtDate(sum.date)}</p>
        <h1 class="vt-summary-title">${esc(sum.routineName)}</h1>
        <div class="vt-stat-row" style="margin-top:16px">
          <div class="vt-stat"><span class="vt-stat-label">Duración</span>
            <span class="vt-stat-value">${fmtDurationMin(sum.durationSec)}</span></div>
          <div class="vt-stat"><span class="vt-stat-label">Volumen</span>
            <span class="vt-stat-value">${Math.round(sum.volume).toLocaleString("es-CL")} kg</span></div>
          <div class="vt-stat"><span class="vt-stat-label">Series</span>
            <span class="vt-stat-value">${sum.setsCount}</span></div>
        </div>
        ${prSection}
        ${routineSection}
        ${saveAsRoutineSection}
        <button class="vt-btn-primary vt-full" style="margin-top:20px" data-a="summary-close">Cerrar</button>
      </div>
    </div>`;
}

/* --------------------------------- Export / Import -------------------------------- */

function exportJSON() {
  const data = {
    app: "volley-tracker",
    version: 1,
    exportedAt: new Date().toISOString(),
    routines,
    "routine-folders": routineFolders,
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

// Separado de importJSON(file) para poder reutilizarlo desde "Pegar JSON"
// (que ya tiene el objeto parseado, sin pasar por FileReader).
function processImportedData(data) {
    const inExercises = data["custom-exercises"] || data.exercises || null;
    const inFolders = data["routine-folders"] || data.routineFolders || null;

    if (Array.isArray(data.sessions)) {
      // Respaldo completo: reemplaza todo.
      askConfirm("Este archivo es un respaldo completo. Se REEMPLAZARÁN todos los datos actuales. ¿Continuar?", () => {
        if (Array.isArray(data.routines)) { routines = data.routines; persistRoutines(); }
        if (Array.isArray(inFolders)) { routineFolders = inFolders; persistFolders(); }
        sessions = data.sessions; persistSessions();
        if (Array.isArray(inExercises) && inExercises.length) { exercises = inExercises; persistExercises(); }
        if (data.settings) { settings = Object.assign(settings, data.settings); persistSettings(); }
        alert("Respaldo restaurado ✔");
      }, true);
      return;
    }
    if (Array.isArray(data.routines) || Array.isArray(inExercises)) {
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
      if (Array.isArray(inFolders)) {
        for (const f of inFolders) {
          if (!f.id || !f.name) continue;
          const i = routineFolders.findIndex((x) => x.id === f.id);
          if (i >= 0) routineFolders[i] = f; else routineFolders.push(f);
        }
        persistFolders();
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
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch { alert("El archivo no es un JSON válido."); return; }
    processImportedData(data);
  };
  reader.readAsText(file);
}

/* ------------------------------- Swipe-to-delete de series ------------------------------- */
// Deslizar una fila de serie hacia la izquierda revela un fondo rojo con basura;
// soltar pasado el 40% del recorrido la elimina (misma acción que el botón "×").
// No interfiere con el drag handle de reordenar ejercicios: son zonas de DOM distintas
// (la manija vive en la cabecera del bloque, fuera de .vt-swipe-wrap).

const SWIPE_MAX = 80;
let swipeState = null; // { wrapEl, rowEl, exI, setI, startX, startY, dx, deciding, horizontal }

document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  const wrapEl = e.target.closest(".vt-swipe-wrap");
  if (!wrapEl) return;
  const rowEl = wrapEl.querySelector(".vt-set-row");
  const t = e.touches[0];
  swipeState = {
    wrapEl, rowEl,
    exI: +wrapEl.dataset.ex, setI: +wrapEl.dataset.set,
    startX: t.clientX, startY: t.clientY, dx: 0,
    deciding: true, horizontal: false,
  };
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (!swipeState || e.touches.length !== 1) return;
  const t = e.touches[0];
  const deltaX = t.clientX - swipeState.startX;
  const deltaY = t.clientY - swipeState.startY;

  if (swipeState.deciding) {
    if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return; // aún sin gesto claro
    swipeState.deciding = false;
    swipeState.horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    if (swipeState.horizontal) {
      swipeState.wrapEl.classList.add("is-swiping");
      swipeState.rowEl.style.transition = "none"; // sigue al dedo 1:1 durante el arrastre
    }
  }
  if (!swipeState.horizontal) return; // gesto vertical: se deja scrollear la página normalmente

  e.preventDefault(); // ya confirmado horizontal: evita que la página scrollee
  const dx = Math.max(-SWIPE_MAX, Math.min(0, deltaX)); // solo hacia la izquierda
  swipeState.dx = dx;
  swipeState.rowEl.style.transform = `translateX(${dx}px)`;
}, { passive: false });

function endSwipe() {
  if (!swipeState) return;
  const { wrapEl, rowEl, exI, setI, dx, horizontal } = swipeState;
  swipeState = null;
  if (!horizontal) return;
  rowEl.style.transition = ""; // vuelve a la transición suave definida en CSS

  if (Math.abs(dx) > SWIPE_MAX * 0.4) {
    // Pasado el umbral: fade + slide de salida, luego se elimina de verdad.
    wrapEl.classList.add("is-removing");
    rowEl.style.transform = `translateX(-100%)`;
    setTimeout(() => deleteSet(exI, setI), 180);
  } else {
    wrapEl.classList.remove("is-swiping");
    rowEl.style.transform = "translateX(0)";
  }
}

document.addEventListener("touchend", endSwipe);
document.addEventListener("touchcancel", endSwipe);

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
      stopSetTimer(); // cambiar de pestaña detiene el cronómetro sin perder lo acumulado
      ui.tab = el.dataset.tab;
      ui.editingRoutine = null;
      ui.manageExercises = false;
      ui.manageGroups = false;
      ui.exerciseEditMode = false;
      ui.selectedExercises.clear();
      render();
      break;

    /* Modal de confirmación propio */
    case "confirm-yes": {
      const dlg = ui.confirmDialog;
      dlg?.onYes();
      ui.confirmDialog = null;
      render();
      break;
    }
    case "confirm-cancel":
      ui.confirmDialog = null;
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
      askConfirm("¿Eliminar esta rutina? (el historial no se borra)", () => {
        routines = routines.filter((r) => r.id !== id);
        persistRoutines(); render();
      }, true);
      break;
    case "routine-start": {
      const r = routines.find((x) => x.id === id);
      if (r) {
        const start = () => {
          ui.activeSession = buildSessionFromRoutine(r);
          ui.sessionMinimized = false;
          ui.openNotes.clear();
          ui.openExNotes.clear();
          ui.openTypeSelector = null;
          ui.collapsedExercises.clear();
          ui.tab = "rutinas";
          render();
        };
        if (ui.activeSession) askConfirm("Ya hay una sesión en curso. ¿Descartarla y empezar otra?", start, true);
        else start();
      }
      break;
    }

    /* Carpetas de rutinas */
    case "folder-new": ui.folderModal = { id: null, name: "" }; render(); break;
    case "folder-edit": {
      const f = routineFolders.find((x) => x.id === id);
      if (f) ui.folderModal = { ...f };
      render();
      break;
    }
    case "folder-del": {
      const f = routineFolders.find((x) => x.id === id);
      askConfirm(`¿Eliminar la carpeta "${f?.name || ""}"? Las rutinas adentro no se borran, quedan sin carpeta.`, () => {
        routineFolders = routineFolders.filter((x) => x.id !== id);
        persistFolders();
        routines = routines.map((r) => r.folderId === id ? { ...r, folderId: null } : r);
        persistRoutines();
        settings.openFolders = (settings.openFolders || []).filter((x) => x !== id);
        persistSettings();
        render();
      }, true);
      break;
    }
    case "folder-toggle": {
      const open = new Set(settings.openFolders || []);
      open.has(id) ? open.delete(id) : open.add(id);
      settings.openFolders = [...open];
      persistSettings();
      render();
      break;
    }
    case "folder-modal-cancel": ui.folderModal = null; render(); break;
    case "folder-modal-save": {
      const name = document.getElementById("fold-name").value.trim();
      if (!name) { alert("Ponle un nombre a la carpeta."); break; }
      const m = ui.folderModal;
      let folderId;
      if (m.id) {
        const f = routineFolders.find((x) => x.id === m.id);
        if (f) f.name = name;
        folderId = m.id;
      } else {
        const f = { id: uid("fold"), name };
        routineFolders.push(f);
        folderId = f.id;
      }
      persistFolders();
      ui.folderModal = null;
      // Si veníamos de "mover rutina" → "+ Nueva carpeta", la rutina se
      // asigna directo a la carpeta recién creada.
      if (ui.movingRoutineId) {
        const r = routines.find((x) => x.id === ui.movingRoutineId);
        if (r) { r.folderId = folderId; persistRoutines(); }
        ui.movingRoutineId = null;
      }
      render();
      break;
    }
    case "routine-move": ui.movingRoutineId = id; render(); break;
    case "move-close": ui.movingRoutineId = null; render(); break;
    case "move-new-folder": ui.folderModal = { id: null, name: "" }; render(); break;
    case "move-pick": {
      const r = routines.find((x) => x.id === ui.movingRoutineId);
      if (r) {
        r.folderId = el.dataset.folder || null;
        persistRoutines();
      }
      ui.movingRoutineId = null;
      render();
      break;
    }

    /* Editor de rutina */
    case "editor-cancel":
      ui.editingRoutine = null;
      ui.exerciseEditMode = false; ui.selectedExercises.clear();
      render();
      break;
    case "editor-loadmode": {
      const it = ui.editingRoutine.exercises[+el.dataset.idx];
      it.loadMode = el.dataset.mode;
      if (it.loadMode === "percent" && it.targetPercent == null) it.targetPercent = 70;
      render();
      break;
    }
    case "editor-save": {
      const r = ui.editingRoutine;
      if (!r.name.trim()) { alert("Ponle un nombre a la rutina."); break; }
      if (r.exercises.length === 0) { alert("Agrega al menos un ejercicio."); break; }
      // Modo %1RM exige tener 1RM en el catálogo; el peso nunca se congela en la rutina.
      const mapEx = exMap();
      const sinRM = r.exercises.find((it) => it.loadMode === "percent" && !(num(mapEx[it.exerciseId]?.oneRM) > 0));
      if (sinRM) {
        alert(`"${mapEx[sinRM.exerciseId]?.name || "Un ejercicio"}" está en modo %1RM pero no tiene 1RM definido. Configúralo en Ajustes → Ejercicios.`);
        break;
      }
      r.exercises.forEach((it) => { if (it.loadMode === "percent") delete it.targetWeight; });
      const stamped = { id: r.id, name: r.name.trim(), exercises: r.exercises, updatedAt: new Date().toISOString(), folderId: r.folderId ?? null };
      const i = routines.findIndex((x) => x.id === r.id);
      if (i >= 0) routines[i] = stamped; else routines = [stamped, ...routines];
      persistRoutines();
      ui.editingRoutine = null;
      ui.exerciseEditMode = false; ui.selectedExercises.clear();
      render();
      break;
    }

    /* Modo "Organizar ejercicios" (compartido: editor de rutina y sesión activa) */
    case "exercise-editmode-toggle":
      ui.exerciseEditMode = !ui.exerciseEditMode;
      ui.selectedExercises.clear();
      render();
      break;
    case "exercise-select-toggle": {
      const idx = +el.dataset.idx;
      ui.selectedExercises.has(idx) ? ui.selectedExercises.delete(idx) : ui.selectedExercises.add(idx);
      render();
      break;
    }
    case "organize-delete": {
      const inSession = !ui.editingRoutine && !!ui.activeSession;
      const list = ui.editingRoutine ? ui.editingRoutine.exercises : ui.activeSession.exercises;
      const indices = [...ui.selectedExercises];
      const doDelete = () => {
        indices.slice().sort((a, b) => b - a).forEach((i) => {
          if (inSession) {
            const ex = list[i];
            (ui.activeSession.explicitlyRemoved ??= []).push({ id: ex.exerciseId, name: exName(ex.exerciseId) });
            if (runningTimer) {
              if (runningTimer.exIdx === i) runningTimer = null;
              else if (runningTimer.exIdx > i) runningTimer.exIdx--;
            }
          }
          list.splice(i, 1);
        });
        ui.selectedExercises.clear();
        render();
      };
      const hasDone = inSession && indices.some((i) => list[i].sets.some((st) => st.done));
      if (hasDone) askConfirm("Algunos de estos ejercicios tienen series marcadas como hechas. ¿Eliminarlos de todas formas?", doDelete, true);
      else doDelete();
      break;
    }
    case "organize-group": {
      const list = ui.editingRoutine ? ui.editingRoutine.exercises : ui.activeSession.exercises;
      groupAsSuperset(list, [...ui.selectedExercises]);
      ui.selectedExercises.clear();
      render();
      break;
    }
    case "organize-replace": {
      ui.replaceExerciseIdx = [...ui.selectedExercises][0];
      ui.selectedExercises.clear();
      ui.picker = "replace";
      ui.pickerQuery = "";
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
      // Personalización completa: abre el modal de ejercicio precargado en vez
      // de crearlo directo. pickerCtx recuerda desde qué picker se abrió, para
      // que ex-modal-save lo agregue automáticamente ahí al guardar.
      ui.exerciseModal = { id: null, name, group: "Custom", type: "weight", pickerCtx: ui.picker };
      ui.picker = null;
      ui.pickerQuery = "";
      render();
      break;
    }

    /* Sesión activa */
    case "train-free": {
      const start = () => {
        ui.activeSession = { id: uid("ses"), routineId: null, routineName: `Sesión libre ${fmtDateShort(new Date())}`, date: new Date().toISOString(), explicitlyRemoved: [], exercises: [] };
        ui.sessionMinimized = false;
        ui.openNotes.clear();
        ui.openExNotes.clear();
        ui.openTypeSelector = null;
        ui.collapsedExercises.clear();
        render();
      };
      if (ui.activeSession) askConfirm("Ya hay una sesión en curso. ¿Descartarla y empezar otra?", start, true);
      else start();
      break;
    }
    case "session-note-toggle": {
      const exI = +el.dataset.ex;
      ui.openExNotes.has(exI) ? ui.openExNotes.delete(exI) : ui.openExNotes.add(exI);
      render();
      break;
    }
    case "ex-toggle-collapse": {
      const exI = +el.dataset.ex;
      ui.collapsedExercises.has(exI) ? ui.collapsedExercises.delete(exI) : ui.collapsedExercises.add(exI);
      render();
      break;
    }
    case "set-add": {
      const ex = ui.activeSession.exercises[+el.dataset.ex];
      const t = exType(ex.exerciseId);
      ex.sets.push(defaultSet(t, ex.target, ex.sets[ex.sets.length - 1], exUnilateral(ex.exerciseId)));
      render();
      break;
    }
    case "set-check": {
      const exI = +el.dataset.ex, setI = +el.dataset.set;
      const ex = ui.activeSession.exercises[exI];
      const st = ex.sets[setI];
      const wasComplete = isExerciseComplete(ex);
      st.done = !st.done;
      if (st.done) {
        // Si esta misma serie estaba cronometrándose, se detiene y queda su valor.
        if (runningTimer && runningTimer.exIdx === exI && runningTimer.setIdx === setI) stopSetTimer();
        // En superserie, solo el último ejercicio del grupo dispara el descanso.
        const lbl = computeSupersetLabels(ui.activeSession.exercises)[exI];
        if (!lbl || lbl.isLast) startRest(ex.restSeconds);
      }
      // Colapso automático solo cuando este click deja el ejercicio recién
      // completo — si lo rompe, no se fuerza a expandir de vuelta.
      if (!wasComplete && isExerciseComplete(ex)) ui.collapsedExercises.add(exI);
      render();
      break;
    }
    case "set-timer": {
      const exI = +el.dataset.ex, setI = +el.dataset.set;
      if (runningTimer && runningTimer.exIdx === exI && runningTimer.setIdx === setI) {
        stopSetTimer();
      } else {
        stopSetTimer(); // solo una serie corriendo a la vez: la anterior se detiene sola
        // El valor del input es el objetivo; el cronómetro siempre parte de 0 para medir el intento real.
        ui.activeSession.exercises[exI].sets[setI].seconds = 0;
        runningTimer = { exIdx: exI, setIdx: setI, startedAt: Date.now(), baseValue: 0 };
      }
      render();
      break;
    }
    case "settype-toggle": {
      const key = `${el.dataset.ex}:${el.dataset.set}`;
      ui.openTypeSelector = ui.openTypeSelector === key ? null : key;
      render();
      break;
    }
    case "settype-pick": {
      const st = ui.activeSession.exercises[+el.dataset.ex].sets[+el.dataset.set];
      st.setType = el.dataset.type || null;
      st.warmup = false; // limpia el campo viejo: el fallback de compatibilidad ya no debe mirarlo
      ui.openTypeSelector = null;
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
      askConfirm("¿Descartar la sesión completa? No se guardará nada.", () => {
        runningTimer = null;
        ui.activeSession = null; ui.openNotes.clear(); ui.openExNotes.clear();
        ui.exerciseEditMode = false; ui.selectedExercises.clear(); ui.collapsedExercises.clear();
        stopRest(); render();
      }, true);
      break;
    case "session-finish": finishSession(); break;
    case "session-minimize":
      ui.sessionMinimized = true;
      ui.exerciseEditMode = false; ui.selectedExercises.clear();
      render();
      break;
    case "session-restore": ui.sessionMinimized = false; render(); break;
    case "rest-cancel": stopRest(); break;

    /* Resumen de sesión */
    case "summary-apply-1rm": {
      const ex = exercises.find((e) => e.id === id);
      if (ex) {
        ex.oneRM = num(el.dataset.value);
        persistExercises();
        ui.sessionSummary.appliedUpdates.add(id);
        render();
      }
      break;
    }
    case "summary-sync-routine": {
      const diff = ui.sessionSummary?.routineDiff;
      const routine = diff && routines.find((r) => r.id === diff.routineId);
      if (routine) {
        diff.added.forEach((x) => {
          const t = exType(x.id);
          routine.exercises.push({
            exerciseId: x.id, targetSets: 3, targetReps: 8, targetWeight: 0,
            targetSeconds: t === "time" ? 30 : undefined,
          });
        });
        routine.exercises = routine.exercises.filter((re) => !diff.removed.some((x) => x.id === re.exerciseId));
        persistRoutines();
        ui.sessionSummary.routineSynced = true;
        render();
      }
      break;
    }
    case "summary-save-as-routine": {
      const sum = ui.sessionSummary;
      if (sum && !sum.savedAsRoutine) {
        const newRoutine = {
          id: uid("rt"),
          name: sum.routineName,
          folderId: null,
          exercises: sum.exercisesSnapshot.map((e) => {
            const t = exType(e.exerciseId);
            const lastSet = e.sets[e.sets.length - 1];
            // repsL/repsR caen a num(lastSet.reps) vía fallback cuando el set
            // no es unilateral, así que el promedio da lo mismo que antes.
            return {
              exerciseId: e.exerciseId,
              targetSets: e.sets.length,
              targetReps: Math.round((repsL(lastSet) + repsR(lastSet)) / 2),
              targetWeight: num(lastSet.weight),
              targetSeconds: t === "time" ? num(lastSet.seconds) : undefined,
              restSeconds: num(e.restSeconds) || 0,
              linkPrev: !!e.linkPrev,
              note: e.note || "",
            };
          }),
          updatedAt: new Date().toISOString(),
        };
        routines = [newRoutine, ...routines];
        persistRoutines();
        ui.sessionSummary.savedAsRoutine = true;
        render();
      }
      break;
    }
    case "summary-close":
      ui.sessionSummary = null;
      ui.tab = "historial";
      render();
      break;

    /* Historial */
    case "hist-toggle": ui.openHistory = ui.openHistory === id ? null : id; render(); break;
    case "hist-del":
      askConfirm("¿Eliminar esta sesión del historial?", () => {
        sessions = sessions.filter((s) => s.id !== id);
        persistSessions(); render();
      }, true);
      break;
    case "session-repeat": {
      const past = sessions.find((s) => s.id === id);
      if (past) {
        const start = () => {
          ui.activeSession = buildSessionFromPastSession(past);
          ui.sessionMinimized = false;
          ui.openNotes.clear();
          ui.openExNotes.clear();
          ui.openTypeSelector = null;
          ui.collapsedExercises.clear();
          ui.tab = "rutinas";
          render();
        };
        if (ui.activeSession) askConfirm("Ya hay una sesión en curso. ¿Descartarla y empezar otra?", start, true);
        else start();
      }
      break;
    }

    /* Progreso */
    case "prog-metric": ui.progressMetric = el.dataset.m; render(); break;
    case "featured-remove":
      settings.featuredExercises = (settings.featuredExercises || []).filter((x) => x !== id);
      persistSettings();
      render();
      break;

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
      askConfirm(msg, () => {
        exercises = exercises.filter((x) => x.id !== id);
        persistExercises();
        routines = routines.map((r) => ({ ...r, exercises: r.exercises.filter((x) => x.exerciseId !== id) }));
        persistRoutines();
        settings.featuredExercises = (settings.featuredExercises || []).filter((x) => x !== id);
        persistSettings();
        render();
      }, true);
      break;
    }
    case "ex-modal-cancel": ui.exerciseModal = null; render(); break;
    case "ex-modal-save": {
      const name = document.getElementById("exm-name").value.trim();
      const group = document.getElementById("exm-group").value;
      const type = document.getElementById("exm-type").value;
      if (!name) { alert("Ponle un nombre al ejercicio."); break; }
      const ormVal = num(document.getElementById("exm-onerm")?.value);
      const oneRM = type !== "time" && ormVal > 0 ? ormVal : undefined;
      const uniVal = document.getElementById("exm-unilateral")?.checked;
      const unilateral = type !== "time" && uniVal ? true : undefined;
      const m = ui.exerciseModal;
      let exId = m.id;
      if (m.id) {
        const i = exercises.findIndex((x) => x.id === m.id);
        if (i >= 0) exercises[i] = { ...exercises[i], name, group, type, oneRM, unilateral };
      } else {
        exId = uid("cex");
        exercises.push({ id: exId, name, group, type, oneRM, unilateral });
      }
      persistExercises();
      ui.exerciseModal = null;
      // Si se abrió desde un picker (crear con personalización completa), lo
      // agrega automáticamente a esa rutina/sesión — aplica a cualquier
      // contexto: editor, sesión, destacados o "reemplazar".
      if (m.pickerCtx) {
        ui.picker = m.pickerCtx;
        pickExercise(exId);
      } else {
        render();
      }
      break;
    }

    /* Grupos de ejercicios */
    case "groups-open": ui.manageGroups = true; render(); break;
    case "groups-close": ui.manageGroups = false; render(); break;
    case "group-new": ui.groupModal = { originalName: null, name: "", color: GROUP_PALETTE[0] }; render(); break;
    case "group-edit": {
      const g = exerciseGroups.find((x) => x.name === el.dataset.name);
      if (g) ui.groupModal = { originalName: g.name, name: g.name, color: g.color };
      render();
      break;
    }
    case "group-del": {
      const name = el.dataset.name;
      askConfirm(`¿Eliminar el grupo "${name}"? Los ejercicios que lo usaban pasan a "Custom".`, () => {
        exerciseGroups = exerciseGroups.filter((g) => g.name !== name);
        persistGroups();
        exercises = exercises.map((e) => e.group === name ? { ...e, group: "Custom" } : e);
        persistExercises();
        render();
      }, true);
      break;
    }
    case "group-color-pick": ui.groupModal.color = el.dataset.color; render(); break;
    case "group-modal-cancel": ui.groupModal = null; render(); break;
    case "group-modal-save": {
      const name = document.getElementById("grp-name").value.trim();
      if (!name) { alert("Ponle un nombre al grupo."); break; }
      const m = ui.groupModal;
      if (m.originalName) {
        if (name !== m.originalName && exerciseGroups.some((g) => g.name === name)) {
          alert("Ya existe un grupo con ese nombre.");
          break;
        }
        const g = exerciseGroups.find((x) => x.name === m.originalName);
        if (g) {
          if (name !== m.originalName) {
            exercises = exercises.map((e) => e.group === m.originalName ? { ...e, group: name } : e);
            persistExercises();
          }
          g.name = name;
          g.color = m.color;
          persistGroups();
        }
      } else {
        if (exerciseGroups.some((g) => g.name === name)) { alert("Ya existe un grupo con ese nombre."); break; }
        exerciseGroups.push({ name, color: m.color });
        persistGroups();
      }
      ui.groupModal = null;
      render();
      break;
    }

    case "export": exportJSON(); break;
    case "paste-json-open": ui.pasteJsonModal = true; render(); break;
    case "paste-json-cancel": ui.pasteJsonModal = false; render(); break;
    case "paste-json-import": {
      const text = document.getElementById("paste-json-text").value;
      let data;
      try { data = JSON.parse(text); }
      catch { alert("El texto pegado no es un JSON válido."); break; }
      ui.pasteJsonModal = false;
      processImportedData(data);
      break;
    }
  }
});

function pickExercise(id) {
  if (ui.picker === "featured") {
    settings.featuredExercises = settings.featuredExercises || [];
    if (!settings.featuredExercises.includes(id) && settings.featuredExercises.length < 5) {
      settings.featuredExercises.push(id);
      persistSettings();
    }
  } else if (ui.picker === "editor" && ui.editingRoutine) {
    const t = exType(id);
    ui.editingRoutine.exercises.push({
      exerciseId: id, targetSets: 3, targetReps: 8, targetWeight: 0,
      targetSeconds: t === "time" ? 30 : undefined,
    });
  } else if (ui.picker === "session" && ui.activeSession) {
    const t = exType(id);
    ui.activeSession.exercises.push({ exerciseId: id, target: null, sets: [defaultSet(t, null, null, exUnilateral(id))] });
  } else if (ui.picker === "replace") {
    const idx = ui.replaceExerciseIdx;
    const newType = exType(id);
    if (ui.editingRoutine) {
      const it = ui.editingRoutine.exercises[idx];
      const shapeChanged = exType(it.exerciseId) !== newType;
      it.exerciseId = id;
      if (shapeChanged) {
        // Reconstruye los targets para el tipo nuevo, sin dejar campos rotos
        // (ej. segundos en un ejercicio que ahora es de peso).
        delete it.targetReps; delete it.targetWeight; delete it.targetSeconds;
        delete it.targetPercent; delete it.loadMode;
        it.targetSets = it.targetSets || 3;
        if (newType === "time") it.targetSeconds = 30;
        else { it.targetReps = 8; it.targetWeight = 0; }
      }
    } else if (ui.activeSession) {
      const e = ui.activeSession.exercises[idx];
      // El type solo no basta: unilateral cambia la forma del set (reps vs
      // repsL/repsR) aunque el type sea el mismo (ej. Sentadilla → Zancada búlgara).
      const shapeChanged = exType(e.exerciseId) !== newType || exUnilateral(e.exerciseId) !== exUnilateral(id);
      e.exerciseId = id;
      if (shapeChanged) {
        e.target = null;
        e.sets = e.sets.map(() => defaultSet(newType, null, null, exUnilateral(id)));
      }
    }
    ui.replaceExerciseIdx = null;
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
    case "session-name":
      if (ui.activeSession) ui.activeSession.routineName = el.value;
      break;
    case "editor-target": {
      const it = ui.editingRoutine?.exercises[+el.dataset.idx];
      if (it) it[el.dataset.field] = el.dataset.field === "targetSeconds" ? parseClock(el.value) : num(el.value);
      // Cálculo de kg en vivo al editar el % (sin render, patrón #live-vol).
      if (it && el.dataset.field === "targetPercent") {
        const span = document.getElementById("pct-calc-" + el.dataset.idx);
        const orm = num(exMap()[it.exerciseId]?.oneRM);
        if (span && orm > 0) span.textContent = `= ${pctKg(orm, it.targetPercent)} kg (1RM ${orm} kg)`;
      }
      break;
    }
    case "editor-note": {
      const it = ui.editingRoutine?.exercises[+el.dataset.idx];
      if (it) it.note = el.value;
      break;
    }
    case "group-name":
      // Sincronizado con el estado (y no solo leído al guardar) porque elegir
      // un color dispara render() y reconstruye el input desde ui.groupModal.name.
      if (ui.groupModal) ui.groupModal.name = el.value;
      break;
    case "set": {
      const st = ui.activeSession?.exercises[+el.dataset.ex]?.sets[+el.dataset.set];
      if (!st) break;
      const f = el.dataset.f;
      if (f === "rpe") st.rpe = el.value === "" ? null : num(el.value);
      else if (f === "seconds") st.seconds = parseClock(el.value);
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
    case "featured-rm": {
      // Escribe directo en el catálogo, sin render para no perder el foco.
      const ex = exercises.find((x) => x.id === el.dataset.id);
      if (ex) {
        const v = num(el.value);
        if (v > 0) ex.oneRM = v; else delete ex.oneRM;
        persistExercises();
      }
      break;
    }
    case "ex-rest": {
      // Solo afecta la sesión en curso, no la rutina guardada.
      const ex = ui.activeSession?.exercises[+el.dataset.ex];
      if (ex) ex.restSeconds = Math.max(0, Math.round(num(el.value)));
      break;
    }
    case "session-note": {
      const ex = ui.activeSession?.exercises[+el.dataset.ex];
      if (ex) ex.sessionNote = el.value;
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
    case "exm-type": {
      // El 1RM y "unilateral" solo aplican a peso/corporal; se ocultan en
      // tipo tiempo (sin re-render).
      const lbl = document.getElementById("exm-onerm-label");
      if (lbl) lbl.style.display = el.value === "time" ? "none" : "";
      const uniRow = document.getElementById("exm-uni-row");
      if (uniRow) uniRow.style.display = el.value === "time" ? "none" : "";
      break;
    }
    case "import-file":
      if (el.files && el.files[0]) importJSON(el.files[0]);
      el.value = "";
      break;
  }
});

// Tocar un input de VALOR selecciona su contenido completo (para reemplazarlo
// de un tiro, sin borrar a mano). Nunca en campos de texto libre (nombre de
// rutina/ejercicio, notas) — ahí molestaría. focusin (no focus) porque sí burbujea.
const SELECT_ON_FOCUS = ".vt-set-input, .vt-rpe-input, .vt-rest-mini input, .vt-numfield input, #exm-onerm, .vt-max-input";
document.addEventListener("focusin", (e) => {
  if (e.target.matches && e.target.matches(SELECT_ON_FOCUS)) e.target.select();
});

const sessionHasUnsavedProgress = () =>
  !!(ui.activeSession && ui.activeSession.exercises.some((x) => x.sets.some((st) => st.done)));

// Aviso si intenta cerrar la pestaña con una sesión sin guardar.
window.addEventListener("beforeunload", (e) => {
  if (sessionHasUnsavedProgress()) {
    e.preventDefault();
    e.returnValue = "";
  }
});

render();

/* ------------------------- Service worker y actualizaciones ------------------------- */
// Permite abrir la app sin conexión (los datos ya viven en localStorage).
// Si falla (p. ej. abriendo el archivo directo con file://), la app sigue normal.

// Estado del aviso de actualización: fuera de `ui` a propósito — el banner
// es un elemento de DOM aparte, agregado/quitado directo, para no forzar un
// render() de toda la app ni interferir con el estado de `ui`.
let updateAvailable = false;
let swRegistration = null;

function showUpdateToast() {
  if (updateAvailable) return; // ya se está mostrando, no duplicar
  updateAvailable = true;
  const bar = document.createElement("div");
  bar.id = "update-toast";
  bar.innerHTML = `<span>Hay una versión nueva</span><button type="button">Recargar</button>`;
  bar.querySelector("button").addEventListener("click", applyUpdate);
  document.body.appendChild(bar);
}

function applyUpdate() {
  const reload = () => {
    const waiting = swRegistration?.waiting;
    if (!waiting) { location.reload(); return; }
    navigator.serviceWorker.addEventListener("controllerchange", () => location.reload(), { once: true });
    waiting.postMessage("SKIP_WAITING");
  };
  if (sessionHasUnsavedProgress()) {
    askConfirm("Actualizar la app ahora perderá el progreso no guardado de la sesión en curso. ¿Continuar?", reload, false);
  } else {
    reload();
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      swRegistration = reg;
      // Por si se cerró la app antes de aplicar una actualización anterior.
      if (reg.waiting) showUpdateToast();
      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // "installed" + ya hay un controller = actualización real, no la
          // primera instalación (ahí todavía no hay controller).
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast();
          }
        });
      });
    }).catch((err) => console.warn("SW no registrado:", err));
  });
}
