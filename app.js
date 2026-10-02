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
// Número con formato chileno: miles con punto, decimales con coma (52,5).
// Regla de toda la app: SIEMPRE espacio antes de la unidad ("53 kg", no "53kg").
const fmtNum = (n) => num(n).toLocaleString("es-CL", { maximumFractionDigits: 2 });

// Clonado profundo para el borrador del modo Organizar (los datos son planos,
// JSON-serializables, sin fechas ni funciones) — nunca comparte referencias
// con el array real mientras se está organizando.
const deepClone = (v) => JSON.parse(JSON.stringify(v));

// Kg objetivo a partir de %1RM, redondeado al disco de 2.5 kg más cercano.
const pctKg = (oneRM, pct) => Math.round(num(oneRM) * num(pct) / 100 / 2.5) * 2.5;

/* ----------------------------------- Storage ----------------------------------- */

const load = (k, fb) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; }
  catch { return fb; }
};
// Si localStorage falla (cuota llena, modo privado, almacenamiento borrado
// por el sistema) la app sigue andando en memoria, pero avisa UNA vez por
// sesión de uso para que se exporte un respaldo antes de cerrar. El aviso
// se difiere hasta que la app terminó de arrancar (save() también corre
// durante la carga, antes de que existan `ui` y render()).
let appReady = false;
let storagePersisted = false; // navigator.storage.persisted(), se resuelve después del primer render
let saveFailed = false, saveFailNotified = false;
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); }
  catch (err) {
    console.warn("No se pudo guardar", k, err);
    saveFailed = true;
    notifySaveFailure();
  }
};
function notifySaveFailure() {
  if (!appReady || !saveFailed || saveFailNotified) return;
  saveFailNotified = true;
  askAlert("No se pudo guardar en este dispositivo. Exporta un respaldo ahora.", { label: "Exportar", action: "export-from-alert" });
}

let routines = load("routines", []);
let sessions = load("sessions", []);
let exercises = load("custom-exercises", null);
if (!Array.isArray(exercises) || exercises.length === 0) {
  exercises = DEFAULT_EXERCISES.map((e) => ({ ...e }));
  save("custom-exercises", exercises);
}
let settings = Object.assign({
  sound: true, vibrate: true, featuredExercises: [], openFolders: [], openExerciseGroups: [],
}, load("settings", {}));
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

// Autoguardado de la sesión EN CURSO (distinto de persistSessions, que solo
// guarda sesiones ya finalizadas) — para sobrevivir a cerrar la pestaña sin
// terminar/descartar. También sincroniza acá el cronómetro inline en curso
// (runningTimer, variable de módulo fuera de `ui`) dentro de
// ui.activeSession.runningTimerInfo, para poder reconstruirlo al recargar.
function persistActiveSession() {
  if (ui.activeSession) {
    ui.activeSession.runningTimerInfo = runningTimer
      ? { exIdx: runningTimer.exIdx, setIdx: runningTimer.setIdx, startedAt: runningTimer.startedAt }
      : null;
    save("active-session", ui.activeSession);
  } else {
    localStorage.removeItem("active-session");
  }
}

// El grupo se identifica por nombre (no hay id) — mismo modelo que ya usaban
// GROUPS/GROUP_COLORS antes de persistirse. Sin fallback baked-in: cada
// call site decide su propio valor por defecto, igual que antes.
const groupNames = () => exerciseGroups.map((g) => g.name);
const groupColor = (name) => exerciseGroups.find((g) => g.name === name)?.color;

/* ---------------------------------- Estado UI ---------------------------------- */

const ui = {
  tab: "rutinas",
  editingRoutine: null,   // copia de la rutina en edición, o null
  editorSnapshot: "",     // foto del estado al abrir el editor (para detectar cambios sin guardar)
  editorOpenNotes: new Set(), // índices de ejercicio con la nota desplegada en el editor
  activeSession: null,    // sesión en curso, o null
  sessionMinimized: false, // sesión activa pero minimizada a la barra flotante
  picker: null,           // null | "editor" | "session" | "featured" | "replace"
  pickerQuery: "",
  sessionDetail: null,    // id de la sesión cuyo detalle está abierto (Historial), o null
  sessionRpeEdit: false,  // en el detalle de sesión: mostrando los botones 1–10 para poner/cambiar el RPE
  historyQuery: "",       // buscador del historial (dentro de Progreso), filtra por nombre de rutina/sesión
  historyRange: "todo",   // "todo" | "1m" | "3m" | "1a" — se aplica en conjunto (AND) con historyQuery
  progressDetail: null,      // id del ejercicio cuyo detalle está abierto (desde Ejercicios o Progreso), o null
  detailReturnScroll: 0,     // scroll de la lista al abrir el detalle, para restaurarlo al volver
  progressMetric: null,      // métrica del gráfico del detalle (weight | reps | seconds | volume)
  progressRange: "2m",       // "1m" | "2m" | "6m" | "1a"
  featuredSheet: false,      // hoja "Tus ejercicios → Editar" (destacados)
  progressSection: "resumen", // "resumen" | "historial" — Historial se fusionó dentro de Progreso
  exercisesQuery: "",        // buscador de la pestaña Ejercicios
  manageGroups: false,
  exerciseModal: null,    // null | {id|null, name, group, type, pickerCtx?}
  groupModal: null,       // null | {originalName|null, name, color}
  openNotes: new Set(),   // "exIdx:setIdx" con línea RPE abierta
  openExNotes: new Set(), // exIdx con la nota de ejercicio (sessionNote) abierta
  openTypeSelector: null, // "exIdx:setIdx" con el selector de tipo de serie abierto, o null
  sessionSummary: null,   // null | {routineName, date, durationSec, volume, setsCount, prHits, appliedUpdates}
  confirmDialog: null,    // null | {message, danger, onYes}
  infoDialog: null,       // null | {message} — reemplaza alert() nativo, un solo botón
  folderModal: null,      // null | {id|null, name}
  movingRoutineId: null,  // id de la rutina que se está moviendo a otra carpeta, o null
  actionSheet: null,      // null | {kind: "routine"|"folder"|"exercise"|"session", id} — hoja inferior del botón ⋯
  pasteJsonModal: false,  // modal de "Pegar JSON"
  exerciseEditMode: false,     // modo "Organizar ejercicios" (editor de rutina o sesión activa)
  exerciseEditDraft: null,     // null | copia profunda de los ejercicios en edición mientras dura el modo
  selectedExercises: new Set(), // índices (dentro del draft) seleccionados en modo Organizar
  replaceExerciseIdx: null,     // índice (dentro del draft) del ejercicio a reemplazar (picker en contexto "replace")
  collapsedExercises: new Set(), // exIdx colapsados en la sesión activa — no persiste
};

// Reemplaza confirm() nativo por un modal propio (mismo lenguaje visual que
// el resto de la app). onYes se guarda y se ejecuta recién si el usuario
// toca "Confirmar"/"Eliminar"; si cancela o cierra, no pasa nada.
function askConfirm(message, onYes, danger = false, onNo = null) {
  ui.confirmDialog = { message, danger, onYes, onNo };
  render();
}

