# GOAT — reglas del proyecto

## Arquitectura (cerrada, no reabrir)
- HTML/CSS/JS plano, sin build ni framework. 3 archivos: index.html,
  estilos.css, app.js. Librerías externas solo por CDN (ej. Chart.js,
  SortableJS), nunca npm/bundler.
- Excepción aprobada (2026-10-27): `bodymap.js`, un cuarto archivo SOLO DE
  DATOS (MUSCLES y BODY_MAP: trazos SVG de react-native-body-highlighter,
  licencia MIT). Se carga con `defer` antes de app.js y está en el precache
  de sw.js. Toda la lógica sigue en app.js. El comentario con el aviso de
  licencia MIT de su encabezado es OBLIGATORIO: no borrarlo. Etiquetas
  visibles: `gluteos` = "Glúteo mayor" y `abductores` = "Glúteo medio" (los
  ids no cambian).
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
- `exercise.muscles = { primary: [ids], secondary: [ids] }` (ids de
  MUSCLES; un id no puede estar en las dos listas; `cleanMuscles` al
  importar). Sin el campo, el ejercicio no suma al mapa. Conteo
  (`muscleSets`): cada serie hecha suma 1 a cada principal y 0,5 a cada
  secundario; sin Calentamiento; una serie unilateral cuenta una vez; los
  ejercicios que cuentan como saltos NO suman (la pliometría queda fuera del
  mapa y va por el ícono de saltos).
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
  marco), `--surface` #1C1C1E, `--surface-2` #2C2C2E, `--surface-3`
  #3A3A3C (botones dentro de un menú flotante), `--line`
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
  "·" separadores (`sepJoin`), el RPE vacío ("—") de la tabla de Última
  vez y controles deshabilitados (en vez de bajar la opacidad).
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
  88px (SOLO el número héroe del resumen de sesión) · `--fs-menu` 16px
  (SOLO menús flotantes: filas, título y valores de la tabla).
- Espaciado (grilla de 4): `--sp-1` 4px · `--sp-2` 8px · `--sp-3` 12px
  · `--sp-4` 16px · `--sp-6` 24px · `--sp-8` 32px · `--sp-12` 48px ·
  `--sp-16` 64px.
- Radios: `--r-sm` 8px (controles chicos) · `--r-md` 12px (botones,
  barras, hoja de modal) · `--r-lg` 14px (menú flotante) · `--r-full`
  999px (píldoras). `50%` solo para círculos.
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
- Fila de serie tipo tabla `[nº] [valor] [×] [valor] [✓]`: check a la
  derecha, nº sin caja, valores en columnas flex iguales. El RPE de serie
  YA NO tiene columna (2026-10-23): si la serie lo tiene, va "@8" en 11px
  `--text-dim` debajo del número.
- Menú de serie (`setMenuHTML`): tocar el nº de serie abre un menú
  flotante (anillo `--blue` de 2px en el número) con el tipo (Normal /
  C Calentamiento / D Drop set / F Fallida, 4 botones de 52px con el
  nombre; elegir aplica y el menú sigue abierto), el esfuerzo RPE ENTERO
  1–10 en 2 × 5 (guarda y cierra; tocar el elegido lo quita) y "Eliminar
  serie" con el mismo deshacer del swipe. RPE con decimal de sesiones
  viejas: se conserva en los datos y se muestra redondeado hacia abajo
  (`setRpe`); al importar se limpia a enteros 1–10 (`cleanImportedRpe`).
- "Última vez" (sesión en vivo): botón al inicio de la línea de controles
  del bloque (solo si hay historial) que abre un menú flotante con la
  sesión anterior en tabla (columnas por tipo, C/D/F en su color, RPE
  vacío "—"), "Mejor serie: …" y "Usar estos valores" (copia sobre las
  series SIN marcar, serie por serie y con su tipo, agrega las que faltan;
  aviso "Valores copiados · Deshacer"). No hay línea de texto "Última vez".
