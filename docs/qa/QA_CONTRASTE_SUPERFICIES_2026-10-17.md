# Contraste de superficies y sombras — 2026-10-17

## Alcance y procedencia

- Base: remoto verificado `1402678f7b004847cb02375922fd9c8372d5cba1`.
- Rama: `codex/surface-contrast-20261017`.
- Solicitud: extender el acabado aprobado de matrícula a las pantallas de Ayni, con campos ligeramente más visibles, textos conservados y sombras suaves como en el ejemplo.
- Cambios de presentación: CSS global, Card y módulos/componentes que sobrescribían bordes o elevación neutrales. No cambia navegación, lógica pedagógica, IA, endpoints, permisos, datos ni documentos.
- Entorno funcional: Vite 3431 → API local 3432 → PGlite nuevo, docente ficticia `66101731-0000-4000-8000-000000000001`. Variables cloud y claves IA excluidas del proceso. Preview y Producción comparten base, por lo que no se hicieron escrituras cloud.

## Resultado visual

Fondo `#eaf2f8`; tarjetas blancas con borde `#b8ccde`; sombra `0 5px 16px rgba(23,43,82,.065)` en paneles principales. Se reutilizan tokens en vez de elevar cada fila o sección interna. Campos con fondo `#f0f5fa`, borde `#748da4` y placeholder `#526b87`. Matrícula separa sus dos tarjetas 24 px en escritorio; el móvil conserva el apilado y su separación existente. No se oscurecen los textos generales ni cambian pesos o tamaños.

DOM real de matrícula: ambas tarjetas muestran borde `rgb(184,204,222)` y sombra `rgba(23,43,82,.067) 0px 5px 16px 0px`; gap 24 px. El navegador redondea el alfa. Los campos muestran los tokens previstos; buscador con contenedor teñido y campo transparente.

Contrastes calculados con luminancia sRGB: borde/campo **3.14:1**, placeholder/campo **5.02:1**. Error conserva borde rojo `rgb(184,59,69)`, foco turquesa y deshabilitado opacidad `.55`. Checkbox y archivo mantienen su estilo específico; solo lectura sigue sin admitir edición. No se afirma una auditoría WCAG completa del producto.

## Verificación ejecutada

| Comprobación | Resultado | Límite |
|---|---|---|
| Matrícula: alta por UI, búsqueda y recarga | PASS | 20 niños ficticios iniciales; Lucía Contraste QA lleva la lista a 21 y persiste. Sin fotos ni datos reales. |
| Capturas 1366×1000 y 390×844 | PASS | Matrícula, configuración, entrevista, perfil/colegio, Hoy vacío, calendario, biblioteca de talleres, Evaluar, Informes, Consolidado, proyecto, lectura de actividad, guía y estados de campos. No hay overflow horizontal de página; tablas conservan su scroll interno. |
| Datos preparados en Evaluar, Informes, Consolidado, proyecto y actividad | PASS visual | Componentes reales con muestras ficticias de solo lectura; no certifica generación, guardado, descargas o cierres de esos flujos. Mutaciones de evaluación bloqueadas por el fixture. |
| Documentos | PASS visual | Estado vacío real de la nueva base; actividad preparada comprobada aparte en el lector real. |
| Formularios | PASS visual | Normal, con contenido, foco, error, deshabilitado, solo lectura, textarea, checkbox y archivo. |
| Integridad del código de componentes | PASS | AST de 34 TSX comparado con la base, retirando atributos className y normalizando el reemplazo de sombra de Card: resto idéntico, incluidos textos, eventos y estados. |
| Regresión existente | PASS, 52/52 | Nueve suites: setup form/draft, enrollment completion, student enrollment, family interview redesign, workflow continuity, period review navigation, workspace selection y period selection. |
| TypeScript | PASS | `npx tsc --noEmit`. |
| ESLint | PASS | `npm run lint -- --ignore-pattern .local`. |
| Build Vinext | PASS | `npm run build`; advertencia existente de clasificación estática de rutas API. |
| Build Next | PASS | `npx next build --webpack`. |
| Parse CSS y diff | PASS | Todos los CSS editados parsean; `git diff --check` sin defectos. |

La regresión previa fijaba el hex antiguo del borde. Se sustituyó esa aserción por los umbrales de contraste del borde y del placeholder sobre el fondo real del campo. No se añade una prueba que replique cada clase CSS.

Detector Impeccable: dos hallazgos preexistentes (`paper-grid` global y `border-l-2` en annual-slot-editor). No se introdujeron ni se rediseñan esas superficies fuera de esta corrección. No se afirma detector totalmente limpio.

## Evidencia y límites

Capturas y galería local: `outputs/surface-contrast-20261017/index.html`; vista principal `enrollment-preview.png`; pares `*-desktop.png` / `*-mobile.png`. Artefactos de ejecución privados en `.local/surface-contrast-20261017/`: logs, aislamiento, DOM, cobertura y comparación AST. Se conserva el PGlite de QA y se cierra limpiamente.

Es una revisión visual acotada, no una nueva auditoría anual. No se revisaron píxel a píxel todos los diálogos, pantallas administrativas, históricos y combinaciones de permisos. Los estilos compartidos llegan a ellos, pero sus flujos completos no se declaran probados. Costo nuevo de IA: **USD 0**.

## Publicación y rollback

Solo Preview con commit limpio identificable y smoke de 32 rutas públicas/protegidas. El recibo privado de release registra URL, SHA y estado READY; Producción se compara con su deployment anterior y no se promueve. Las comprobaciones cloud usan GET públicos o peticiones sin autenticación que deben responder 401, sin escrituras pedagógicas.

Rollback: dejar de usar el Preview nuevo y volver al Preview previo de `1402678`. Para revertir el código, revertir el commit de esta rama y publicar otro Preview tras los mismos checks. No hay migración ni restauración de datos.
