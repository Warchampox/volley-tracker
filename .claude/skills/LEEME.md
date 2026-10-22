# Skills de diseño instaladas en este proyecto

Instaladas el 2026-10-22 a nivel de proyecto. Solo se copiaron las partes de
texto (SKILL.md, guías y licencia). No hay hooks, detectores, lanzadores ni
scripts: ninguna de estas skills ejecuta nada sola.

| Carpeta | Origen | Versión (commit) | Licencia | En el repo |
| --- | --- | --- | --- | --- |
| `impeccable/` | https://github.com/pbakaus/impeccable (`.claude/skills/impeccable`) | v4.7.0, 583595f (2026-10-22) | Apache 2.0 (`LICENSE`, `NOTICE.md`) | sí |
| `taste/` | https://github.com/leonxlnx/taste-skill (`skills/taste-skill`) | v2, 6010f91 (2026-10-20) | MIT (`LICENSE`) | sí |
| `apple-design/` | https://github.com/dickwu/apple-design-skill | 914b6a3 (2026-10-15) | sin licencia; texto de las HIG de Apple | **no** (solo local, en `.git/info/exclude`) |

## Qué se dejó fuera y por qué

- **impeccable**: sin `scripts/` (el lanzador `impeccable` descarga un binario a
  `~/.impeccable/bin` la primera vez y corre el detector de 61 reglas) y sin el
  `settings.json` de hooks (corría el detector en cada Edit/Write, al iniciar y
  al cerrar sesión). La skill tiene un modo previsto para esto: cuando el
  lanzador no está, dice "Context loading did not run" y lee PRODUCT.md /
  DESIGN.md directo. `audit` y `critique` funcionan sin la parte determinística.
- **taste**: sin `scripts/` (`draw.mjs`, `inspect.mjs`, `lint.mjs`,
  `scenes.mjs`, `assets.mjs`; necesitan Node 22 y Chrome, y `assets.mjs`
  descarga imágenes de colecciones abiertas), sin `library/` (solo la lee
  `draw.mjs`) y sin `evals/`. La skill prevé este caso ("No Chrome or Node 22"):
  se critica sobre capturas tomadas con otra herramienta. `assets/` son CSS/JS
  base pasivos para construir páginas.
- **apple-design (dickwu)**: sin `scripts/pull-hig.mjs` (vuelve a bajar las
  páginas desde developer.apple.com; no hace falta para revisar). Se eligió
  esta en vez de `emilkowalski/skills › apple-design` porque es un revisor con
  las guías completas y reglas para web apps; la de Emil Kowalski trata solo
  animación y gestos (resortes, arrastre, hojas) y sirve como complemento.

## Encaje con GOAT (HTML/CSS/JS plano)

Ninguna exige React, Tailwind ni SwiftUI. taste está escrita sobre todo para
landing pages; para GOAT aplica su guía de pantallas de app
(`taste/references/app-screens.md`). apple-design trata una web app con sus
principios y fundamentos (accesibilidad, color, tipografía, layout, textos),
no con las convenciones propias de iOS.

Para reinstalar algo de lo omitido, copiarlo desde el repo de origen en el
mismo commit.
