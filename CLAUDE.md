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
- Compartir UNA rutina: ⋯ de la rutina → Compartir → "Como texto" o
  "Como archivo" (`shareRoutine`, `buildRoutineShare`). El texto es un
  mensaje con cabecera legible + JSON compacto, porque hay teléfonos
  que no abren un .json recibido por WhatsApp; quien lo recibe lo
  pega en Ajustes → Importar → pegar, y `extractJSON` ignora lo que
  venga antes o después del JSON. Mismo formato que el export parcial
  de rutinas (`kind: "routines"`), sin 1RM y sin carpeta.
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
- Paleta: acento de marca azul cobalto #3B6FE0 (`--blue`) SOLO en
  rellenos y bordes (botones primarios, ▶, barras de gráficos,
  interruptores, check de selección, subrayado de foco). Todo texto o
  ícono azul usa `--blue-text` #5A8BEE (el #3B6FE0 como texto no llega a
  4,5:1). Ámbar EXCLUSIVO para
  PR/trofeo, verde EXCLUSIVO para serie completada — no reasignar esos
  colores a nada más. Sin marca de agua, sin tinte de fondo en bloques.
- Tipografía (2026-10-23): UNA familia, la del sistema (SF en iPhone,
  Roboto en Android), en una sola variable `--font`
  (`system-ui, -apple-system, "Roboto", "Segoe UI", sans-serif`). Sin
  fuentes web (ni Google Fonts ni archivos propios). La jerarquía se hace
  con peso y tamaño: título de pestaña 32/700 (`letter-spacing: -0.01em`),
  titular del resumen 32/700, número héroe 88/800 (-0.02em), nombres de
  rutina y ejercicio en bloques 20/600, nombres en filas de lista 15/500,
  valores de series 18/600, botones 600, texto normal 400. Los números en
  columnas (series, reloj, stats, "Última vez", ejes, fechas) llevan
  `font-variant-numeric: tabular-nums` (utilidad `.vt-num`). El canvas de
  compartir y Chart.js usan la misma familia del sistema.
  Barlow Condensed e IBM Plex Sans/Mono se DESCARTARON el 2026-10-23 por
  pedido de Martín ("se ve hecha por IA"; tampoco convencieron Archivo ni
  Saira como familia única): no volver a proponerlas ni proponer otra
  fuente web.
- Reglas de mayúsculas (2026-10-23). En MAYÚSCULA solo: encabezados de
  columna (KG, REPS, SERIES, TIEMPO, DESC., también KG / %1RM del editor)
  en `--fs-xs` 600, y labels de sección (ESTA SEMANA, RÉCORDS, LO QUE
  HICISTE, nombres de grupo y de carpeta) en `--fs-sm` 600; los dos con
  `--track` 0.02em. Todo lo demás en formato normal: títulos de pestaña,
  botones, títulos de hojas, nav, labels de stats y formularios, el
  encabezado de Organizar. Nombres de ejercicio, de rutina y notas libres
  nunca en mayúscula.
- Neutros de plataforma (2026-10-23, modelo de etiquetas de iOS en modo
  oscuro: el gris es el mismo blanco con opacidad). `--bg` #000 (tiene que
  ser IDÉNTICO a `background_color` / `theme_color` de manifest.json, al
  meta theme-color y al fondo del ícono maskable, o la splash muestra un
  marco), `--surface` #1C1C1E, `--surface-2` #2C2C2E, `--line`
  rgba(84,84,88,.55). Texto: `--text` #FFF (tinta principal),
  `--text-dim` rgba(235,235,245,.60) (secundario, ≥ 5,3:1 sobre los tres
  fondos), `--text-faint` rgba(235,235,245,.30) (terciario). NUNCA un gris
  hexadecimal propio, en CSS ni en JS: Chart.js y el canvas leen los
  tokens con `cssVar()`.
- Regla de tinta: en `--text` va lo que se lee como dato o identidad
  (nombres de rutina, ejercicio y sesión; valores de series y objetivos;
  los valores de "Última vez"; mejor marca y números de stats; texto de
  botones). En `--text-dim`: etiquetas, unidades, fechas, subtítulos, la
  lista de ejercicios bajo cada rutina, labels de sección y encabezados de
  columna. En `--text-faint`: placeholders, el "×" entre kg y reps, los
  "·" separadores (`sepJoin`), íconos de RPE sin valor y controles
  deshabilitados (en vez de bajar la opacidad).
