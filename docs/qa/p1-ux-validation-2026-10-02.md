# Validación focal P1 — 2026-10-02

## Alcance y base

Fuente: `ui-delta-audit-impeccable-2026-10-02.md`. Solo D1, D2 e I6, usando Impeccable (harden) y Web Design Guidelines. Rama `codex/annual-year-map`; base `4c10b928f61fcc55d4aae4b0953d161cf831f8bd`. Cierre autorizado con commit local de P1, sin publicación ni cambios P2/P3.

QA en una copia aislada de `.local/validation-close/pgdata`, guardada en `.local/p1-ux-2026-10-02/pgdata`. Aplicación local en localhost:5173 y API local en 8788; proveedor configurado exclusivamente a localhost, sin generación ni gastos de IA. No se usó Supabase remoto ni se alteraron datos reales.

## Cambios

- **D1:** la selección de otra versión consulta `canLeaveWorkspace` y el evento cancelable existente `ayni-before-navigation`. El borrador anual registra la misma protección de cambios pendientes y de recarga usada por la preparación. Cancelar conserva el borrador para guardarlo; aceptar permite descartar. La misma versión no dispara el aviso.
- **D2:** reemplazo del overlay manual por Dialog compartido, manteniendo el panel lateral. Foco inicial en Título, contención y cierre proporcionados por el componente compartido, retorno al botón de apertura. Al editar desde el mapa, el mapa permanece montado para conservar ese botón.
- **I6:** labels asociados a Nueva fecha, Motivo de reprogramación y Motivo de la excepción; fieldset/legend con «Estado de asistencia de [alumno]». Sin cambiar callbacks ni reglas de asistencia/calendario.

## Navegador

| Caso | Resultado y evidencia |
|---|---|
| D1: reordenar e intentar otra versión | Aviso `confirm` detectado en Chrome. El cambio local no se guardó silenciosamente. |
| D1: permanecer y guardar | Tras la recuperación del navegador, V3 seguía seleccionada, con orden 02 → 01 y cambios pendientes. Guardar mostró «Cambios guardados»; una segunda pestaña recuperó el orden guardado. No se declara validado el control automatizado de Cancelar: la llamada de cierre agotó el tiempo. |
| D1: misma versión / cambio limpio | Sin aviso al seleccionar la misma V3; cambio inmediato a V2 tras guardar. |
| D1: histórico / vigente | V1 abrió como «Versión anterior · versión 1», sin Editar ni Guardar cambios. Comparación del JSON completo antes/después: vigente e históricos idénticos. Solo el borrador QA guardado cambió (revisión 3 → 5). |
| D1: descartar y cambiar | El aviso se detectó, pero Aceptar agotó el tiempo y la herramienta perdió acceso a esa pestaña. Sin evidencia fiable de esa decisión en navegador. **Cierre mediante prueba focal PASS**, autorizado posteriormente por el usuario. |
| D2: teclado desde mapa y lista | **PASS:** Enter abre, Título recibe foco; Tab desde la última acción y Shift+Tab desde Cerrar permanecen dentro; fondo no interactivo; Escape cierra; foco retorna a Modificar en el mapa y Editar en lista. Panel lateral conservado (576 px en viewport 1280 × 720). |
| I6: asistencia | **PASS:** árbol accesible incluye «Estado de asistencia de Lucía Flores» y las cuatro alternativas con selección. Tarde se seleccionó y Guardar cerró el diálogo; Hoy mostró 1/1 registrados. |
| I6: calendario | **PASS:** los tres labels apuntan a INPUT existentes; `getByLabel` encuentra cada campo. Excepción QA guardada y visible. Reprogramación mediante teclado del control nativo conservó el 3 de noviembre y la próxima actividad pasó a esa fecha. |

La herramienta mostró inicialmente la fecha rellenada sin reflejarla en el estado React; entrada real con ArrowUp en el segmento de día resolvió esa limitación de automatización. No se modificó el producto para compensarla. No se utilizó lector de pantalla real.

El usuario indicó que no veía el aviso nativo que la herramienta detectaba. No se atribuye esta limitación a un bug de Ayni ni se sustituye el patrón existente solo para facilitar automatización. El usuario autorizó cerrar ambas decisiones con una prueba focal mínima, sin repetir E2E. No se declara validado el control nativo del aviso en navegador.

### Cierre focal D1

`node --test src/lib/annual-version-navigation.test.mjs`: **3 PASS**. La prueba extrae con el AST de TypeScript y ejecuta el efecto de protección y el manejador de selección reales de AnnualPreplanWorkspace, junto con `canLeaveWorkspace`. Simula únicamente el evento del navegador y la respuesta de `window.confirm`; no duplica las decisiones de navegación ni cambia código de producto.

- Cancelar al abrir vigente e histórico: mantiene ID, objeto de borrador y editor, sin ejecutar setters; al desmontar elimina el guard.
- Aceptar/descartar al abrir vigente e histórico: selecciona la propuesta de destino y cierra el editor, sin mutar el borrador ni el plan de destino.
- Borrador limpio y selección de la misma versión: no presentan aviso; cambiar desde limpio es inmediato.

Esta prueba cubre las decisiones que el control nativo no permitió verificar de forma fiable. La apariencia y el control automatizado del aviso siguen sin validación en navegador, sin constituir un pendiente para este cierre autorizado.

Captura del editor con foco en Título: `.local/p1-ux-2026-10-02/editor-teclado.png` (artefacto local ignorado).

## Pruebas ejecutadas

- `node --test --test-name-pattern='mover|retirar' src/lib/annual-year-map.test.mjs`: **2 PASS**. Conservación de slot/procedencia y contrato de disponibles/histórico.
- `npx tsc --noEmit`: **PASS**.
- `npm run lint`: **PASS**.
- `npm run build`: **PASS** (Vinext; avisos existentes de tamaño de chunks y dependencia PGlite).
- `git diff --check`: **PASS**.

Se añadió únicamente la prueba focal D1 anterior; no se repitieron suites generales de planificación, evaluación o generación ni se hizo más QA en navegador. Sin bugs adicionales de producto identificados. Los gates de typecheck/lint/build del cambio de producto ya estaban aprobados; tras añadir la prueba se verificó lint focal y diff check.

## Archivos y rollback

Producto: `annual-preplan-workspace.tsx`, `school-calendar-screen.tsx`, `attendance-dialog.tsx`, todos dentro de `src/features/dashboard/components/`.

Prueba: `src/lib/annual-version-navigation.test.mjs`. Documentación: este informe y `docs/ERRORS_AND_FIXES.md`. Los artefactos anteriores `.impeccable/` e informe delta se preservaron en el stash `a0fa6eb49d404a4015f5f8171e335277923470ef`, separado del commit P1 para dejar el árbol limpio y recuperarlos en la siguiente fase. El stash previo `7b7b39f862d09e9ddc58f8560d1e71cbacad8835` no se alteró. El bloque agregado automáticamente a AGENTS.md por Next dev se retiró al cerrar el servidor.

Para consultar la lista de mejoras de la siguiente fase sin restaurar archivos: `git show a0fa6eb49d404a4015f5f8171e335277923470ef^3:docs/qa/ui-delta-audit-impeccable-2026-10-02.md`. D1, D2 e I6 quedan cerrados por este commit y sus validaciones; P2/P3 se mantienen como próximos trabajos, sin implementación adicional.

Rollback: revertir exclusivamente estos tres archivos de producto; no existen migraciones ni cambios de datos remotos. Los cambios QA pertenecen únicamente a la copia local aislada.
