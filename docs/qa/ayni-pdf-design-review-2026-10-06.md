# Revisión de diseño de Ayni — 2026-10-06

## Alcance y disposición

Extensión ordinaria del sistema visual existente. La revisión final tiene disposición **ship** para dos correcciones visuales en la preparación de un proyecto. No constituye autorización de despliegue ni aprobación visual o funcional del recorrido completo.

Se conservan `PRODUCT.md`, `DESIGN.md`, los controles compartidos, el shell y sus decisiones visuales. Este pase no crea un sistema, no genera un sidecar ni actualiza reglas globales a partir de una pantalla.

## Contrato observado

- **THESIS:** guiar a la docente con poca carga y acciones reconocibles.
- **OWN-WORLD:** modo Operate educativo dentro de la identidad existente.
- **STORY:** aula → conocer → contexto → año → proyecto → observar.
- **FIRST VIEWPORT:** reconocer el proyecto mediante título, imagen y propósito.
- **FORM:** shell y controles existentes, teal para acciones, blanco y pasteles para superficies.

STORY expresa el recorrido que orienta esta extensión; las capturas de este pase acreditan únicamente la pantalla de proyecto, no cada etapa del recorrido.

## Evidencia y correcciones puntuadas

Capturas finales de la preparación del proyecto ficticio «Invitación 2»:

- [Escritorio](../../.impeccable/review/desktop.jpg).
- [Móvil, página completa](../../.impeccable/review/mobile.jpg).
- [Móvil, primer viewport](../../.impeccable/review/mobile-viewport.jpg).

La revisión inicial pidió corregir la promesa del primer viewport y un texto de cabecera redundante. La revisión final dio por resueltos ambos hallazgos:

1. Título, imagen y propósito completo aparecen dentro del primer viewport móvil. El propósito precede al aviso del proyecto futuro; el aviso y «Quiero trabajarlo antes» se conservan, con la acción comprobable en las capturas completas.
2. Se eliminó «Mi año → Proyecto» y se retiraron los títulos redundantes de la preparación. La navegación existente conserva la orientación sin añadir otra cabecera.

El revisor no detectó regresiones visibles atribuibles a estas dos correcciones y declaró el alcance puntuado resuelto (`remaining clear`, `disposition: ship`). Esto no afirma ausencia de defectos en otras pantallas, estados o contenidos más largos.

La implementación correspondiente se observa en `src/features/dashboard/components/simple-project-workspace.tsx`: título principal directo, sección nombrada de propósito/preparación, imagen y propósito primero, y aviso futuro después de competencias. La composición cambia de columna en móvil a fila desde `sm`; no requiere una nueva plantilla visual.

El detector en `.local/pdf-design-detect.json` devuelve `[]`. Ese resultado es evidencia auxiliar del detector; no sustituye la lectura de capturas ni certifica PDFs exportados.

## Continuidad del sistema incumbente

Se contrastaron `PRODUCT.md` y `DESIGN.md` con `app/globals.css`, `components/ui/button.tsx`, `components/ui/textarea.tsx` y los componentes simples `simple-project-workspace.tsx`, `annual-journey-workspace.tsx`, `pedagogical-block.tsx` y `diagnostic-brief-review.tsx`. `project-pictogram.tsx` aporta la imagen decorativa reutilizada, sin introducir controles nuevos.

Resumen del sistema observado, sin convertirlo en un sistema nuevo:

1. **Paleta:** acciones y foco teal (`--primary: #087d96`); superficies blancas y fondos claros; jerarquía azul oscuro y texto secundario apagado.
2. **Tipo:** sans existente (Aptos, Segoe UI, Arial); título de proyecto `text-3xl`/extrabold, títulos de bloque `text-xl`/bold, cuerpo legible y texto secundario `text-sm`.
3. **Forma:** contenedores con bordes suaves y esquinas redondeadas; pictograma reconocible; bloques tonales para información, calendario y observación.
4. **Regla de continuidad:** reutilizar Button, AsyncButton, Textarea, controles de dictado y detalles desplegables del producto; la nueva composición conserva esa gramática.
5. **Regla de decisión docente:** presentar propósito y acciones reconocibles antes del detalle; conservar estados y confirmación explícita, sin inferir valoración pedagógica desde el diseño.

Los rótulos de estas dos reglas describen evidencia de continuidad en este informe; no añaden reglas normativas a `DESIGN.md`.

## Drift previo y límites

`PRODUCT.md` conserva doce propuestas y `DESIGN.md` describe doce tarjetas, con la lista como presentación inicial. La implementación anual ya ofrece mapa/lista y compatibilidad entre históricos de doce y editor de quince. Esa divergencia antecede a las dos correcciones puntuadas; se registra sin reparar documentos ni reinterpretar contratos guardados.

El texto de cabecera eliminado era un defecto señalado por el piso de calidad; su estilo no se canoniza como patrón para otras superficies. Tampoco se convierten los valores de la pantalla en reglas nuevas para justificar defectos.

Las capturas finales no acreditan por sí solas Mi año, diagnóstico, bloques de actividad, estados preparados/confirmados, audio, permisos, RLS, persistencia ni archivos Word/PDF. La inspección de código de esos componentes acredita continuidad de materiales y controles, no un QA visual de todas sus rutas. Este pase de documentación no ejecutó typecheck, lint, build, pruebas funcionales ni despliegue; sus resultados deben constar por separado en el cierre técnico correspondiente.