- Eyebrows: solo los que informan (fecha de sesión, grupo en el detalle de
  ejercicio, "Sesión nº N · fecha", "Editar rutina / Nueva rutina"), en
  `--fs-xs`, sin mayúscula forzada, en `--blue-text`. Los encabezados
  de pestaña van solo con el título (sin "SET 0X · …").
- Ícono-acción SIN recuadro: un ícono que es una acción (volver,
  nuevo, exportar, ⋯, cronometrar, etc.) va sin fondo ni borde, con
  área táctil de 44×44 e ícono de 24px (`.vt-btn-icon`); el fondo
  aparece solo al presionar. Excepciones — los únicos con forma
  propia: el check de serie, el círculo azul ▶ de Iniciar, los
  botones primarios y los selectores con opción activa (píldoras,
  interruptor, RPE 1–10).
- Colores reservados: ámbar = PR, verde = serie completada, azul
  #3B6FE0 = marca, morado = superserie, naranja = drop set, rojo =
  eliminar/fallida (`--red-fill` #B24A40 para rellenos con texto blanco,
  `--red-text` #D46A60 para texto e íconos). Los grupos musculares NUNCA usan uno de esos ni
  repiten color entre sí. Paleta por defecto (`DEFAULT_GROUPS`):
  Piernas #3FB0A6 · Pliometría #D86A9C · Empuje #A9C54A · Tracción
  #4FB7E3 · Hombro #C26AD8 · Core #A89F91 · Custom #6E7681; el
  selector (`GROUP_PALETTE`) suma #E3C94F y #7FA7FF. Los grupos
  viejos se migraron una vez (`settings.groupPaletteV2`,
  `migrateGroupColors`); uno recoloreado a mano no se toca.
- Unidades de volumen: el de UNA sesión va siempre en kg (`3.636 kg`:
  resumen, fila y detalle de sesión, barra minimizada); las toneladas
  (`7,3 t`) son solo para totales de semana o mes (`fmtVolume`).
- Notas (del entrenador, de sesión, de serie): texto normal en
  `--text-dim`, nunca en cursiva.
- No reproducir escudos/logos de clubes o marcas registradas. Dejar
  placeholders de imagen con fallback para que el usuario los agregue.

## Escala de diseño (2026-10-01, no reabrir sin pedido explícito)
Regla: **nunca valores sueltos de font-size / spacing / radius /
tracking; siempre tokens** (definidos en `:root` de estilos.css). Vale
también para los `style=""` inline de app.js. Se quedan en px solo 0,
1px y 2px (ajustes ópticos), los `calc()`, el 100px de holgura de la
nav y los anchos/altos de elementos (columnas, botones, círculos).
- Tamaños: `--fs-xs` 11px (encabezados de columna) · `--fs-sm` 13px
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
- Tracking: `--track` 0.02em para lo que va en mayúscula (el 0.06em de
  antes era para la mono, que ya no existe).
- Colores de contraste (2026-10-22, medidos contra WCAG AA): `--blue-text`
  #5A8BEE (texto azul, 6:1 sobre `--bg`), `--red-fill` #B24A40 (blanco
  encima 5,3:1), `--red-text` #D46A60 (5,3:1 sobre `--surface`),
  `--line-strong` #68687A (borde de controles vacíos y subrayado de
  editables, 3,6:1 sobre `--bg`).
- Números: siempre con `fmtNum()` (coma decimal chilena) y espacio
  antes de la unidad: `52,5 kg`, nunca `52.5kg`.

Patrones (reutilizar, no inventar variantes):
- Fila de serie tipo tabla `[nº] [valor] [×] [valor] [RPE] [✓]`: check
  a la derecha, nº sin caja, valores en columnas flex iguales.
