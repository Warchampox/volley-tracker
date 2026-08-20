# GOAT — bitácora de sesión

Entradas nuevas al final. No reescribir lo anterior.

## 2026-07-28
- Se agregó CLAUDE.md (arquitectura y diseño cerrados) y este STATUS.md,
  más la regla de mantenerlo al final de cada sesión.
- Pendiente de probar: nada de código en esta sesión, fue solo
  configuración de archivos de proyecto.
- Sin decisiones nuevas de arquitectura/diseño (ya están en CLAUDE.md).

## 2026-07-28 (cont.)
- Se implementó: arrastre de ejercicios ahora se mueve solo en vertical
  (se bloquea el desplazamiento horizontal del "fantasma" de SortableJS);
  se eliminó el botón "×" de borrar serie (el swipe queda como único
  método); se quitó el resaltado azul de selección táctil en botones/
  íconos (tap-highlight, touch-callout, user-select) y se afinó
  touch-action en la manija de arrastre y en la fila con swipe.
- Pendiente de probar: todo se verificó en el navegador de escritorio
  (incluido el arrastre, simulado con eventos sintéticos); falta probar
  el gesto táctil real en el teléfono de Martín.
- Sin decisiones nuevas de arquitectura/diseño (cambios dentro de lo ya
  cerrado en CLAUDE.md).

## 2026-07-28 (cont. 2)
- Se corrigió: en pantallas angostas (~360px, teléfono real) la fila de
  serie se desbordaba y el trofeo de PR / ícono de nota quedaban
  recortados por el overflow:hidden del swipe — pasaba en todas las
  filas, no solo en las de tipo "tiempo". Se achicó el gap/padding de
  la fila y el ancho de los inputs de forma general, y además los
  inputs y el botón de cronómetro en las filas de tipo "tiempo" (que
  tienen un control más).
- Pendiente de probar: verificado por medición de overflow y captura
  en un viewport de 360px de ancho; falta confirmar en el teléfono
  real de Martín.
- Sin decisiones nuevas de arquitectura/diseño.

## 2026-07-29
- Se renombró la app de "Pesitas" a "GOAT": manifest.json (name/
  short_name), <title> y meta apple-mobile-web-app-title en
  index.html, el pie de página de Ajustes, y los encabezados de
  CLAUDE.md/STATUS.md. Se quitó el placeholder del logo del club
  (la función logoHTML, el <img> en tabHeaderHTML, la clase CSS
  .vt-club-logo y la entrada en el app shell del service worker) —
  ya no aplica con la nueva marca. sw.js pasa a versionar como
  "goat-vN" (reinicia en v1) y la limpieza de cachés viejas en
  `activate` ahora borra cualquier caché que no sea la actual (ya
  no filtra por prefijo "pesitas-"), para que también limpie los
  dispositivos que traían cachés "pesitas-*" de antes del rebrand.
- Los 5 íconos (icon-192, icon-512, icon-512-maskable,
  apple-touch-icon, favicon-32) se reemplazaron con el diseño del
  plato azul "GOAT" que Martín subió en icons/goat-icon-final.zip
  (Descargas). Tamaños y nombres verificados 1:1 contra lo esperado
  por manifest.json/index.html; no hizo falta tocar esos archivos.
- Pendiente de probar: verificado que el archivo en disco y el
  servidor Python del preview sirven los bytes nuevos (comprobado
  con curl directo); el pane de este entorno mostró una versión
  cacheada y no se pudo forzar la purga desde ahí, pero es una
  caché propia de la herramienta, no del sitio real. Falta
  confirmar visualmente en GitHub Pages / el teléfono tras el push.
- Decisión: icons/club-logo.png se dejó en el repo sin borrar (solo
  se quitaron las referencias en código) por si se quiere reusar o
  confirmar su borrado explícitamente más adelante.

## 2026-07-29 (cont.)
- Se implementó: pantalla de resumen al finalizar sesión (overlay de
  pantalla completa, distinto del bottom-sheet chico de picker/
  exerciseModal) con duración/volumen/series y la lista de PRs
  logrados. Si un PR de peso×reps (reps entre 1 y 12) supera el 1RM
  actual del catálogo, se sugiere el nuevo 1RM (fórmula de Epley) con
  un botón para aplicarlo directo desde el resumen.
- Bug encontrado y corregido de paso: el rebrand a GOAT de ayer quitó
  la función logoHTML() pero dejó un segundo llamado suelto en
  trainActiveHTML() (el header de la sesión activa tiene su propio
  markup, no pasa por tabHeaderHTML) — esto rompía CUALQUIER inicio
  de sesión de entrenamiento con un error silencioso. Ya está
  arreglado y verificado.
- Pendiente de probar: verificado el flujo completo en el navegador
  (sesión sin PR, con PR y sugerencia de 1RM aplicada, y PR con
  reps>12 sin sugerencia) y las 5 pestañas sin errores de consola;
  falta probar en el teléfono real.

## 2026-07-29 (cont. 2)
- Se implementó: botón para quitar un ejercicio entero de la sesión
  activa (data-a="session-ex-remove", pide confirmación solo si ya
  tiene alguna serie marcada como hecha). Y sincronización de la
  rutina guardada desde el resumen de fin de sesión: si la sesión
  vino de una rutina, se detectan ejercicios agregados/quitados
  respecto a la rutina original y se ofrece un botón para aplicar
  esos cambios a la rutina guardada (routines), nunca a sesiones ya
  guardadas. Sesión libre (routineId null) nunca muestra esta sección.
- El panel "Tus máximos" (Feature C del pedido) ya estaba
  implementado de una sesión anterior — se verificó que cumple todo
  lo pedido (tope de 5, tipo "tiempo" excluido del picker, desmarcar
  no borra el ejercicio, edición inline sin perder foco) sin tocar
  código.
- Pendiente de probar: verificado en el navegador — agregar/quitar
  ejercicio de sesión y sincronizar rutina (con confirmación
  reabriendo el editor), tope de 5 destacados, export conserva
  featuredExercises y oneRM, 5 pestañas sin errores de consola.
  Falta probar en el teléfono real.
- Pendiente: el ícono icon-512-maskable.png corregido que pidió
  Martín NO se reemplazó — en Descargas solo apareció una imagen de
  comparación lado a lado (maskable_fixed_check.png, 1044×512, no es
  el ícono en sí), no el archivo cuadrado 512×512 real.

## 2026-07-29 (cont. 3)
- Se reemplazó icons/icon-512-maskable.png con la versión corregida
  (margen de seguridad más chico) que Martín dejó en
  ~/Downloads/icons/icon-512-maskable.png. Confirmado por MD5 que es
  distinta a la anterior y por tamaño (512×512) que corresponde.
  sw.js sube a goat-v4 (el ícono es parte del app shell cacheado).
- Sin decisiones nuevas de arquitectura/diseño.

