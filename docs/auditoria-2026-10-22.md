# Auditoría de diseño GOAT — 22 de octubre de 2026

## Resumen

1. **Lectores de pantalla y teclado (A1, A2 · alta):** los 37 campos de peso y reps de una sesión no tienen nombre, el check de serie no anuncia si está marcado, y ninguna hoja o ventana se comporta como diálogo (el foco no entra y Escape no cierra).
2. **Zoom bloqueado (A3 · alta):** `index.html` trae `maximum-scale=1, user-scalable=no`; nadie puede agrandar el texto con los dedos.
3. **Contraste bajo el mínimo (A4 · media):** texto blanco sobre botones rojos 4,37:1, filas rojas de las hojas 4,25:1 y borde del check vacío 1,75:1 (el mínimo para controles es 3:1).
4. **Decisión a revisar más importante (B1):** el azul de marca #3B6FE0 usado como color de texto da 4,27:1 sobre el fondo. Recomiendo dejarlo en rellenos (botones, ▶, barras) y usar #5A8BEE para texto (5,99:1).
5. **El resto es pulido:** el título de la sesión choca con el reloj a 360 px, los diálogos de descartar dicen "Eliminar", y los selects no muestran flecha.

## Alcance y método

- **Sitio revisado:** el publicado, https://warchampox.github.io/volley-tracker/ (versión `goat-v33`). No se cambió nada del sitio.
- **Tamaños:**
  - celular a 390×844, todas las pantallas;
  - celular a 360×800, las principales;
  - escritorio a 1440×812, en el navegador integrado de Claude Code.
- **Datos de prueba:** se cargaron en el localStorage de ese navegador de pruebas, no en el teléfono de Martín:
  - 4 rutinas (una carpeta "Pretemporada", %1RM, superserie, unilaterales, tiempo, peso corporal y pliometría);
  - 21 sesiones entre el 4-sep y el 21-oct con progresión, RPE y notas;
  - 1RM en 2 ejercicios;
  - último respaldo hace 23 días.
- **Flujo recorrido:** estados vacíos (antes de cargar datos), registrar una sesión completa (marcar series, récord, descanso, ⋯, Organizar, finalizar con series sin marcar, resumen, RPE), historial y detalle de sesión, Progreso, detalle de ejercicio, Ejercicios, editor de rutina, selector de ejercicios, confirmaciones, Exportar, Borrar datos, Pegar para importar y Nuevo ejercicio.
- **Mediciones:** los contrastes salen de los tokens de `estilos.css` (fórmula WCAG). Tamaños, etiquetas y roles se midieron en el DOM publicado.
- **Skills usadas:**
  - **impeccable** v4.7.0: `audit` y `critique`, con sus antipatrones.
  - **taste** (leonxlnx/taste-skill v2): modo crítica, `tells.md` y la guía de pantallas de app.
  - **apple-design** (dickwu): los cinco lentes, con los principios y fundamentos que aplican a una web app.
- **Limitaciones declaradas, como piden las skills:**
  - `⚠️ DEGRADED: single-context` en la crítica de impeccable: se hizo en un solo contexto, sin los dos subagentes que pide la skill.
  - El detector determinístico de impeccable y el inspector de taste no se ejecutaron: no se instalaron, a pedido.
  - Gestos como el swipe, la vibración y el sonido no se pueden probar en un navegador emulado.

### Puntajes de las skills

| Skill | Puntaje | Lectura |
| --- | --- | --- |
| impeccable `audit` | **13/20** (aceptable) | Accesibilidad 1 · Rendimiento 3 · Theming 3 · Responsive 3 · Integridad 3 (sin detector) |
| impeccable `critique` (Nielsen) | **27/40** | Consistencia 2, Recuperación de errores 2 y Ayuda 2 son los más bajos |
| taste (pantallas de app) | **7,2** | Diseño 7 · Usabilidad 7 · Creatividad 7,5 · Contenido 8. Con las reglas de *página* tendría tope 6,5 por las etiquetas mono en mayúscula (ver B2 y C1) |
| apple-design | **Critical issues** | Por accesibilidad (lente 1). En oficio y jerarquía queda en "Good" |

Lo que funciona y conviene mantener (las tres skills coinciden):