- Valor editable sin caja (series, objetivos del editor, 1RM, descanso
  del ejercicio, RPE): subrayado tenue permanente `--editable-line` (60%
  del ancho, centrado, en `--line-strong`); al enfocar, subrayado azul de
  2px; en una serie completada (`.is-done`) no lleva subrayado.
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
- Fila de historial (`sessionRowHTML`): nombre de rutina + "fecha ·
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
- Encabezado de modo (`.vt-mode-head`, hoy solo Organizar): un modo
  modal reemplaza el encabezado normal por Cancelar · Organizar + guía
  (o "N elegidos") · Guardar, oculta la nav y las barras flotantes, y usa
  UNA barra de herramientas pegada abajo (`organizeViewHTML`,
  `organizeFooterHTML`). Se entra por el ⋯ del encabezado (sesión en vivo
  o editor) o manteniendo presionado CUALQUIER punto del bloque de un
  ejercicio (salvo campos, botones, check, nº de serie y cronómetro; el
  movimiento de más de 10 px lo cancela, así no compite con el swipe ni
  con el scroll), con una vibración de 15 ms al entrar.
- Barra de herramientas de modo (`.vt-tool`): fija abajo con área segura,
  fondo `--surface`, divisor arriba, botones iguales de 56px (ícono 22px
  arriba, texto `--fs-xs` 500 abajo). SIEMPRE los mismos botones: los que
  no aplican a la selección quedan visibles, `disabled` y en
  `--text-faint`, para que la barra no cambie de forma. En Organizar:
  Eliminar (`--red-text`, 1+), Superserie (`--superset`, 2+; dice Separar
  si lo elegido ya es una superserie) y Reemplazar (exactamente 1).
- Fila de Organizar: `[○ selección] [nombre + resumen de series] [⠿ asa]`,
  el asa a la derecha para el pulgar. Elegida = tinte azul en toda la fila.
  El resumen sale de `organizeSummary` ("3 × 20 · 10 kg", "3 × 1:00",
  "3 × 10 reps · +10 kg", "3 × 8/8 · 20 kg", "…" si las series difieren).
  Superseries: barra morada continua de 3px que une las filas y etiqueta
  A1/A2 morada antes del nombre. Arrastre: la copia levantada lleva sombra,
  `--surface-2` y `scale: 1.02`; el hueco es una línea azul de 2px; 10 ms
  de vibración al soltar.
- Selector de ejercicios (`pickerHTML`): hoja de 92vh con título por
  contexto (Agregar / Reemplazar / Destacar ejercicio), buscador, chips de
  grupo deslizables (Todos + grupos; activo = fondo `--text`) y lista por
  secciones: RECIENTES (4 últimos usados que no están en la sesión o
  rutina) y una por grupo con su barrita de color; al buscar, una sola
  lista sin secciones. Fila: nombre 15/500 + "Mejor 53 kg · hace 4 días" /
  "Sin marca" / "Sin registros"; si ya está en la sesión o rutina, nombre
  en gris + etiqueta (se puede agregar igual). En "session" y "editor" se
  eligen varios (círculo a la derecha) y "Agregar N ejercicios" los suma
  en el orden elegido (`addExerciseFromPicker`); en "replace", "featured"
  y "detail" tocar elige y cierra. "+ Crear "texto"" al final abre "Nuevo
  ejercicio" con el nombre. Se redibuja por partes (`refreshPicker`) para
  no perder el scroll ni el foco.
- ⋯ en encabezados: las acciones secundarias de una pantalla (Organizar,
  Descartar sesión, Editar/Eliminar) viven en una hoja desde el ⋯, no
  como botones sueltos que ocupan una fila.
- Duración corregible: `durationDialogHTML` al finalizar una sesión de
  más de 2,5 h y al tocar la duración en el detalle de sesión; la
  carga sale siempre de `durationSec`.
- Progreso tiene UN selector de rango (`.vt-range-bar`), nunca uno por
  sección.
- Selectores chicos como píldoras (`.vt-pills`), pestañas internas
  subrayadas (`.vt-tabs`), botón de texto (`.vt-text-btn`) para
  acciones secundarias (también "+ Agregar serie", `.vt-add-set`),
  borde sólido (`.vt-btn-outline`) para acciones de ancho completo.
  El borde punteado ya no se usa en botones (solo como subrayado de un
  texto editable: nombre de sesión, duración; los valores numéricos
  llevan el subrayado tenue de arriba).
