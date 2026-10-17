# Campos y opciones con apariencia activa

Fecha: 2026-10-17. Base `657eb71333a12f5584bccb54e326e21744a2e2c6`; rama `codex/active-form-controls-20261017`.

## Problema y corrección

La usuaria percibe el fondo gris de los campos como bloqueado y las sugerencias de entrevista como inactivas. El token compartido aplicado anteriormente teñía campos editables; las opciones conservaban bordes y casillas demasiado suaves, además de overrides del modo apilado.

Corrección de tres archivos de interfaz:

- `app/globals.css`: campo editable blanco; gris solo para disabled/readonly, incluyendo contenedores de textarea y select. Conserva borde, foco y error.
- `family-interview-v4.tsx`: clase de presentación en opciones existentes, sin cambios de eventos, datos ni texto.
- `interviews-workspace.module.css`: opciones disponibles celestes con borde/casilla más contrastados, seleccionadas turquesas con check y deshabilitadas grises; estados hover conservan selección. Tipografía mantiene tamaños y aumenta únicamente el peso de las opciones apiladas a 500.

No modifica sombras de tarjetas, disposición, información pedagógica, modelos, llamadas IA, base, documentos ni permisos.

## Pruebas ejecutadas

- QA por navegador con UI y API reales locales: PGlite nuevo en 3442, frontend 3441, tres alumnos ficticios, docente `66101741-0000-4000-8000-000000000001`. Proceso sin conexiones cloud ni claves IA.
- Entrevista apilada editable: campo blanco y opciones disponibles visibles; click selecciona Construcción y aparece check. Escritura libre funciona.
- Entrevista por pasos: selección por teclado, escritura y confirmación real de versión 1; campos/opciones se bloquean y cambian a gris. Recarga conserva texto y selección; Corregir entrevista vuelve a mostrar campo blanco editable en apilado. El selector privado entre fixtures no sustituye la navegación guardada del producto.
- Estados de Input, Textarea, select y campo envuelto: blanco editable, gris deshabilitado/readonly, borde rojo de error, foco turquesa. Capturas en 1366×1000 y 390×844; entrevista apilada, por pasos confirmada, estados y matrícula. Sin overflow de página en los tamaños comprobados.
- Matrícula conserva separación, sombras y campos editables blancos.
- Comparación AST de la entrevista, excluyendo solo className: comportamiento y copia idénticos a la base.
- 52/52 regresiones PASS: setup form/draft, enrollment completion, student enrollment, family interview redesign, workflow continuity, period navigation, workspace selection y period selection.
- `npx tsc --noEmit`, ESLint, build Vinext y build Next webpack: PASS.
- `git diff --check`: PASS. Detector de diseño: solo advertencia preexistente de paper-grid global; no se modifica ese patrón fuera de alcance.

Contraste calculado sobre pares efectivos: borde/campo 3.45:1; placeholder/blanco 5.51:1; borde/opción disponible 3.73:1; texto/opción 8.94:1; casilla/blanco 4.38:1; borde/seleccionada 4.16:1; texto/seleccionada 6.77:1; check/indicador 4.79:1. No constituye auditoría WCAG completa.

## Evidencia y límites

Capturas en `outputs/active-form-controls-20261017/`, destacando `interview-final-desktop.png`, `interview-mobile.png` y `states-mobile.png`. Logs, aislamiento y estados computados en `.local/active-form-controls-20261017/`. PGlite preservado y detenido limpiamente.

QA focal de apariencia/interacción de controles; no repite el recorrido anual ni todas las variantes históricas. Sin llamadas nuevas de IA: USD 0. Sin cambios ni escrituras en Producción; Preview y Producción comparten base, por lo que el QA pedagógico permanece local.

Solo Preview desde commit limpio y smoke sin autenticación. Recibo privado de publicación registra SHA/URL/READY y comparación de Producción. Rollback: regresar al Preview de `657eb71` o revertir este commit y volver a publicar Preview; no requiere restaurar datos.