// Reemplaza alert() nativo por un modal propio (mismo lenguaje visual que
// askConfirm), con un solo botón — para avisos que no piden una decisión.
// `extra` opcional = {label, action}: agrega un botón primario que dispara
// esa acción (data-a) además de cerrar; "Entendido" pasa a ser secundario.
function askAlert(message, extra = null) {
  ui.infoDialog = { message, extra };
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
  trend: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  chevDown: '<polyline points="6 9 12 15 18 9"/>',
  chevUp: '<polyline points="18 15 12 9 6 15"/>',
  chevRight: '<polyline points="9 6 15 12 9 18"/>',
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
  more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  playFill: '<polygon points="8 5 19 12 8 19 8 5" fill="currentColor"/>',
  timer: '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
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

// PR por serie DENTRO de una sesión: una serie es PR solo si supera
// estrictamente el máximo del historial (prior) Y el de las series anteriores
// de esta misma sesión — un empate no es PR. Sin esto, 3 series iguales que
// superan el historial contaban como 3 PRs. Devuelve un booleano por serie,
// en el mismo orden; mismo máximo incremental que computeAllPRs.
function prFlags(type, sets, prior, unilateral) {
  const run = { ...prior };
  return sets.map((st) => {
    if (!st.done || getSetType(st)) return false;
    const hit = isPR(type, st, run, unilateral);
    run.maxW = Math.max(run.maxW, num(st.weight));
    run.maxR = Math.max(run.maxR, unilateral ? Math.min(repsL(st), repsR(st)) : num(st.reps));
    run.maxS = Math.max(run.maxS, num(st.seconds));
    if (num(st.weight) > 0) run.anyLastre = true;
    return hit;
  });
}

/* ------------------------ Saltos en gimnasio y carga de sesión ------------------------ */

// ¿Las reps de este ejercicio cuentan como saltos? Campo opcional del
// catálogo (`countsJumps`); si no está definido, cuentan los del grupo
// "Pliometría" y nada más. Los de tipo tiempo nunca cuentan.
const countsJumps = (ex) => !!ex && ex.type !== "time" && (ex.countsJumps ?? ex.group === "Pliometría");

// Saltos de una sesión guardada: suma de las reps de TODAS sus series (las
// guardadas son las completadas, calentamiento incluido) en los ejercicios
// que cuentan; en unilateral, izquierda + derecha. OJO: esto mide solo lo
// registrado en sesiones de pesas — los saltos en cancha no se miden.
function sessionJumps(session, map = exMap()) {
  return session.exercises.reduce((acc, e) => {
    const ex = map[e.exerciseId];
    if (!countsJumps(ex)) return acc;
    return acc + e.sets.reduce((a, st) => a + (ex.unilateral ? repsL(st) + repsR(st) : num(st.reps)), 0);
  }, 0);
}

// Carga de una sesión = RPE de sesión (1–10, `session.rpe`, opcional) ×
// minutos de duración, en "UA" (unidades arbitrarias). null si no tiene RPE.
const sessionMinutes = (session) => Math.max(1, Math.round(num(session.durationSec) / 60));
const sessionLoad = (session) => session.rpe ? session.rpe * sessionMinutes(session) : null;

// Línea "48 saltos en gimnasio" (resumen de sesión y detalle de sesión).
const jumpsLineHTML = (n) => n > 0 ? `<p class="vt-jumps-line"><b>${fmtNum(n)}</b> salto${n !== 1 ? "s" : ""} en gimnasio</p>` : "";

// Fila de 10 botones (1–10) para el RPE de la sesión. Tocar el elegido lo quita.
function rpeButtonsHTML(sessionId, current) {
  return `<div class="vt-rpe-scale">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) =>
    `<button class="${current === n ? "is-active" : ""}" data-a="session-rpe" data-id="${sessionId}" data-value="${n}" aria-label="RPE ${n}">${n}</button>`).join("")}</div>`;
}

// 1RM estimado (Epley), redondeado al disco de 2,5 kg más cercano. Solo es
// confiable entre 1 y 12 reps con peso — fuera de eso devuelve 0.
const epley1RM = (w, r) => (w > 0 && r >= 1 && r <= 12) ? Math.round(w * (1 + r / 30) / 2.5) * 2.5 : 0;

// Mejor estimación de 1RM en todo el historial de un ejercicio, con la serie
// de la que sale: {est, weight, reps} o null. Mismo criterio que los PRs
// (C/D/F no cuentan; en unilateral, las reps del lado más débil).
function bestEpley(exId) {
  const uni = exUnilateral(exId);
  let best = null;
  for (const s of sessions)
    for (const e of s.exercises)
      if (e.exerciseId === exId)
        for (const st of e.sets) {
          if (getSetType(st)) continue;
          const w = num(st.weight), r = uni ? Math.min(repsL(st), repsR(st)) : num(st.reps);
          const est = epley1RM(w, r);
          if (est > 0 && (!best || est > best.est)) best = { est, weight: w, reps: r };
        }
  return best;
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
// agrupar en superserie o reemplazar un ejercicio. Todo el modo trabaja sobre
// un BORRADOR (ui.exerciseEditDraft, copia profunda) — el array real
// (ui.editingRoutine.exercises o ui.activeSession.exercises) no se toca hasta
// "Guardar cambios"; "Cancelar" simplemente descarta el borrador.

// Índice (dentro del draft) que acaba de entrar al modo por mantener presionado
// — dispara el pulso visual una sola vez, ver exerciseOrganizeRowHTML.
let justEnteredOrganizeIdx = null;

// Contador para el __ord de ejercicios agregados DURANTE el modo Organizar
// (vía "Agregar ejercicio" con el picker abierto mientras se organiza): no
// existían en el array original, así que nunca deben colisionar con un
// índice real (siempre >= 0) — negativo y decreciente alcanza.
let nextDraftOrd = -1;

// Entra al modo: clona el array correspondiente hacia el borrador, marcando
// cada item con su posición ORIGINAL (__ord) — así "Guardar cambios" puede
// saber más tarde qué se eliminó de verdad, sin importar cuánto se reordenó/
// agrupó/reemplazó mientras tanto (ver exercise-editmode-save).
function enterOrganizeMode(preselectIdx) {
  ui.editorOpenNotes.clear(); // van por índice de ejercicio, que cambia al reordenar o borrar
  const source = ui.editingRoutine ? ui.editingRoutine.exercises : ui.activeSession.exercises;
  ui.exerciseEditDraft = source.map((it, i) => ({ ...deepClone(it), __ord: i }));
  ui.exerciseEditMode = true;
  ui.selectedExercises = preselectIdx != null ? new Set([preselectIdx]) : new Set();
  if (preselectIdx != null) {
    justEnteredOrganizeIdx = preselectIdx;
    setTimeout(() => { justEnteredOrganizeIdx = null; }, 300);
  }
  render();
}

// Botón de entrada — solo existe fuera del modo; adentro se sale por la barra
// inferior (Cancelar / Guardar cambios), nunca por un botón suelto arriba.
function organizeToggleHTML() {
  if (ui.exerciseEditMode) return "";
  return `<div style="display:flex;justify-content:flex-end;margin-bottom:var(--sp-3)">
    <button class="vt-btn-icon" data-a="exercise-editmode-toggle">Organizar</button>
  </div>`;
}

// Fila compacta que reemplaza el bloque completo mientras se organiza:
// manija + acento + nombre + círculo de selección.
function exerciseOrganizeRowHTML(idx, ex, lbl) {
  const selected = ui.selectedExercises.has(idx);
  const pulse = idx === justEnteredOrganizeIdx;
  return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""} ${pulse ? "vt-organize-pulse" : ""}" style="border-left-color:${blockAccentColor(ex, lbl)}">
    <div class="vt-block-row">
      <button type="button" class="vt-drag-handle" aria-label="Reordenar ejercicio">${icon("grip", 16)}</button>
      <span class="vt-organize-name">${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}</span>
      <button type="button" class="vt-select-circle ${selected ? "is-on" : ""}" data-a="exercise-select-toggle" data-idx="${idx}" aria-label="Seleccionar ejercicio"></button>
    </div>
  </div>`;
}

// Barra de acciones sobre lo seleccionado — vacía si no hay nada elegido.
function organizeActionBarHTML() {
  const n = ui.selectedExercises.size;
  if (n === 0) return "";
  return `<div class="vt-organize-bar">
    <span class="vt-organize-count">${n} elegido${n !== 1 ? "s" : ""}</span>
    <div class="vt-organize-actions">
      <button class="vt-btn-ghost vt-danger" data-a="organize-delete">${icon("trash", 16)} Eliminar</button>
      ${n >= 2 ? `<button class="vt-btn-ghost" data-a="organize-group">${icon("link", 16)} Agrupar</button>` : ""}
      ${n === 1 ? `<button class="vt-btn-ghost" data-a="organize-replace">${icon("repeat", 16)} Reemplazar</button>` : ""}
    </div>
  </div>`;
}

// Barra inferior fija del modo Organizar: apila la barra de selección (si hay
// algo elegido) sobre la de Cancelar/Guardar cambios — mismo patrón de
// wrapper fijo compartido que #floating-stack (restbar + minimized-bar), así
// se apilan solas sin coordinar posiciones a mano.
function organizeFooterHTML() {
  return `<div class="vt-organize-footer-wrap">
    ${organizeActionBarHTML()}
    <div class="vt-organize-savebar">
      <button class="vt-btn-ghost vt-danger" data-a="exercise-editmode-cancel">Cancelar</button>
      <button class="vt-btn-primary vt-flex" data-a="exercise-editmode-save">${icon("check", 18)} Guardar cambios</button>
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

// Reconstruye el target de un ítem de RUTINA (editorHTML) a partir del
// historial real del ejercicio (mismo patrón que "Guardar como rutina" usa
// con el último set de cada ejercicio) — cantidad de series y valores reales,
// no los del ejercicio que se está reemplazando. Sin historial, cae a los
// defaults de siempre (3 series, 8 reps, 0 kg / 30s si es tipo tiempo).
function editorTargetFromHistory(exId, type) {
  const hist = lastSetsFor(exId);
  if (!hist || !hist.length)
    return type === "time"
      ? { targetSets: 3, targetSeconds: 30, targetWeight: 0 }
      : { targetSets: 3, targetReps: 8, targetWeight: 0 };
  const lastSet = hist[hist.length - 1];
  if (type === "time") return { targetSets: hist.length, targetSeconds: num(lastSet.seconds) || 30, targetWeight: num(lastSet.weight) };
  const uni = exUnilateral(exId);
  const reps = uni ? Math.round((repsL(lastSet) + repsR(lastSet)) / 2) : num(lastSet.reps);
  return { targetSets: hist.length, targetReps: reps || 8, targetWeight: num(lastSet.weight) };
}

// Reconstruye los sets reales de un ítem de SESIÓN (trainActiveHTML) a partir
// del historial — un set nuevo por cada set histórico, mismo patrón que
// defaultSet() usa con prevSet (hereda valores, done:false, rpe:null). Sin
// historial, un único set con los defaults de siempre.
function sessionSetsFromHistory(exId, type, unilateral) {
  const hist = lastSetsFor(exId);
  if (!hist || !hist.length) return [defaultSet(type, null, null, unilateral)];
  return hist.map((histSet) => defaultSet(type, null, histSet, unilateral));
}

function fmtSet(type, s, unilateral) {
  const w = typePrefix(getSetType(s));
  const rpe = s.rpe ? ` @${s.rpe}` : "";
  if (type === "time") return `${w}${fmtClock(num(s.seconds))}${num(s.weight) > 0 ? ` +${fmtNum(s.weight)} kg` : ""}${rpe}`;
  if (unilateral) {
    const sides = `I${repsL(s)} D${repsR(s)}`;
    return num(s.weight) > 0 ? `${w}${fmtNum(s.weight)} kg · ${sides}${rpe}` : `${w}${sides}${rpe}`;
  }
  if (type === "bodyweight")
    return num(s.weight) > 0 ? `${w}+${fmtNum(s.weight)} kg × ${num(s.reps)}${rpe}` : `${w}${num(s.reps)}${rpe}`;
  return `${w}${fmtNum(s.weight)}×${num(s.reps)}${rpe}`;
}

/* -------------------------- Cronómetro de descanso ------------------------------- */

let rest = null; // { ends, total, timer }
let audioCtx = null;

function startRest(seconds) {
  stopRest();
  // Sin fallback global: si el ejercicio/rutina/sesión no define descanso
  // propio (>0), simplemente no arranca descanso automático.
  const secs = Math.round(num(seconds));
  if (secs <= 0) return;
  rest = { ends: Date.now() + secs * 1000, total: secs, timer: setInterval(tickRest, 250) };
  updateRestBar();
}

function stopRest() {
  if (rest) { clearInterval(rest.timer); rest = null; }
  updateRestBar();
}

// Botones −15 s / +15 s de la barra: mueven el final del descanso. Nunca
// baja de 0 (si queda menos de 15 s, termina ya). `total` se estira si el
// restante lo supera, para que la línea de progreso no pase del 100%.
function adjustRest(deltaSec) {
  if (!rest) return;
  rest.ends = Math.max(Date.now(), rest.ends + deltaSec * 1000);
  const left = Math.ceil((rest.ends - Date.now()) / 1000);
  rest.total = Math.max(rest.total, left);
  tickRest();
}

function tickRest() {
  if (!rest) return;
  if (Date.now() >= rest.ends) {
    clearInterval(rest.timer);
    rest = null;
    beep();
    if (settings.vibrate && navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 400]);
    updateRestBar();
    return;
  }
  updateRestBar();
}

// La barra se arma UNA vez por descanso y los ticks (cada 250 ms) solo
// actualizan el texto del tiempo y la línea de progreso — si se reescribiera
// el HTML en cada tick, un toque sobre −15/+15/× podía caer justo entre dos
// reescrituras y perderse.
function updateRestBar() {
  const el = document.getElementById("restbar");
  if (!el) return;
  if (!rest) { el.className = "is-hidden"; el.innerHTML = ""; return; }
  const leftMs = Math.max(0, rest.ends - Date.now());
  const left = Math.ceil(leftMs / 1000);
  const pct = Math.max(0, Math.min(100, (leftMs / (rest.total * 1000)) * 100));
  el.className = "";
  el.style.setProperty("--rest-pct", pct + "%");
  let time = el.querySelector(".vt-rest-time");
  if (!time) {
    el.innerHTML = `
      <button class="vt-rest-btn" data-a="rest-adjust" data-delta="-15" aria-label="Quitar 15 segundos">−15 s</button>
      <div class="vt-rest-info">
        <div class="vt-rest-label">Descanso</div>
        <div class="vt-rest-time"></div>
      </div>
      <button class="vt-rest-btn" data-a="rest-adjust" data-delta="15" aria-label="Agregar 15 segundos">+15 s</button>
      <button class="vt-rest-btn vt-rest-cancel" data-a="rest-cancel" aria-label="Cancelar descanso">${icon("x", 20)}</button>`;
    time = el.querySelector(".vt-rest-time");
  }
  time.textContent = fmtClock(left);
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

// Mide el alto real de la barra flotante del modo Organizar (varía si hay
// selección activa — una o dos barras apiladas) y lo deja en una CSS var
// que .vt-content usa como padding-bottom extra, para que el scroll deje
// subir el último ejercicio de la lista por sobre la barra. 0px si no está
// el modo activo (nada que compensar).
function updateOrganizePad() {
  const wrap = document.querySelector(".vt-organize-footer-wrap");
  const h = wrap ? Math.ceil(wrap.getBoundingClientRect().height) + 16 : 0;
  document.documentElement.style.setProperty("--organize-pad", h + "px");
}

// Un tono: uno o varios osciladores sumados → ganancia con ataque/caída
// cortos → compresor (para que el pico alto no sature el parlante) → salida.
// `voices` = [[frecuencia, tipo de onda], ...]; el pico se reparte entre ellas.
function tone(at, dur, voices, peak) {
  const g = audioCtx.createGain();
  const comp = audioCtx.createDynamicsCompressor();
  g.connect(comp); comp.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  g.gain.setValueAtTime(peak, at + dur - 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  voices.forEach(([freq, type]) => {
    const o = audioCtx.createOscillator();
    const v = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    v.gain.value = 1 / voices.length;
    o.connect(v); v.connect(g);
    o.start(at); o.stop(at + dur + 0.02);
  });
}

function withAudio(fn) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    fn(audioCtx.currentTime);
  } catch (e) { /* sin audio disponible */ }
}

// Fin del descanso: bocina de marcador de voleibol (la del fin de un tiempo
// muerto o un cambio), sintetizada — sin archivo de audio. Es un solo toque
// largo y áspero: dos dientes de sierra graves a un intervalo disonante (lo
// que le da el "zumbido" de bocina) más una cuadrada una octava arriba, que
// es la parte que de verdad suena en el parlante chico de un teléfono.
function beep() {
  withAudio((t) => tone(t, 1.1, [[247, "sawtooth"], [311, "sawtooth"], [494, "square"], [622, "square"]], 0.95));
}

/* --------------------------------- Render raíz ---------------------------------- */

const $app = document.getElementById("app");
let chart = null;       // gráfico principal: volumen (Resumen) o línea del detalle de ejercicio
let extraCharts = [];   // gráficos adicionales del Resumen (saltos, carga)

// "rutinas" fusiona lo que antes eran dos pestañas separadas (Rutinas +
// Entrenar): muestra la sesión activa cuando hay una y no está minimizada,
// si no la lista de rutinas (que a su vez incluye iniciar rutina y sesión
// libre — ver routinesHTML). El punto verde de sesión activa vive acá.
const NAV_ITEMS = [
  { id: "rutinas", label: "Entrenar", ic: "play" },
  { id: "ejercicios", label: "Ejercicios", ic: "barbell" },
  { id: "progreso", label: "Progreso", ic: "trend" },
  { id: "ajustes", label: "Ajustes", ic: "sliders" },
];

function render() {
  exerciseStatsCache = null; // se recalcula una sola vez por render, la primera vez que alguien lo pida
  sessionPRCache = null;
  if (ui.sessionDetail && !sessions.some((x) => x.id === ui.sessionDetail)) ui.sessionDetail = null; // la sesión se eliminó
  if (ui.progressDetail && !exMap()[ui.progressDetail]) ui.progressDetail = null; // el ejercicio se eliminó
  let view = "";
  // El detalle de ejercicio se abre desde Ejercicios o desde Progreso y se
  // dibuja sobre la pestaña donde se abrió (la nav no cambia; "volver"
  // regresa a esa misma pestaña).
  if (ui.progressDetail && (ui.tab === "ejercicios" || ui.tab === "progreso")) view = exerciseDetailHTML();
  else if (ui.sessionDetail && ui.tab === "progreso") view = sessionDetailHTML();
  else if (ui.tab === "rutinas") {
    if (ui.editingRoutine) view = editorHTML();
    else if (ui.activeSession && !ui.sessionMinimized) view = trainActiveHTML();
    else view = routinesHTML();
  }
  else if (ui.tab === "ejercicios") view = ui.manageGroups ? groupsManagerHTML() : exercisesManagerHTML();
  else if (ui.tab === "progreso") view = progressHTML();
  else if (ui.tab === "ajustes") view = settingsHTML();

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
    ${ui.infoDialog ? infoDialogHTML() : ""}
    ${ui.folderModal ? folderModalHTML() : ""}
    ${ui.movingRoutineId && !ui.folderModal ? moveRoutineHTML() : ""}
    ${ui.actionSheet ? actionSheetHTML() : ""}
    ${ui.featuredSheet && !ui.picker ? featuredSheetHTML() : ""}
    ${ui.groupModal ? groupModalHTML() : ""}
    ${ui.pasteJsonModal ? pasteJsonModalHTML() : ""}`;

  updateRestBar();
  updateMinimizedBar();
  updateOrganizePad();
  if (ui.tab === "progreso" || ui.progressDetail) mountChart();
  mountSortables();
  if (ui.activeSession) persistActiveSession();
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
        // La manija (y por lo tanto el drag) solo existe en modo Organizar —
        // reordena el borrador, nunca el array real directamente.
        const [moved] = ui.exerciseEditDraft.splice(evt.oldIndex, 1);
        ui.exerciseEditDraft.splice(evt.newIndex, 0, moved);
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
        const [moved] = ui.exerciseEditDraft.splice(evt.oldIndex, 1);
        ui.exerciseEditDraft.splice(evt.newIndex, 0, moved);
        render();
      },
    });
  }
}

/* --------------------------------- Vista Rutinas -------------------------------- */

// Una rutina = una fila: texto a la izquierda, botón redondo de Iniciar a la
// derecha. Editar / Duplicar / Mover / Eliminar viven en la hoja del ⋯
// (actionSheetHTML), no como íconos sueltos.
function routineRowHTML(r, map, lastUsed) {
  const last = lastUsed(r.id);
  const n = r.exercises.length;
  const names = r.exercises.map((re) => map[re.exerciseId]?.name || "Ejercicio").join(" · ");
  return `<div class="vt-routine-row">
    <div class="vt-routine-text">
      <div class="vt-routine-head">
        <h3 class="vt-routine-name">${esc(r.name) || "Sin nombre"}</h3>
        <button class="vt-more-btn" data-a="sheet-open" data-kind="routine" data-id="${r.id}" aria-label="Más opciones">${icon("more", 18)}</button>
      </div>
      <p class="vt-routine-meta">${n} ejercicio${n !== 1 ? "s" : ""}${last ? ` · última vez ${fmtDateShort(last)}` : " · sin usar"}</p>
      ${names ? `<p class="vt-routine-exs">${esc(names)}</p>` : ""}
    </div>
    <button class="vt-play-btn" data-a="routine-start" data-id="${r.id}" aria-label="Iniciar">${icon("playFill", 18)}</button>
  </div>`;
}

function routinesHTML() {
  const map = exMap();
  const lastUsed = (rid) => { const s = sessions.find((s) => s.routineId === rid); return s ? s.date : null; };
  const listHTML = (list) => `<div class="vt-routine-list">${list.map((r) => routineRowHTML(r, map, lastUsed)).join("")}</div>`;

  const loose = routines.filter((r) => !r.folderId);
  const looseHTML = loose.length ? listHTML(loose) : "";

  const foldersHTML = routineFolders.map((f) => {
    const inFolder = routines.filter((r) => r.folderId === f.id);
    // openFolders persiste en settings — por defecto (array vacío) todas colapsadas.
    const collapsed = !(settings.openFolders || []).includes(f.id);
    return `<div class="vt-folder">
      <div class="vt-folder-head-row">
        <button class="vt-folder-toggle" data-a="folder-toggle" data-id="${f.id}">
          ${icon(collapsed ? "chevDown" : "chevUp", 16)}
          <span class="vt-group-title">${esc(f.name)}</span>
          <span class="vt-folder-count">${inFolder.length} rutina${inFolder.length !== 1 ? "s" : ""}</span>
        </button>
        <button class="vt-more-btn" data-a="sheet-open" data-kind="folder" data-id="${f.id}" aria-label="Opciones de carpeta">${icon("more", 18)}</button>
      </div>
      ${collapsed ? "" : (inFolder.length
        ? listHTML(inFolder)
        : `<p class="vt-muted vt-folder-empty">Sin rutinas todavía — abre el menú de una rutina y elige "Mover a carpeta".</p>`)}
    </div>`;
  }).join("");

  const body = routines.length === 0 && routineFolders.length === 0
    ? emptyHTML("Todavía no hay rutinas por acá",
        "Creemos la primera — sin límite de cuántas puedes guardar, aunque las cambies cada mes.",
        `<button class="vt-btn-primary" data-a="routine-new">Crear rutina</button>`)
    : looseHTML + foldersHTML;

  const html = `
    <header class="vt-header">
      ${tabHeaderHTML("Set 01 · Preparación", "Rutinas")}
      <div style="display:flex;gap:var(--sp-2)">
        <button class="vt-btn-icon" data-a="folder-new" aria-label="Nueva carpeta">${icon("folder", 20)}</button>
        <button class="vt-btn-icon" data-a="routine-new" aria-label="Nueva rutina">${icon("plus", 22)}</button>
      </div>
    </header>
    <button class="vt-btn-outline vt-btn-solid vt-flex-center vt-free-btn" data-a="train-free">${icon("plus", 18)} Sesión libre</button>
    ${body}`;
  const reminder = backupReminderText();
  const banner = !reminder ? "" : `<div class="vt-banner">
      <span>${reminder}</span>
      <button class="vt-banner-action" data-a="export">Exportar</button>
      <button class="vt-banner-close" data-a="backup-snooze" aria-label="Recordar más tarde">${icon("x", 16)}</button>
    </div>`;
  return banner + html;
}

// Hoja inferior del botón ⋯ (rutina, carpeta, ejercicio o sesión): mismo estilo que los demás
// modales. Cada fila dispara la acción de siempre (routine-edit, folder-del,
// etc.); el click handler cierra la hoja antes de ejecutar cualquier acción.
function actionSheetHTML() {
  const { kind, id } = ui.actionSheet;
  const row = (a, ic, label, danger) =>
    `<button class="vt-modal-row ${danger ? "vt-modal-row-danger" : ""}" data-a="${a}" data-id="${id}">${icon(ic, 16)} ${label}</button>`;
  let title, rows;
  if (kind === "export") {
    title = "Exportar";
    rows = EXPORT_KINDS.map((k) => `<button class="vt-modal-row" data-a="export-pick" data-kind="${k.id}">
      ${icon(k.ic, 16)}<span class="vt-modal-row-text">${k.label}<small>${k.sub}</small></span></button>`).join("");
  } else if (kind === "folder") {
    title = routineFolders.find((f) => f.id === id)?.name || "Carpeta";
    rows = row("folder-edit", "pencil", "Renombrar") + row("folder-del", "trash", "Eliminar", true);
  } else if (kind === "session") {
    title = sessions.find((x) => x.id === id)?.routineName || "Sesión";
    rows = row("hist-del", "trash", "Eliminar", true);
  } else if (kind === "exercise") {
    title = exName(id);
    rows = row("ex-edit", "pencil", "Editar") + row("ex-del", "trash", "Eliminar", true);
  } else {
    title = routines.find((r) => r.id === id)?.name || "Rutina";
    rows = row("routine-edit", "pencil", "Editar") + row("routine-dup", "copy", "Duplicar")
      + row("routine-move", "folder", "Mover a carpeta") + row("routine-del", "trash", "Eliminar", true);
  }
  return `
    <div class="vt-modal-backdrop" data-a="sheet-close">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title vt-modal-title-free">${esc(title)}</h2>
          <button class="vt-btn-ghost" data-a="sheet-close" aria-label="Cerrar">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-body">${rows}</div>
      </div>
    </div>`;
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

// Abre el editor sobre una copia de la rutina y guarda una foto del estado
// inicial, para saber al salir si hay cambios sin guardar (editorIsDirty).
function openEditor(routine) {
  ui.editingRoutine = routine;
  ui.editorSnapshot = editorState();
  ui.editorOpenNotes = new Set();
}
const editorState = () => JSON.stringify([ui.editingRoutine.name, ui.editingRoutine.exercises]);
const editorIsDirty = () => !!ui.editingRoutine && editorState() !== ui.editorSnapshot;

// Sale del editor (flecha atrás o cambio de pestaña): si hay cambios sin
// guardar pregunta antes de descartarlos; si no, sigue directo.
function leaveEditor(next) {
  const go = () => {
    ui.editingRoutine = null;
    ui.exerciseEditMode = false; ui.exerciseEditDraft = null; ui.selectedExercises.clear();
    next();
  };
  if (editorIsDirty()) askConfirm("Tienes cambios sin guardar en esta rutina. ¿Descartarlos?", go, true);
  else go();
}

// Columnas de objetivos del editor según el tipo — mismo lenguaje que la fila
// de serie (encabezado en mayúscula + valores sin caja). La columna de carga
// cambia de campo en modo %1RM. Unilateral usa las de su tipo.
function targetColumns(type, isPct) {
  const load = type === "time" ? { cap: "+kg", field: "targetWeight", step: 2.5 }
    : isPct ? { cap: "%1RM", field: "targetPercent", step: 5, def: 70, toggle: true }
    : { cap: type === "bodyweight" ? "+kg" : "kg", field: "targetWeight", step: 2.5, toggle: true };
  return [
    { cap: "Series", field: "targetSets", step: 1 },
    type === "time" ? { cap: "Tiempo", field: "targetSeconds", clock: true, def: 30 } : { cap: "Reps", field: "targetReps", step: 1 },
    load,
    { cap: "Desc.", field: "restSeconds", step: 15 },
  ];
}

function editorHTML() {
  const r = ui.editingRoutine;
  const map = exMap();
  const editMode = ui.exerciseEditMode;
  // En modo Organizar, TODO lee/escribe sobre el borrador — el array real no
  // se toca hasta "Guardar cambios" (o queda intacto si se Cancela).
  const list = editMode ? ui.exerciseEditDraft : r.exercises;
  const ssLabels = computeSupersetLabels(list);
  return `
    <header class="vt-header">
      <div class="vt-header-brand vt-grow">
        <button class="vt-btn-icon" data-a="editor-cancel" aria-label="Volver">${icon("back", 18)}</button>
        <div class="vt-detail-title vt-grow">
          <p class="vt-eyebrow">${r.isNew ? "Nueva rutina" : "Editar rutina"}</p>
          <input type="text" class="vt-session-name-input" placeholder="Nombre de la rutina"
            value="${esc(r.name)}" data-i="editor-name" autocomplete="off">
        </div>
      </div>
    </header>
    ${organizeToggleHTML()}
    <div class="vt-list" id="editor-exercise-list">
      ${list.map((it, idx) => {
        const ex = map[it.exerciseId];
        const lbl = ssLabels[idx];
        if (editMode) return exerciseOrganizeRowHTML(idx, ex, lbl);
        const t = ex?.type || "weight";
        const isPct = t !== "time" && it.loadMode === "percent";
        const oneRM = num(map[it.exerciseId]?.oneRM);
        const cols = targetColumns(t, isPct);
        // El encabezado de la columna de carga ES el selector KG / %1RM (la
        // opción activa nombra la columna). En tiempo no hay modo %.
        const caps = cols.map((c) => !c.toggle ? `<span class="vt-cap vt-col-val">${c.cap}</span>`
          : `<span class="vt-col-val vt-pills vt-cap-toggle">
              <button class="${!isPct ? "is-active" : ""}" data-a="editor-loadmode" data-idx="${idx}" data-mode="kg">${t === "bodyweight" ? "+kg" : "kg"}</button>
              <button class="${isPct ? "is-active" : ""}" data-a="editor-loadmode" data-idx="${idx}" data-mode="percent">%1RM</button>
            </span>`).join("");
        const fields = cols.map((c) => {
          const v = it[c.field] ?? c.def ?? 0;
          const attrs = c.clock
            ? `type="text" inputmode="numeric" value="${fmtClockInput(num(v))}"`
            : `type="number" inputmode="decimal" value="${num(v)}" step="${c.step}"`;
          return `<input class="vt-input vt-mono vt-set-input vt-col-val" ${attrs}
            data-i="editor-target" data-field="${c.field}" data-idx="${idx}" aria-label="${c.cap}"
            autocomplete="off" autocorrect="off" spellcheck="false" name="f_${c.field}_${idx}">`;
        }).join("");
        const calc = !isPct ? "" : `<p class="vt-muted-sm vt-target-calc ${oneRM > 0 ? "" : "is-missing"}" id="pct-calc-${idx}">${oneRM > 0
          ? `= ${fmtNum(pctKg(oneRM, it.targetPercent ?? 70))} kg (1RM ${fmtNum(oneRM)} kg)`
          : "Falta el 1RM: defínelo en el detalle del ejercicio (pestaña Ejercicios)"}</p>`;
        const note = ui.editorOpenNotes.has(idx)
          ? `<textarea class="vt-note-input" rows="2" placeholder="Nota (ej: profunda, subir altura)"
              data-i="editor-note" data-idx="${idx}" autocomplete="off">${esc(it.note || "")}</textarea>`
          : it.note
            ? `<button class="vt-note-link has-note" data-a="editor-note-open" data-idx="${idx}">${esc(it.note)}</button>`
            : `<button class="vt-note-link" data-a="editor-note-open" data-idx="${idx}">+ Nota</button>`;
        return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${blockAccentColor(ex, lbl)}" data-block-idx="${idx}">
          <div class="vt-block-body">
            <div class="vt-card-top">
              <h3>${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}</h3>
            </div>
            <div class="vt-sets vt-targets">
              <div class="vt-set-caps">${caps}</div>
              <div class="vt-set-row">${fields}</div>
            </div>
            ${calc}
            ${note}
          </div>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-btn-solid vt-flex-center" data-a="picker-open" data-ctx="editor">${icon("plus", 18)} Agregar ejercicio</button>
    ${editMode ? organizeFooterHTML() : `<div class="vt-sticky-footer">
      <button class="vt-btn-primary vt-full" data-a="editor-save">Guardar rutina</button>
    </div>`}`;
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
  const editMode = ui.exerciseEditMode;
  // En modo Organizar, TODO lee/escribe sobre el borrador — el array real no
  // se toca hasta "Guardar cambios" (o queda intacto si se Cancela).
  const list = editMode ? ui.exerciseEditDraft : s.exercises;
  const ssLabels = computeSupersetLabels(list);

  return `
    <header class="vt-header vt-header-sticky">
      <div class="vt-header-brand"><div>
        <p class="vt-eyebrow">${fmtDate(s.date)}</p>
        ${s.routineId === null
          ? `<input type="text" class="vt-session-name-input" value="${esc(s.routineName)}" data-i="session-name" autocomplete="off">`
          : `<h1 class="vt-header-title-sm">${esc(s.routineName)}</h1>`}
      </div></div>
      <div style="display:flex;align-items:center;gap:var(--sp-4)">
        <div style="display:flex;gap:var(--sp-6)">
          <span class="vt-scoreboard"><span id="live-clock">${fmtClock((Date.now() - new Date(s.date).getTime()) / 1000)}</span><small>TIEMPO</small></span>
          <span class="vt-scoreboard"><span id="live-vol">${Math.round(vol).toLocaleString("es-CL")}</span> kg<small>VOLUMEN</small></span>
        </div>
        <button class="vt-btn-ghost" data-a="session-minimize" aria-label="Minimizar sesión">${icon("chevDown", 20)}</button>
      </div>
    </header>
    ${organizeToggleHTML()}
    <div class="vt-list" id="session-exercise-list">
      ${list.map((e, exIdx) => {
        const ex = map[e.exerciseId];
        const lbl = ssLabels[exIdx];
        if (editMode) return exerciseOrganizeRowHTML(exIdx, ex, lbl);

        const t = ex?.type || "weight";
        const uni = !!ex?.unilateral;
        const prior = priorStats(e.exerciseId);
        const complete = isExerciseComplete(e);
        const prs = prFlags(t, e.sets, prior, uni);
        const anyPR = prs.some(Boolean);
        const accent = blockAccentColor(ex, lbl);

        if (ui.collapsedExercises.has(exIdx)) {
          return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${accent}">
            <button type="button" class="vt-collapsed-row" data-a="ex-toggle-collapse" data-ex="${exIdx}">
              <span class="vt-collapsed-name">${esc(ex?.name || "(eliminado)")}</span>
              ${complete ? `<span class="vt-collapsed-check">${icon("check", 12)}</span>` : ""}
              ${anyPR ? `<span class="vt-pr" title="¡PR!">${icon("trophy", 14)}</span>` : ""}
              ${icon("chevDown", 16)}
            </button>
          </div>`;
        }

        const last = lastSetsFor(e.exerciseId);
        return `<div class="vt-block ${lbl && !lbl.isLast ? "vt-linked-next" : ""}" style="border-left-color:${accent}" data-block-idx="${exIdx}">
          <div class="vt-block-body">
            <div class="vt-card-top">
              <h3>${lbl ? `<span class="vt-ss-badge">${lbl.letter}${lbl.pos}</span>` : ""}${esc(ex?.name || "(eliminado)")}${e.target?.percent ? `<span class="vt-badge" style="margin-left:var(--sp-2)">@${e.target.percent}%</span>` : ""}</h3>
              <div style="display:flex;align-items:center;gap:var(--sp-2);flex-shrink:0">
                <span class="vt-rest-mini" title="Descanso">${icon("timer", 14)}
                  <input type="number" inputmode="numeric" class="vt-input vt-mono" min="0" step="15"
                    value="${num(e.restSeconds) > 0 ? num(e.restSeconds) : ""}" placeholder="0"
                    data-i="ex-rest" data-ex="${exIdx}" aria-label="Descanso en segundos"
                    autocomplete="off" autocorrect="off" spellcheck="false" name="f_exrest_${exIdx}"> s
                </span>
                <button class="vt-btn-ghost" data-a="session-note-toggle" data-ex="${exIdx}" aria-label="Nota del ejercicio" style="${e.sessionNote ? "color:var(--amber)" : ""}">${icon("note", 15)}</button>
                <button class="vt-btn-ghost" data-a="ex-toggle-collapse" data-ex="${exIdx}" aria-label="Colapsar">${icon("chevUp", 16)}</button>
              </div>
            </div>
            ${e.note ? `<p class="vt-coach-note">${esc(e.note)}</p>` : ""}
            ${ui.openExNotes.has(exIdx) ? `<input type="text" class="vt-input" style="margin:var(--sp-2) 0" placeholder="Nota de este ejercicio hoy…" value="${esc(e.sessionNote || "")}" data-i="session-note" data-ex="${exIdx}" autocomplete="off">` : ""}
            ${last ? `<p class="vt-lasttime">Última vez: ${last.map((x) => fmtSet(t, x, uni)).join(", ")}</p>` : ""}
            <div class="vt-sets">
              ${e.sets.length ? setCapsHTML(t, uni) : ""}
              ${(() => {
                let n = 0; // las efectivas se numeran 1..n; C/D/F muestran su letra
                return e.sets.map((st, setIdx) => {
                  const stype = getSetType(st);
                  const label = stype === "warmup" ? "C" : stype === "dropset" ? "D" : stype === "failed" ? "F" : String(++n);
                  return setRowHTML(t, st, exIdx, setIdx, prs[setIdx], label, uni);
                }).join("");
              })()}
            </div>
            <button class="vt-btn-outline vt-small" data-a="set-add" data-ex="${exIdx}">${icon("plus", 14)} Agregar serie</button>
          </div>
        </div>`;
      }).join("")}
    </div>
    <button class="vt-btn-outline vt-flex-center" data-a="picker-open" data-ctx="session">${icon("plus", 18)} Agregar ejercicio</button>
    ${editMode ? organizeFooterHTML() : `<div class="vt-sticky-footer vt-footer-split">
      <button class="vt-btn-ghost vt-danger" data-a="session-discard">Descartar</button>
      <button class="vt-btn-primary vt-flex" data-a="session-finish">${icon("check", 18)} Finalizar sesión</button>
    </div>`}`;
}

// Plantilla ÚNICA de columnas de valor por tipo de ejercicio. La usan el
// encabezado (setCapsHTML) y la fila (setRowHTML), así los dos quedan
// alineados por construcción: mismas columnas, mismas clases .vt-col-*
// (anchos en estilos.css, ver .vt-sets). Alrededor de estas columnas van
// siempre, fijas: [nº] a la izquierda y [RPE] [✓] a la derecha.
//   {cap, f}   → columna de valor (flex:1), f = campo de la serie
//   {x: true}  → el "×" entre kg y reps
//   {timer: true} → botón de cronómetro
function setColumns(type, unilateral) {
  if (type === "time") return [{ cap: "tiempo", f: "seconds" }, { cap: "+kg", f: "weight" }, { timer: true }];
  if (unilateral) return [{ cap: "kg", f: "weight" }, { cap: "izq", f: "repsL" }, { cap: "der", f: "repsR" }];
  if (type === "bodyweight") return [{ cap: "reps", f: "reps" }, { cap: "+kg", f: "weight" }];
  return [{ cap: "kg", f: "weight" }, { x: true }, { cap: "reps", f: "reps" }];
}

// Encabezados de columna sobre la primera serie.
function setCapsHTML(type, unilateral) {
  const cols = setColumns(type, unilateral).map((c) =>
    c.x ? `<span class="vt-col-x"></span>`
      : c.timer ? `<span class="vt-col-timer"></span>`
      : `<span class="vt-cap vt-col-val">${c.cap}</span>`).join("");
  return `<div class="vt-set-caps" aria-hidden="true"><span class="vt-col-num"></span>${cols}<span class="vt-col-rpe"></span><span class="vt-col-check"></span></div>`;
}

// "MM:SS" o "H:MM:SS" para el cronómetro de sesión.
function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

// Igual que fmtClock pero sin rellenar la primera unidad a 2 dígitos
// ("0:30" en vez de "00:30") — para los inputs editables de tiempo, donde
// este es el formato que se ve mientras se escribe (ver
// digitsToClockDisplay) y por consistencia también se usa en su valor
// inicial/mientras el cronómetro corre sin foco.
function fmtClockInput(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

// Reformateo en vivo (tecla a tecla) de un input de tiempo: toma solo los
// dígitos tecleados, los últimos 2 son segundos, lo anterior minutos (y si
// sobran más de 2 dígitos ahí, los que sobran al inicio son horas). A
// diferencia de fmtClock, acá los minutos NO se rellenan a 2 dígitos
// mientras se construye el número — tipear "1" se ve "0:01", no "00:01".
function digitsToClockDisplay(digits) {
  digits = digits.replace(/\D/g, "");
  if (!digits) return "0:00";
  const s = digits.slice(-2).padStart(2, "0");
  const rest = digits.slice(0, -2);
  if (rest.length <= 2) return `${rest === "" ? "0" : String(Number(rest))}:${s}`;
  const mm = rest.slice(-2).padStart(2, "0");
  const hh = String(Number(rest.slice(0, -2)));
  return `${hh}:${mm}:${s}`;
}

// Reescribe el input EN EL MOMENTO con digitsToClockDisplay (cursor al
// final, comportamiento esperado en un campo tipo reloj) y devuelve el
// valor ya convertido a segundos totales, listo para guardar en el estado.
function reformatClockInputLive(el) {
  const display = digitsToClockDisplay(el.value);
  el.value = display;
  el.setSelectionRange(display.length, display.length);
  return parseClock(display);
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
  persistActiveSession(); // limpia runningTimerInfo (se recalcula desde runningTimer, ver arriba)
}

// Tick único y global: escribe directo en el DOM por id/selector, nunca render() (patrón #live-vol).
let tickCount = 0;
setInterval(() => {
  tickCount++;
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
  if (input && document.activeElement !== input) input.value = fmtClockInput(st.seconds);
  // No hace falta autoguardar con precisión de 1s — cada 5 alcanza para que
  // quede al día sin escribir en localStorage cada tick.
  if (tickCount % 5 === 0) persistActiveSession();
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

function setRowHTML(type, st, exIdx, setIdx, pr, label, unilateral) {
  const stype = getSetType(st);
  const open = ui.openNotes.has(`${exIdx}:${setIdx}`);
  const typeKey = `${exIdx}:${setIdx}`;
  const openType = ui.openTypeSelector === typeKey;
  const typeBtnClass = stype === "warmup" ? "is-warmup" : stype === "dropset" ? "is-dropset" : stype === "failed" ? "is-failed" : "";
  const attrs = (f) =>
    `data-i="set" data-f="${f}" data-ex="${exIdx}" data-set="${setIdx}" autocomplete="off" autocorrect="off" spellcheck="false" name="f_${f}_${exIdx}_${setIdx}"`;

  const running = !!(runningTimer && runningTimer.exIdx === exIdx && runningTimer.setIdx === setIdx);
  const fields = setColumns(type, unilateral).map((c) => {
    if (c.x) return `<span class="vt-x vt-col-x">×</span>`;
    if (c.timer) return `<button class="vt-timer-btn vt-col-timer ${running ? "is-running" : ""}" data-a="set-timer" data-ex="${exIdx}" data-set="${setIdx}"
        aria-label="${running ? "Pausar cronómetro" : "Cronometrar serie"}">${icon(running ? "pause" : "playBtn", 13)}</button>`;
    if (c.f === "seconds") return `<input type="text" inputmode="numeric" class="vt-input vt-mono vt-set-input vt-col-val vt-set-input-clock ${running ? "is-running" : ""}" value="${fmtClockInput(num(st.seconds))}" ${attrs("seconds")}>`;
    const value = c.f === "repsL" ? repsL(st) : c.f === "repsR" ? repsR(st) : num(st[c.f]);
    return `<input type="number" inputmode="${c.f === "weight" ? "decimal" : "numeric"}" class="vt-input vt-mono vt-set-input vt-col-val" value="${value}" ${attrs(c.f)}>`;
  }).join("");

  return `
    <div class="vt-swipe-wrap" data-ex="${exIdx}" data-set="${setIdx}">
      <div class="vt-swipe-bg" aria-hidden="true">${icon("trash", 18)}</div>
      <div class="vt-set-row ${type === "time" ? "vt-set-row-time" : ""} ${stype === "warmup" ? "is-warmup" : ""} ${st.done ? "is-done" : ""} ${pr ? "is-pr" : ""}">
        <button class="vt-settype-btn vt-col-num ${typeBtnClass}" data-a="settype-toggle" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Tipo de serie">${label}</button>
        ${fields}
        <button class="vt-rpe-btn vt-col-rpe ${st.rpe ? "has-value" : ""}" data-a="set-notes" data-ex="${exIdx}" data-set="${setIdx}" aria-label="RPE">${icon("gauge", 15)}</button>
        <button class="vt-check vt-col-check" data-a="set-check" data-ex="${exIdx}" data-set="${setIdx}" aria-label="Marcar serie">${icon("check", 15)}</button>
        ${pr ? `<span class="vt-pr" title="¡PR!">${icon("trophy", 16)}</span>` : ""}
      </div>
    </div>
    ${openType ? typeSelectorHTML(exIdx, setIdx) : ""}
    ${open ? `<div class="vt-setline2">
      <input type="number" inputmode="decimal" class="vt-input vt-mono vt-rpe-input" placeholder="RPE" min="1" max="10" step="0.5"
        value="${st.rpe ?? ""}" ${attrs("rpe")}>
    </div>` : ""}`;
}

/* --------------------------------- Vista Historial ------------------------------- */

// Fusionado dentro de Progreso (sub-vista "historial", ver progressHTML) —
// sin su propio <header> de pestaña, ese ya lo pone Progreso arriba.
const HISTORY_RANGE_CHIPS = [{ id: "todo", label: "Todo" }, { id: "1m", label: "1M" }, { id: "3m", label: "3M" }, { id: "1a", label: "1A" }];
const HISTORY_RANGE_DAYS = { "1m": 30, "3m": 90, "1a": 365 };

// Buscador + rango son AND, no se reemplazan entre sí.
function filteredSessions() {
  const q = ui.historyQuery.trim().toLowerCase();
  const days = HISTORY_RANGE_DAYS[ui.historyRange];
  const cutoff = days ? Date.now() - days * 86400000 : null;
  return sessions.filter((s) => {
    if (q && !s.routineName.toLowerCase().includes(q)) return false;
    if (cutoff && new Date(s.date).getTime() < cutoff) return false;
    return true;
  });
}

// Ejercicios con récord por sesión: {sessionId: Set(exerciseId)}. Sale de
// computeAllPRs (un récord por ejercicio, igual que el resumen de sesión).
// Se calcula una vez por render (render() invalida el caché).
let sessionPRCache = null;
function sessionPRs() {
  if (sessionPRCache) return sessionPRCache;
  const out = {};
  computeAllPRs().forEach((p) => { (out[p.sessionId] ??= new Set()).add(p.exerciseId); });
  return (sessionPRCache = out);
}

// Peso total en formato corto: "3.636 kg", o "7,3 t" desde 1.000 kg cuando
// `tons` está activo (encabezados de mes, franjas de stats).
function fmtVolume(v, tons = false) {
  return tons && v >= 1000
    ? `${(v / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })} t`
    : `${Math.round(v).toLocaleString("es-CL")} kg`;
}

// Fila de sesión del historial: mismo patrón que la fila de rutina (nombre en
// Barlow + línea de datos), con chevron. Tocarla abre el detalle de la sesión.
function sessionRowHTML(s) {
  const nPR = sessionPRs()[s.id]?.size || 0;
  const meta = [fmtDateShort(s.date), s.durationSec ? fmtDurationMin(s.durationSec) : "", fmtVolume(sessionVolume(s, false))].filter(Boolean).join(" · ");
  return `<button class="vt-hist-row" data-a="session-detail-open" data-id="${s.id}">
    <span class="vt-hist-text">
      <span class="vt-routine-name">${esc(s.routineName)}</span>
      <span class="vt-routine-meta">${meta}${nPR ? ` · <span class="vt-pr vt-pr-inline">${icon("trophy", 12)}</span> ${nPR}` : ""}</span>
    </span>
    <span class="vt-cat-chev">${icon("chevRight", 16)}</span>
  </button>`;
}

// Se llama al tipear/tocar un filtro — actualiza solo la lista filtrada, sin
// perder el foco del buscador (mismo patrón que exercises-q). Agrupada por
// mes: "OCTUBRE 2026 · 3 SESIONES · 7,3 t".
function historyFilteredListHTML() {
  const filtered = filteredSessions();
  if (!filtered.length) return emptyHTML("Nada por acá", "Prueba con otro nombre o ajusta el rango de fecha.", "");
  const months = [];
  filtered.forEach((s) => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    let m = months[months.length - 1];
    if (!m || m.key !== key) months.push(m = { key, label: `${d.toLocaleDateString("es-CL", { month: "long" })} ${d.getFullYear()}`, list: [] });
    m.list.push(s);
  });
  return months.map((m, i) => {
    const vol = m.list.reduce((a, s) => a + sessionVolume(s, false), 0);
    const n = m.list.length;
    return `<section class="vt-section ${i === 0 ? "vt-section-first" : ""}">
      <p class="vt-section-eyebrow">${m.label} · ${n} sesi${n !== 1 ? "ones" : "ón"} · <span class="vt-keepcase">${fmtVolume(vol, true)}</span></p>
      <div class="vt-routine-list">${m.list.map(sessionRowHTML).join("")}</div>
    </section>`;
  }).join("");
}

function historyListHTML() {
  if (sessions.length === 0)
    return emptyHTML("Todavía no hay historial", "Cuando termines un entrenamiento, va a aparecer acá.", "");
  return `
    <div class="vt-search">${icon("search", 16)}
      <input placeholder="Buscar por nombre…" value="${esc(ui.historyQuery)}" data-i="history-q" autocomplete="off">
    </div>
    <div class="vt-hist-filters"><div class="vt-pills">
      ${HISTORY_RANGE_CHIPS.map((c) => `<button class="${ui.historyRange === c.id ? "is-active" : ""}" data-a="history-range" data-range="${c.id}">${c.label}</button>`).join("")}
    </div></div>
    <div id="history-filtered-list">${historyFilteredListHTML()}</div>`;
}

/* ------------------------------- Detalle de sesión ------------------------------- */

// "Lo que hiciste": una fila por ejercicio con sus series en formato compacto
// (fmtDoneSets) y un trofeo si tuvo récord. La usan el resumen de fin de
// sesión y el detalle de sesión del historial; este último pasa
// withNotes=true para mostrar también las notas (del entrenador, de la
// sesión y de series puntuales).
function doneListHTML(list, prIds, withNotes = false) {
  return `<div class="vt-rows">${list.map((e) => {
    const setNotes = withNotes ? e.sets.filter((st) => st.note).map((st) => esc(st.note)) : [];
    const notes = !withNotes ? "" : `
      ${e.note ? `<p class="vt-coach-note">${esc(e.note)}</p>` : ""}
      ${e.sessionNote ? `<p class="vt-note-line">— ${esc(e.sessionNote)}</p>` : ""}
      ${setNotes.length ? `<p class="vt-note-line">— ${setNotes.join(" · ")}</p>` : ""}`;
    return `<div class="vt-row-wrap">
      <div class="vt-row">
        <span class="vt-row-name">${esc(exName(e.exerciseId))}${prIds.has(e.exerciseId) ? `<span class="vt-pr vt-pr-inline">${icon("trophy", 12)}</span>` : ""}</span>
        <span class="vt-row-value">${esc(fmtDoneSets(e))}</span>
      </div>${notes}
    </div>`;
  }).join("")}</div>`;
}

// Pantalla completa que se abre al tocar una sesión del historial. Mismo
// encabezado que el detalle de ejercicio (volver + eyebrow + título + ⋯).
function sessionDetailHTML() {
  const s = sessions.find((x) => x.id === ui.sessionDetail);
  const dur = s.durationSec ? durationParts(s.durationSec) : { value: "—", unit: "" };
  const [volValue, volUnit] = fmtVolume(sessionVolume(s, false), true).split(" ");
  const done = s.exercises.filter((e) => e.sets.length);
  return `
    <header class="vt-header">
      <div class="vt-header-brand">
        <button class="vt-btn-icon" data-a="session-detail-close" aria-label="Volver">${icon("back", 18)}</button>
        <div class="vt-detail-title"><p class="vt-eyebrow">${fmtDate(s.date)}</p><h1 class="vt-header-title-sm">${esc(s.routineName)}</h1></div>
      </div>
      <button class="vt-more-btn" data-a="sheet-open" data-kind="session" data-id="${s.id}" aria-label="Opciones de la sesión">${icon("more", 20)}</button>
    </header>
    ${statStripHTML([
      { label: "Duración", value: dur.value, unit: dur.unit },
      { label: "Volumen", value: volValue, unit: volUnit },
      { label: "Series", value: done.reduce((a, e) => a + e.sets.length, 0) },
    ])}
    ${jumpsLineHTML(sessionJumps(s))}
    <section class="vt-section">
      <p class="vt-section-eyebrow">Lo que hiciste</p>
      ${doneListHTML(done, sessionPRs()[s.id] || new Set(), true)}
    </section>
    <section class="vt-section">
      <div class="vt-sec-head">
        <p class="vt-section-eyebrow">Carga</p>
        ${s.rpe && !ui.sessionRpeEdit ? `<button class="vt-text-btn" data-a="session-rpe-edit">Cambiar</button>` : ""}
      </div>
      ${ui.sessionRpeEdit ? rpeButtonsHTML(s.id, s.rpe || null)
        : s.rpe ? `<p class="vt-load-line">RPE <b>${s.rpe}</b> · <b>${fmtNum(sessionLoad(s))}</b> UA</p>`
        : `<button class="vt-text-btn" data-a="session-rpe-edit">Agregar RPE</button>`}
    </section>
    <div class="vt-sum-actions">
      <button class="vt-btn-primary vt-full vt-flex" data-a="session-repeat" data-id="${s.id}">${icon("repeat", 16)} Repetir</button>
    </div>`;
}

/* --------------------------------- Vista Progreso -------------------------------- */

function exercisesWithHistory() {
  const ids = new Set();
  sessions.forEach((s) => s.exercises.forEach((e) => { if (e.sets.length) ids.add(e.exerciseId); }));
  return Array.from(ids);
}

function metricOptions(exId) {
  const t = exType(exId);
  const uni = exUnilateral(exId);
  const prior = priorStats(exId);
  if (t === "time") return [{ id: "seconds", label: "Tiempo máx." }];
  if (t === "bodyweight") {
    const opts = [
      prior.anyLastre ? { id: "weight", label: "Lastre máx." } : { id: "reps", label: "Reps máx." },
      { id: "volume", label: "Volumen" },
    ];
    // Con lastre, "reps" no aparece por defecto — pero en unilateral sigue
    // siendo el dato que interesa graficar por lado (peso es compartido).
    if (uni && prior.anyLastre) opts.splice(1, 0, { id: "reps", label: "Reps máx." });
    return opts;
  }
  const opts = [{ id: "weight", label: "Peso máx." }, { id: "volume", label: "Volumen" }];
  // Ejercicios de peso unilaterales (ej. zancada búlgara): el peso es
  // compartido, lo que realmente varía por lado son las reps — sin esto la
  // vista de dos lados (Izq/Der) nunca sería alcanzable para este tipo.
  if (uni) opts.splice(1, 0, { id: "reps", label: "Reps máx." });
  return opts;
}

/* ----------------------------- Rango temporal ----------------------------- */

// Solo 4 opciones, sin scroll horizontal. El mismo rango gobierna el gráfico
// de volumen, el reparto, las mini curvas de "Tus ejercicios" y el detalle.
const RANGE_CHIPS = [{ id: "1m", label: "1M" }, { id: "2m", label: "2M" }, { id: "6m", label: "6M" }, { id: "1a", label: "1A" }];
const RANGE_DAYS = { "1m": 30, "2m": 60, "6m": 180, "1a": 365 };
const RANGE_WORDS = { "1m": "1 mes", "2m": "2 meses", "6m": "6 meses", "1a": "1 año" };
const rangeToDays = (range) => RANGE_DAYS[range] || 60;

// Granularidad: semanal hasta 6M, mensual en 1A (si no, serían 52 barras).
const bucketGranularity = (range) => range === "1a" ? "month" : "week";

function sessionsInRange(range) {
  const cutoff = Date.now() - rangeToDays(range) * 86400000;
  return sessions.filter((s) => new Date(s.date).getTime() >= cutoff);
}

// Lunes de la semana de `d` (semana ISO, lunes a domingo), a medianoche local.
function mondayOf(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  const day = dt.getDay(); // 0=domingo
  dt.setDate(dt.getDate() + (day === 0 ? -6 : 1 - day));
  return dt;
}
const weekKey = (d) => mondayOf(d).toISOString().slice(0, 10);
// "YYYY-MM-DD" → Date a medianoche LOCAL (new Date("YYYY-MM-DD") lo toma como UTC).
const localKeyToDate = (key) => { const [y, m, d] = key.split("-").map(Number); return new Date(y, m - 1, d); };
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

function bucketLabel(key, granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" });
  }
  // OJO: key es "YYYY-MM-DD" (de weekKey) — usar localKeyToDate, no fmtDateShort(key)
  // a secas, o en husos negativos (Chile) el eje muestra el domingo anterior.
  return fmtDateShort(localKeyToDate(key));
}

// Agrupa las sesiones del rango en períodos (semanas o meses, ver
// bucketGranularity), en orden cronológico. La serie es CONTINUA: va desde
// el primer período con sesiones hasta el actual, incluyendo los vacíos (en
// 0) — así el eje no esconde las semanas sin entrenar y el período actual
// siempre existe (es la barra azul). `isCurrent` marca ese último.
function computeBuckets(range) {
  const granularity = bucketGranularity(range);
  const keyOf = (d) => granularity === "month" ? monthKey(d) : weekKey(d);
  const map = new Map();
  sessionsInRange(range).forEach((s) => {
    const key = keyOf(new Date(s.date));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(s);
  });
  if (map.size === 0) return [];
  const nowKey = keyOf(new Date());
  const keys = [];
  // El cursor avanza en hora local (mediodía, para no cruzarse con cambios
  // de hora) desde el primer período con datos hasta el actual.
  const cursor = granularity === "month"
    ? (() => { const [y, m] = [...map.keys()].sort()[0].split("-").map(Number); return new Date(y, m - 1, 1, 12); })()
    : (() => { const d = localKeyToDate([...map.keys()].sort()[0]); d.setHours(12); return d; })();
  for (let guard = 0; guard < 80; guard++) {
    const k = keyOf(cursor);
    keys.push(k);
    if (k >= nowKey) break;
    if (granularity === "month") cursor.setMonth(cursor.getMonth() + 1); else cursor.setDate(cursor.getDate() + 7);
  }
  return keys.map((key) => ({ key, label: bucketLabel(key, granularity), sessions: map.get(key) || [], isCurrent: key === nowKey }));
}

function rangeChipsHTML() {
  return `<div class="vt-pills">
    ${RANGE_CHIPS.map((c) => `<button class="${ui.progressRange === c.id ? "is-active" : ""}" data-a="prog-range" data-range="${c.id}">${c.label}</button>`).join("")}
  </div>`;
}

/* ------------------------------- Resumen semanal ------------------------------- */

// Semanas consecutivas (hacia atrás desde hoy) con al menos 1 sesión. Si la
// semana en curso todavía no tiene sesión, no rompe la racha por eso solo —
// se sigue contando desde la semana anterior.
function currentStreakWeeks() {
  const weeksWithSessions = new Set(sessions.map((s) => weekKey(new Date(s.date))));
  let cursor = mondayOf(new Date());
  if (!weeksWithSessions.has(weekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  let streak = 0;
  while (weeksWithSessions.has(weekKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

function weeklyStats() {
  const thisWeek = weekKey(new Date());
  const thisWeekSessions = sessions.filter((s) => weekKey(new Date(s.date)) === thisWeek);
  const volume = thisWeekSessions.reduce((a, s) => a + sessionVolume(s, false), 0);
  return { count: thisWeekSessions.length, volume, streak: currentStreakWeeks() };
}

/* --------------------------------- Récords --------------------------------- */

// Recorre las sesiones de la más vieja a la más nueva llevando un máximo
// incremental por ejercicio (mismo criterio que priorStats/isPR: C/D/F no
// cuentan, unilateral usa el lado más débil) y registra cada vez que una
// serie supera el máximo que había hasta ESE momento. Devuelve más reciente primero.
function computeAllPRs() {
  const map = exMap();
  const trackers = {};
  const hits = [];
  [...sessions].reverse().forEach((s) => {
    s.exercises.forEach((e) => {
      const exId = e.exerciseId;
      const type = exType(exId);
      const uni = exUnilateral(exId);
      if (!trackers[exId]) trackers[exId] = { maxW: 0, maxR: 0, maxS: 0, anyLastre: false };
      const prior = trackers[exId];
      e.sets.forEach((st) => {
        if (getSetType(st)) return;
        if (type === "time") {
          const v = num(st.seconds);
          if (v > 0 && v > prior.maxS) hits.push({ date: s.date, sessionId: s.id, exerciseId: exId, exerciseName: map[exId]?.name || "(ejercicio eliminado)", type, metric: "seconds", value: v });
        } else if (type === "bodyweight") {
          if (num(st.weight) > 0) {
            if (num(st.weight) > prior.maxW) hits.push({ date: s.date, sessionId: s.id, exerciseId: exId, exerciseName: map[exId]?.name || "(ejercicio eliminado)", type, metric: "weight", value: num(st.weight) });
          } else {
            const r = uni ? Math.min(repsL(st), repsR(st)) : num(st.reps);
            if (!prior.anyLastre && r > 0 && r > prior.maxR) hits.push({ date: s.date, sessionId: s.id, exerciseId: exId, exerciseName: map[exId]?.name || "(ejercicio eliminado)", type, metric: "reps", value: r });
          }
        } else {
          if (num(st.weight) > 0 && num(st.weight) > prior.maxW) hits.push({ date: s.date, sessionId: s.id, exerciseId: exId, exerciseName: map[exId]?.name || "(ejercicio eliminado)", type, metric: "weight", value: num(st.weight) });
        }
        prior.maxW = Math.max(prior.maxW, num(st.weight));
        prior.maxR = Math.max(prior.maxR, uni ? Math.min(repsL(st), repsR(st)) : num(st.reps));
        prior.maxS = Math.max(prior.maxS, num(st.seconds));
        if (num(st.weight) > 0) prior.anyLastre = true;
      });
    });
  });
  return hits.reverse();
}

const fmtPRValue = (hit) =>
  hit.metric === "seconds" ? fmtClockInput(hit.value) : hit.metric === "reps" ? `${hit.value} reps` : `${fmtNum(hit.value)} kg`;

// Récords recientes: máximo 3, uno por ejercicio (el más reciente de cada
// uno). Compartir un PR vive en el detalle del ejercicio, no acá.
function recentRecordsHTML() {
  const seen = new Set();
  const prs = computeAllPRs().filter((p) => !seen.has(p.exerciseId) && seen.add(p.exerciseId)).slice(0, 3);
  return `<section class="vt-section">
    <p class="vt-section-eyebrow vt-eyebrow-pr">Récords recientes</p>
    ${prs.length === 0
      ? `<p class="vt-muted">Todavía no hay récords registrados.</p>`
      : `<div class="vt-records">${prs.map((p) => `
        <div class="vt-record">
          <span class="vt-pr">${icon("trophy", 16)}</span>
          <div class="vt-record-main"><span class="vt-record-name">${esc(p.exerciseName)}</span></div>
          <span class="vt-record-value">${fmtPRValue(p)}</span>
        </div>`).join("")}</div>`}
  </section>`;
}

/* ---------------------------- Datos por ejercicio ---------------------------- */

function progressData(exId, metric) {
  const t = exType(exId);
  const uni = exUnilateral(exId);
  const cutoff = Date.now() - rangeToDays(ui.progressRange || "2m") * 86400000;
  const pts = [];
  [...sessions].filter((s) => new Date(s.date).getTime() >= cutoff).reverse().forEach((s) => {
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

// Variante por lado (izq/der) para ejercicios unilaterales con métrica "reps"
// — el rango solo filtra qué sesiones entran, cada una es su propio punto.
function progressDataSide(exId, field) {
  const cutoff = Date.now() - rangeToDays(ui.progressRange || "2m") * 86400000;
  const pts = [];
  [...sessions].filter((s) => new Date(s.date).getTime() >= cutoff).reverse().forEach((s) => {
    const e = s.exercises.find((x) => x.exerciseId === exId);
    if (!e || e.sets.length === 0) return;
    const eff = e.sets.filter((st) => !getSetType(st));
    if (!eff.length) return;
    const v = Math.max(...eff.map((st) => (field === "repsL" ? repsL(st) : repsR(st))));
    pts.push({ date: fmtDateShort(s.date), v });
  });
  return pts;
}

// Valor de una métrica con su unidad, en formato chileno ("52,5 kg", "12 reps",
// "1:30"). `sign` antepone +/− (para deltas).
function fmtMetric(v, metric, sign = false) {
  const pre = !sign ? "" : v < 0 ? "−" : "+";
  const a = sign ? Math.abs(v) : v;
  if (metric === "seconds") return `${pre}${fmtClockInput(a)}`;
  return `${pre}${fmtNum(a)} ${metric === "reps" ? "reps" : "kg"}`;
}

/* ----------------------- Marcas por ejercicio (exerciseStats) ----------------------- */

// Fuente única para todo lo que muestra "la mejor marca" de un ejercicio:
// la pestaña Ejercicios (filas y Recientes) y "Tus ejercicios" de Progreso.
// Recorre las sesiones UNA vez por render (el resultado se guarda en
// exerciseStatsCache, que render() invalida) y devuelve, por exerciseId:
//   metric   → qué se mide: "weight" | "reps" | "seconds"
//   best     → la mejor marca histórica (null si nunca hubo una válida)
//   lastDate → fecha ISO del último uso
//   points   → [{date, v}] mejor marca de cada sesión, en orden cronológico
// La marca según el tipo:
//   peso × reps   → peso máximo (0 kg NO cuenta como marca)
//   peso corporal → lastre máximo si alguna vez usó; si no, reps máximas
//   tiempo        → segundos máximos
// Mismo criterio que los PRs: C/D/F no cuentan y en unilateral las reps son
// las del lado más débil. Ejercicios borrados del catálogo quedan fuera.
let exerciseStatsCache = null;
function exerciseStats() {
  if (exerciseStatsCache) return exerciseStatsCache;
  const map = exMap();
  const acc = {};
  for (let i = sessions.length - 1; i >= 0; i--) { // `sessions` va de más nueva a más vieja
    const s = sessions[i];
    for (const e of s.exercises) {
      const ex = map[e.exerciseId];
      if (!ex || !e.sets.length) continue;
      const a = (acc[e.exerciseId] ??= { lastDate: null, raw: [] });
      // El mismo ejercicio dos veces en una sesión cuenta como un solo punto.
      let pt = a.raw[a.raw.length - 1];
      if (!pt || pt.sid !== s.id) { pt = { sid: s.id, date: s.date, w: 0, r: 0, sec: 0 }; a.raw.push(pt); }
      a.lastDate = s.date;
      for (const st of e.sets) {
        if (getSetType(st)) continue;
        pt.w = Math.max(pt.w, num(st.weight));
        pt.r = Math.max(pt.r, ex.unilateral ? Math.min(repsL(st), repsR(st)) : num(st.reps));
        pt.sec = Math.max(pt.sec, num(st.seconds));
      }
    }
  }
  const out = {};
  for (const [id, a] of Object.entries(acc)) {
    const type = map[id].type || "weight";
    const metric = type === "time" ? "seconds"
      : type === "bodyweight" ? (a.raw.some((p) => p.w > 0) ? "weight" : "reps")
      : "weight";
    const key = metric === "seconds" ? "sec" : metric === "reps" ? "r" : "w";
    const points = a.raw.map((p) => ({ date: p.date, v: p[key] })).filter((p) => p.v > 0);
    out[id] = { metric, best: points.length ? Math.max(...points.map((p) => p.v)) : null, lastDate: a.lastDate, points };
  }
  return (exerciseStatsCache = out);
}

// Una marca con su unidad: `53 kg`, `10 reps`, `1:00`; el lastre de un
// ejercicio de peso corporal lleva el signo: `+10 kg`.
function fmtMark(exId, v, metric) {
  return `${metric === "weight" && exType(exId) === "bodyweight" ? "+" : ""}${fmtMetric(v, metric)}`;
}

// Fecha relativa corta: hoy / ayer / hace N días / hace N sem / hace N meses.
// Cuenta días de calendario (medianoche local), no bloques de 24 h.
function fmtRelDate(iso) {
  const day = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const days = Math.max(0, Math.round((day(new Date()) - day(iso)) / 86400000));
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;
  if (days < 30) return `hace ${Math.floor(days / 7)} sem`;
  if (days < 365) { const m = Math.floor(days / 30); return `hace ${m} mes${m !== 1 ? "es" : ""}`; }
  const y = Math.floor(days / 365);
  return `hace ${y} año${y !== 1 ? "s" : ""}`;
}

/* ------------------------------ "Tus ejercicios" ------------------------------ */

// Los destacados que eligió el usuario (hasta 5, los mismos del viejo panel
// "Tus máximos"); si no eligió ninguno, los 5 más entrenados. Los de tiempo
// quedan fuera de la lista automática igual que del selector de destacados —
// se llega a su detalle por "Ver todos".
function featuredIds() {
  const map = exMap();
  const chosen = (settings.featuredExercises || []).filter((id) => map[id]); // ids huérfanos se ignoran
  if (chosen.length) return chosen;
  const counts = {};
  sessions.forEach((s) => s.exercises.forEach((e) => {
    if (e.sets.length && map[e.exerciseId] && map[e.exerciseId].type !== "time")
      counts[e.exerciseId] = (counts[e.exerciseId] || 0) + 1;
  }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
}

// Mini curva SVG (72×24 por defecto; la pestaña Ejercicios la usa a 56×20)
// con una marca por sesión. La escala Y va del mínimo al máximo del propio
// ejercicio (no desde 0): acá importa la forma de la tendencia, el valor
// exacto va al lado en texto.
function sparklineHTML(values, W = 72, H = 24) {
  const PAD = 3;
  if (!values.length) return `<svg class="vt-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>`;
  const min = Math.min(...values), max = Math.max(...values);
  const x = (i) => values.length === 1 ? W - PAD : PAD + i * (W - 2 * PAD) / (values.length - 1);
  const y = (v) => max === min ? H / 2 : H - PAD - (v - min) * (H - 2 * PAD) / (max - min);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const last = pts[pts.length - 1].split(",");
  return `<svg class="vt-spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true">
    ${values.length > 1 ? `<polyline points="${pts.join(" ")}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <circle cx="${last[0]}" cy="${last[1]}" r="2.5" fill="currentColor"/>
  </svg>`;
}

function exerciseRowHTML(exId) {
  const st = exerciseStats()[exId];
  const metric = st?.metric || "weight";
  const cutoff = Date.now() - rangeToDays(ui.progressRange) * 86400000;
  const data = (st?.points || []).filter((p) => new Date(p.date).getTime() >= cutoff);
  const words = RANGE_WORDS[ui.progressRange] || "2 meses";
  const current = data[data.length - 1];
  const delta = data.length > 1 ? current.v - data[0].v : 0;
  const sub = !current ? `sin registros en ${words}`
    : delta === 0 ? `sin cambios en ${words}`
    : `<b class="${delta > 0 ? "vt-sum-up" : ""}">${fmtMetric(delta, metric, true)}</b> en ${words}`;
  // El valor grande es el RÉCORD histórico (coincide con "Récords
  // recientes"); si la última sesión quedó por debajo, el subtítulo lo dice.
  const lastPt = st?.points[st.points.length - 1];
  const belowRecord = st && st.best !== null && lastPt && lastPt.v < st.best ? ` · última ${fmtMark(exId, lastPt.v, metric)}` : "";
  const [val, unit] = st && st.best !== null ? fmtMark(exId, st.best, metric).split(" ") : ["—", ""];
  return `<button class="vt-exrow" data-a="prog-detail-open" data-id="${exId}">
    <span class="vt-exrow-text"><span class="vt-exrow-name">${esc(exName(exId))}</span><span class="vt-exrow-sub">${sub}${belowRecord}</span></span>
    ${sparklineHTML(data.map((p) => p.v))}
    <span class="vt-exrow-value">${val}${unit ? `<small>${unit}</small>` : ""}</span>
  </button>`;
}

function yourExercisesHTML() {
  const ids = featuredIds();
  return `<section class="vt-section">
    <div class="vt-sec-head">
      <p class="vt-section-eyebrow">Tus ejercicios</p>
      <button class="vt-text-btn" data-a="featured-sheet-open">Editar</button>
    </div>
    <div class="vt-rows">${ids.map(exerciseRowHTML).join("")}</div>
    <button class="vt-text-btn" data-a="picker-open" data-ctx="detail">Ver todos</button>
  </section>`;
}

// Hoja "Editar" de Tus ejercicios: el selector de destacados de siempre
// (quitar con ✕, agregar abre el picker) — hasta 5.
function featuredSheetHTML() {
  const map = exMap();
  const ids = (settings.featuredExercises || []).filter((id) => map[id]);
  return `
    <div class="vt-modal-backdrop" data-a="featured-sheet-close">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-head">
          <h2 class="vt-modal-title">Tus ejercicios</h2>
          <button class="vt-btn-ghost" data-a="featured-sheet-close" aria-label="Cerrar">${icon("x", 18)}</button>
        </div>
        <div class="vt-modal-body">
          ${ids.length ? "" : `<p class="vt-muted vt-modal-note">Destaca hasta 5 ejercicios. Mientras no elijas ninguno, se muestran los 5 que más entrenas.</p>`}
          ${ids.map((id) => `<div class="vt-modal-row vt-modal-row-static">
            <span class="vt-dotgroup" style="background:${groupColor(map[id].group) || "var(--text-dim)"}"></span>
            <span class="vt-modal-row-name">${esc(map[id].name)}</span>
            <button class="vt-btn-ghost vt-danger" data-a="featured-remove" data-id="${id}" aria-label="Quitar de destacados">${icon("x", 16)}</button>
          </div>`).join("")}
          ${ids.length < 5 ? `<button class="vt-modal-row vt-modal-row-action" data-a="picker-open" data-ctx="featured">${icon("plus", 16)} Agregar ejercicio</button>` : ""}
        </div>
      </div>
    </div>`;
}

/* ----------------------------- Detalle de ejercicio ----------------------------- */

// Línea bajo el 1RM (solo peso × reps): "Estimado: 67,5 kg de 53 × 8" + botón
// "Usar". Aparece si no hay 1RM guardado, o si el guardado difiere más de un
// 5% del estimado (hacia cualquier lado).
function oneRMHintHTML(ex) {
  if ((ex.type || "weight") !== "weight") return "";
  const b = bestEpley(ex.id);
  if (!b) return "";
  const saved = num(ex.oneRM);
  if (saved > 0 && Math.abs(b.est - saved) / saved <= 0.05) return "";
  return `<div class="vt-hint-row">
    <span>Estimado: <b>${fmtNum(b.est)} kg</b> <span class="vt-hint-dim">de ${fmtNum(b.weight)} × ${b.reps}</span></span>
    <button class="vt-text-btn" data-a="onerm-use" data-id="${ex.id}" data-value="${b.est}">Usar</button>
  </div>`;
}

// Pantalla que se abre al tocar un ejercicio — en "Tus ejercicios" de
// Progreso o en la pestaña Ejercicios (filas y Recientes): gráfico con
// toggle de métrica y soporte unilateral, rango, 1RM editable y compartir PR.
// Editar y Eliminar el ejercicio viven en el ⋯ del encabezado.
function exerciseDetailHTML() {
  const exId = ui.progressDetail;
  const ex = exMap()[exId];
  const options = metricOptions(exId);
  if (!ui.progressMetric || !options.some((o) => o.id === ui.progressMetric)) ui.progressMetric = options[0].id;
  const metric = ui.progressMetric;
  // Unilateral: solo la métrica "reps" se desglosa por lado — peso es
  // compartido y volumen ya suma ambos lados, ahí un único dataset alcanza.
  const splitBySide = exUnilateral(exId) && metric === "reps";

  let cells;
  if (splitBySide) {
    const dataL = progressDataSide(exId, "repsL"), dataR = progressDataSide(exId, "repsR");
    const curL = dataL[dataL.length - 1], curR = dataR[dataR.length - 1];
    cells = [{ label: "Izquierda", v: curL?.v }, { label: "Derecha", v: curR?.v }].map((c) => ({ label: c.label, text: c.v == null ? "—" : fmtMetric(c.v, "reps") }));
  } else {
    const data = progressData(exId, metric);
    const m = metric === "volume" ? "weight" : metric; // el volumen se muestra en kg
    const current = data[data.length - 1];
    cells = [
      { label: "Actual", text: current ? fmtMetric(current.v, m) : "—" },
      { label: `En ${RANGE_WORDS[ui.progressRange]}`, text: data.length > 1 ? fmtMetric(current.v - data[0].v, m, true) : "—" },
    ];
  }
  const strip = statStripHTML(cells.map((c) => { const [value, unit] = c.text.split(" "); return { label: c.label, value, unit }; }));

  const lastPR = computeAllPRs().find((p) => p.exerciseId === exId);
  const hasHistory = !!exerciseStats()[exId];
  const hasData = splitBySide
    ? progressDataSide(exId, "repsL").length > 0
    : progressData(exId, metric).length > 0;
  return `
    <header class="vt-header">
      <div class="vt-header-brand">
        <button class="vt-btn-icon" data-a="prog-detail-close" aria-label="Volver">${icon("back", 18)}</button>
        <div class="vt-detail-title"><p class="vt-eyebrow">${esc(ex.group || "Custom")}</p><h1 class="vt-header-title-sm">${esc(ex.name)}</h1></div>
      </div>
      <button class="vt-more-btn" data-a="sheet-open" data-kind="exercise" data-id="${exId}" aria-label="Opciones del ejercicio">${icon("more", 20)}</button>
    </header>
    ${!hasHistory ? `<p class="vt-muted vt-detail-empty">Sin registros todavía. Cuando lo entrenes, acá va a aparecer su gráfico.</p>` : `${strip}
    <section class="vt-section">
      <div class="vt-sec-head">
        <div class="vt-pills">
          ${options.map((o) => `<button class="${metric === o.id ? "is-active" : ""}" data-a="prog-metric" data-m="${o.id}">${o.label}</button>`).join("")}
        </div>
        ${rangeChipsHTML()}
      </div>
      ${hasData
        ? `<div class="vt-chart-flat"><canvas id="prog-canvas" height="220"></canvas></div>`
        : `<p class="vt-muted">Sin registros en ${RANGE_WORDS[ui.progressRange]}.</p>`}
    </section>`}
    ${ex.type === "time" ? "" : `<section class="vt-section">
      <p class="vt-section-eyebrow">1RM</p>
      <div class="vt-rows"><label class="vt-row vt-row-center">
        <span class="vt-row-name">Tu máximo a una repetición</span>
        <span class="vt-row-input"><input type="number" inputmode="decimal" class="vt-input vt-mono vt-max-input" placeholder="—"
          value="${num(ex.oneRM) > 0 ? num(ex.oneRM) : ""}" data-i="featured-rm" data-id="${exId}"
          autocomplete="off" autocorrect="off" spellcheck="false" name="f_maxrm_${exId}"> kg</span>
      </label></div>
      ${oneRMHintHTML(ex)}
    </section>`}
    ${!lastPR ? "" : `<section class="vt-section">
      <p class="vt-section-eyebrow vt-eyebrow-pr">Último récord</p>
      <div class="vt-records"><div class="vt-record">
        <span class="vt-pr">${icon("trophy", 16)}</span>
        <div class="vt-record-main"><span class="vt-record-name">${fmtDate(lastPR.date)}</span></div>
        <span class="vt-record-value">${fmtPRValue(lastPR)}</span>
      </div></div>
      <button class="vt-btn-outline vt-btn-solid vt-flex-center vt-section-btn" data-a="pr-share" data-id="${exId}">${icon("share", 16)} Compartir récord</button>
    </section>`}`;
}

/* --------------------------------- Vista principal de Progreso -------------------------------- */

// Pestañas superiores de Progreso — Historial se fusionó acá, dejó de ser
// una pestaña propia (ver NAV_ITEMS). Estilo subrayado, sin cajas.
const PROGRESS_SECTIONS = [{ id: "resumen", label: "Resumen" }, { id: "historial", label: "Historial" }];

function progressSectionToggleHTML() {
  return `<div class="vt-tabs">
    ${PROGRESS_SECTIONS.map((s) => `<button class="${ui.progressSection === s.id ? "is-active" : ""}" data-a="progress-section" data-section="${s.id}">${s.label}</button>`).join("")}
  </div>`;
}

function progressHTML() {
  const head = `<header class="vt-header">${tabHeaderHTML("Set 04 · Análisis", "Progreso")}</header>`;
  const toggle = progressSectionToggleHTML();

  if (ui.progressSection === "historial") return `${head}${toggle}${historyListHTML()}`;

  if (sessions.length === 0)
    return `${head}${toggle}${emptyHTML("Todavía no hay nada que mostrar", "Registra al menos una sesión y tu progreso va a empezar a aparecer acá.", "")}`;

  const ws = weeklyStats();
  const vol = ws.volume >= 1000
    ? { value: (ws.volume / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 }), unit: "t" }
    : { value: Math.round(ws.volume).toLocaleString("es-CL"), unit: "kg" };
  const monthly = bucketGranularity(ui.progressRange) === "month";
  const reparto = groupSetCounts(sessionsInRange(ui.progressRange).flatMap((s) => s.exercises));

  return `${head}${toggle}
    <section class="vt-section vt-section-first">
      <p class="vt-section-eyebrow">Esta semana</p>
      ${weekDotsHTML()}
    </section>
    <div class="vt-section">${statStripHTML([
      { label: "Sesiones", value: ws.count },
      { label: "Volumen", value: vol.value, unit: vol.unit },
      { label: "Racha", value: ws.streak, unit: "sem" },
    ])}</div>
    <section class="vt-section">
      <div class="vt-sec-head">
        <p class="vt-section-eyebrow">Volumen ${monthly ? "mensual" : "semanal"}</p>
        ${rangeChipsHTML()}
      </div>
      ${computeBuckets(ui.progressRange).length
        ? `<div class="vt-chart-flat"><canvas id="prog-canvas" height="200"></canvas></div>`
        : `<p class="vt-muted">Sin sesiones en ${RANGE_WORDS[ui.progressRange]}.</p>`}
    </section>
    ${jumpsSectionHTML()}
    ${loadSectionHTML()}
    ${reparto.length ? `<section class="vt-section"><p class="vt-section-eyebrow">Reparto</p>${repartoHTML(reparto)}</section>` : ""}
    ${recentRecordsHTML()}
    ${yourExercisesHTML()}`;
}

// "Saltos en gimnasio": solo aparece si algún ejercicio que cuenta como
// saltos tiene historial. Sin alertas ni umbrales — solo el dato.
function jumpsSectionHTML() {
  const map = exMap();
  if (!sessions.some((s) => s.exercises.some((e) => e.sets.length && countsJumps(map[e.exerciseId])))) return "";
  const thisWeek = weekKey(new Date());
  const prev = new Date(); prev.setDate(prev.getDate() - 7);
  const lastWeek = weekKey(prev);
  const sum = (key) => sessions.filter((s) => weekKey(new Date(s.date)) === key).reduce((a, s) => a + sessionJumps(s, map), 0);
  return `<section class="vt-section">
    <div class="vt-sec-head">
      <p class="vt-section-eyebrow">Saltos en gimnasio</p>
      ${rangeChipsHTML()}
    </div>
    <p class="vt-big-stat">${fmtNum(sum(thisWeek))}<small>esta semana · vs ${fmtNum(sum(lastWeek))} la semana pasada</small></p>
    ${computeBuckets(ui.progressRange).length ? `<div class="vt-chart-flat"><canvas id="jumps-canvas" height="160"></canvas></div>` : ""}
    <p class="vt-footnote">Solo saltos registrados en tus sesiones de pesas. No incluye cancha.</p>
  </section>`;
}

// "Carga semanal": RPE de sesión × minutos, sumando solo las sesiones que
// tienen RPE. Aparece cuando al menos una sesión respondió la pregunta.
function loadSectionHTML() {
  if (!sessions.some((s) => s.rpe)) return "";
  const monthly = bucketGranularity(ui.progressRange) === "month";
  const buckets = computeBuckets(ui.progressRange);
  const missing = buckets.reduce((a, b) => a + b.sessions.filter((s) => !s.rpe).length, 0);
  return `<section class="vt-section">
    <div class="vt-sec-head">
      <p class="vt-section-eyebrow">Carga ${monthly ? "mensual" : "semanal"}</p>
      ${rangeChipsHTML()}
    </div>
    ${buckets.length ? `<div class="vt-chart-flat"><canvas id="load-canvas" height="160"></canvas></div>` : ""}
    <p class="vt-footnote">RPE de sesión × minutos. Solo sesiones donde respondiste la pregunta.${missing ? ` ${missing} sesi${missing !== 1 ? "ones" : "ón"} sin RPE.` : ""}</p>
  </section>`;
}

// Estilo común de ejes para los dos gráficos (barras de volumen y línea del
// detalle): ticks mono 10px, sin grilla en X, grilla Y tenue, sin bordes de
// eje ni leyenda. El eje Y SIEMPRE parte en 0 — con un solo punto Chart.js
// centraba el eje en el dato y mostraba valores negativos (−1,0 a 1,0).
// yMin > 0 solo lo usa el gráfico de peso máx. del detalle de ejercicio: ahí
// partir en 0 aplastaba la curva contra el techo.
function chartScales(yFormat, yMin = 0) {
  const tick = { color: "#8FA0AC", font: { family: "'IBM Plex Mono', monospace", size: 10 } };
  return {
    x: { grid: { display: false }, border: { display: false }, ticks: { ...tick, maxRotation: 0, autoSkipPadding: 8 } },
    y: {
      beginAtZero: yMin === 0, min: yMin, grace: "8%", // aire arriba: sin esto el punto/barra más alto queda cortado contra el borde
      grid: { color: "#1B1B1F" }, border: { display: false },
      ticks: { ...tick, maxTicksLimit: 4, callback: yFormat },
    },
  };
}

// Gráfico de barras por período (volumen, saltos, carga): el período actual
// en azul, el resto apagado. Devuelve la instancia, o null si no hay canvas.
function mountBars(canvasId, buckets, values, yFormat, tooltipFormat) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  return new Chart(canvas, {
    type: "bar",
    data: {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: values, backgroundColor: buckets.map((b) => b.isCurrent ? "#3B6FE0" : "#2A2A2F"), borderRadius: 4 }],
    },
    options: {
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => tooltipFormat(c.parsed.y) } } },
      scales: chartScales(yFormat),
    },
  });
}

function mountChart() {
  if (typeof Chart === "undefined") return;
  if (chart) { chart.destroy(); chart = null; }
  extraCharts.forEach((c) => c.destroy());
  extraCharts = [];

  if (!ui.progressDetail) {
    // Resumen de Progreso: volumen (gráfico principal) + saltos y carga si corresponden.
    const buckets = computeBuckets(ui.progressRange);
    const sumBy = (fn) => buckets.map((b) => Math.round(b.sessions.reduce((a, s) => a + fn(s), 0)));
    const volume = sumBy((s) => sessionVolume(s, false));
    const inTons = Math.max(0, ...volume) >= 1000;
    chart = mountBars("prog-canvas", buckets, volume,
      (v) => inTons ? `${(v / 1000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}t` : fmtNum(v),
      (v) => `${fmtNum(v)} kg`);
    const map = exMap();
    [
      mountBars("jumps-canvas", buckets, sumBy((s) => sessionJumps(s, map)), fmtNum, (v) => `${fmtNum(v)} saltos`),
      mountBars("load-canvas", buckets, sumBy((s) => sessionLoad(s) || 0), fmtNum, (v) => `${fmtNum(v)} UA`),
    ].forEach((c) => { if (c) extraCharts.push(c); });
    return;
  }

  const canvas = document.getElementById("prog-canvas");
  if (!canvas) return;
  // Detalle de ejercicio. Azul para la serie principal; ámbar no se usa acá
  // (reservado para PR) — en unilateral el segundo lado va en blanco.
  const exId = ui.progressDetail, metric = ui.progressMetric;
  const line = (label, data, color) => ({ label, data: data.map((p) => p.v), borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 3, cubicInterpolationMode: "monotone" }); // monotone: la curva no se pasa de los puntos (ni baja de 0)
  const yFormat = (v) => metric === "seconds" ? fmtClockInput(v) : fmtNum(v);
  const splitBySide = exUnilateral(exId) && metric === "reps";
  let labels, datasets, yMin = 0;
  if (splitBySide) {
    const dataL = progressDataSide(exId, "repsL"), dataR = progressDataSide(exId, "repsR");
    labels = (dataL.length >= dataR.length ? dataL : dataR).map((p) => p.date);
    datasets = [line("Izquierda", dataL, "#3B6FE0"), line("Derecha", dataR, "#FFFFFF")];
  } else {
    const data = progressData(exId, metric);
    labels = data.map((p) => p.date);
    datasets = [line("", data, "#3B6FE0")];
    // Peso máx.: el eje parte un 15% bajo el valor más bajo del rango,
    // redondeado hacia abajo a múltiplo de 5 (nunca negativo). El resto de
    // las métricas (volumen, reps, tiempo) sigue partiendo en 0.
    if (metric === "weight" && data.length)
      yMin = Math.max(0, Math.floor(Math.min(...data.map((p) => p.v)) * 0.85 / 5) * 5);
  }
  chart = new Chart(canvas, {
    type: "line",
    data: { labels, datasets },
    options: {
      plugins: {
        legend: { display: splitBySide, labels: { color: "#8FA0AC", boxWidth: 10, boxHeight: 10, font: { family: "'IBM Plex Mono', monospace", size: 10 } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ": " : ""}${yFormat(c.parsed.y)}` } },
      },
      scales: chartScales(yFormat, yMin),
    },
  });
}

/* ---------------------------------- Vista Ajustes -------------------------------- */

function settingsHTML() {
  return `
    <header class="vt-header">
      ${tabHeaderHTML("Set 05 · Configuración", "Ajustes")}
    </header>
    <p class="vt-section-eyebrow">General</p>
    <label class="vt-settings-row">
      <div class="vt-settings-label">Sonido<small>Pitido al terminar el descanso</small></div>
      <input type="checkbox" class="vt-switch" ${settings.sound ? "checked" : ""} data-c="set-sound" autocomplete="off">
    </label>
    <label class="vt-settings-row">
      <div class="vt-settings-label">Vibración<small>Si tu teléfono lo permite</small></div>
      <input type="checkbox" class="vt-switch" ${settings.vibrate ? "checked" : ""} data-c="set-vibrate" autocomplete="off">
    </label>
    <p class="vt-section-eyebrow" style="margin-top:var(--sp-6)">Datos</p>
    <div class="vt-settings-row">
      <div class="vt-settings-label">Exportar datos<small>Último respaldo: ${settings.lastExportAt ? fmtRelDate(settings.lastExportAt) : "nunca"}</small></div>
      <button class="vt-btn-icon" data-a="sheet-open" data-kind="export" aria-label="Exportar datos">${icon("download", 16)}</button>
    </div>
    <div class="vt-settings-row">
      <div class="vt-settings-label">Importar datos<small>Respaldo completo, o rutinas / entrenamientos / ejercicios</small></div>
      <div style="display:flex;gap:var(--sp-2)">
        <label class="vt-btn-icon" style="cursor:pointer" aria-label="Importar archivo">${icon("upload", 16)}
          <input type="file" accept=".json,application/json" data-c="import-file" autocomplete="off">
        </label>
        <button class="vt-btn-icon" data-a="paste-json-open" aria-label="Pegar JSON">${icon("clipboard", 16)}</button>
      </div>
    </div>
    <p class="vt-muted" style="text-align:center;margin-top:var(--sp-4)">GOAT · datos guardados en este dispositivo</p>
    <p class="vt-muted" style="text-align:center">Almacenamiento protegido: ${storagePersisted ? "sí" : "no"}</p>`;
}

/* ----------------------------- Gestión de ejercicios ------------------------------ */

// Fila de ejercicio del catálogo: nombre + "Mejor 53 kg · hoy", mini curva
// (solo con 3+ sesiones) y chevron. Tocarla abre el detalle del ejercicio;
// Editar/Eliminar viven en el ⋯ de ese detalle, no en la lista.
function catalogRowHTML(e, st) {
  // El tipo solo se menciona cuando NO es el caso común (peso × reps).
  const kind = [e.type === "time" ? "Tiempo" : e.type === "bodyweight" ? "Peso corporal" : "", e.unilateral ? "Unilateral" : ""].filter(Boolean);
  const parts = [...kind];
  if (!st) parts.push("Sin registros");
  else {
    parts.push(st.best !== null ? `Mejor <b>${fmtMark(e.id, st.best, st.metric)}</b>` : "Sin marca");
    parts.push(fmtRelDate(st.lastDate));
  }
  const curve = st && st.points.length >= 3 ? sparklineHTML(st.points.slice(-10).map((p) => p.v), 56, 20) : "<span></span>";
  return `<button class="vt-cat-row ${st ? "" : "is-empty"}" data-a="prog-detail-open" data-id="${e.id}">
    <span class="vt-cat-text"><span class="vt-cat-name">${esc(e.name)}</span><span class="vt-cat-sub">${parts.join(" · ")}</span></span>
    ${curve}
    <span class="vt-cat-chev">${icon("chevRight", 16)}</span>
  </button>`;
}

// "Recientes": los últimos 6 ejercicios usados, en una fila deslizable.
function recentExercisesHTML(stats) {
  const recent = exercises.filter((e) => stats[e.id])
    .sort((a, b) => stats[b.id].lastDate.localeCompare(stats[a.id].lastDate)).slice(0, 6);
  if (!recent.length) return "";
  return `<p class="vt-section-eyebrow">Recientes</p>
    <div class="vt-recents">${recent.map((e) => {
      const st = stats[e.id];
      return `<button class="vt-recent" data-a="prog-detail-open" data-id="${e.id}">
        <span class="vt-recent-name">${esc(e.name)}</span>
        <span class="vt-recent-value">${st.best !== null ? fmtMark(e.id, st.best, st.metric) : "—"}</span>
        <span class="vt-recent-date">${fmtRelDate(st.lastDate)}</span>
      </button>`;
    }).join("")}</div>`;
}

// Recientes + lista de grupos, separada de exercisesManagerHTML para poder
// reconstruirla sola al tipear en el buscador (patrón de picker-q), sin
// perder el foco del input de búsqueda.
function exercisesListHTML() {
  const byGroup = {};
  exercises.forEach((e) => { (byGroup[e.group] = byGroup[e.group] || []).push(e); });
  const groups = Object.keys(byGroup);
  if (groups.length === 0) return emptyHTML("Sin ejercicios todavía", "Creemos el primero con el botón +.", "");

  const stats = exerciseStats();
  const q = ui.exercisesQuery.trim().toLowerCase();
  const searching = q.length > 0;
  const openSaved = new Set(settings.openExerciseGroups || []);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  // Primero los entrenados, del uso más reciente al más viejo; después los
  // sin registros, por orden alfabético.
  const order = (a, b) => {
    const sa = stats[a.id], sb = stats[b.id];
    if (sa && sb) return sb.lastDate.localeCompare(sa.lastDate);
    if (sa || sb) return sa ? -1 : 1;
    return a.name.localeCompare(b.name, "es");
  };

  const groupsHTML = groups.map((g) => {
    const list = byGroup[g];
    const matches = (searching ? list.filter((e) => e.name.toLowerCase().includes(q)) : list).slice().sort(order);
    if (searching && matches.length === 0) return ""; // grupo sin coincidencias: se oculta mientras se busca
    // Mientras se busca, los grupos con coincidencias se auto-expanden
    // (ignorando el estado guardado); al vaciar el buscador vuelve a regir
    // settings.openExerciseGroups.
    const open = searching ? true : openSaved.has(g);
    const thisMonth = list.filter((e) => stats[e.id] && stats[e.id].lastDate >= monthAgo).length;
    return `<div class="vt-group-block" style="border-left-color:${groupColor(g) || "var(--line)"}">
      <button type="button" class="vt-folder-toggle" data-a="exgroup-toggle" data-name="${esc(g)}" style="width:100%">
        ${icon(open ? "chevUp" : "chevDown", 16)}
        <span class="vt-group-title" style="margin:0">${esc(g)}</span>
        <span class="vt-group-count">${list.length}${thisMonth ? ` · <b>${thisMonth} este mes</b>` : ""}</span>
      </button>
      ${open ? matches.map((e) => catalogRowHTML(e, stats[e.id])).join("") : ""}
    </div>`;
  }).join("");

  // Mientras se busca, Recientes se oculta: los resultados quedan pegados al buscador.
  return `${searching ? "" : recentExercisesHTML(stats)}<div class="vt-ex-groups">${groupsHTML}</div>`;
}

function exercisesManagerHTML() {
  return `
    <header class="vt-header">
      ${tabHeaderHTML("Set 02 · Catálogo", "Ejercicios")}
      <div style="display:flex;gap:var(--sp-2)">
        <button class="vt-btn-icon" data-a="groups-open" aria-label="Gestionar grupos">${icon("tag", 18)}</button>
        <button class="vt-btn-icon" data-a="ex-new" aria-label="Nuevo ejercicio">${icon("plus", 20)}</button>
      </div>
    </header>
    <div class="vt-search" style="margin-bottom:var(--sp-4)">${icon("search", 16)}
      <input placeholder="Buscar ejercicio…" value="${esc(ui.exercisesQuery)}" data-i="exercises-q" autocomplete="off">
    </div>
    <div id="exercises-list">${exercisesListHTML()}</div>`;
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
            <select class="vt-input" id="exm-group" data-c="exm-group">
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
          <label class="vt-modal-toggle-row" id="exm-jumps-row" style="${m.type === "time" ? "display:none" : ""}">
            <span>Cuenta como saltos<small>Sus reps suman al conteo de saltos en gimnasio</small></span>
            <input type="checkbox" class="vt-switch" id="exm-jumps" data-c="exm-jumps" ${countsJumps(m) ? "checked" : ""} autocomplete="off">
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
  // "Ver todos" de Progreso: solo los que tienen algo que mostrar.
  if (ui.picker === "detail") {
    const withHistory = new Set(exercisesWithHistory());
    pool = exercises.filter((e) => withHistory.has(e.id));
  }
  const filtered = pool.filter((e) => e.name.toLowerCase().includes(q));
  let html = filtered.map((ex) => `
    <button class="vt-modal-row" data-a="picker-pick" data-id="${ex.id}">
      <span class="vt-dotgroup" style="background:${groupColor(ex.group) || "var(--text-dim)"}"></span>
      ${esc(ex.name)}
      <span class="vt-muted-sm">${esc(ex.group)}</span>
    </button>`).join("");
  if (q && ui.picker !== "detail" && !filtered.some((e) => e.name.toLowerCase() === q)) {
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

// Modal propio para avisos informativos (reemplaza alert() nativo). Mismo
// lenguaje visual que confirmDialogHTML, pero un solo botón, sin Cancelar.
function infoDialogHTML() {
  const d = ui.infoDialog;
  return `
    <div class="vt-modal-backdrop" data-a="info-dialog-close">
      <div class="vt-modal" data-stop="1">
        <div class="vt-modal-form">
          <p style="margin:0;white-space:pre-line">${esc(d.message)}</p>
        </div>
        <div class="vt-modal-actions">
          ${d.extra
            ? `<button class="vt-btn-ghost" data-a="info-dialog-close">Ahora no</button>
               <button class="vt-btn-primary" data-a="${d.extra.action}">${esc(d.extra.label)}</button>`
            : `<button class="vt-btn-primary vt-full" data-a="info-dialog-close">Entendido</button>`}
        </div>
      </div>
    </div>`;
}

function emptyHTML(title, detail, action) {
  // onerror oculta la mascota sin romper el layout si icons/goat-face.png
  // todavía no existe en este dispositivo/deploy — el resto del estado
  // vacío se ve igual de bien sin ella.
  return `<div class="vt-empty">
    <img src="icons/goat-face.png" alt="" class="vt-empty-mascot" onerror="this.style.display='none'">
    <h3>${title}</h3><p>${detail}</p>${action}
  </div>`;
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
      persistActiveSession(); // limpia el autoguardado, ya no hay sesión que recuperar
      ui.exerciseEditMode = false; ui.exerciseEditDraft = null; ui.selectedExercises.clear(); ui.collapsedExercises.clear();
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
    // Una entrada por EJERCICIO (no por serie): la mejor serie PR. Como cada
    // PR tiene que superar al anterior de la misma sesión (prFlags), la mejor
    // es simplemente la última marcada.
    const prHits = [];
    for (const e of s.exercises) {
      const type = exType(e.exerciseId);
      const uni = exUnilateral(e.exerciseId);
      const flags = prFlags(type, e.sets, priorStats(e.exerciseId), uni);
      const bestIdx = flags.lastIndexOf(true);
      if (bestIdx === -1) continue;
      const st = e.sets[bestIdx];
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
      // Sugerencia de 1RM (Epley, solo confiable entre 1 y 12 reps): la mejor
      // estimación entre TODAS las series efectivas hechas de este ejercicio
      // hoy, no solo la del PR — 47,5×8 estima más que 50×3 aunque el PR de
      // peso sea la de 50.
      if (type !== "time") {
        let best = 0;
        for (const x of e.sets) {
          if (!x.done || getSetType(x)) continue;
          const w = num(x.weight), r = uni ? Math.min(repsL(x), repsR(x)) : num(x.reps);
          best = Math.max(best, epley1RM(w, r));
        }
        if (best > num(map[e.exerciseId]?.oneRM)) hit.suggestedOneRM = best;
      }
      prHits.push(hit);
    }

    // Sesión anterior de la MISMA rutina (antes de meter esta en `sessions`),
    // para el titular y el "+8% vs la última vez" del resumen.
    const prevSame = s.routineId ? sessions.find((x) => x.routineId === s.routineId) : null;

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
      sessionId: cleaned.id,
      volume: sessionVolume(cleaned, false),
      jumps: sessionJumps(cleaned),
      rpe: null, // RPE de sesión (1–10), opcional: se elige en el resumen y se guarda en la sesión
      setsCount: done,
      sessionNumber: sessions.length, // total de sesiones guardadas, contando esta
      prevVolume: prevSame ? sessionVolume(prevSame, false) : null, // null = primera vez con esta rutina
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
    persistActiveSession(); // sesión ya finalizada y guardada en `sessions` — limpia el autoguardado
    ui.openNotes.clear();
    ui.openExNotes.clear();
    ui.exerciseEditMode = false;
    ui.exerciseEditDraft = null;
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

/* ------------------------ Piezas reutilizables del resumen ------------------------ */
// (weekDotsHTML, statStripHTML y repartoHTML también las usa Progreso.)

// Duración partida en valor + unidad, para mostrarlos con tamaños distintos:
// "58" + "min", o "1:12" + "h" pasada la hora.
function durationParts(sec) {
  const min = Math.max(1, Math.round(num(sec) / 60));
  return min >= 60
    ? { value: `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`, unit: "h" }
    : { value: String(min), unit: "min" };
}

// "Esta semana": 7 círculos de lunes a domingo, relleno azul si hubo sesión
// ese día. La letra de hoy va en blanco.
function weekDotsHTML() {
  const monday = mondayOf(new Date());
  const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const trained = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  const today = dayKey(new Date());
  return `<div class="vt-week">${["L", "M", "M", "J", "V", "S", "D"].map((letter, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const k = dayKey(d);
    return `<div class="vt-week-day ${k === today ? "is-today" : ""}"><span>${letter}</span><i class="${trained.has(k) ? "is-on" : ""}"></i></div>`;
  }).join("")}</div>`;
}

// Franja de stats plana: columnas iguales con divisores verticales, sin cajas.
// items: [{label, value, unit?}]
function statStripHTML(items) {
  return `<div class="vt-strip">${items.map((it) => `
    <div class="vt-strip-cell"><span class="vt-strip-label">${it.label}</span>
      <span class="vt-strip-value">${it.value}${it.unit ? `<small>${it.unit}</small>` : ""}</span></div>`).join("")}</div>`;
}

// Series por grupo muscular de una lista de ejercicios de sesión ([{exerciseId,
// sets}]), de mayor a menor: [[grupo, n], ...].
function groupSetCounts(exerciseLists) {
  const counts = {};
  exerciseLists.forEach((e) => {
    if (!e.sets.length) return;
    const g = exGroup(e.exerciseId);
    counts[g] = (counts[g] || 0) + e.sets.length;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

// Barras de reparto: BLANCAS a propósito, no con el color del grupo — la
// paleta de grupos repite el ámbar y el verde, que están reservados.
function repartoHTML(entries) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return `<div class="vt-reparto">${entries.map(([g, n]) => `
    <span class="vt-reparto-name">${esc(g)}</span>
    <span class="vt-reparto-track"><i style="width:${Math.round(n / max * 100)}%"></i></span>
    <span class="vt-reparto-n">${n}</span>`).join("")}</div>`;
}

// Valor de un récord en el resumen: `50 × 6` (peso), `10 reps` / `+10 × 6`
// (corporal sin/con lastre), `1:00` (+ ` · +10 kg`) para tiempo. Unilateral
// conserva el formato compacto de siempre (fmtSet).
function fmtRecordValue(hit) {
  if (hit.type === "time") return `${fmtClockInput(hit.seconds)}${hit.weight > 0 ? ` · +${fmtNum(hit.weight)} kg` : ""}`;
  if (exUnilateral(hit.exerciseId)) return fmtSet(hit.type, hit, true);
  if (hit.type === "bodyweight") return hit.weight > 0 ? `+${fmtNum(hit.weight)} × ${hit.reps}` : `${hit.reps} reps`;
  return `${fmtNum(hit.weight)} × ${hit.reps}`;
}

// Línea compacta de "lo que hiciste" para un ejercicio (sets ya hechos):
// si todas las series son iguales `3 × 20 · 10 kg` / `3 × 1:00` / `3 × 10`;
// si no, cada una por separado `45×6  45×6  50×6`.
function fmtDoneSets(e) {
  const type = exType(e.exerciseId);
  const uni = exUnilateral(e.exerciseId);
  const reps = (st) => uni ? `I${repsL(st)} D${repsR(st)}` : String(num(st.reps));
  const one = (st) => {
    const w = num(st.weight);
    if (type === "time") return `${fmtClockInput(num(st.seconds))}${w > 0 ? ` +${fmtNum(w)} kg` : ""}`;
    if (type === "bodyweight") return w > 0 ? `+${fmtNum(w)}×${reps(st)}` : reps(st);
    return uni ? `${fmtNum(w)} kg ${reps(st)}` : `${fmtNum(w)}×${reps(st)}`;
  };
  const all = e.sets.map(one);
  if (!all.every((x) => x === all[0])) return all.join("  ");
  const st = e.sets[0], w = num(st.weight), n = e.sets.length;
  if (type === "time") return `${n} × ${fmtClockInput(num(st.seconds))}${w > 0 ? ` · +${fmtNum(w)} kg` : ""}`;
  if (type === "bodyweight") return `${n} × ${reps(st)}${w > 0 ? ` · +${fmtNum(w)} kg` : ""}`;
  return `${n} × ${reps(st)}${w > 0 ? ` · ${fmtNum(w)} kg` : ""}`;
}

// Pantalla de resumen al finalizar sesión: overlay de pantalla completa
// (no el bottom-sheet chico de picker/exerciseModal). Todo plano: secciones
// con label en mayúscula y divisores finos, sin .vt-card.
function sessionSummaryHTML() {
  const sum = ui.sessionSummary;
  const done = sum.exercisesSnapshot;
  const nPR = sum.prHits.length;
  const prIds = new Set(sum.prHits.map((h) => h.exerciseId));
  const section = (label, body, cls = "") => `<section class="vt-section"><p class="vt-section-eyebrow ${cls}">${label}</p>${body}</section>`;

  const headline = nPR > 0 ? (nPR === 1 ? "Récord nuevo" : `${nPR} récords nuevos`)
    : sum.prevVolume !== null && sum.prevVolume < sum.volume ? "Más fuerte que la última vez"
    : "Sesión cumplida";

  // Número héroe: el volumen; si no hubo volumen (solo tiempo o peso
  // corporal), la duración — y ahí no hay comparación ni cabras.
  const dur = durationParts(sum.durationSec);
  const hasVol = sum.volume > 0;
  const hero = hasVol ? { value: Math.round(sum.volume).toLocaleString("es-CL"), unit: "kg" } : dur;
  const subParts = [];
  if (sum.routineId !== null) {
    if (sum.prevVolume === null) subParts.push("Primera vez con esta rutina");
    else if (hasVol && sum.prevVolume > 0) {
      const pct = Math.round((sum.volume - sum.prevVolume) / sum.prevVolume * 100);
      subParts.push(`<span class="${pct >= 0 ? "vt-sum-up" : ""}">${pct >= 0 ? "+" : "−"}${Math.abs(pct)}%</span> vs la última vez`);
    }
  }
  const goats = Math.round(sum.volume / 60); // una cabra ≈ 60 kg
  if (hasVol && goats > 0) subParts.push(`como levantar <b>${goats.toLocaleString("es-CL")} cabra${goats !== 1 ? "s" : ""}</b>`);

  const recordsSection = nPR === 0 ? "" : section("Récords", `<div class="vt-records">${sum.prHits.map((hit) => `
    <div class="vt-record">
      <span class="vt-pr">${icon("trophy", 16)}</span>
      <div class="vt-record-main">
        <span class="vt-record-name">${esc(hit.exerciseName)}</span>
        ${hit.suggestedOneRM ? (sum.appliedUpdates.has(hit.exerciseId)
          ? `<span class="vt-sum-done">${icon("check", 12)} 1RM actualizado</span>`
          : `<button class="vt-text-btn vt-text-btn-pr" data-a="summary-apply-1rm" data-id="${hit.exerciseId}" data-value="${hit.suggestedOneRM}">1RM → ${fmtNum(hit.suggestedOneRM)} kg</button>`) : ""}
      </div>
      <span class="vt-record-value">${esc(fmtRecordValue(hit))}</span>
    </div>`).join("")}</div>`, "vt-eyebrow-pr");

  const doneSection = section("Lo que hiciste", doneListHTML(done, prIds));

  const routineSection = !sum.routineDiff ? "" : section("Cambios en tu rutina", `<div class="vt-rows">
      ${sum.routineDiff.added.map((x) => `<div class="vt-row"><span class="vt-row-name vt-diff-added">+ ${esc(x.name)}</span></div>`).join("")}
      ${sum.routineDiff.removed.map((x) => `<div class="vt-row"><span class="vt-row-name vt-diff-removed">− ${esc(x.name)}</span></div>`).join("")}
    </div>
    ${sum.routineSynced
      ? `<span class="vt-sum-done">${icon("check", 12)} Rutina actualizada</span>`
      : `<button class="vt-text-btn" data-a="summary-sync-routine">Actualizar "${esc(sum.routineDiff.routineName)}" con estos cambios</button>`}`);

  const saveAsRoutineSection = sum.routineId !== null ? "" : section("Sesión libre", sum.savedAsRoutine
    ? `<span class="vt-sum-done">${icon("check", 12)} Guardada como rutina</span>`
    : `<button class="vt-text-btn" data-a="summary-save-as-routine">Guardar como rutina</button>`);

  return `
    <div class="vt-summary-overlay">
      <div class="vt-summary-inner">
        <div class="vt-sum-head">
          <img src="icons/goat-face.png" alt="" class="vt-sum-mascot" onerror="this.style.display='none'">
          <p class="vt-eyebrow">Sesión nº ${sum.sessionNumber} · ${fmtDate(sum.date)}</p>
          <h1 class="vt-sum-headline">${headline}</h1>
          <p class="vt-sum-routine">${esc(sum.routineName)}</p>
        </div>
        <div class="vt-sum-hero">
          <p class="vt-sum-hero-num">${hero.value}<small>${hero.unit}</small></p>
          ${subParts.length ? `<p class="vt-sum-hero-sub">${subParts.join(" · ")}</p>` : ""}
        </div>
        ${statStripHTML([
          { label: "Duración", value: dur.value, unit: dur.unit },
          { label: "Series", value: sum.setsCount },
          { label: "Ejercicios", value: done.length },
        ])}
        ${jumpsLineHTML(sum.jumps)}
        ${section("Esta semana", weekDotsHTML())}
        ${recordsSection}
        ${doneSection}
        ${section("Reparto", repartoHTML(groupSetCounts(done)))}
        ${routineSection}
        ${saveAsRoutineSection}
        ${section("¿Qué tan dura fue?", rpeButtonsHTML(sum.sessionId, sum.rpe))}
        <div class="vt-sum-actions">
          <button class="vt-btn-outline vt-btn-solid vt-flex-center" data-a="summary-share">${icon("share", 16)} Compartir</button>
          <button class="vt-btn-primary vt-full" data-a="summary-close">Listo</button>
        </div>
      </div>
    </div>`;
}

/* ----------------------------- Compartir como imagen ------------------------------ */
// Tarjeta vertical (1080x1350) dibujada a mano con Canvas API — sin librería
// nueva. Dos variantes: "session" (resumen de fin de sesión) y "pr" (un PR
// puntual desde Progreso). Usa las mismas fuentes ya cargadas por la app
// (Barlow Condensed para títulos, IBM Plex Mono para números) — espera
// document.fonts.ready antes de dibujar para no caer al fallback del sistema.

const SHARE_W = 1080, SHARE_H = 1350;

// Reutiliza el mismo path SVG que ya usa icon() en el resto de la app (el
// trofeo), en vez de inventar un ícono nuevo o depender de un emoji.
function svgIconImage(pathsD, color, size) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${pathsD}</svg>`;
  const img = new Image();
  const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  return new Promise((resolve) => { img.onload = () => resolve(img); img.src = url; });
}

// Dibuja `text` alineado según `align`, encogiendo el tamaño de fuente hasta
// que quepa en maxWidth (nunca corta el texto a la fuerza) — usado para
// nombres de rutina/ejercicio que el usuario escribió y pueden ser largos.
function fitText(ctx, text, x, y, maxWidth, maxSize, weight, family, align = "left") {
  let size = maxSize;
  ctx.textAlign = align;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 28 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  ctx.fillText(text, x, y);
}

async function drawSessionShareCard(ctx, sum) {
  const trophyImg = sum.prHits?.length ? await svgIconImage(PATHS.trophy, "#E8A33D", 200) : null;

  ctx.textAlign = "left";
  ctx.fillStyle = "#8FA0AC";
  ctx.font = "600 30px 'IBM Plex Mono'";
  ctx.fillText(fmtDate(sum.date).toUpperCase(), 64, 190);

  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, sum.routineName, 64, 300, SHARE_W - 128, 88, 700, "'Barlow Condensed'");

  const stats = [
    { label: "DURACIÓN", value: fmtDurationMin(sum.durationSec) },
    { label: "VOLUMEN", value: `${Math.round(sum.volume).toLocaleString("es-CL")} kg` },
    { label: "SERIES", value: String(sum.setsCount) },
  ];
  const colW = (SHARE_W - 128) / 3;
  stats.forEach((s, i) => {
    const x = 64 + i * colW;
    ctx.textAlign = "left";
    ctx.fillStyle = "#8FA0AC";
    ctx.font = "600 24px 'IBM Plex Mono'";
    ctx.fillText(s.label, x, 430);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 54px 'IBM Plex Mono'";
    ctx.fillText(s.value, x, 495);
  });

  ctx.strokeStyle = "#2A2A2F";
  ctx.beginPath(); ctx.moveTo(64, 550); ctx.lineTo(SHARE_W - 64, 550); ctx.stroke();

  const prs = (sum.prHits || []).slice(0, 3);
  if (prs.length) {
    ctx.fillStyle = "#8FA0AC";
    ctx.font = "600 28px 'IBM Plex Mono'";
    ctx.fillText("PRs DE HOY", 64, 620);
    let y = 690;
    prs.forEach((hit) => {
      if (trophyImg) ctx.drawImage(trophyImg, 64, y - 34, 40, 40);
      ctx.fillStyle = "#E8A33D";
      fitText(ctx, hit.exerciseName, 122, y, SHARE_W - 122 - 260, 42, 700, "'Barlow Condensed'");
      ctx.textAlign = "right";
      ctx.font = "600 34px 'IBM Plex Mono'";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText(fmtSet(hit.type, hit, exUnilateral(hit.exerciseId)), SHARE_W - 64, y);
      y += 72;
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#8FA0AC";
  ctx.font = "600 26px 'IBM Plex Mono'";
  ctx.fillText("ENTRENADO CON GOAT", SHARE_W / 2, SHARE_H - 60);
}

async function drawPRShareCard(ctx, p) {
  const trophyImg = await svgIconImage(PATHS.trophy, "#E8A33D", 400);
  ctx.drawImage(trophyImg, SHARE_W / 2 - 80, 220, 160, 160);

  ctx.textAlign = "center";
  ctx.fillStyle = "#E8A33D";
  ctx.font = "700 40px 'Barlow Condensed'";
  ctx.fillText("NUEVO PR", SHARE_W / 2, 470);

  ctx.fillStyle = "#FFFFFF";
  fitText(ctx, p.exerciseName, SHARE_W / 2, 580, SHARE_W - 160, 72, 700, "'Barlow Condensed'", "center");

  ctx.font = "700 150px 'IBM Plex Mono'";
  ctx.fillText(fmtPRValue(p), SHARE_W / 2, 800);

  ctx.fillStyle = "#8FA0AC";
  ctx.font = "600 32px 'IBM Plex Mono'";
  ctx.fillText(fmtDate(p.date), SHARE_W / 2, 870);

  ctx.font = "600 26px 'IBM Plex Mono'";
  ctx.fillText("ENTRENADO CON GOAT", SHARE_W / 2, SHARE_H - 60);
}

async function buildShareBlob(kind, data) {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_W;
  canvas.height = SHARE_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0A0A0C";
  ctx.fillRect(0, 0, SHARE_W, SHARE_H);

  ctx.textAlign = "left";
  ctx.fillStyle = "#3B6FE0";
  ctx.font = "800 46px 'Barlow Condensed'";
  ctx.fillText("GOAT", 64, 110);

  if (kind === "session") await drawSessionShareCard(ctx, data);
  else await drawPRShareCard(ctx, data);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// Comparte vía el sheet nativo del sistema si está disponible; si no, cae a
// una descarga normal (mismo patrón que exportJSON: <a download> + blob URL).
async function shareImage(kind, data, filename, shareTitle) {
  const blob = await buildShareBlob(kind, data);
  if (!blob) { askAlert("No se pudo generar la imagen para compartir."); return; }
  const file = new File([blob], filename, { type: "image/png" });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: shareTitle });
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return; // el usuario cerró el sheet — no es un error
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* --------------------------------- Export / Import -------------------------------- */

// Qué se puede exportar. "full" es el respaldo completo (lo único que al
// importarse REEMPLAZA los datos); los otros tres son archivos parciales,
// pensados para compartir o mover una parte: al importarse se AGREGAN a lo
// que ya hay, sin borrar nada.
const EXPORT_KINDS = [
  { id: "full", ic: "download", label: "Todo", sub: "Respaldo completo, para restaurar en otro teléfono", file: "respaldo" },
  { id: "routines", ic: "clipboard", label: "Rutinas", sub: "Para compartir: incluye sus ejercicios, sin tus 1RM", file: "rutinas" },
  { id: "sessions", ic: "trend", label: "Entrenamientos", sub: "Tu historial de sesiones", file: "entrenamientos" },
  { id: "exercises", ic: "barbell", label: "Ejercicios", sub: "El catálogo y sus grupos, sin tus 1RM", file: "ejercicios" },
];

// Ejercicios del catálogo con esos ids, sin el 1RM (dato personal: al
// importarlo, pisaría el 1RM de quien recibe el archivo) + los grupos que usan.
function exportableExercises(ids) {
  const list = exercises.filter((e) => !ids || ids.has(e.id)).map(({ oneRM, ...rest }) => rest);
  const used = new Set(list.map((e) => e.group));
  return { "custom-exercises": list, "exercise-groups": exerciseGroups.filter((g) => used.has(g.name)) };
}

function buildExportData(kind) {
  const base = { app: "volley-tracker", version: 1, kind, exportedAt: new Date().toISOString() };
  if (kind === "routines") {
    const folderIds = new Set(routines.map((r) => r.folderId).filter(Boolean));
    return { ...base, routines, "routine-folders": routineFolders.filter((f) => folderIds.has(f.id)),
      ...exportableExercises(new Set(routines.flatMap((r) => r.exercises.map((x) => x.exerciseId)))) };
  }
  if (kind === "sessions")
    return { ...base, sessions, ...exportableExercises(new Set(sessions.flatMap((x) => x.exercises.map((e) => e.exerciseId)))) };
  if (kind === "exercises") return { ...base, ...exportableExercises(null) };
  return { ...base, routines, "routine-folders": routineFolders, sessions, "custom-exercises": exercises, "exercise-groups": exerciseGroups, settings };
}

async function exportJSON(kind = "full") {
  const def = EXPORT_KINDS.find((k) => k.id === kind) || EXPORT_KINDS[0];
  const name = `goat-${def.file}-${new Date().toISOString().slice(0, 10)}.json`;
  try {
    const blob = new Blob([JSON.stringify(buildExportData(def.id), null, 2)], { type: "application/json" });
    // Los parciales se comparten por la hoja del sistema (WhatsApp, AirDrop,
    // etc.) cuando el teléfono lo permite; si no, se descargan igual que el
    // respaldo completo.
    let shared = false;
    if (def.id !== "full") {
      const file = new File([blob], name, { type: "application/json" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `GOAT · ${def.label}` });
          shared = true;
        }
      } catch (err) {
        if (err?.name === "AbortError") return; // cerró la hoja de compartir: no es un error
      }
    }
    if (!shared) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  } catch (err) {
    askAlert("No se pudo generar el archivo.");
    return;
  }
  // Solo el respaldo COMPLETO cuenta como "último respaldo" (alimenta el
  // recordatorio de Rutinas y el subtítulo de "Exportar datos" en Ajustes).
  if (def.id === "full") {
    settings.lastExportAt = new Date().toISOString();
    delete settings.backupSnoozeUntil;
    persistSettings();
  }
  render();
}

// Recordatorio de respaldo (banner arriba de Rutinas). Devuelve el texto a
// mostrar, o null si no corresponde:
//   - último respaldo de hace más de 14 días Y hay sesiones nuevas desde entonces;
//   - nunca se exportó y ya hay 3 sesiones o más.
// Cerrar el banner lo pospone 7 días (settings.backupSnoozeUntil).
function backupReminderText() {
  if (settings.backupSnoozeUntil && new Date(settings.backupSnoozeUntil).getTime() > Date.now()) return null;
  const last = settings.lastExportAt;
  if (!last) return sessions.length >= 3 ? "Todavía no has respaldado tus datos" : null;
  const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
  if (days <= 14 || !sessions.some((x) => x.date > last)) return null;
  return `Hace ${days} días que no respaldas tus datos`;
}

// Separado de importJSON(file) para poder reutilizarlo desde "Pegar JSON"
// (que ya tiene el objeto parseado, sin pasar por FileReader).
function processImportedData(data) {
  const inExercises = data["custom-exercises"] || data.exercises || null;
  const inFolders = data["routine-folders"] || data.routineFolders || null;
  const inGroups = data["exercise-groups"];
  // Respaldo completo = trae sesiones y NO viene marcado como parcial (los
  // archivos de antes de que existiera `kind` son todos completos).
  const isFull = Array.isArray(data.sessions) && (!data.kind || data.kind === "full");

  if (isFull) {
    askConfirm("Este archivo es un respaldo completo. Se REEMPLAZARÁN todos los datos actuales. ¿Continuar?", () => {
      if (Array.isArray(data.routines)) { routines = data.routines; persistRoutines(); }
      if (Array.isArray(inFolders)) { routineFolders = inFolders; persistFolders(); }
      sessions = data.sessions; persistSessions();
      if (Array.isArray(inExercises) && inExercises.length) { exercises = inExercises; persistExercises(); }
      if (Array.isArray(inGroups) && inGroups.length) { exerciseGroups = inGroups; persistGroups(); }
      if (data.settings) { settings = Object.assign(settings, data.settings); persistSettings(); }
      askAlert("Respaldo restaurado ✔");
    }, true);
    return;
  }

  // Archivo parcial (rutinas, entrenamientos y/o ejercicios): se AGREGA a lo
  // que ya hay, nunca borra. Lo que ya existe con el mismo id se actualiza,
  // salvo las sesiones, que no se tocan.
  if (!Array.isArray(data.routines) && !Array.isArray(inExercises) && !Array.isArray(data.sessions)) {
    askAlert("El archivo no tiene rutinas, entrenamientos, ejercicios ni un respaldo reconocible.");
    return;
  }
  let nEx = 0, nRt = 0, nSes = 0;
  if (Array.isArray(inGroups)) {
    // Solo grupos que no existen (por nombre): no pisa los colores propios.
    for (const g of inGroups)
      if (g?.name && !exerciseGroups.some((x) => x.name === g.name)) exerciseGroups.push({ name: g.name, color: g.color || GROUP_PALETTE[0] });
    persistGroups();
  }
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
  if (Array.isArray(data.sessions)) {
    const have = new Set(sessions.map((x) => x.id));
    for (const ses of data.sessions) {
      if (!ses.id || !ses.date || !Array.isArray(ses.exercises) || have.has(ses.id)) continue;
      sessions.push(ses); nSes++;
    }
    sessions.sort((a, b) => b.date.localeCompare(a.date)); // siempre de más nueva a más vieja
    persistSessions();
  }
  const parts = [];
  if (Array.isArray(data.routines)) parts.push(`${nRt} rutina(s)`);
  if (Array.isArray(data.sessions)) parts.push(`${nSes} entrenamiento(s)`);
  if (Array.isArray(inExercises)) parts.push(`${nEx} ejercicio(s)`);
  askAlert(`Importado ✔  Nuevos: ${parts.join(", ")}.`);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let data;
    try { data = JSON.parse(reader.result); }
    catch { askAlert("El archivo no es un JSON válido."); return; }
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

/* ------------------- Mantener presionado: entra a Organizar ------------------- */
// Mantener el dedo ~500ms sobre el NOMBRE de un ejercicio (fuera del modo
// Organizar) entra al modo con ese ejercicio ya preseleccionado. Gesto de
// temporizador, fuera del sistema de delegación de "click" — se cancela si
// hay movimiento significativo antes de cumplirse (no compite con el scroll).
// Se ata solo al <h3> del bloque (nombre/cabecera), nunca a sus controles:
// en la sesión activa el <h3> convive con descanso/nota/colapsar pero es un
// elemento propio sin acción de click encima, así que no hace falta excluir
// nada explícitamente — inputs y botones quedan afuera del selector solo.
const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 10; // px
let longPressTimer = null;
let longPressStart = null; // {x, y}
let suppressClickUntil = 0; // evita que el tap que dispara el long-press también gatille su click normal

function cancelLongPress() {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
  longPressStart = null;
}

document.addEventListener("pointerdown", (e) => {
  if (ui.exerciseEditMode) return; // el long-press solo sirve para ENTRAR, no hace nada ya adentro
  if (!ui.editingRoutine && !ui.activeSession) return;
  const h3 = e.target.closest(".vt-block h3");
  if (!h3) return;
  const blockEl = h3.closest("[data-block-idx]");
  if (!blockEl) return;
  // Bloquea selección de texto/menú contextual/zoom del navegador sobre este
  // gesto — si no, le gana la carrera al temporizador de long-press de abajo.
  e.preventDefault();
  const idx = +blockEl.dataset.blockIdx;
  longPressStart = { x: e.clientX, y: e.clientY };
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    if (!longPressStart) return;
    longPressStart = null;
    enterOrganizeMode(idx);
    suppressClickUntil = Date.now() + 400;
  }, LONG_PRESS_MS);
});
document.addEventListener("pointermove", (e) => {
  if (!longPressStart) return;
  const dx = e.clientX - longPressStart.x, dy = e.clientY - longPressStart.y;
  if (Math.hypot(dx, dy) > LONG_PRESS_TOLERANCE) cancelLongPress();
});
document.addEventListener("pointerup", cancelLongPress);
document.addEventListener("pointercancel", cancelLongPress);

/* ------------------------------------ Eventos ------------------------------------ */

document.addEventListener("click", (e) => {
  // Si un mantener-presionado acaba de disparar (entrar a Organizar), el tap
  // que lo soltó no debe además ejecutar la acción normal del elemento
  // (ej. el toggle de colapsar de una fila colapsada) — ver long-press más abajo.
  if (Date.now() < suppressClickUntil) return;
  const el = e.target.closest("[data-a]");
  if (!el) return;
  // El fondo oscuro cierra el modal, pero un clic dentro del panel no debe cerrarlo.
  if (el.classList.contains("vt-modal-backdrop") && e.target.closest(".vt-modal")) return;
  const a = el.dataset.a;
  const id = el.dataset.id;
  // Cualquier acción cierra la hoja del ⋯ (las filas de la hoja disparan las
  // acciones de siempre: routine-edit, folder-del, etc., y todas renderizan).
  if (a !== "sheet-open") ui.actionSheet = null;

  switch (a) {
    case "sheet-open": ui.actionSheet = { kind: el.dataset.kind, id }; render(); break;
    case "sheet-close": render(); break;
    case "tab": {
      const go = () => {
        stopSetTimer(); // cambiar de pestaña detiene el cronómetro sin perder lo acumulado
        ui.editingRoutine = null;
        ui.manageGroups = false;
        ui.exerciseEditMode = false;
        ui.exerciseEditDraft = null;
        ui.selectedExercises.clear();
        ui.progressDetail = null;
        ui.sessionDetail = null;
        ui.tab = el.dataset.tab;
        render();
      };
      // Salir del editor por la nav también avisa si hay cambios sin guardar.
      if (ui.editingRoutine) leaveEditor(go); else go();
      break;
    }

    /* Modal de confirmación propio */
    case "confirm-yes": {
      const dlg = ui.confirmDialog;
      dlg?.onYes();
      ui.confirmDialog = null;
      render();
      break;
    }
    case "confirm-cancel":
      ui.confirmDialog?.onNo?.();
      ui.confirmDialog = null;
      render();
      break;
    case "info-dialog-close":
      ui.infoDialog = null;
      render();
      break;

    /* Rutinas */
    case "routine-new":
      ui.tab = "rutinas";
      openEditor({ id: uid("rt"), name: "", exercises: [], isNew: true });
      render();
      break;
    case "routine-edit": {
      const r = routines.find((x) => x.id === id);
      if (r) openEditor({ ...r, exercises: r.exercises.map((x) => ({ ...x })), isNew: false });
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
          runningTimer = null; // no arrastrar el cronómetro de una sesión que se está reemplazando
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
      if (!name) { askAlert("Ponle un nombre a la carpeta."); break; }
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
    case "editor-cancel": leaveEditor(render); break;
    case "editor-note-open": {
      const idx = +el.dataset.idx;
      ui.editorOpenNotes.add(idx);
      render();
      document.querySelector(`textarea[data-i="editor-note"][data-idx="${idx}"]`)?.focus();
      break;
    }
    case "editor-loadmode": {
      const it = ui.editingRoutine.exercises[+el.dataset.idx];
      it.loadMode = el.dataset.mode;
      if (it.loadMode === "percent" && it.targetPercent == null) it.targetPercent = 70;
      render();
      break;
    }
    case "editor-save": {
      const r = ui.editingRoutine;
      if (!r.name.trim()) { askAlert("Ponle un nombre a la rutina."); break; }
      if (r.exercises.length === 0) { askAlert("Agrega al menos un ejercicio."); break; }
      // Modo %1RM exige tener 1RM en el catálogo; el peso nunca se congela en la rutina.
      const mapEx = exMap();
      const sinRM = r.exercises.find((it) => it.loadMode === "percent" && !(num(mapEx[it.exerciseId]?.oneRM) > 0));
      if (sinRM) {
        askAlert(`"${mapEx[sinRM.exerciseId]?.name || "Un ejercicio"}" está en modo %1RM pero no tiene 1RM definido. Defínelo en el detalle del ejercicio (pestaña Ejercicios).`);
        break;
      }
      r.exercises.forEach((it) => { if (it.loadMode === "percent") delete it.targetWeight; });
      const stamped = { id: r.id, name: r.name.trim(), exercises: r.exercises, updatedAt: new Date().toISOString(), folderId: r.folderId ?? null };
      const i = routines.findIndex((x) => x.id === r.id);
      if (i >= 0) routines[i] = stamped; else routines = [stamped, ...routines];
      persistRoutines();
      ui.editingRoutine = null;
      ui.exerciseEditMode = false; ui.exerciseEditDraft = null; ui.selectedExercises.clear();
      render();
      break;
    }

    /* Modo "Organizar ejercicios" (compartido: editor de rutina y sesión activa) */
    case "exercise-editmode-toggle":
      enterOrganizeMode(null);
      break;
    case "exercise-select-toggle": {
      const idx = +el.dataset.idx;
      ui.selectedExercises.has(idx) ? ui.selectedExercises.delete(idx) : ui.selectedExercises.add(idx);
      render();
      break;
    }
    case "organize-delete": {
      // Elimina del BORRADOR nomás — nada se pierde de verdad todavía (se
      // puede seguir "Cancelar"), así que acá no hay confirmación ni se toca
      // explicitlyRemoved/runningTimer: eso se resuelve una sola vez en
      // "Guardar cambios" (exercise-editmode-save), comparando contra el
      // array real que sigue intacto.
      const indices = [...ui.selectedExercises];
      indices.slice().sort((a, b) => b - a).forEach((i) => ui.exerciseEditDraft.splice(i, 1));
      ui.selectedExercises.clear();
      render();
      break;
    }
    case "organize-group": {
      groupAsSuperset(ui.exerciseEditDraft, [...ui.selectedExercises]);
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
    case "exercise-editmode-cancel":
      // El array real nunca se tocó — el borrador simplemente se descarta.
      ui.exerciseEditMode = false;
      ui.exerciseEditDraft = null;
      ui.selectedExercises.clear();
      render();
      break;
    case "exercise-editmode-save": {
      const draft = ui.exerciseEditDraft;
      const stripOrd = (list) => list.map(({ __ord, ...rest }) => rest);

      if (ui.editingRoutine) {
        ui.editingRoutine.exercises = stripOrd(draft);
        ui.exerciseEditMode = false;
        ui.exerciseEditDraft = null;
        ui.selectedExercises.clear();
        render();
        break;
      }

      if (ui.activeSession) {
        const original = ui.activeSession.exercises;
        // __ord viaja con cada item del borrador pase lo que pase (reordenar/
        // agrupar/reemplazar no lo tocan) — lo que falta acá es justo lo que
        // se eliminó de verdad, comparado contra el array real (intacto).
        const survivingOrds = new Set(draft.map((it) => it.__ord));
        const removed = original.filter((it, i) => !survivingOrds.has(i));
        const doneLost = removed.reduce((a, ex) => a + ex.sets.filter((st) => st.done).length, 0);

        // Mapa índice-original (__ord) → índice-nuevo, para recolocar TODO lo
        // que en `ui` está indexado por exIdx de la sesión (colapsados, notas
        // abiertas, el cronómetro corriendo) — sin esto quedan apuntando a la
        // posición vieja y terminan aplicados al ejercicio equivocado tras
        // eliminar/reordenar/agrupar. Los que ya no sobreviven simplemente se pierden.
        const ordToNewIdx = new Map(draft.map((it, newIdx) => [it.__ord, newIdx]));
        const remapIdxSet = (set) => {
          const out = new Set();
          set.forEach((idx) => { const n = ordToNewIdx.get(idx); if (n !== undefined) out.add(n); });
          return out;
        };

        const commit = () => {
          // Recoloca (o detiene, si su ejercicio ya no está) el cronómetro
          // corriendo — recién ahora, porque hasta este momento el array real
          // no se había tocado todavía (el borrador era descartable).
          if (runningTimer) {
            const newIdx = ordToNewIdx.get(runningTimer.exIdx);
            if (newIdx === undefined) runningTimer = null;
            else runningTimer.exIdx = newIdx;
          }
          ui.collapsedExercises = remapIdxSet(ui.collapsedExercises);
          ui.openExNotes = remapIdxSet(ui.openExNotes);
          const remappedOpenNotes = new Set();
          ui.openNotes.forEach((key) => {
            const [exIdxStr, setIdxStr] = key.split(":");
            const n = ordToNewIdx.get(+exIdxStr);
            if (n !== undefined) remappedOpenNotes.add(`${n}:${setIdxStr}`);
          });
          ui.openNotes = remappedOpenNotes;
          removed.forEach((ex) => {
            (ui.activeSession.explicitlyRemoved ??= []).push({ id: ex.exerciseId, name: exName(ex.exerciseId) });
          });
          ui.activeSession.exercises = stripOrd(draft);
          ui.exerciseEditMode = false;
          ui.exerciseEditDraft = null;
          ui.selectedExercises.clear();
          render();
        };

        if (doneLost > 0) {
          askConfirm(`Vas a perder ${doneLost} serie${doneLost !== 1 ? "s" : ""} marcada${doneLost !== 1 ? "s" : ""} de los ejercicios eliminados. ¿Guardar los cambios de todas formas?`, commit, true);
        } else {
          commit();
        }
      }
      break;
    }

    /* Selector de ejercicios */
    case "picker-open": ui.picker = el.dataset.ctx; ui.pickerQuery = ""; render(); break;
    case "picker-close": ui.picker = null; render(); break; // si venía de la hoja de destacados, esa sigue abierta debajo
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
        runningTimer = null; // no arrastrar el cronómetro de una sesión que se está reemplazando
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
        ui.activeSession = null;
        persistActiveSession(); // limpia el autoguardado, se descartó a propósito
        ui.openNotes.clear(); ui.openExNotes.clear();
        ui.exerciseEditMode = false; ui.exerciseEditDraft = null; ui.selectedExercises.clear(); ui.collapsedExercises.clear();
        stopRest(); render();
      }, true);
      break;
    case "session-finish": finishSession(); break;
    case "session-minimize":
      ui.sessionMinimized = true;
      ui.exerciseEditMode = false; ui.exerciseEditDraft = null; ui.selectedExercises.clear();
      render();
      break;
    case "session-restore": ui.sessionMinimized = false; render(); break;
    case "rest-cancel": stopRest(); break;
    case "rest-adjust": adjustRest(num(el.dataset.delta)); break;

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
      ui.tab = "progreso";
      ui.progressSection = "historial";
      render();
      break;
    case "summary-share": {
      const sum = ui.sessionSummary;
      if (sum) shareImage("session", sum, `goat-sesion-${sum.date.slice(0, 10)}.png`, sum.routineName);
      break;
    }
    case "pr-share": {
      const p = computeAllPRs().find((x) => x.exerciseId === id); // el más reciente de ese ejercicio
      if (p) shareImage("pr", p, `goat-pr-${p.exerciseName.toLowerCase().replace(/\s+/g, "-")}.png`, `PR: ${p.exerciseName}`);
      break;
    }

    /* Historial */
    case "session-rpe-edit": ui.sessionRpeEdit = true; render(); break;
    case "session-rpe": {
      // RPE de la sesión (resumen de fin de sesión o detalle del historial).
      // Tocar el número ya elegido lo quita: la pregunta es opcional.
      const ses = sessions.find((x) => x.id === id);
      if (ses) {
        const v = Math.round(num(el.dataset.value));
        if (ses.rpe === v) delete ses.rpe; else ses.rpe = v;
        persistSessions();
        if (ui.sessionSummary?.sessionId === id) ui.sessionSummary.rpe = ses.rpe ?? null;
        ui.sessionRpeEdit = false;
        render();
      }
      break;
    }
    case "session-detail-open":
      ui.detailReturnScroll = window.scrollY;
      ui.sessionRpeEdit = false;
      ui.sessionDetail = id;
      render(); window.scrollTo(0, 0);
      break;
    case "session-detail-close":
      ui.sessionDetail = null;
      render(); window.scrollTo(0, ui.detailReturnScroll || 0);
      ui.detailReturnScroll = 0;
      break;
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
          runningTimer = null; // no arrastrar el cronómetro de una sesión que se está reemplazando
          ui.activeSession = buildSessionFromPastSession(past);
          ui.sessionMinimized = false;
          ui.openNotes.clear();
          ui.openExNotes.clear();
          ui.openTypeSelector = null;
          ui.collapsedExercises.clear();
          ui.sessionDetail = null;
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
    case "onerm-use": {
      const ex = exercises.find((x) => x.id === id);
      if (ex) { ex.oneRM = num(el.dataset.value); persistExercises(); render(); }
      break;
    }
    case "prog-detail-open":
      ui.detailReturnScroll = window.scrollY; // para volver a la misma altura de la lista
      ui.progressDetail = id; ui.progressMetric = null;
      render(); window.scrollTo(0, 0);
      break;
    case "prog-detail-close":
      ui.progressDetail = null;
      render(); window.scrollTo(0, ui.detailReturnScroll || 0);
      ui.detailReturnScroll = 0;
      break;
    case "featured-sheet-open": ui.featuredSheet = true; render(); break;
    case "featured-sheet-close": ui.featuredSheet = false; render(); break;
    case "prog-range": ui.progressRange = el.dataset.range; render(); break;
    case "history-range": {
      ui.historyRange = el.dataset.range;
      render();
      break;
    }
    case "progress-section": ui.progressSection = el.dataset.section; render(); break;
    case "featured-remove":
      settings.featuredExercises = (settings.featuredExercises || []).filter((x) => x !== id);
      persistSettings();
      render();
      break;

    /* Pestaña Ejercicios */
    case "exgroup-toggle": {
      const name = el.dataset.name;
      const open = new Set(settings.openExerciseGroups || []);
      open.has(name) ? open.delete(name) : open.add(name);
      settings.openExerciseGroups = [...open];
      persistSettings();
      render();
      break;
    }
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
      if (!name) { askAlert("Ponle un nombre al ejercicio."); break; }
      const ormVal = num(document.getElementById("exm-onerm")?.value);
      const oneRM = type !== "time" && ormVal > 0 ? ormVal : undefined;
      const uniVal = document.getElementById("exm-unilateral")?.checked;
      const unilateral = type !== "time" && uniVal ? true : undefined;
      // countsJumps solo se guarda cuando difiere del valor por defecto de su
      // grupo; si coincide queda sin definir y sigue al grupo.
      const jumpsVal = !!document.getElementById("exm-jumps")?.checked;
      const countsJumpsVal = type !== "time" && jumpsVal !== (group === "Pliometría") ? jumpsVal : undefined;
      const m = ui.exerciseModal;
      let exId = m.id;
      if (m.id) {
        const i = exercises.findIndex((x) => x.id === m.id);
        if (i >= 0) exercises[i] = { ...exercises[i], name, group, type, oneRM, unilateral, countsJumps: countsJumpsVal };
      } else {
        exId = uid("cex");
        exercises.push({ id: exId, name, group, type, oneRM, unilateral, countsJumps: countsJumpsVal });
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
      if (!name) { askAlert("Ponle un nombre al grupo."); break; }
      const m = ui.groupModal;
      if (m.originalName) {
        if (name !== m.originalName && exerciseGroups.some((g) => g.name === name)) {
          askAlert("Ya existe un grupo con ese nombre.");
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
        if (exerciseGroups.some((g) => g.name === name)) { askAlert("Ya existe un grupo con ese nombre."); break; }
        exerciseGroups.push({ name, color: m.color });
        persistGroups();
      }
      ui.groupModal = null;
      render();
      break;
    }

    case "export": exportJSON(); break; // respaldo completo directo (banner de recordatorio)
    case "export-pick": exportJSON(el.dataset.kind); break;
    case "export-from-alert": // botón del aviso "no se pudo guardar": exporta y deja a la vista la sección Datos
      ui.infoDialog = null;
      ui.tab = "ajustes";
      exportJSON();
      break;
    case "backup-snooze":
      settings.backupSnoozeUntil = new Date(Date.now() + 7 * 86400000).toISOString();
      persistSettings();
      render();
      break;
    case "paste-json-open": ui.pasteJsonModal = true; render(); break;
    case "paste-json-cancel": ui.pasteJsonModal = false; render(); break;
    case "paste-json-import": {
      const text = document.getElementById("paste-json-text").value;
      let data;
      try { data = JSON.parse(text); }
      catch { askAlert("El texto pegado no es un JSON válido."); break; }
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
  } else if (ui.picker === "detail") {
    // "Ver todos" en Progreso: abre el detalle del ejercicio elegido.
    ui.detailReturnScroll = window.scrollY;
    ui.progressDetail = id;
    ui.progressMetric = null;
    window.scrollTo(0, 0);
  } else if (ui.picker === "editor" && ui.editingRoutine) {
    const t = exType(id);
    const newItem = {
      exerciseId: id, targetSets: 3, targetReps: 8, targetWeight: 0,
      targetSeconds: t === "time" ? 30 : undefined,
    };
    // Si el picker se abrió estando en modo Organizar, agrega al BORRADOR
    // (no al array real) — si no, quedaba fuera de lo que se ve/guarda ahí.
    if (ui.exerciseEditMode && ui.exerciseEditDraft) ui.exerciseEditDraft.push({ ...newItem, __ord: nextDraftOrd-- });
    else ui.editingRoutine.exercises.push(newItem);
  } else if (ui.picker === "session" && ui.activeSession) {
    const t = exType(id);
    const newItem = { exerciseId: id, target: null, sets: [defaultSet(t, null, null, exUnilateral(id))] };
    if (ui.exerciseEditMode && ui.exerciseEditDraft) ui.exerciseEditDraft.push({ ...newItem, __ord: nextDraftOrd-- });
    else ui.activeSession.exercises.push(newItem);
  } else if (ui.picker === "replace") {
    const idx = ui.replaceExerciseIdx;
    const newType = exType(id);
    const draft = ui.exerciseEditDraft;
    // Reemplazar SIEMPRE trae los valores del ejercicio NUEVO (su propio
    // historial real, o los defaults de siempre si nunca se hizo) — nunca los
    // del ejercicio que se está sacando. Opera sobre el borrador del modo
    // Organizar, igual que reordenar/eliminar/agrupar.
    if (draft && ui.editingRoutine) {
      const it = draft[idx];
      it.exerciseId = id;
      // Limpia todo lo del ejercicio anterior antes de reconstruir, para no
      // dejar campos rotos (ej. segundos en un ejercicio que ahora es de peso).
      delete it.targetReps; delete it.targetWeight; delete it.targetSeconds;
      delete it.targetPercent; delete it.loadMode;
      Object.assign(it, editorTargetFromHistory(id, newType));
    } else if (draft && ui.activeSession) {
      const e = draft[idx];
      // Si la sesión viene de una rutina guardada, el ejercicio que se saca
      // necesita quedar marcado como "sacado a propósito" (mismo array que ya
      // usa el botón de basura) — si no, al sincronizar la rutina al finalizar
      // la sesión solo se detecta el agregado del nuevo, nunca la baja del
      // viejo. En sesión libre (routineId null) no hay rutina que sincronizar,
      // no hace falta.
      if (ui.activeSession.routineId) {
        (ui.activeSession.explicitlyRemoved ??= []).push({ id: e.exerciseId, name: exName(e.exerciseId) });
      }
      e.exerciseId = id;
      e.target = null;
      e.sets = sessionSetsFromHistory(id, newType, exUnilateral(id));
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
      if (it) it[el.dataset.field] = el.dataset.field === "targetSeconds" ? reformatClockInputLive(el) : num(el.value);
      // Cálculo de kg en vivo al editar el % (sin render, patrón #live-vol).
      if (it && el.dataset.field === "targetPercent") {
        const span = document.getElementById("pct-calc-" + el.dataset.idx);
        const orm = num(exMap()[it.exerciseId]?.oneRM);
        if (span && orm > 0) span.textContent = `= ${fmtNum(pctKg(orm, it.targetPercent))} kg (1RM ${fmtNum(orm)} kg)`;
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
      else if (f === "seconds") st.seconds = reformatClockInputLive(el);
      else st[f] = num(el.value);
      // Actualiza el contador de volumen en vivo sin re-dibujar (para no perder el foco).
      const live = document.getElementById("live-vol");
      if (live && ui.activeSession) live.textContent = Math.round(sessionVolume(ui.activeSession, true)).toLocaleString("es-CL");
      persistActiveSession(); // este caso no pasa por render() (no perder el foco), autoguardar aparte
      break;
    }
    case "picker-q": {
      ui.pickerQuery = el.value;
      const list = document.getElementById("picker-list");
      if (list) list.innerHTML = pickerListHTML();
      break;
    }
    case "exercises-q": {
      ui.exercisesQuery = el.value;
      const list = document.getElementById("exercises-list");
      if (list) list.innerHTML = exercisesListHTML();
      break;
    }
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
      persistActiveSession(); // no pasa por render() (no perder el foco), autoguardar aparte
      break;
    }
    case "session-note": {
      const ex = ui.activeSession?.exercises[+el.dataset.ex];
      if (ex) ex.sessionNote = el.value;
      persistActiveSession(); // no pasa por render() (no perder el foco), autoguardar aparte
      break;
    }
    case "history-q": {
      ui.historyQuery = el.value;
      const list = document.getElementById("history-filtered-list");
      if (list) list.innerHTML = historyFilteredListHTML();
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
    case "exm-type": {
      // El 1RM y "unilateral" solo aplican a peso/corporal; se ocultan en
      // tipo tiempo (sin re-render).
      const lbl = document.getElementById("exm-onerm-label");
      if (lbl) lbl.style.display = el.value === "time" ? "none" : "";
      const uniRow = document.getElementById("exm-uni-row");
      if (uniRow) uniRow.style.display = el.value === "time" ? "none" : "";
      const jumpsRow = document.getElementById("exm-jumps-row");
      if (jumpsRow) jumpsRow.style.display = el.value === "time" ? "none" : "";
      break;
    }
    // "Cuenta como saltos" sigue al valor por defecto del grupo (Pliometría =
    // sí) mientras el usuario no lo haya tocado a mano en este modal.
    case "exm-jumps": el.dataset.touched = "1"; break;
    case "exm-group": {
      const sw = document.getElementById("exm-jumps");
      if (sw && !sw.dataset.touched && ui.exerciseModal?.countsJumps === undefined) sw.checked = el.value === "Pliometría";
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
const SELECT_ON_FOCUS = ".vt-set-input, .vt-rpe-input, .vt-rest-mini input, #exm-onerm, .vt-max-input";
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

/* ------------------------ Restaurar sesión activa autoguardada ------------------------ */
// Aviso chico y discreto (no bloqueante) de que se recuperó una sesión sola —
// mismo patrón de elemento de DOM aparte que showUpdateToast, se autodestruye solo.
function showRecoveredToast() {
  const bar = document.createElement("div");
  bar.id = "recovered-toast";
  bar.textContent = "Recuperamos tu sesión en curso";
  document.body.appendChild(bar);
  setTimeout(() => bar.remove(), 3500);
}

// Antes del primer render(): si había una sesión autoguardada (persistActiveSession,
// ver Storage), se restaura tal cual quedó — series marcadas, valores editados,
// ejercicios agregados, todo. Cubre el caso de cerrar la pestaña sin terminar
// ni descartar la sesión.
{
  const savedActiveSession = load("active-session", null);
  if (savedActiveSession && savedActiveSession.id && Array.isArray(savedActiveSession.exercises)) {
    ui.activeSession = savedActiveSession;
    ui.sessionMinimized = false;
    ui.tab = "rutinas"; // la lleva directo a la sesión en curso, no a donde estuviera antes
    if (savedActiveSession.runningTimerInfo) {
      const info = savedActiveSession.runningTimerInfo;
      const st = savedActiveSession.exercises[info.exIdx]?.sets?.[info.setIdx];
      // baseValue = el "seconds" que ese set ya tenía guardado (mismo criterio
      // que set-timer al arrancar): sigue contando desde ahí, no desde cero.
      if (st) runningTimer = { exIdx: info.exIdx, setIdx: info.setIdx, startedAt: Date.now(), baseValue: num(st.seconds) };
    }
    showRecoveredToast();
  }
}

render();
appReady = true;
notifySaveFailure(); // por si save() ya falló durante la carga

// Pide al navegador que no borre los datos de la app por falta de espacio
// (sin esto, localStorage es "best effort" y el sistema puede limpiarlo). El
// resultado se muestra en Ajustes ("Almacenamiento protegido: sí / no").
(async () => {
  try {
    if (navigator.storage?.persist) storagePersisted = await navigator.storage.persist();
    else if (navigator.storage?.persisted) storagePersisted = await navigator.storage.persisted();
  } catch { /* API no disponible: queda en "no" */ }
  if (ui.tab === "ajustes") render();
})();

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