## 2026-07-29 (cont. 4)
- Se implementó: modal de confirmación propio (askConfirm/
  confirmDialogHTML/ui.confirmDialog) que reemplaza TODOS los
  confirm() nativos del código (10 sitios: routine-del, ex-del,
  hist-del, session-discard, session-ex-remove, routine-start/
  train-start, train-free, los dos de finishSession, y el de
  importJSON). Mismo lenguaje visual que los modales existentes
  (bottom sheet), con variante "danger" (fondo rojo) para las
  acciones destructivas. finishSession quedó reestructurado con la
  lógica de guardado dentro de un closure `save` para poder colgarla
  del callback del modal sin romper el flujo anidado que ya tenía
  (PRs, diff de rutina, sessionSummary).
- Se agregó autocomplete="off" a todos los <input> de la app; a los
  numéricos (kg/reps/seg/RPE/descanso/targets/1RM) además
  autocorrect="off" spellcheck="false" y un name único no
  descriptivo (ej. f_weight_0_1), que es lo que Chrome a veces
  necesita para dejar de mostrar la barra de autocompletar sobre el
  teclado en campos numéricos aunque autocomplete ya esté en off.
- Pendiente de probar: verificado en el navegador — los 10 flujos de
  confirmación (cancelar y confirmar, incluida la variante danger),
  incluido un caso con confirm() "trampa" (lanza error si algo lo
  llama) que nunca se disparó. Atributos de autocomplete confirmados
  en el DOM para inputs de texto y numéricos. 5 pestañas sin errores
  de consola. Falta confirmar en el teléfono real que ya no aparece
  la barra de autocompletar de Chrome sobre el teclado.

## 2026-07-29 (cont. 5)
- Se implementó: sesión libre con nombre automático por fecha
  (`Sesión libre {fecha}`) editable en caliente durante el
  entrenamiento (input integrado al header, solo si routineId es
  null); "Guardar como rutina" en el resumen de fin de sesión, que
  arma una plantilla de rutina a partir de los ejercicios/sets que
  quedaron marcados (targetSets = cantidad de sets, targetReps/
  targetWeight/targetSeconds = los del último set).
- Se implementó: botón "Repetir" en cada card de Historial —
  arranca una sesión libre nueva (buildSessionFromPastSession) con
  los mismos ejercicios y los pesos/reps/segundos de esa vez, pero
  sin marcar, sin RPE y sin nota; pide confirmación (modal propio)
  si ya hay una sesión en curso.
- Se implementó: carpetas de rutinas (routineFolders en localStorage,
  cada rutina con folderId opcional). Crear/renombrar/eliminar
  carpeta (eliminar no borra las rutinas, quedan sueltas), colapsar/
  expandir (solo de la sesión de uso, no persiste), mover una rutina
  a una carpeta desde un bottom-sheet que también permite crear la
  carpeta ahí mismo y asigna automático. Export/import incluyen
  routineFolders y el folderId de cada rutina.
- Bug encontrado y corregido de paso: al guardar una rutina editada
  (editor-save), el objeto "stamped" no copiaba folderId — cada vez
  que se editaba y guardaba una rutina que estaba dentro de una
  carpeta, salía silenciosamente de la carpeta. Ya está arreglado y
  verificado (edité y guardé una rutina en carpeta, folderId se
  mantuvo).
- Pendiente de probar: verificado a fondo en el navegador — carpetas
  (crear, mover 2 rutinas, colapsar/expandir, eliminar carpeta con
  rutinas adentro, mover con "+ nueva carpeta" y auto-asignación),
  sesión libre nombrable + guardar como rutina + verificado que NO
  aparece en sesiones desde rutina guardada, repetir sesión pasada
  (valores precargados sin marcar, sin RPE/nota, con confirmación si
  hay sesión en curso), export/import de routineFolders (incluido
  round-trip completo). 5 pestañas sin errores de consola. Falta
  probar todo esto en el teléfono real.

## 2026-07-29 (cont. 6)
- Se implementó: formato mm:ss (h:mm:ss si pasa de una hora) para
  todo lo que es tiempo — fila de serie tipo "tiempo", objetivo de
  segundos en el editor de rutina, "Última vez", detalle de
  historial y la barra de descanso. Nuevo helper parseClock(str)
  (junto a fmtClock) que acepta "1:30" o "90" (sin ":", por
  compatibilidad) y siempre devuelve segundos — el almacenamiento en
  localStorage sigue siendo el número de segundos, solo cambió cómo
  se muestra/tipea.
- Al mostrar "01:00" en vez de "60" el input de segundos de la fila
  necesitaba más ancho del que tenía (se cortaba a "01:0"); se le dio
  su propio ancho (60px, clase vt-set-input-clock) y se compensó
  achicando un poco más el input de peso y los márgenes de esa fila
  específica para que siguiera cabiendo en pantallas angostas
  (verificado sin desborde a 360px).
- Pendiente de probar: verificado en el navegador — reloj en fila de
  serie/editor/última vez/historial/descanso, cronómetro inline
  sigue contando en vivo en mm:ss, "1:30" y "90" ambos guardan 90
  segundos, PR sobre el valor numérico sigue funcionando. 5 pestañas
  sin errores de consola. Falta probar en el teléfono real.

## 2026-07-29 (cont. 7)
- Rediseño visual (estilo tabla, sin cajas donde ya no correspondía):
  catálogo de ejercicios ahora agrupa por bloque con acento vertical
  de color por grupo (no por fila) y encabezado en mayúscula con
  tracking, igual lenguaje que el resto de la app; el header de sesión
  (tiempo/volumen) perdió su caja y quedó flotando; la barra de
  descanso pasó de tarjeta flotante con track+fill grueso a una barra
  delgada de ancho completo pegada arriba de la nav, con una línea de
  progreso fina en el borde superior (CSS var --rest-pct escrita desde
  updateRestBar) en vez del track+fill.
- Se auditó y corrigió la alineación de columnas (setCapsHTML vs
  setRowHTML) para los tres tipos de ejercicio: el header de columnas
  ahora usa el ancho EXACTO de cada input real (antes eran genéricos
  y no calzaban, sobre todo en tipo "tiempo" donde faltaba reservar
  espacio para el botón de cronómetro). También se encontró y corrigió
  un desfase de 2px en TODOS los tipos: la fila real tiene un
  border-left transparente de 2px (para el acento de estado) que el
  header no replicaba.
- Se agregó selección automática del contenido al enfocar inputs de
  VALOR (peso/reps/seg/RPE/descanso/1RM/targets), vía un listener
  global de "focusin" — nunca en campos de texto libre (nombres,
  notas).
- El botón de cronómetro de serie (play/pausa) creció a 36px de tap
  target (antes 26-30px) y ahora pulsa/brilla mientras corre; el input
  de segundos se pinta azul mientras esa serie se cronometra. Para que
  la fila de tipo "tiempo" siguiera sin desbordar a 360px se achicó el
  input de peso de esa fila (36px → 30px) y el gap entre controles
  (3px → 2px).
- Fix de lógica: "removed" en el diff de sincronización de rutina
  (resumen de fin de sesión) ya NO se calcula comparando la rutina
  original contra los ejercicios con series marcadas — eso hacía que
  simplemente no completar un ejercicio se ofreciera como "quitarlo de
  la rutina". Ahora la sesión activa trackea explicitlyRemoved (solo
  se llena al usar el botón de basura de "quitar ejercicio de la
  sesión") y el diff usa eso. "added" no cambió.
