# GOAT — reglas del proyecto

## Arquitectura (cerrada, no reabrir)
- HTML/CSS/JS plano, sin build ni framework. 3 archivos: index.html,
  estilos.css, app.js. Librerías externas solo por CDN (ej. Chart.js,
  SortableJS), nunca npm/bundler.
- Persistencia: localStorage (routines, sessions, custom-exercises,
  settings). Sin backend. Sync entre dispositivos es manual, vía
  exportar/importar JSON — no proponer alternativas salvo pedido
  explícito.
- Deploy: GitHub Pages vía GitHub Actions
  (.github/workflows/pages.yml, publica el repo tal cual, sin build).
  No usa el sistema viejo "Deploy from a branch" (Jekyll) — se cambió
  el 2026-08-07 porque ese quedó colgado/fallando sin motivo claro.
- Pestaña "Partidos" (vóleibol, vía la Volleyball API de Highlightly):
  se construyó completa entre el 2026-08-07 y 2026-08-08 y se dejó de
  lado el 2026-08-26 — código removido de app.js/estilos.css, no
  aparece en NAV_ITEMS. No hace falta migrar ni limpiar localStorage
  de quien la haya probado, el código ya no lee ni escribe esas
  llaves. Si se retoma, el diseño completo (equipos favoritos,
  calendario mensual, banderas vs logos, compartir, cuota manual,
  etc.) ya quedó validado — ver STATUS.md de esas fechas antes de
  repartir desde cero.

## Datos (campos opcionales, todos viajan tal cual en el export/import)
- `exercise.countsJumps` (boolean): si las reps del ejercicio cuentan
  como saltos. Sin definir = `true` solo para el grupo "Pliometría"
  (helper `countsJumps(ex)`); se guarda explícito solo cuando difiere
  de ese valor por defecto. Tipo tiempo nunca cuenta.
- Saltos en gimnasio (`sessionJumps`): suma de reps de todas las
  series guardadas (calentamiento incluido; en unilateral izq + der)
  de los ejercicios que cuentan. Mide SOLO sesiones de pesas — la
  interfaz tiene que decir siempre que no incluye cancha. Sin alertas
  ni umbrales.
- `session.rpe` (entero 1–10, opcional): RPE de la sesión, se pregunta
  en el resumen y se puede cambiar en el detalle de sesión. Carga =
  `rpe × minutos` en "UA" (`sessionLoad`); solo cuentan las sesiones
  que respondieron.
- `settings.lastExportAt` (ISO): último respaldo exportado; alimenta
  el banner de recordatorio en Rutinas (14 días + sesiones nuevas, o
  nunca exportado con 3+ sesiones) y el subtítulo de Ajustes.
  `settings.backupSnoozeUntil` lo pospone 7 días.
- El respaldo incluye `exercise-groups` desde 2026-10-02.
- Exportación diferenciada (`EXPORT_KINDS`, campo `kind` en el JSON):
  `full` (respaldo), `routines`, `sessions`, `exercises`. Regla de
  importación: SOLO el respaldo completo reemplaza los datos; los
  archivos parciales se AGREGAN sin borrar nada (las sesiones se
  fusionan por id). Los parciales no llevan `oneRM` (dato personal:
  pisaría el de quien recibe) ni cuentan como "último respaldo".
- Datos personales = entrenamientos (`sessions`, con su RPE) y 1RM.
  Solo el respaldo completo los restaura sin filtro. Un archivo
  parcial NUNCA importa 1RM (se descarta aunque venga) y los
  entrenamientos entran solo tras confirmar que son propios. Ajustes
  tiene "Borrar datos personales" (entrenamientos o 1RM, cada uno con
  confirmación; no toca rutinas, ejercicios ni grupos).
- `save()` nunca lanza: si localStorage falla avisa una vez y la app
  sigue en memoria. Al cargar se pide `navigator.storage.persist()`.

## Diseño visual (decidido, no reabrir sin pedido explícito)
- Estilo tabla (ref. Hevy): sin tarjetas encajonadas, divisores finos,
  radio de esquina solo en elementos táctiles, acento vertical por
  grupo muscular.
- Paleta: acento de marca azul cobalto #3B6FE0. Ámbar EXCLUSIVO para
  PR/trofeo, verde EXCLUSIVO para serie completada — no reasignar esos
  colores a nada más. Sin marca de agua, sin tinte de fondo en bloques.
- Mayúsculas con tracking en labels/estructura; nombres de ejercicio,
  de rutina y notas libres van en formato normal (nunca mayúscula).
- No reproducir escudos/logos de clubes o marcas registradas. Dejar
  placeholders de imagen con fallback para que el usuario los agregue.

## Escala de diseño (2026-10-01, no reabrir sin pedido explícito)
Regla: **nunca valores sueltos de font-size / spacing / radius /
tracking; siempre tokens** (definidos en `:root` de estilos.css). Vale
también para los `style=""` inline de app.js. Se quedan en px solo 0,
1px y 2px (ajustes ópticos), los `calc()`, el 100px de holgura de la
nav y los anchos/altos de elementos (columnas, botones, círculos).
- Tipografía: `--fs-xs` 11px (labels en mayúscula) · `--fs-sm` 13px
  (texto secundario) · `--fs-md` 15px (texto base) · `--fs-lg` 18px
  (valores) · `--fs-xl` 20px (títulos de bloque/rutina/modal) ·
  `--fs-2xl` 24px (header chico, nombre de sesión) · `--fs-3xl` 32px
  (título de pestaña, descanso, titular del resumen) · `--fs-hero`
  88px (SOLO el número héroe del resumen de sesión).
