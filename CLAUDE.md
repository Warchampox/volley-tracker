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
- Pestaña "Partidos" (2026-08-07): único punto de la app que llama a
  un servicio externo — la Volleyball API de Highlightly
  (https://volleyball.highlightly.net). Siempre a través de
  `callVolleyballApi()`, la única función que hace fetch a esa API.
  Caché en localStorage (leagues-catalog, matches-cache,
  standings-cache, api-usage), TTL 24h vía `shouldRefreshLeague()`.
  Todo namespaced bajo `.volleyball` (settings.apiKeys,
  settings.favoriteLeagues, y las llaves de caché) pensando en sumar
  otros deportes más adelante — hoy solo se construye vóleibol. Sin
  key configurada, la pestaña no intenta ninguna llamada. Confirmado
  con key real: los headers de cuota (x-ratelimit-requests-*) casi
  nunca llegan a JS por CORS al llamar directo desde el navegador —
  el indicador de cuota entonces se queda casi siempre en "Sin datos"
  y no hay arreglo posible sin backend propio (fuera de alcance).

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