- Grupos musculares dejaron de ser una constante fija: ahora viven en
  localStorage ("exercise-groups", sembrado la primera vez con los
  mismos 7 grupos/colores de antes para no romper nada). Nueva
  pantalla "Grupos" (ícono de tag en Ajustes → Ejercicios): crear
  grupo (nombre + color de una paleta de 7 que excluye ámbar/verde,
  reservados para PR/serie completada), renombrar (cascada: actualiza
  el campo group de todos los ejercicios que lo usaban), recolorear,
  eliminar (Custom no se puede eliminar; al borrar un grupo sus
  ejercicios pasan a Custom).
- Notas por ejercicio en la sesión: nuevo campo sessionNote (distinto
  de note, que es la nota del entrenador/rutina, de solo lectura) con
  su propio ícono en la cabecera de cada bloque de ejercicio durante
  el entrenamiento. El desplegable por serie (RPE/nota) quedó SOLO con
  RPE — ya no se crean notas nuevas a nivel de serie. Datos viejos con
  nota por serie se siguen mostrando igual en el historial, sin migrar
  ni borrar nada.
- Bug encontrado y corregido durante la verificación (no llegó a
  pushearse roto): el input de nombre del modal "Nuevo/editar grupo"
  no estaba sincronizado con el estado — al elegir un color se
  disparaba un render() completo que reconstruía el modal desde
  ui.groupModal.name (todavía vacío) y el nombre recién tipeado se
  perdía. Se agregó tracking data-i="group-name" como en los demás
  campos de texto de la app.
- sw.js sube a goat-v8 (cambios grandes en app.js/estilos.css).
- Pendiente de probar: verificado a fondo en el navegador — las 3
  correcciones/features de lógica (removed explícito con caso positivo
  y negativo, grupos crear/renombrar-con-cascada/eliminar-con-
  reasignación, nota de ejercicio guardada y visible en historial),
  alineación de columnas medida por JS (0px de diferencia en los 3
  tipos, sin overflow horizontal a 360px), timer con clase is-running
  y animación confirmadas por CSS computado, select-on-focus
  confirmado en input de valor y descartado en campo de texto libre.
  5 pestañas sin errores de consola. Falta probar en el teléfono real
  (especialmente el tap target más grande del botón de cronómetro y
  el nuevo restbar de ancho completo).

## 2026-07-30
- Se implementó: ejercicios unilaterales. Nuevo campo `unilateral` en el
  catálogo (toggle en el modal de ejercicio, oculto en tipo "tiempo").
  Cuando está activo, la fila de serie muestra un peso compartido +
  reps por lado (IZQ/DER, columnas propias en el encabezado) en vez de
  un solo input de reps. El volumen suma ambos lados; el PR por reps
  (bodyweight sin lastre) usa el lado MÁS DÉBIL, no el más fuerte — el
  PR por peso no cambió, sigue igual que antes. "Última vez" e
  historial muestran el formato compacto "10kg · I8 D10".
- Se agregaron helpers repsL(st)/repsR(st) con fallback a `reps` para
  sets viejos (de antes de marcar el ejercicio como unilateral) — no
  se migra ni se borra el dato original, solo se lee con ese fallback.
  Se propagó por todos los puntos que leían `.reps`: setVol,
  priorStats, isPR, fmtSet, progressData (gráfico de Progreso),
  defaultSet, buildSessionFromPastSession (repetir sesión) y "Guardar
  como rutina" (targetReps ahora es el promedio de ambos lados, que
  coincide con el valor viejo cuando el set no es unilateral).
- Fila unilateral: mismo achique de gap/padding que la fila de tipo
  "tiempo" (2px/7px 2px) para caber a 360px con el control extra;
  verificado sin overflow y con columnas del encabezado alineadas
  exacto (0px de diferencia) contra los inputs reales.
- sw.js sube a goat-v9.
- Pendiente de probar: verificado a fondo en el navegador — toggle
  unilateral se guarda y se oculta/muestra según el tipo, fila de
  serie con IZQ/DER sin desborde a 360px, volumen sumando ambos lados,
  PR por reps usando el lado débil (probado caso que NO debía dar PR
  y caso que sí), formato compacto en "Última vez"/historial/PR del
  resumen, gráfico de "Reps máx." en Progreso usando el lado débil por
  serie. Un ejercicio no unilateral (Sentadilla trasera) verificado
  sin cambios de comportamiento. 5 pestañas sin errores de consola.
  Falta probar en el teléfono real.

## 2026-07-30 (cont.)
- Se implementó: aviso de actualización disponible. sw.js ya no llama
  self.skipWaiting() en "install" — el worker nuevo queda en "waiting"
  hasta que app.js le manda el mensaje SKIP_WAITING (nuevo listener de
  "message" en sw.js). "activate" (clients.claim + limpieza de cachés
  viejas) no cambió.