- Espaciado (grilla de 4): `--sp-1` 4px · `--sp-2` 8px · `--sp-3` 12px
  · `--sp-4` 16px · `--sp-6` 24px · `--sp-8` 32px · `--sp-12` 48px ·
  `--sp-16` 64px.
- Radios: `--r-sm` 8px (controles chicos) · `--r-md` 12px (botones,
  barras, hoja de modal) · `--r-full` 999px (píldoras). `50%` solo
  para círculos.
- Tracking: `--track` 0.06em para todo lo que va en mayúscula.
- Números: siempre con `fmtNum()` (coma decimal chilena) y espacio
  antes de la unidad: `52,5 kg`, nunca `52.5kg`.

Patrones (reutilizar, no inventar variantes):
- Fila de serie tipo tabla `[nº] [valor] [×] [valor] [RPE] [✓]`: check
  a la derecha, nº sin caja, valores en columnas flex iguales.
  Encabezado y fila salen de la misma plantilla (`setColumns`), con
  anchos fijos en variables `--col-*` de `.vt-sets`. El trofeo de PR
  va absoluto, nunca como columna.
- Fila de rutina: texto + círculo azul de Iniciar; las acciones
  secundarias van en una hoja inferior desde el botón ⋯
  (`actionSheetHTML`), no como íconos sueltos.
- `weekDotsHTML()`: 7 círculos L–D de "Esta semana".
- `statStripHTML()`: franja de stats plana, columnas con divisores
  verticales, sin cajas; los labels no se parten en dos líneas.
- `repartoHTML()`: barras de reparto por grupo en BLANCO (no con el
  color del grupo: esa paleta repite ámbar y verde, reservados).
- `exerciseStats()`: fuente única de "la mejor marca" por ejercicio
  (mejor marca, último uso y una marca por sesión). La usan la pestaña
  Ejercicios, sus Recientes y "Tus ejercicios" de Progreso — no
  recalcular marcas por otro lado. Recorre las sesiones una vez por
  render. Marca = peso máx (0 kg no cuenta) / lastre máx o reps máx en
  peso corporal / segundos máx en tiempo.
- Fila de ejercicio del catálogo (`catalogRowHTML`): nombre + "Mejor
  53 kg · hoy" (`fmtMark` + `fmtRelDate`), mini curva (`sparklineHTML`,
  solo con 3+ sesiones) y chevron. El tipo se menciona solo si no es
  peso × reps. La fila entera abre el detalle del ejercicio; Editar y
  Eliminar viven en el ⋯ del detalle, nunca como íconos en la lista.
- Detalle de ejercicio (`exerciseDetailHTML`, `ui.progressDetail`): un
  solo componente, se abre desde Ejercicios o desde Progreso y se
  dibuja sobre la pestaña donde se abrió.
- Detalle de sesión (`sessionDetailHTML`, `ui.sessionDetail`): mismo
  encabezado que el detalle de ejercicio (volver + eyebrow + título +
  ⋯), franja de stats, "Lo que hiciste" con notas (`doneListHTML`,
  compartido con el resumen), carga/RPE, saltos y botón Repetir.
- Fila de historial (`sessionRowHTML`): nombre en Barlow + "fecha ·
  duración · volumen" + trofeo con la cantidad de récords + chevron;
  sesiones agrupadas por mes con el total del mes en el label.
- Selector compacto de filtros = `.vt-pills` (rango de Progreso,
  métrica del detalle, rango del Historial, KG/%1RM del editor).
  Nunca chips con scroll horizontal.
- Interruptor (`.vt-switch`): checkbox con pista 44×26 y perilla
  blanca, azul encendido. En Ajustes y en el modal de ejercicio.
- Editor de rutina: mismo bloque que la sesión en vivo; objetivos como
  fila de tabla (`targetColumns`, clases de la fila de serie); nota
  como link "+ Nota"; `leaveEditor` avisa si hay cambios sin guardar.
- Áreas táctiles: todo control chico lleva un `::before` de 44×44
  (lista al final de estilos.css); al crear un control nuevo de menos
  de 44px, agregarlo ahí.
- Fin del descanso: bocina de marcador sintetizada (`beep()`), un solo
  toque, sin cuenta regresiva. La barra tiene −15 s / +15 s.
- Selectores chicos como píldoras (`.vt-pills`), pestañas internas
  subrayadas (`.vt-tabs`), botón de texto (`.vt-text-btn`) para
  acciones secundarias, borde sólido (`.vt-btn-solid`) para acciones
  reales de ancho completo — el punteado queda solo para "agregar".
- Sin `.vt-card`: no existen tarjetas encajonadas en la app.
- Gráficos (Chart.js): sin caja, eje Y siempre desde 0, serie
  principal en azul. Ámbar no se usa en gráficos.

## Reglas de compactación
Al compactar (automático o manual), preserva siempre:
- Las rutas de archivo que se estén editando
- Cualquier decisión de arquitectura o diseño tomada en la sesión
- El estado actual: qué feature se está implementando y qué falta
- Mensajes de error o fallos de verificación pendientes
Nunca resumas ni parafrasees: valores hexadecimales, nombres de
variables CSS, y las reglas de esta sección. Descarta en cambio
la exploración/debugging intermedio que ya no aporta.

## Bitácora de sesión
Antes de terminar cada sesión, agrega 2-3 líneas a STATUS.md (al
final, no reescribas lo anterior) con:
- Qué se implementó
- Qué quedó pendiente de probar
- Cualquier decisión tomada que no esté ya en este archivo
Si una decisión es duradera (afecta arquitectura o diseño futuro),
además de anotarla en STATUS.md, súbela a la sección correspondiente
de este archivo.
