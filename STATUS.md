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
