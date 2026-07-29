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