- **Una idea propia:** la sesión en vivo como tabla densa, el resumen con "como levantar 63 cabras", la bocina de marcador y las barras de color por grupo.
- **Un sistema de tokens coherente:** escala de 7 tamaños, espaciado en grilla de 4 y colores con significado (ámbar = récord, verde = hecho).
- **Áreas táctiles:** casi todo control chico ya tiene 44×44 de toque gracias al `::before`.
- **Ninguno de los "tells" duros:** sin degradados, brillos, glassmorfismo, emojis ni tarjetas anidadas.

---

## A. Problemas claros

| # | Problema | Gravedad | Esfuerzo | Skill |
| --- | --- | --- | --- | --- |
| A1 | Campos de serie sin nombre y check sin estado | Alta | Bajo | impeccable audit · apple-design |
| A2 | Hojas y ventanas no son diálogos accesibles | Alta | Medio | impeccable audit · apple-design |
| A3 | Zoom bloqueado | Alta | Bajo | impeccable audit · apple-design |
| A4 | Rojo y borde del check bajo el contraste mínimo | Media | Bajo | impeccable audit · apple-design |
| A5 | Título de la sesión choca con el reloj a 360 px | Media | Bajo | impeccable critique · taste |
| A6 | Confirmaciones con el verbo equivocado | Media | Bajo | apple-design · impeccable critique |
| A7 | Borrar una serie con swipe no tiene deshacer | Media | Medio | apple-design · impeccable critique |
| A8 | Nombre del ejercicio partido por sus controles | Media | Medio | impeccable critique · taste |
| A9 | Selects sin flecha en "Nuevo ejercicio" | Media | Bajo | apple-design · impeccable |
| A10 | Progreso vacío sin próximo paso | Baja | Bajo | apple-design · impeccable onboard |
| A11 | Primer uso de Ejercicios parece deshabilitado | Baja | Bajo | impeccable onboard · taste |
| A12 | Hojas sin cerrar deslizando ni "grabber" | Baja | Medio | apple-design |
| A13 | Faltas menores de accesibilidad | Baja | Bajo | impeccable audit |
| A14 | Textos desactualizados o crípticos | Baja | Bajo | impeccable clarify · apple-design |
| A15 | Ejes de gráficos con marcas desparejas | Baja | Bajo | taste · impeccable |
| A16 | Mayúsculas mezcladas en títulos y botones | Baja | Bajo | apple-design · impeccable critique |

### A1. Campos de serie sin nombre y check sin estado — alta

**Dónde:** sesión en vivo. Los campos son `input[data-i="set"]`, que arma `setRowHTML()` en `app.js`; el check es `.vt-check` (`data-a="set-check"`).

**Qué pasa:**
- Los 37 campos de una sesión de 5 ejercicios no tienen etiqueta. Un lector de pantalla dice "campo de texto, 87,5", sin aclarar si es kg o reps ni de qué serie.
- El check tiene `aria-label="Marcar serie"`, pero no tiene `aria-pressed`: no anuncia si está marcado.
- En el editor sí hay etiquetas (`aria-label` con el nombre de la columna); en la sesión no.

**Captura:** [390-09](auditoria/390-09-sesion-series-descanso.jpg).

**Arreglo:**
- En `setRowHTML()`, agregar `aria-label="Serie ${label}, ${c.cap}"` a cada campo.
- En el check, agregar `aria-pressed="${st.done}"` y que la etiqueta cambie a "Desmarcar serie N" cuando ya está hecha.

**Referencias:**
- impeccable `audit` › Accessibility: "Form issues: Inputs without labels".
- apple-design: `accessibility.md` (lente 1).

**Esfuerzo:** bajo, 1–2 h.

### A2. Hojas y ventanas no son diálogos accesibles — alta

**Dónde:** todos los `.vt-modal-backdrop`. Los arman `actionSheetHTML()`, `confirmDialogHTML()`, `infoDialogHTML()`, `pickerHTML()`, `exerciseModalHTML()`, `durationDialogHTML()` y `pasteJsonModalHTML()`.

**Qué pasa:**
- No tienen `role="dialog"`, `aria-modal` ni `aria-labelledby`.
- Al abrir, el foco se queda en `<body>`. Con Tab se sigue recorriendo la pantalla de atrás.
- Escape no cierra, y al cerrar el foco no vuelve al botón que abrió.
- Medido: se abrió la hoja ⋯ de la sesión y se envió Escape; quedó abierta.