- Sin `.vt-card`: no existen tarjetas encajonadas en la app.
- Gráficos (Chart.js): sin caja, serie principal en azul. El eje Y del
  peso máximo (detalle de ejercicio) parte cerca del mínimo
  (`suggestedMin` = mínimo × 0,85, Chart.js lo baja a una marca pareja);
  volumen, saltos y carga parten en 0. La última barra (período actual)
  siempre lleva fecha. Cada canvas lleva texto alternativo
  (`chartSummary`). Ámbar no se usa en gráficos.
- Diálogos: un ayudante ÚNICO (`setupDialogs`, corre al final de
  render()) marca el modal de más arriba con `role="dialog"` y
  `aria-modal`, deja inerte lo de atrás, mueve el foco al primer control
  que no sea un campo de texto, encierra Tab, cierra con Escape (misma
  acción que tocar el fondo) y devuelve el foco al botón que lo abrió.
  Un modal nuevo no necesita nada extra si usa `.vt-modal-backdrop` con
  `data-a` de cierre.
- Hojas inferiores: barrita de 36×4 en `--line-strong` (la agrega
  setupDialogs) y cierre arrastrando hacia abajo > 80 px o con un tirón
  rápido (`sheetDrag`), además de la ✕, el fondo y Escape.
- Confirmaciones: `askConfirm(message, onYes, { label, danger, onNo,
  cancelLabel })`. El botón principal repite la acción con un verbo
  ("Descartar sesión", "Eliminar rutina", "Finalizar y guardar"), nunca
  "Confirmar" ni un "Eliminar" genérico.
- Borrar una serie (swipe) se puede deshacer: aviso "Serie eliminada ·
  Deshacer" de 5 s (`showUndoToast`) que devuelve la serie con sus
  valores a la misma posición.
- Zoom: el viewport sigue bloqueado (`maximum-scale=1, user-scalable=no`)
  porque en julio de 2026 la app se agrandaba sola durante el uso. En su
  lugar hay un zoom temporal: pellizcar con dos dedos agranda `<main>`
  hasta 3× y al soltar vuelve en 250 ms (inmediato con movimiento
  reducido). Cancela swipe, long-press y arrastre de Organizar; no aplica
  dentro de diálogos. Nada con `position: fixed` puede vivir dentro de
  `<main>` (por eso la barra de Organizar va fuera).
- Deslizar entre pestañas (`tabSwipe`): arrastre real, no un comando. La
  pestaña actual sigue al dedo y la vecina (copia inerte, `tabViewHTML`)
  entra pegada a su lado. Al soltar decide con la posición proyectada
  (posición + velocidad × 180 ms): pasada la mitad del ancho cambia; si
  no, vuelve. En los extremos hay resistencia. Solo en las pantallas de
  lista de cada pestaña: nunca en la sesión en vivo, el editor,
  Organizar, los detalles ni con un diálogo abierto; no arranca sobre
  Recientes, campos ni junto al borde de la pantalla. Un segundo dedo lo
  cancela. Cambiar de pestaña por la nav o deslizando pasa por
  `goToTab`.
- Encabezado de la sesión en vivo (`.vt-live-head`): título a 2 líneas
  como máximo, nunca toca el reloj; bajo 380px tiempo y volumen bajan a
  una segunda fila. Encabezado de ejercicio en sesión: el nombre ocupa la
  fila; descanso, nota y colapsar van en la línea de "Última vez".
- Selección de texto: solo lo editable se selecciona. `#app` y todo lo que
  contiene van con `user-select: none` y sin menú del sistema
  (`-webkit-touch-callout: none`); las únicas excepciones son `input`,
  `textarea` (incluidos "Pegar para importar" y el texto para copiar al
  compartir) y `[contenteditable="true"]`. No agregar reglas sueltas de
  `user-select` por componente.
- Accesibilidad: cada control sin texto lleva `aria-label`; los que
  tienen estado, `aria-pressed` (check, píldoras, RPE) o `aria-current`
  (nav). Avisos sin mover el foco por `announce()` (región `#sr-live`,
  polite). Con `prefers-reduced-motion` no hay pop del trofeo, pulso de
  Organizar ni animación de gráficos.

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
