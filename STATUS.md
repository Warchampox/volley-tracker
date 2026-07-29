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