**Captura:** [390-07](auditoria/390-07-rutina-hoja-acciones.jpg), [390-12](auditoria/390-12-confirmar-finalizar.jpg).

**Arreglo:** un solo ayudante, llamado al final de `render()` cuando hay un modal abierto, que:
- ponga `role="dialog"` y `aria-modal="true"`, y apunte `aria-labelledby` al título;
- mueva el foco al primer control;
- encierre Tab dentro del modal;
- cierre con Escape usando la misma acción del fondo;
- devuelva el foco al botón que abrió el modal.

**Referencias:**
- impeccable `audit`: "keyboard traps, missing ARIA".
- apple-design `modality.md`: un modal tiene una salida obvia.

**Esfuerzo:** medio, ½ día.

### A3. Zoom bloqueado — alta

**Dónde:** `index.html`, `<meta name="viewport" … maximum-scale=1, user-scalable=no …>`.

**Qué pasa:** no se puede ampliar con los dedos, y todo el texto está en px fijos. Además, el texto más común de la app es de 11–13 px (20 elementos de 11 px en la pantalla de sesión).

**Referencias:**
- WCAG 1.4.4.
- apple-design `accessibility.md`: "Support larger text sizes … give people the option to enlarge text by at least 200 percent".

**Arreglo:**
- Quitar `maximum-scale=1, user-scalable=no`.
- Para evitar el zoom automático de iOS al tocar un campo (probablemente la razón original), dejar en 16 px los campos que hoy son más chicos: el descanso de 13 px (`.vt-rest-mini input`), el buscador de 15 px (`.vt-search input`) y `.vt-input` de 15 px.
- Los campos de serie ya miden 18 px.

**Esfuerzo:** bajo. Probar en iPhone que no aparezca el zoom al tocar.

### A4. Rojo y borde del check bajo el contraste mínimo — media