- Valor editable sin caja (series, objetivos del editor, 1RM, descanso
  del ejercicio): subrayado tenue permanente `--editable-line` (60%
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
- Menú flotante (`popoverHTML`, `positionPopover`, `closePopover`,
  `ui.popover`): componente ÚNICO para menús chicos anclados a un botón.
  Panel `--surface-2`, radio `--r-lg`, sombra 0 12px 32px, ancho según el
  contenido (216px a 100vw − 32px), sobre un fondo atenuado al 35% que lo
  cierra. Abre hacia abajo y, si no cabe, hacia arriba; se alinea al borde
  del botón (izquierdo o derecho según la mitad de pantalla). Entra desde
  la esquina del botón (escala 0,96 → 1 y opacidad, 140ms) y sale en
  100ms; con movimiento reducido, solo opacidad. Es un diálogo más para
  setupDialogs (foco, Escape, Tab, retorno del foco). Filas de 48px con
  ícono 20 y texto `--fs-menu`; las destructivas en `--red-text` con un
  divisor antes. Elegir una acción lo cierra, salvo las marcadas
  `data-keep`.
- Cuándo menú flotante y cuándo hoja inferior: menú flotante para las
  acciones cortas de un ⋯ (sesión en vivo, editor, rutina, carpeta,
  detalle de sesión y de ejercicio: `MENU_KINDS`), el menú de serie y
  "Última vez". Hoja inferior para lo que necesita subtítulo por opción o
  más espacio (Exportar, Compartir rutina, Borrar datos personales, el
  selector, formularios). Modal centrado solo para confirmaciones y el
  aviso de duración.
- Hojas inferiores: barrita de 36×4 en `--line-strong` (la agrega
  setupDialogs) y cierre arrastrando hacia abajo > 80 px o con un tirón
  rápido (`sheetDrag`), además del fondo y Escape. Las hojas de menú
  (Exportar, Compartir, Borrar datos) van sin ✕.
- Confirmaciones: `askConfirm(message, onYes, { label, danger, onNo,
  cancelLabel })`. El botón principal repite la acción con un verbo
  ("Descartar sesión", "Eliminar rutina", "Finalizar y guardar"), nunca
  "Confirmar" ni un "Eliminar" genérico.
- Borrar una serie (swipe o menú de serie) se puede deshacer: aviso
  "Serie eliminada · Deshacer" de 5 s que devuelve la serie con sus
  valores a la misma posición. El aviso es genérico:
  `showUndoToast(texto, undo)` (también lo usa "Usar estos valores").
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

## Mapa muscular (2026-10-27)
- Componente `bodyMapHTML(levels, { height, values, jumps, interactive, action })`:
  cuerpo de frente y de espalda lado a lado (cada `path` muscular con
  `data-muscle`). Niveles 0–4 por vista: `ceil(4 × valor / máximo)` contra
  el músculo más trabajado de esa vista. Tokens `--muscle-0` (sin series,
  `--surface-2`) a `--muscle-4` #7FA3F2, en el azul de marca; silueta en
  `--surface` y bordes entre partes en `--bg`.
- El ícono de saltos es "un músculo más": a la derecha de los cuerpos, con
  el color de su nivel (`--text-faint` en 0), el número y "saltos". Nivel:
  en una sesión, contra la sesión con más saltos; en Progreso, contra el
  período con más saltos de `computeBuckets` del rango.
- Interactivo (resumen, detalle de sesión y Progreso): tocar un músculo lo
  resalta con borde `--text` de 2px y muestra "Cuádriceps · 14 series";
  tocar los saltos, "312 saltos en gimnasio". Es estado de pantalla, sin
  render().
- Dónde aparece: resumen (anima los niveles al abrir, una vez), detalle de
  sesión, Progreso (antes de Reparto, con lista y nota de series sin
  músculos) y detalle de ejercicio (principales en nivel 4, secundarios en
  2). Se eligen en el modal de ejercicio (fila "Músculos" → hoja con ciclo
  sin marcar → principal → secundario, fichas y "Agregar por nombre").
- `MUSCLE_HINTS` (app.js) sugiere músculos al CREAR un ejercicio mientras no
  se toquen: gana la PRIMERA regla que calce, así que el orden importa
  (palabras completas, plural con -s / -es, `requires` para "peso muerto").
- Créditos en Ajustes con la licencia MIT de los dibujos.

## Animaciones (2026-10-24, no agregar otras sin pedido explícito)
- Curva ÚNICA: token `--ease` = cubic-bezier(.2, .8, .2, 1). Solo CSS más
  JS mínimo para disparar clases; sin librerías.
- Regla `ui.anim`: render() reconstruye el DOM en cada acción, así que una
  animación NUNCA se ata solo a una clase de estado (`.is-done`, `.is-pr`):
  se repetiría al escribir o al redibujar. La acción fija
  `ui.anim = { kind, key }` justo antes de su render(); solo el elemento
  con esa key recibe la clase `.anim-*`, y `runAnimHooks()` suelta
  ui.anim al cuadro siguiente (o a los 100 ms si no hay cuadros).
- Alturas (filas que entran o salen, colapso): FLIP con
  `animateHeight(el, from, to, ms)` (height + overflow hidden).
- Las 7 animaciones:
  1. Marcar serie (solo al marcar): pop del check 220 ms (.86 → 1,06 → 1),
     visto dibujado 180 ms (+60), tinte verde y borde 240 ms, vibración 12 ms.
  2. Récord en vivo: destello ámbar de la fila 900 ms y trofeo .4 → 1,2 → 1
     con giro leve, 360 ms (+80); vibración [12, 60, 24].
  3. Agregar serie: abre su altura 220 ms con opacidad. Borrar (swipe o
     menú): se desliza 24 px desde donde quedó el dedo mientras se cierra,
     200 ms, y recién ahí sale del modelo (`removeSetAnimated`). El aviso
     de deshacer va abajo y sube en 240 ms; deshacer vuelve a entrar.
  4. Ejercicio completado: espera 350 ms, el bloque se cierra con FLIP en
     320 ms y la fila resumida aparece (220 ms, +160). Expandir: 280 ms.
     Colapsar a mano: igual, sin espera (`toggleBlock`).
  5. Resumen de fin de sesión (solo al abrirse): el número héroe cuenta
     desde 0 en 700 ms con ease-out cúbico (kilos, o la duración); el
     círculo de hoy se llena con rebote 420 ms (+500); los récords suben 8
     px en 280 ms, escalonados 80 ms desde 700 ms.
  6. Menú flotante: entra 140 ms desde el botón, sale en 100 ms.
  7. Final del descanso: en los últimos 3 s el número late una vez por
     segundo (1 → 1,08 → 1 en 150 ms); al llegar a 0 la barra destella en
     azul 700 ms antes de ocultarse.
- Todas respetan `prefers-reduced-motion: reduce`: el estado final aparece
  sin movimiento (reglas en estilos.css y `reducedMotion()` en app.js).
- No se agregan animaciones a la carga de listas o pantallas, ni confeti,
  ni rebotes en otras partes. El rebote viejo del trofeo (`vt-pop-in`) se
  quitó.

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
