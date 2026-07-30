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