| Elemento | Hoy | Mínimo | Propuesta |
| --- | --- | --- | --- |
| Texto blanco en botón rojo (`.vt-btn-danger`, confirmaciones) | #C1594F → 4,37:1 | 4,5:1 | fondo #B24A40 → 5,32:1 |
| Texto rojo en filas de hoja (`.vt-modal-row-danger` sobre `--surface`) | 4,25:1 | 4,5:1 | texto #D46A60 → 5,32:1 |
| Borde del check vacío y del círculo de Organizar (`--line-strong` #3A3A41) | 1,75:1 | 3:1 (WCAG 1.4.11) | #5E5E68 → 3,09:1, o #68687A → 3,63:1 |

**Capturas:** [390-24](auditoria/390-24-descartar-cambios-eliminar.jpg), [390-26](auditoria/390-26-borrar-datos.jpg), [390-08](auditoria/390-08-sesion-inicio.jpg).

**Nota:** el rol "rojo = eliminar/fallida" se mantiene; solo cambia el tono para cada uso. El check vacío es el control más usado de la app, y hoy su borde casi no se distingue del fondo.

**Esfuerzo:** bajo. Son dos tokens nuevos (`--red-fill`, `--red-text`) y un cambio de `--line-strong`.

### A5. Título de la sesión choca con el reloj a 360 px — media

**Dónde:** encabezado de la sesión en vivo (`.vt-header-sticky`): `.vt-header-title-sm` al lado de `.vt-live-right`, en `trainActiveHTML()`.

**Qué pasa:**
- Con "Fuerza B · tren superior", el texto toca el reloj ("tren00:19").
- Según el ancho de los números, otras veces se parte en tres líneas.
- A 390 px, el mismo nombre ocupa dos líneas.

**Capturas:** [360-01](auditoria/360-01-sesion-titulo-choca.jpg), [360-06](auditoria/360-06-descartar-sesion-eliminar.jpg), [390-08](auditoria/390-08-sesion-inicio.jpg).

**Arreglo:**
- En el bloque del título: `flex: 1; min-width: 0`.
- En el nombre: 2 líneas como máximo, con `-webkit-line-clamp: 2`.
- En `.vt-live-right`: `flex-shrink: 0` y un `gap` mínimo.
- Bajo 380 px, pasar tiempo y volumen a una segunda fila.

**Esfuerzo:** bajo.

### A6. Confirmaciones con el verbo equivocado — media

**Dónde:** `confirmDialogHTML()` decide el texto del botón con `d.danger ? "Eliminar" : "Confirmar"`.

**Qué pasa:**
- "¿Descartar la sesión completa?" ofrece "ELIMINAR".
- "Tienes cambios sin guardar… ¿Descartarlos?" ofrece "ELIMINAR".
- "¿Finalizar y guardar las 9 marcadas?" ofrece "CONFIRMAR".
- En el momento de más duda, el botón dice otra cosa que la pregunta.

**Capturas:** [390-24](auditoria/390-24-descartar-cambios-eliminar.jpg), [360-06](auditoria/360-06-descartar-sesion-eliminar.jpg), [390-12](auditoria/390-12-confirmar-finalizar.jpg).

**Arreglo:** que `askConfirm()` acepte el texto del botón: "Descartar sesión", "Descartar cambios", "Finalizar y guardar", "Eliminar rutina", etc.

**Referencias:** apple-design `writing.md` › "Be action oriented … it's almost always best to use a verb"; Lente 5: "An action keeps its name through the whole flow".

**Esfuerzo:** bajo.

### A7. Borrar una serie con swipe no tiene deshacer — media

**Dónde:** `endSwipe()` → `deleteSet()` en `app.js`. Pasado el 40 % del recorrido, la serie se borra sin confirmación ni forma de recuperarla.

**Captura:** no aplica; es un gesto y no se puede reproducir en el navegador emulado.

**Por qué importa:** en el gimnasio, con las manos ocupadas o sudadas, un roce horizontal borra una serie con sus valores.

**Arreglo:** guardar la serie borrada y mostrar 5 s un aviso "Serie eliminada · Deshacer" (mismo estilo que `#recovered-toast`).

**Referencias:** apple-design Lente 4 ("Undo covers the rest"); impeccable `critique` › heurística 3 (control y libertad).

**Esfuerzo:** medio.

### A8. Nombre del ejercicio partido por sus controles — media

**Dónde:** encabezado de cada bloque de la sesión (`.vt-card-top`: `h3` + `.vt-rest-mini` + nota + colapsar).

**Qué pasa:** los controles de la derecha ocupan ~150 px. A 390 px, "Sentadilla trasera" se parte en dos líneas y la etiqueta "@80%" queda debajo. Lo más importante del bloque pierde frente a sus controles.

**Captura:** [390-08](auditoria/390-08-sesion-inicio.jpg).

**Arreglo:** que el nombre tenga la fila entera y bajar descanso, nota y colapsar a la línea de "Última vez", o compactar el descanso a solo el número con su ícono.

**Esfuerzo:** medio.

### A9. Selects sin flecha en "Nuevo ejercicio" — media

**Dónde:** `exerciseModalHTML()`, `select.vt-input { appearance: none }` sin ícono.

**Qué pasa:** "Custom" y "Peso × reps" se ven como campos de texto, y no se entiende que se tocan para elegir.

**Captura:** [390-28](auditoria/390-28-nuevo-ejercicio.jpg).

**Arreglo:** un chevron como fondo SVG a la derecha y `padding-right` para dejarle espacio.

**Referencia:** apple-design `pop-up-buttons.md` (indicar que abre opciones).

**Esfuerzo:** bajo.

### A10. Progreso vacío sin próximo paso — baja

**Dónde:** `progressHTML()` llama `emptyHTML(…, "")`, sin botón.

**Captura:** [390-02](auditoria/390-02-progreso-vacio.jpg).

**Arreglo:** un botón "Empezar una sesión" que lleve a Rutinas, igual que el vacío de Rutinas tiene "Crear rutina".

**Referencias:** apple-design `writing.md` › "Provide clear next steps on any blank screens"; impeccable operate › "Empty states that teach the interface".

**Esfuerzo:** bajo.

### A11. Primer uso de Ejercicios parece deshabilitado — baja

**Dónde:** `exercisesListHTML()` y `catalogRowHTML()`.

**Qué pasa:** en una instalación nueva, todos los grupos parten cerrados. Al abrir uno, todos los nombres salen en gris con "Sin registros" (`.vt-cat-row.is-empty`), y el catálogo de fábrica se lee como inactivo.

**Capturas:** [390-03](auditoria/390-03-ejercicios-inicio.jpg), [390-04](auditoria/390-04-ejercicios-sin-registros.jpg).

**Arreglo:**
- Atenuar los ejercicios sin registros solo cuando existe historial; si no hay ninguno, mostrar los nombres en blanco.
- Abrir el primer grupo por defecto.

**Esfuerzo:** bajo.

### A12. Hojas sin cerrar deslizando ni "grabber" — baja

**Dónde:** `.vt-modal`, que usan las hojas ⋯, Exportar, el selector y "Nuevo ejercicio". Hoy se cierran tocando la ✕ o el fondo.

**Captura:** [390-07](auditoria/390-07-rutina-hoja-acciones.jpg).

**Referencia:** apple-design `sheets.md` › "Support swiping to dismiss a sheet", "Include a grabber".

**Arreglo:** una barrita arriba de la hoja y cerrar al arrastrar hacia abajo desde el encabezado.

**Esfuerzo:** medio.

### A13. Faltas menores de accesibilidad — baja

Se agrupan porque cada una es corta:

- **Sin región principal:** no hay `<main>`; envolver `.vt-content`.
- **Encabezados que saltan de nivel:** las pestañas pasan de `h1` a `h3` sin `h2`.
- **Avisos que no se anuncian:** no hay `aria-live`. El fin del descanso, "Recuperamos tu sesión" y los avisos de importación no se leen en voz alta.
- **Gráficos sin texto alternativo:** los 3 `<canvas>` de Progreso no tienen `aria-label`; agregar, por ejemplo, "Volumen semanal, última semana 12 t".
- **Sin `prefers-reduced-motion`:** el trofeo entra con rebote y no hay versión sin movimiento.
- **Buscadores sin foco visible:** `.vt-search input:focus { outline: none }` no tiene reemplazo, así que con teclado no se ve dónde está el foco. Los botones sí muestran el anillo del navegador ([1440-01](auditoria/1440-01-rutinas-foco-teclado.jpg)).

**Esfuerzo:** bajo en total.

### A14. Textos desactualizados o crípticos — baja

**Qué pasa:**
- **Sonido en Ajustes:** dice "Pitido al terminar el descanso", pero ahora suena una bocina ([390-05](auditoria/390-05-ajustes.jpg)).
- **Almacenamiento protegido:** "no" no dice qué significa ni qué hacer (instalar la app en la pantalla de inicio suele activarlo).
- **Calentamiento en "Última vez":** sale como "c50×5" ([390-08](auditoria/390-08-sesion-inicio.jpg)), y la "c" en minúscula, al lado de "D" y "F", no se entiende. Viene de `typePrefix()`.
- **Historial:** muestra "0 kg" en sesiones de pliometría ([390-15](auditoria/390-15-historial.jpg)). Sería mejor omitirlo o mostrar los saltos (`sessionRowHTML()`).

**Esfuerzo:** bajo.

### A15. Ejes de gráficos con marcas desparejas — baja

**Qué pasa:**
- **Detalle de ejercicio:** el eje Y marca 55, 60, 80, 100, porque `yMin` (mínimo × 0,85) no coincide con el paso de las marcas ([390-20](auditoria/390-20-detalle-ejercicio.jpg)).
- **Volumen a 390 px:** la barra de la semana actual queda sin fecha ([390-17](auditoria/390-17-progreso-arriba.jpg)). A 1440 px sí aparece.

**Arreglo:** redondear `yMin` al paso o usar `suggestedMin`, y forzar la etiqueta de la última barra.

**Esfuerzo:** bajo.

### A16. Mayúsculas mezcladas en títulos y botones — baja

**Qué pasa:**
- **Títulos de ventana:** "NUEVO EJERCICIO" y "PEGAR PARA IMPORTAR" van en mayúscula Barlow.
- **Títulos de hoja:** "Exportar" y "Borrar datos personales" van en formato normal.
- **Botones:** los primarios van en mayúscula, mientras "Cancelar · Guardar" de Organizar va en formato normal.

**Capturas:** [390-28](auditoria/390-28-nuevo-ejercicio.jpg), [390-25](auditoria/390-25-exportar.jpg), [390-11](auditoria/390-11-organizar.jpg).

**Referencia:** apple-design `writing.md` › "Adopt capitalization rules … then apply them consistently".

**Arreglo:** elegir una regla para títulos de ventana y hoja, y otra para botones, y aplicarla igual en todas. La regla de mayúsculas en sí está en B2.

**Esfuerzo:** bajo.

---

## B. Decisiones a revisar

### B1. El azul de marca como color de texto — recomiendo **cambiar**

**Decisión actual (CLAUDE.md):** "Paleta: acento de marca azul cobalto #3B6FE0."

**Qué la cuestiona:**
- Usado como texto, #3B6FE0 da 4,27:1 sobre el fondo y 3,71:1 sobre `--surface-2`; el mínimo AA es 4,5:1.
- Se usa como texto en:
  - eyebrows ("SET 01 · PREPARACIÓN", fechas de sesión);
  - etiqueta activa de la barra inferior;
  - "Editar", "Cambiar", "Ver todos";
  - "Guardar" de Organizar;
  - deltas como "+17,5 kg".
- Fuentes: impeccable `audit` (contraste) y apple-design `accessibility.md` (tabla de contraste mínimo).

**Qué se gana:** todo el texto pasa AA.

**Qué se pierde:** el azul del texto se ve un poco más claro que el de los botones.

**Recomendación:**
- Mantener #3B6FE0 en rellenos: botones, ▶ de Iniciar, barras del gráfico e interruptores. El blanco sobre él da 4,63:1.
- Agregar `--blue-text: #5A8BEE` (5,99:1 sobre el fondo, 5,2:1 sobre `--surface-2`) para todo texto azul.

### B2. Etiquetas en mayúscula, monoespaciadas, con numeración "SET 0X" — recomiendo **probar**

**Decisión actual (CLAUDE.md):**
- "Mayúsculas con tracking en labels/estructura".
- Tokens "`--fs-xs` 11px (labels en mayúscula)" y "Tracking: `--track` 0.06em para todo lo que va en mayúscula".

**Qué la cuestiona:**
- **taste** (`tells.md`) marca como "tells" de interfaz generada las etiquetas pequeñas en mayúscula con tracking (16 % de los sitios mejor evaluados contra 57 % de los peores), la mono como voz "técnica" y la numeración índice "01/02/03". Su guía de pantallas de app permite como máximo una etiqueta en mayúscula con tracking por pantalla. GOAT tiene unas 20 en la sesión.
- **apple-design** (lente de oficio): "Does structure encode information? Numbering, eyebrows … should say something true". "SET 01 · PREPARACIÓN", "SET 04 · ANÁLISIS" no informan nada que la pestaña no diga.
- **11 px mono en mayúscula** es el texto más chico de la app, y la mayúscula se lee más lento.

**Qué se gana:** menos aspecto de plantilla, lectura más rápida y algo de altura en cada pantalla.

**Qué se pierde:** parte de la identidad de "marcador deportivo" que se buscó a propósito.

**Recomendación:**
- Sacar el eyebrow "SET 0X · …" de los encabezados de pestaña.
- Dejar la mayúscula solo en encabezados de columna (KG / REPS) y labels de sección.
- Mantener la mono para los números.

**Capturas:** [390-06](auditoria/390-06-rutinas-con-datos.jpg), [390-17](auditoria/390-17-progreso-arriba.jpg).

### B3. Valores editables sin caja (estilo tabla) — recomiendo **probar**

**Decisión actual (CLAUDE.md):**
- "Estilo tabla (ref. Hevy): sin tarjetas encajonadas, divisores finos…".
- Patrón "Fila de serie tipo tabla … nº sin caja, valores en columnas flex iguales".

**Qué la cuestiona:**
- Los números de una serie ("87,5", "5") se ven como texto plano; el subrayado aparece solo al enfocar.
- Nada indica que se tocan para editar. Junto al borde casi invisible del check (A4), un usuario nuevo no distingue qué es control y qué es dato.
- Fuentes: apple-design `layout.md` › "Differentiate controls from content"; impeccable operate › "consistent affordances".

**Qué se gana:** descubribilidad desde el primer uso.

**Qué se pierde:** algo de la limpieza tipo Hevy.

**Recomendación:** probar un subrayado tenue permanente (1 px, `--line-strong` corregido) bajo cada valor editable, sin caja. Es reversible y se puede comparar en el teléfono.

**Captura:** [390-08](auditoria/390-08-sesion-inicio.jpg).

### B4. Azul de marca en toda la interfaz — recomiendo **mantener**

**Decisión actual:** "acento de marca azul cobalto #3B6FE0" en botones primarios, nav activa, pestañas, ▶ y links.

**Qué la cuestiona:** taste (pantallas de app) propone el acento solo en los datos y un primario casi negro, porque "the accent on every button, tab and link" es un tell de dashboards generados.

**Qué se gana:** más calma visual, con el azul reservado para los datos.

**Qué se pierde:** la identidad de GOAT. El azul es la marca, y en una app de una sola persona orienta rápido.

**Recomendación:** mantener. Solo corregir el contraste del texto (B1).

### B5. Estética iOS que sugiere apple-design — recomiendo **mantener**

**Decisión actual:** paleta oscura propia, IBM Plex + Barlow Condensed, sin modo claro, estilo tabla.

**Qué la cuestiona:** apple-design empuja una estética iOS:
- apariencia clara y oscura según el sistema, sin interruptor propio de la app (`dark-mode.md`);
- colores semánticos del sistema;
- fuente del sistema para controles;
- botones en Title Case;
- materiales translúcidos (Liquid Glass) en barras flotantes.

**Qué se gana:** familiaridad con iOS.

**Qué se pierde:** toda la identidad visual; además, en una web app esos patrones no son nativos.

**Recomendación:** mantener. De esta skill se tomaron solo los fundamentos (accesibilidad, textos, jerarquía), que no cambian la identidad.

### B6. "Eje Y siempre desde 0" no coincide con el código — recomiendo **mantener el código**

**Decisión actual (CLAUDE.md):** "Gráficos (Chart.js): sin caja, eje Y siempre desde 0".

**Qué la cuestiona:** desde la Fase 2 de mejoras, el gráfico de peso máximo del detalle parte en mínimo × 0,85 ([390-20](auditoria/390-20-detalle-ejercicio.jpg)). La documentación y el sitio dicen cosas distintas.

**Qué se gana / pierde:** partir en 0 aplastaba la curva de progreso; partir cerca del mínimo la hace legible, con riesgo de exagerar cambios chicos.

**Recomendación:** mantener el código (peso máx. desde cerca del mínimo; volumen, saltos y carga desde 0) y, cuando se decida, ajustar la frase en CLAUDE.md. En esta sesión no se tocó.

---

## C. Sugerencias de las skills que no recomiendo

| # | Sugerencia | Skill | Por qué no |
| --- | --- | --- | --- |
| C1 | Reglas de página: sin divisores finos, sin mono, al menos 4 fotos reales, 8+ elementos en movimiento, un "live thing", hero con imagen | taste | Son para landing pages. GOAT es una pantalla de trabajo, y la propia guía de pantallas de app permite divisores (1,1–1,3:1, GOAT usa 1,39:1) y mono para números. |
| C2 | Quitar las mini curvas de "Tus ejercicios" y de Ejercicios | taste (app screens: "no sparklines on KPIs") | La regla es para tarjetas de KPI. En GOAT van en filas de lista junto a la marca, y muestran justo la pregunta de esa fila: ¿voy subiendo? |
| C3 | Eliminar el rebote del trofeo de récord | impeccable (antipatrón: bounce/elastic easing) | Es el único momento de celebración y dura 220 ms. Basta con darle una versión sin movimiento (A13). |
| C4 | Layout propio para escritorio (barra lateral, más columnas) | impeccable `adapt` · apple-design | La app se usa en el gimnasio con el celular. A 1440 px es una columna de 480 px centrada ([1440-02](auditoria/1440-02-sesion.jpg)), legible y sin roturas. No justifica el trabajo. |
| C5 | Liquid Glass, SF Symbols, fuente del sistema, Title Case en botones | apple-design | Cambian la identidad y no son nativos en web (B5). |
| C6 | Correr el detector de 61 reglas y el inspector con Chrome | impeccable · taste | No se instalaron, a pedido. Si más adelante se quieren, conviene correrlos a mano en una sesión aparte, no como hooks. |
| C7 | Botón primario casi negro en vez de azul | taste | Ver B4. |
| C8 | Animaciones con resortes para swipe y hojas | apple-design de Emil Kowalski (no instalada) | Útil después de resolver A7 y A12, no antes. |

---

## Anexo: capturas

Todas están en [`docs/auditoria/`](auditoria/). El prefijo indica el ancho:

- **390 px:** 28 capturas, de 390-01 (Rutinas vacía) a 390-28 (Nuevo ejercicio).
- **360 px:** 6 capturas, de 360-01 (título que choca) a 360-06 (descartar sesión).
- **1440 px:** 3 capturas (Rutinas con foco de teclado, sesión y Progreso).

## Anexo: contrastes medidos (WCAG)

| Par | Contraste |
| --- | --- |
| `--text-dim` #8FA0AC sobre fondo / surface / surface-2 | 7,34 / 6,88 / 6,37 |
| Azul #3B6FE0 como texto sobre fondo / surface-2 | 4,27 / 3,71 ✗ |
| Blanco sobre azul (botón primario) | 4,63 |
| Blanco sobre rojo #C1594F | 4,37 ✗ |
| Rojo sobre fondo / surface | 4,53 / 4,25 ✗ |
| Ámbar sobre fondo | 9,17 |
| Check oscuro sobre verde | 7,07 |
| `--line-strong` (borde del check) sobre fondo | 1,75 ✗ (control: 3:1) |
| `--line` (divisor) sobre fondo | 1,39 |
| Colores de grupo sobre fondo | 4,31 (Custom) a 11,99 |

---

## Estado (aplicación, 22 de octubre de 2026)

Martín revisó la auditoría: se aplican todos los puntos A (A3 con otra solución), se adoptan B1, B2 y B3 y se mantienen B4, B5 y B6. No se hace nada de la sección C. Versión publicada con estos cambios: `goat-v34`.

| Punto | Estado | Cómo quedó |
| --- | --- | --- |
| A1 | Aplicado | Campos de serie con nombre ("Serie 2, kilos"); check con `aria-pressed` y "Marcar / Desmarcar serie N". |
| A2 | Aplicado | Ayudante único `setupDialogs`: rol de diálogo, foco adentro, Tab encerrado, Escape cierra, foco de vuelta al botón que abrió. |
| A3 | Aplicado distinto | El viewport sigue bloqueado (en julio la app se agrandaba sola). En su lugar, zoom temporal con dos dedos (hasta 3×) que vuelve solo al soltar. |
| A4 | Aplicado | `--red-fill` #B24A40, `--red-text` #D46A60, `--line-strong` #68687A. |
| A5 | Aplicado | Encabezado de sesión en grilla; título a 2 líneas como máximo; bajo 380 px tiempo y volumen en una segunda fila. |
| A6 | Aplicado | `askConfirm` recibe el verbo; las 18 confirmaciones repiten su acción. |
| A7 | Aplicado | "Serie eliminada · Deshacer" durante 5 s. |
| A8 | Aplicado | Nombre del ejercicio a todo el ancho; descanso, nota y colapsar en la línea de "Última vez". |
| A9 | Aplicado | Chevron en los selects. |
| A10 | Aplicado | Progreso vacío con "Empezar una sesión". |
| A11 | Aplicado | Primer uso sin atenuar el catálogo y con el primer grupo abierto. |
| A12 | Aplicado | Barrita de 36×4 y cierre arrastrando más de 80 px o con un tirón rápido. |
| A13 | Aplicado | `<main>`, h2, `aria-live` polite, texto alternativo en gráficos, foco visible en buscadores, movimiento reducido. |
| A14 | Aplicado | "Bocina al terminar el descanso", aviso para instalar GOAT, prefijo "C", Historial con saltos o sin volumen en vez de "0 kg". |
| A15 | Aplicado | Marcas parejas en el eje del peso; la última barra siempre con fecha. |
| A16 | Aplicado | Con las reglas de mayúsculas de B2. |
| B1 | Adoptado | `--blue-text` #5A8BEE para todo texto azul; `--blue` solo rellenos y bordes. |
| B2 | Adoptado | Sin eyebrow "SET 0X"; mayúscula solo en columnas, labels de sección, título de pestaña y titular del resumen. Pantalla de sesión: 27 → 15 elementos en mayúscula. |
| B3 | Adoptado | Subrayado tenue (60 %, centrado) en valores editables; azul al enfocar; sin subrayado en series completadas. |
| B4 | Mantenido | El azul sigue en botones, nav y pestañas. |
| B5 | Mantenido | Identidad visual propia, sin estética iOS. |
| B6 | Mantenido | El código sigue igual; CLAUDE.md ahora dice que el peso máximo parte cerca del mínimo y volumen, saltos y carga en 0. |
| C1–C8 | No aplicados | Como se recomendó. |

Pendiente de probar en el teléfono: el pellizco, el swipe con deshacer, cerrar hojas deslizando y VoiceOver.