- app.js detecta la actualización de dos formas: si al registrar el SW
  ya hay uno en "waiting" (se cerró la app antes de aplicar una
  actualización previa), o vía "updatefound" + "statechange" del
  worker instalándose a "installed" cuando YA existe
  navigator.serviceWorker.controller (así no dispara en la primera
  instalación, donde todavía no hay controller). En ambos casos llama
  showUpdateToast(), que agrega un banner (#update-toast) directo al
  body — a propósito fuera de render()/`ui`, para no interferir con el
  resto del estado. Botón "Recargar": si hay sesión activa con series
  marcadas sin guardar, pide confirmación (askConfirm, no confirm
  nativo) antes de perder ese progreso; si confirma o no hay nada que
  perder, manda SKIP_WAITING al worker en espera y escucha
  "controllerchange" una sola vez para recargar sola.
- sw.js sube a goat-v10.
- Pendiente de probar: verificado a fondo en el navegador simulando
  una actualización real (bump de CACHE_NAME + registration.update()
  sin cerrar la app) — el banner aparece solo en la actualización real
  (la primera instalación NO lo muestra), "Recargar" con sesión activa
  pide confirmación y cancelar no recarga nada, sin sesión activa
  aplica la actualización y recarga sola mostrando la caché nueva
  (confirmado que la vieja se limpia). 5 pestañas sin errores de
  consola. Falta probar en el teléfono real (especialmente qué tan
  rápido el navegador detecta la actualización estando la PWA
  instalada y en background, ya que el chequeo automático del SW no es
  instantáneo).

## 2026-08-04
- Reestructuración grande, de un solo pedido con 9 puntos:
  1. Modelo: `setType` (null/"warmup"/"dropset"/"failed") reemplaza el
     booleano `warmup` — un set viejo con warmup=true y sin setType se
     lee como "warmup" en runtime (getSetType), nunca se migra el dato
     guardado. Se eliminó por completo el campo `note` a nivel de
     serie (sesiones viejas con st.note lo siguen mostrando en el
     historial, tal cual). Variables CSS nuevas --superset (morado,
     acento de superserie) y --dropset (naranja), reservadas como
     ámbar/verde. settings.openFolders nuevo.
  2. "Pegar JSON": importJSON(file) se separó en
     processImportedData(data) reutilizable; nuevo modal con textarea
     en Ajustes junto al botón de archivo.
  3. Crear ejercicio desde cualquier picker (incluido "reemplazar" y
     "destacados") abre el modal completo en vez de crear con
     defaults, y al guardar se agrega solo a la rutina/sesión de
     origen.
  4. Se fusionaron las pestañas Rutinas y Entrenar en una sola
     ("Entrenar" en el nav, contenido interno sigue diciendo
     "Rutinas"): con sesión activa no minimizada muestra
     trainActiveHTML, si no la lista de rutinas (que ahora incluye
     "+ Sesión libre"). Nuevo botón minimizar en el header sticky de
     la sesión → barra flotante propia (#minimized-bar) con nombre/
     reloj/volumen en vivo, en el mismo wrapper fijo que el restbar
     (#floating-stack, se apilan solas sin pisarse).
  5. El ícono de la fila de serie que abre RPE pasó de una nota a un
     gauge/velocímetro; el resaltado ámbar depende solo de st.rpe.
  6. La fila de serie cambió de orden: botón único de tipo/número
     (Normal/C/D/F, con selector chico de 4 opciones) → check →
     valores → RPE. Se quitó el botón de calentamiento aparte.
  7. Nuevo modo "Organizar ejercicios" (editor de rutina y sesión
     activa): filas compactas con círculo de selección, barra de
     acciones (eliminar/agrupar en superserie/reemplazar). Reemplaza
     por completo los íconos sueltos de eliminar ejercicio y el toggle
     "🔗 vincular con anterior". El acento morado de superserie ahora
     envuelve todo el bloque del grupo, no solo la etiqueta A1/A2.
  8. Ejercicios completos (todas las series no-calentamiento done) se
     colapsan solos al marcarlos; hay un chevron manual además para
     colapsar/expandir a mano; el modo Organizar ignora el colapso
     mientras está activo.
  9. Carpetas de rutinas: el colapso/expansión pasa de un Set en
     memoria a settings.openFolders (persistido) — por defecto todas
     colapsadas.
- sw.js sube a goat-v11.
- Pendiente de probar: verificado a fondo en el navegador (viewport
  360px) — importar por texto pegado, crear ejercicio desde picker se
  agrega automático, agrupar 3 ejercicios no consecutivos en
  superserie con reajuste correcto de linkPrev, reemplazar con cambio
  de tipo sin campos rotos, eliminar en Organizar pide confirmación
  solo si hay series hechas y llena explicitlyRemoved, drop set cuenta
  para volumen pero no para PR, colapso automático + chevron manual,
  minimizar/restaurar sesión sin perder cronómetros ni series, carpeta
  abierta persiste tras recargar la página de verdad. Sin errores de
  consola en las 4 pestañas resultantes. Falta probar en el teléfono
  real.

## 2026-08-04 cont.
- Bloque 1: Ajustes sin cajas (.vt-card fuera, secciones General/Datos
  con eyebrow + .vt-settings-row con su propio padding lateral). El
  catálogo de ejercicios se sacó de Ajustes.
- A pedido de Martín (antes del push): se eliminó por completo el
  ajuste general "Descanso entre series" (no solo se bajó su default a
  0 como se había hecho primero) — settings.restSeconds ya no existe
  en el modelo. startRest() ya no tiene fallback a un valor global: si
  el ejercicio/rutina/sesión no define su propio descanso (>0), no
  arranca descanso automático. El placeholder del campo de descanso
  por ejercicio en sesión activa pasa de mostrar el default global a
  "0". El descanso por ejercicio/rutina (editor, sesión) sigue igual
  que antes, sin cambios.
- Bloque 2: nueva pestaña "Ejercicios" (5 pestañas en el nav, ícono
  barbell). exercisesManagerHTML dejó de depender de
  ui.manageExercises (eliminado junto con manage-open/manage-close).
  Buscador (.vt-search, mismo componente que el picker) con
  ui.exercisesQuery: mientras hay texto los grupos sin match se
  ocultan y los que matchean se auto-expanden ignorando el estado
  guardado; al vaciar vuelve a regir settings.openExerciseGroups
  (nuevo, persistido, default [] = todo colapsado). "+" y "Gestionar
  grupos" viven en el header de la pestaña.
- Bloque 3+4: rediseño completo de Progreso. Resumen (sesiones/
  volumen/racha de la semana en curso, sin caja — .vt-stat-row-flat),
  racha cuenta semanas consecutivas hacia atrás sin romperse si la
  semana en curso todavía no tiene sesión. "PRs recientes"
  (computeAllPRs: recorre sesiones cronológicamente con un tracker
  incremental por ejercicio, devuelve más reciente primero, se
  muestran los primeros 5). Selector Total/Grupo muscular/Ejercicio
  (ui.progressView) + chips de rango 1SEM..1A (ui.progressRange,
  default 2m, rangeToDays) con scroll horizontal
  (.vt-metric-toggle-scroll) arriba de las 3 vistas. Granularidad
  adaptativa: buckets semanales con rango ≤2m, mensuales con ≥4m
  (bucketGranularity). Total = barra con volumen por bucket; Grupo
  muscular = barra apilada (stacked:true) por grupo muscular con
  leyenda; Ejercicio = el comportamiento previo, con soporte
  unilateral (dos datasets Izquierda/Derecha en la métrica reps,
  stats por lado) — se amplió metricOptions para ofrecer "reps" en
  ejercicios de peso unilaterales (antes solo existía para bodyweight
  sin lastre, con lo que la vista de dos lados era inalcanzable para
  la mayoría de los ejercicios unilaterales reales, ej. zancada
  búlgara). "Tus máximos" se mantuvo igual, reubicado bajo el gráfico.
- Fix encontrado en verificación: los colores de grupo semilla usan
  var(--amber) etc., que un <canvas> de Chart.js NO resuelve (a
  diferencia del DOM normal) — un fillStyle inválido se ignora en
  silencio y queda negro. Se agregó resolveCssColor() para resolver
  la variable a su valor real antes de pasarla a un dataset (afecta
  la vista Grupo muscular).
- Verificado en el navegador (viewport 360px, con datos de sesiones
  inyectados para probar resumen/racha/PRs/buckets/vista unilateral):
  las 5 pestañas, buscador con auto-expand, grupos persistiendo across
  reload, descanso default 0 en instalación limpia, resumen semanal y
  racha correctos con hueco de semana intermedio, PRs recientes en
  orden y recortados a 5, cambio de bucket semanal→mensual al pasar de
  2m a 4m, vista Grupo muscular apilada con color correcto tras el
  fix, vista Ejercicio con dos datasets Izq/Der para unilateral. Sin
  errores de consola en las 5 pestañas. Además, tras quitar el ajuste
  global de descanso: verificado que marcar una serie sin descanso
  propio en el ejercicio NO arranca descanso automático, y que
  definiéndole 20s a un ejercicio sí lo arranca con ese valor. Falta
  probar en el teléfono real.

## 2026-08-05
- Fix de ícono/splash: se reemplazaron icons/icon-192.png,
  icon-512.png, apple-touch-icon.png y favicon-32.png (mismo disco
  azul "GOAT", archivos entregados por Martín) — icon-512-maskable.png
  no se tocó. manifest.json tenía background_color/theme_color en
  #0B1220, que NO coincidía con --bg (#0A0A0C en estilos.css): eso
  causaba el borde/rectángulo visible alrededor del ícono en la
  pantalla de carga. Se corrigió a #0A0A0C en ambos campos, y también
  en el <meta name="theme-color"> de index.html (mismo rol, tenía el
  mismo valor viejo — no estaba pedido explícitamente pero quedaba
  inconsistente si no se igualaba). sw.js goat-v12 → v13 (los íconos
  van en APP_SHELL, cache-first).
- Verificado: hash de cada ícono en disco = hash servido por el
  servidor local = hash del zip original (los 4 archivos llegaron
  intactos); manifest.json e index.html sirven #0A0A0C. El panel de
  navegador usado para verificar tiene un caché propio por URL que no
  se pudo invalidar (ni con unregister de SW + clear caches + tab
  nueva) — se confirmó por curl directo al servidor en vez de pelear
  con ese caché, así que no afecta lo que se sube. Pendiente: Martín
  tiene que borrar el acceso directo instalado y agregarlo de nuevo en
  su teléfono para confirmar visualmente que la pantalla de carga
  queda sin el rectángulo — eso no se puede probar desde acá.

## 2026-08-06
- Autoguardado de la sesión en curso (sobrevive a cerrar la pestaña sin
  terminar/descartar): nueva `persistActiveSession()` — guarda
  ui.activeSession completo en localStorage bajo "active-session", o
  borra la llave si es null. Se llama al final de render() (si hay
  sesión activa) y explícitamente en los 3 caminos que escriben directo
  al DOM sin pasar por render() (para no perder foco): input "set"
  (valores de serie), "ex-rest" (descanso por ejercicio en caliente) y
  "session-note" (nota de ejercicio) — este último no estaba en la
  lista explícita del pedido pero es exactamente el mismo patrón de
  bypass de render(), y "notas de ejercicio" sí estaba en el alcance
  pedido, así que se cubrió igual.
- Cronómetro inline (runningTimer, variable de módulo) ahora se
  refleja en ui.activeSession.runningTimerInfo ({exIdx, setIdx,
  startedAt} o null) — se sincroniza solo dentro de
  persistActiveSession() a partir del runningTimer vivo en ese
  momento, así que cualquier lugar que ya llamaba render() después de
  tocar runningTimer quedó cubierto sin tocarlo aparte. stopSetTimer()
  y el tick de 1s (cada 5 ticks, no con lujo de detalle) llaman
  persistActiveSession() explícito porque no pasan por render().
- Restauración al abrir la app: antes del primer render(), si hay
  "active-session" guardado con id+exercises válidos, se restaura tal
  cual (incluye reconstruir runningTimer si había uno corriendo,
  baseValue = el `seconds` que ese set ya tenía guardado y startedAt =
  ahora — sigue contando desde el último valor conocido, no desde
  cero, pero tampoco cuenta como tiempo activo el rato que la pestaña
  estuvo cerrada). Deja ui.tab="rutinas" y sessionMinimized=false para
  caer directo en la sesión, y muestra un toast chico que se
  autodestruye solo ("Recuperamos tu sesión en curso",
  #recovered-toast, mismo patrón de DOM aparte que el aviso de
  actualización).
- Fix encontrado en el camino (no pedido explícito, pero necesario
  para que esto funcione bien): routine-start/train-free/
  session-repeat reemplazan ui.activeSession por una sesión nueva sin
  limpiar el runningTimer de la sesión vieja que se descarta — eso
  dejaba un cronómetro colgado apuntando a índices de la sesión nueva
  (y se autoguardaría mal). Se agregó `runningTimer = null` en los 3
  puntos de arranque.
- finishSession() y session-discard limpian "active-session" al
  terminar (vía persistActiveSession() con ui.activeSession ya null).
- Verificado en el navegador: autoguardado con valores editados a mano
  y set marcado, cronómetro inline arrancado y confirmado en
  localStorage; recarga completa de la página (simula cerrar/reabrir
  pestaña) restaura series/valores/ejercicios exactos, el cronómetro
  sigue corriendo desde el tiempo acumulado (no en 0) y aparece el
  toast; descartar y finalizar sesión dejan "active-session" en null,
  y abrir la app después arranca normal sin nada que restaurar. Sin
  errores de consola en las 5 pestañas. sw.js goat-v13 → v14. Falta
  probar en el teléfono real (cerrar la app de verdad, no solo
  recargar).

## 2026-08-06 cont.
- Fix: la manija de arrastre (⋮⋮) ya NO existe en el DOM fuera del modo
  Organizar (antes se renderizaba igual, solo visualmente redundante) —
  se sacó del bloque normal en editorHTML y trainActiveHTML, el bloque
  recupera el ancho completo (ya no queda el wrapper .vt-block-row con
  el hueco de la manija).
- Modo Organizar reescrito sobre un BORRADOR: nuevo ui.exerciseEditDraft
  (copia profunda de los ejercicios, cada item marcado con su índice
  ORIGINAL en __ord). Mientras dura el modo, editorHTML/trainActiveHTML,
  el drag de Sortable y las acciones (Eliminar/Agrupar/Reemplazar) leen
  y escriben sobre el borrador — el array real no se toca. Nueva barra
  inferior fija (Cancelar / Guardar cambios, mismo look que el footer
  de "Finalizar sesión") reemplaza el botón suelto "Listo" de arriba;
  es la ÚNICA forma de salir del modo. "Cancelar" descarta el borrador
  sin tocar nada; "Guardar cambios" lo escribe de vuelta — en sesión
  activa, si algún ejercicio ELIMINADO en el borrador tenía series
  done=true, un solo askConfirm resume cuántas se perderían antes de
  aplicar (organize-delete en sí mismo ya no confirma nada, eso quedó
  diferido acá). __ord también se usa para recolocar (o detener, si ya
  no existe) el cronómetro corriendo, y para remapear
  ui.collapsedExercises/openNotes/openExNotes a sus nuevos índices —
  sin esto, tras eliminar/reordenar quedaban aplicados al ejercicio
  equivocado (bug real que apareció al probar: un ejercicio colapsado
  terminaba con el estado colapsado de OTRO tras guardar).
- Nuevo gesto: mantener presionado ~500ms el NOMBRE de un ejercicio
  (fuera del modo Organizar) entra al modo con ese ejercicio ya
  preseleccionado (Eliminar+Reemplazar de inmediato en la barra).
  Fuera del sistema de delegación de "click" — pointerdown/move/up con
  temporizador, se cancela con movimiento > 10px. Atado solo al <h3>
  del bloque (nunca a sus controles); la fila colapsada de sesión no
  tiene long-press (es enteramente un botón de toggle, se decidió no
  competir con eso — para organizarla hay que expandirla primero).
  suppressClickUntil evita que el tap que dispara el long-press
  también gatille un click normal.
- Reemplazar ahora SIEMPRE reconstruye desde el historial real del
  ejercicio NUEVO (lastSetsFor), nunca hereda valores del que se está
  sacando: en el editor, targetSets/Reps/Weight/Seconds del último set
  histórico (cantidad de series = cantidad de sets históricos, mismo
  patrón que "Guardar como rutina"); en sesión, un set nuevo por cada
  set histórico vía defaultSet(type, null, histSet, uni) (mismo patrón
  que agregar una serie basada en la anterior). Sin historial, cae a
  los defaults de siempre (3 series/8 reps/0kg o 30s). Ya no depende
  de si cambió el "shape" — siempre reconstruye con la forma del
  ejercicio nuevo.
- Verificado en el navegador: cero manijas en vista normal; organizar,
  reordenar y eliminar varios + Cancelar deja el array real intacto;
  lo mismo + Guardar cambios lo aplica; eliminar con series hechas no
  confirma hasta Guardar cambios, y ahí el mensaje resume la cantidad
  correcta; long-press preselecciona y muestra Eliminar+Reemplazar de
  inmediato; reemplazar con historial trae cantidad de series y
  valores reales (verificado con series de distinto peso/reps cada
  una, no solo repetido); reemplazar sin historial cae a los defaults;
  agrupar en superserie dentro del borrador aplica bien las etiquetas
  A1/A2 al guardar; colapsados/notas abiertas sobreviven correctamente
  reindexados tras eliminar. Sin errores de consola en las 5 pestañas.
  sw.js goat-v14 → v15.

## 2026-08-06 cont.2
- Bug reportado por Martín probando en vivo: "Agregar ejercicio" sigue
  visible/funcional durante el modo Organizar, pero pickExercise()
  empujaba directo al array REAL (ui.editingRoutine.exercises /
  ui.activeSession.exercises), no al borrador — el ejercicio agregado
  no se veía en la lista de Organizar, y encima quedaba con el
  comportamiento invertido: "Guardar cambios" lo perdía (pisaba el
  array real, que ya lo tenía, con el borrador viejo que no), mientras
  que "Cancelar" lo dejaba puesto (nunca tocó ese array real). Fix:
  pickExercise() ahora empuja al borrador (ui.exerciseEditDraft) si
  ui.exerciseEditMode está activo, marcado con un __ord negativo
  decreciente (nextDraftOrd) para que nunca colisione con los índices
  reales que usa el remapeo de colapsados/notas/cronómetro al guardar.
  Verificado en editor y sesión: agregar durante Organizar se ve al
  toque en el borrador, Guardar cambios lo conserva, Cancelar lo
  descarta — en ambos sentidos, ya no invertido. Sin errores de
  consola. sw.js goat-v15 → v16.

## 2026-08-07
- Martín reportó que el aviso de "hay una versión nueva" no le llegaba
  al celular. Investigando: GitHub Pages (el sistema viejo, "Deploy
  from a branch", basado en Jekyll) llevaba desde el 06-ago fallando/
  colgado — el sitio en vivo seguía sirviendo goat-v13 (de un commit
  de dos días antes) pese a 3 pushes posteriores. Se agregó
  .nojekyll (no alcanzó solo, el build de ese commit igual quedó
  colgado ~7.5 horas en "building" sin resolver). Se migró el deploy
  completo a GitHub Actions: nuevo
  .github/workflows/pages.yml (checkout + upload-pages-artifact +
  deploy-pages, publica el repo tal cual sin Jekyll de por medio) y
  se cambió el ajuste del repo (build_type: workflow, vía API). Deploy
  de prueba corrió y terminó en ~1 minuto — verificado que
  warchampox.github.io/volley-tracker ya sirve goat-v16 y el app.js
  con el modo Organizar. Sin errores de consola cargando la URL real.
  Documentado en CLAUDE.md (sección Arquitectura) porque es un cambio
  duradero de cómo se despliega, no solo de esta sesión.

## 2026-08-07 cont.
- Dos fixes al modo Organizar (long-press y barra de acciones):
  1. El <h3> del bloque (donde escucha el long-press) ganó
     user-select:none/-webkit-touch-callout:none/touch-action:
     manipulation, y el handler de pointerdown llama e.preventDefault()
     apenas confirma que el target es ese <h3> — antes el navegador
     ganaba la carrera con su propia selección de texto/menú
     contextual antes de que el temporizador de 500ms llegara a
     disparar. Los inputs de valor y el nombre editable de sesión
     libre quedan afuera (siguen con selección normal).
  2. Nueva updateOrganizePad(), llamada en cada render(): mide el alto
     real de .vt-organize-footer-wrap (varía según si hay 1 o 2 barras
     apiladas) y lo escribe en --organize-pad, que .vt-content usa
     como padding-bottom extra (encima de los 100px de siempre) — así
     el último ejercicio de la lista se puede subir por sobre la barra
     con scroll en vez de quedar tapado. Vuelve a 0px solo con que
     .vt-organize-footer-wrap ya no esté en el DOM (Cancelar/Guardar
     cambios), sin lógica aparte. z-index de la barra (45) ya estaba
     por sobre las tarjetas, confirmado sin cambios.
  3. Verificado con 15 ejercicios en sesión: long-press sigue
     preseleccionando bien, sin selección de texto de por medio;
     con 2 seleccionados (2 barras apiladas, ~142px medidos) el
     último ejercicio queda completamente visible al hacer scroll,
     sin superposición (confirmado con getBoundingClientRect, no solo
     a ojo). Sin errores de consola.
- sw.js goat-v16 → v17.

## 2026-08-07 cont.2
- Nueva pestaña "Partidos" (vóleibol), 6ta del nav — completamente
  independiente del resto (rutinas/sesiones/ejercicios/progreso no se
  tocaron). Implementados los Bloques 1-4 del spec: modelo de datos en
  localStorage (leagues-catalog, matches-cache, standings-cache,
  api-usage, settings.apiKeys/favoriteLeagues), `callVolleyballApi()`
  como única puerta de entrada a la Volleyball API de Highlightly
  (con manejo de headers de cuota y confirm de cuota baja ≤5), catálogo
  de ligas paginado + buscador local (cero llamadas al escribir) +
  favoritos, y calendario con toggle de ligas + auto-refresco al
  entrar (`shouldRefreshLeague`, TTL 24h + partido vencido sin
  terminar) + botón "Actualizar" manual por liga. También se agregó
  la sección "Partidos" en Ajustes (campo de API key) porque el estado
  vacío de la pestaña depende de ella — no estaba en los primeros 4
  bloques pero era necesaria para poder probar el resto.
- Pendiente (Bloques 5-8 del spec, no incluidos en esta pasada):
  detalle de partido (sets, forma reciente, head-to-head), tabla de
  posiciones por liga. La lógica de refresco de partidos (Bloque 8) sí
  se construyó completa porque el calendario (Bloque 4) depende de
  ella directamente.
- Verificado extensivamente en browser (mobile 375×812): los 3 estados
  de la pestaña (sin key / con key sin favoritas / con favoritas),
  búsqueda+favoritos sin generar llamadas de red (confirmado con
  read_network_requests), los 5 casos de `shouldRefreshLeague`,
  paginación de catálogo y de partidos (mockeando fetch), el toggle de
  ligas sin recargar datos, el botón "Actualizar" forzando el refresco
  aunque el caché esté fresco, el flujo de cuota baja con
  Cancelar/Continuar (nuevo parámetro `onNo` en `askConfirm`, retro-
  compatible), y una llamada real a la API con key inválida para
  confirmar manejo de error end-to-end. Ícono de la pestaña reutiliza
  el `calendar` ya existente en PATHS (no se creó uno nuevo). Sin
  errores de consola en las 6 pestañas. `.gitignore` de la tarea
  anterior (api-coverage-check.json) sigue pendiente de confirmar.
- sw.js goat-v17 → v18.

## 2026-08-07 cont.3
- Bloques 5 y 6 del spec de "Partidos": detalle de partido (fase/semana,
  equipos+logos, resultado y tabla de sets firstSet..fifthSet — los que
  existan, incluye partidos "en curso" además de terminados) y tabla de
  posiciones por liga (grupos, PJ/G/P/puntos/sets, mismo lenguaje visual
  de tabla del resto de la app). Forma reciente (`/last-five-games` x2)
  y head-to-head (`/head-2-head`) se cargan bajo demanda solo al entrar
  al detalle de ESE partido, nunca al cargar el calendario — nuevo caché
  `team-stats-cache` (TTL 24h, igual criterio que matches-cache).
  Standings usa `standings-cache` (ya existía en el modelo del Bloque 1,
  quedaba sin usar hasta ahora), llave `{leagueId}-{season}`.
- Las 3 llamadas bajo demanda del detalle (forma x2 + H2H) se hacen
  secuenciales, no con Promise.all — si dispararan el confirm de cuota
  baja en paralelo se pisarían entre sí (ui.confirmDialog es un solo
  diálogo global). Con eso alcanza para evitarlo sin lógica extra.
- Nombres de campo de /last-five-games, /head-2-head y /standings no se
  pudieron verificar en vivo con una key real esta sesión — se
  construyó con parsing defensivo (variantes de nombre para posición/
  PJ/G/P/puntos/sets, inferencia de ganado/perdido con fallback a
  comparar el marcador). Vale la pena una pasada de verificación con
  una key real antes de dar esto por 100% cerrado.
- Verificado en browser: sets table con datos reales de forma (mock),
  caché de forma/H2H confirmado sin llamadas nuevas al reabrir el mismo
  partido, tabla de posiciones con datos mock, y una llamada real con
  key inválida a /last-five-games y /head-2-head que confirmó manejo de
  error end-to-end (mismo patrón que /leagues antes). Sin errores de
  consola nuevos en las 6 pestañas (solo los 401 esperados de las
  pruebas con key falsa).
- Con esto quedan completos los 8 bloques del spec de "Partidos".
- sw.js goat-v18 → v19.

## 2026-08-07 cont.4
- Corregido el parsing defensivo de los Bloques 5-6 con la doc oficial
  (openapi.json de Highlightly, provista por Martín). Cambios reales:
  - `/last-five-games` y `/head-2-head` devuelven un array plano de
    VolleyballMatchResponseDto (sin envoltorio `{data:[...]}`, a
    diferencia de `/leagues` y `/matches`) — `apiListOf()` ya lo
    manejaba bien, sin cambios ahí.
  - No existe campo `winner` en ningún match — se saca del bloque
    muerto en `matchResultForTeam`, queda solo la inferencia por
    `state.score.current` (confirmado que es siempre string "N - M",
    formato de sets ganados, nunca objeto).
  - `/standings` (VolleyballStandingsDto) NO tiene sets a favor/en
    contra como pedía el spec original — tiene `scoredPoints`/
    `receivedPoints` (puntos de rally en la temporada). Se ajustó
    `standingRowFields`/`standingsGroupHTML` a los nombres reales
    (`gamesPlayed`, `wins`, `loses` -sic-, `points`, `scoredPoints`,
    `receivedPoints`) y la columna pasó de "Sets" a "Puntos +/-".
  - La respuesta de `/standings` es el objeto `{groups, league}`
    directo, sin envoltorio de paginación — se simplificó
    `standingsHTML()` en base a eso.
- **Hallazgo importante, no es un bug de código**: probado con una key
  real (que Martín va a regenerar después de esta sesión), confirmado
  que los headers `x-ratelimit-requests-limit/remaining` casi nunca
  llegan a JS al llamar directo a volleyball.highlightly.net desde el
  navegador — el servidor no los incluye en
  `Access-Control-Expose-Headers`, así que CORS los esconde de
  `fetch().headers` aunque sí viajen en la respuesta real (confirmado:
  solo `content-type` es legible). El indicador de cuota queda
  entonces casi siempre en "Sin datos de cuota todavía" — el fallback
  que ya pedía el spec para "headers ausentes" cubre este caso tal
  cual, pero en la práctica va a ser el estado permanente, no
  temporal. No hay arreglo posible sin backend propio.
- Verificado extensivamente con la key real contra el servidor en
  vivo: catálogo (`/leagues?leagueName=Nations League`), calendario
  completo de la liga (116 partidos reales, headers de fase/semana
  reales: "Final", "3rd Place", "Semi-finals"...), detalle de un
  partido real (sets, forma reciente con W/L reales, 10 enfrentamientos
  de head-to-head reales), y tabla de posiciones completa (15 equipos,
  datos reales). Todo renderizó correctamente, sin errores de consola.
  Key usada solo en este entorno de prueba local — nunca se commiteó
  ni se subió a ningún lado.
- sw.js goat-v19 → v20.

## 2026-08-07 cont.5
- Fusionado Historial dentro de Progreso: se quitó "historial" de
  NAV_ITEMS (la función pasó a llamarse `historyListHTML()`, sin su
  propio `<header>`) y Progreso ahora arranca con un segmentado
  "Resumen"/"Historial" (`ui.progressSection`, default "resumen") que
  decide qué cuerpo mostrar debajo del mismo header. `finishSession()`
  → "summary-close" ahora aterriza en `ui.tab="progreso"` +
  `ui.progressSection="historial"` en vez de la vieja pestaña.
- Nota para Martín: el spec asumía que esto dejaba la barra en 4
  pestañas y que Partidos se sumaría después a 5 — pero Partidos ya
  estaba implementado de la sesión anterior, así que quedó en 5 pestañas
  directo (Entrenar/Ejercicios/Progreso/Partidos/Ajustes), no en 4.
- Verificado en browser: sin sesiones ambos sub-estados muestran su
  empty state de siempre bajo el segmentado; con sesiones, Historial
  se ve y funciona igual que antes (expandir, repetir, eliminar);
  terminar una sesión de prueba aterriza en Progreso→Historial;
  recorrido de las 5 pestañas sin errores de consola.
- sw.js goat-v20 → v21.

## 2026-08-08
- Viewport bloqueado: `maximum-scale=1, user-scalable=no` en el meta
  viewport (index.html) + `touch-action: manipulation` en `html`
  (estilos.css) — sin zoom por pellizco ni doble-tap en iOS.
- Inputs de tiempo (serie tipo "time" y "Segundos" del editor de
  rutina) ahora reformatean en vivo tecla a tecla: nueva
  `digitsToClockDisplay()` reconstruye "M:SS"/"H:MM:SS" a partir de
  los dígitos tecleados (últimos 2 = segundos, resto = minutos, y si
  sobran más de 2 ahí, lo que sobra al inicio son horas), sin rellenar
  la primera unidad a 2 dígitos mientras se escribe (nueva
  `fmtClockInput()`, distinta de `fmtClock()` que sigue igual para
  displays de solo lectura). `reformatClockInputLive()` reescribe el
  input en el momento (cursor al final) y devuelve los segundos ya
  convertidos, que se guardan en el mismo evento `input` sin esperar
  blur — `parseClock()` no cambió, solo ahora se le pasa siempre un
  string ya bien formado.
- Verificado en browser simulando la secuencia exacta del spec
  ("1"→"3"→"0" da "0:01"→"0:13"→"1:30", 90s guardados en el estado en
  cada tecla) en ambos campos, cursor confirmado al final tras cada
  reformateo, sin errores de consola en las 5 pestañas.
- sw.js goat-v21 → v22.

## 2026-08-08 cont.
- Reescritura completa de la pestaña "Partidos" (reemplaza toda la
  implementación anterior, no la parchea):
  - **Bloque 1**: `callVolleyballApi()` con contador de cuota manual
    y preciso (`api-usage.volleyball = {date, count}`, +1 por llamada
    real que efectivamente volvió con respuesta — no por headers).
    Confirm si count>=95.
  - **Bloque 2**: equipos favoritos (`settings.favoriteTeams`, objeto
    completo {id,name,logo}) como fuente principal; ligas favoritas
    quedan solo como acceso rápido en Explorar/Tabla. Búsqueda de
    equipos explícita (botón/Enter, nunca al tipear), sin catálogo
    completo, cacheada 7 días por texto exacto.
  - **Bloque 3**: `NATIONAL_TEAM_FLAGS` + `teamFlagOrLogo()` — bandera
    real (flagcdn.com) para selecciones, logo de la API para clubes,
    nunca emojis. Centralizado en `teamLogoHTML()`, usado en todos
    lados (calendario, detalle, tabla, forma, H2H).
  - **Bloque 4**: `fetchTeamMatches()` (2 llamadas home+away, merge
    sin duplicados) + `matches-cache.byTeam`/`byLeague` separados.
  - **Bloque 5**: 3 sub-secciones con segmentado (Mis equipos/Explorar
    ligas/Tabla). "Mis equipos" tiene calendario mensual armado a mano
    (sin librería), navegable, con puntos por día y panel de partidos
    al tocar un día, más chips Hoy/Esta semana/Próximos 7 días que
    cambian a lista agrupada por fecha (nunca plana).
  - **Bloque 6**: forma reciente como píldoras de color (no números
    sueltos), head-to-head como filas con el estilo visual del resto
    de listas de partidos (acento azul + negrita al que ganó).
  - **Bloque 7**: indicador "{count}/100 solicitudes usadas hoy" en
    rojo si count>=90.
- **Bug real encontrado y corregido durante la verificación**: mostrar
  una fecha "YYYY-MM-DD" de la grilla/listas con
  `fmtDate(dateKey)`/`fmtDateShort(key)` directo hacía `new
  Date("YYYY-MM-DD")`, que el motor JS interpreta como medianoche UTC
  — en husos horarios negativos (Chile) mostraba el día ANTERIOR.
  Nuevo helper `localKeyToDate()` reconstruye el Date a mano en huso
  local antes de formatear. Se aplicó en el panel de día de la grilla
  y en las listas de accesos rápidos/agrupado por semana. El mismo
  patrón de bug existe en `bucketLabel()` de la pestaña Progreso
  (preexistente, no tocado esta sesión — quedó como tarea aparte).
- Nota para Martín: la regla de CLAUDE.md "no reproducir escudos/
  logos de clubes o marcas registradas" (sección Diseño visual) choca
  con lo que pediste explícitamente para Partidos (mostrar logos
  reales de equipos vía la API). La traté como no aplicable a esta
  pestaña — si quieres, ajusto la redacción de esa regla para que
  quede explícito que es solo para el resto de la app.
- Verificado extensivamente en browser con datos mock y con la key
  real: calendario mensual (navegación de mes, puntos, panel de día
  con fecha correcta), accesos rápidos agrupados, Explorar ligas
  (favoritos, buscador, header de fase real "SEMIFINALES"), Tabla
  (favoritas + buscador + posiciones con banderas), detalle de partido
  con píldoras de forma real (W/L correctos) y H2H con acento de color,
  búsqueda de equipos (cero llamadas al tipear, 1 al buscar, 0 en
  caché repetida, favorito guarda objeto completo), contador de cuota
  exacto (verificado llamada por llamada contra el contador), reseteo
  diario, y el diálogo de confirmación a partir de 95. Sin errores de
  consola reales en las 5 pestañas (un 403 de una imagen externa de
  flagcdn con fallback ya manejado, no es un error de la app).
- sw.js goat-v22 → v23.

## 2026-08-08 cont.2
- Se cerró la tarea pendiente anotada en la entrada anterior: el mismo
  bug de fecha UTC vs. local existía también en `bucketLabel()` de la
  pestaña Progreso (gráfico de vista semanal) — llamaba
  `fmtDateShort(key)` directo sobre el "YYYY-MM-DD" de `weekKey()`, que
  `new Date(iso)` interpreta como medianoche UTC y en Chile (UTC-4/-3)
  podía mostrar el domingo anterior en vez del lunes real en el eje X.
  Se reutilizó el helper `localKeyToDate()` (ya definido en la sección
  de Partidos, mismo scope de módulo): `bucketLabel()` ahora hace
  `fmtDateShort(localKeyToDate(key))` para la vista semanal (la vista
  mensual ya construía su propio Date local, sin cambios ahí).
- Verificado en el navegador (huso America/Santiago, UTC-4, mismo huso
  del entorno de prueba): con sesiones de prueba en semanas cuyo lunes
  es 27-jul y 10-ago, el gráfico de Progreso (`Chart.getChart().data.
  labels`) mostraba antes "09-ago" (domingo, incorrecto) y ahora
  "10-ago"/"27-jul" (lunes correcto) en ambos buckets.
- sw.js goat-v23 → v24.

## 2026-08-08 cont.2
- Cambio de tipografía (solo fuentes, sin tocar layout/colores/lógica):
  Inter → IBM Plex Sans, JetBrains Mono → IBM Plex Mono en todo
  estilos.css (19 apariciones reemplazadas). Barlow Condensed intacto.
  `<link>` de Google Fonts en index.html actualizado al mismo combo
  (preconnect existente reutilizado, sin duplicar).
- Revisión de pesos: IBM Plex Sans importa 400/500/600 (sin 700) e
  IBM Plex Mono importa 500/600/700 (sin 400). Encontrados y corregidos
  2 casos que hubieran caído a negrita sintética del navegador sin
  avisar: `.vt-scoreboard small` (heredaba Mono con weight 400 → 500) y
  `.vt-cal-cell.is-today .vt-cal-daynum` (heredaba Sans con weight 700
  → 600). Revisado también app.js por font-weight inline — los que
  tiene (600/700 sobre `.vt-mono` o el body font) ya calzaban con los
  pesos importados, sin cambios ahí.
- Verificado en browser: `document.fonts` confirma las 3 familias
  cargadas con los pesos reales usados (Barlow 700/800, Plex Mono 500,
  Plex Sans 400/600) sin pedir ningún peso no importado; recorrido de
  las 5 pestañas sin errores de consola reales (un 401 esperado de una
  key de prueba falsa).
- sw.js goat-v24 → v25.
