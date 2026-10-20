# Descarga de material infantil — 19/10/2026

Base `738d0cb04597e60c50ae4f4325642d587475e3cd`, rama `codex/qa-corrections-20261019`. Cambio posterior autorizado al revisar el PDF de Nina. La nueva petición de cierre autoriza commit y push del conjunto pendiente; no pide publicar en Vercel.

## Comportamiento final

- «Material para imprimir · PDF» descarga únicamente los recursos infantiles del taller: cuentos, fichas, tarjetas o apoyos. La guía docente sigue disponible en Hoy y el Word existente.
- La biblioteca y Hoy solo muestran ese enlace cuando hay material para la edad correspondiente. Una URL directa de un taller sin material devuelve error claro en vez de un PDF vacío.
- El manifiesto de fichas oficiales es compartido por el generador y la disponibilidad en pantalla. La ficha de la mesa para muñecos corresponde a 4 años, no se ofrece a las otras edades.
- Se conservan autenticación, propiedad del aula/alumno, logo opcional, encabezado escolar, texto nativo, integridad de las fichas oficiales y los enlaces antiguos. No se modifica ningún snapshot ni documento guardado.

## Evidencia ejecutada

- 100 talleres, 246 variantes: 77 con material imprimible generado como PDF A4; 169 sin material infantil rechazan la descarga. Todas conservan preparación y tres momentos para Hoy. No se inventan fichas para los talleres que no las necesitan.
- Nina: descarga real desde la biblioteca local, una página de cuento, sin las dos páginas docentes anteriores. Render Poppler inspeccionado; texto legible e ilustraciones conservadas. Archivo `outputs/qa-print-only-20261019/Cuento-de-Nina-solo-imprimible.pdf`.
- UI local real con diez alumnos ficticios: biblioteca de 5 años, Nina seleccionable y descargable; modelado mantiene propósito, preparación, materiales y momentos sin enlace de impresión. En Hoy se abre adivinanzas: preparación, materiales, observación libre y primer momento presentes, más descarga del material infantil. No se programa ni ejecuta un taller nuevo.
- 30 pruebas PASS: `workshop-print`, `workshop-pilot-content`, `workshop-library-service`, `workshop-flow`, `workshop-route-persistence`, `direct-workshop-routes`, `daily-workshop-persistence`.
- 29 pruebas PASS adicionales antes del commit: `activity-observation-plan`, `activity-unified-word`, `annual-plan-redesigned-word`, `document-word-export`, `unified-word-template`, `project-preparation-http`, `project-calendar-boundary`.
- Lint, typecheck, build Vinext y build Next webpack PASS. Logs locales en `.local/qa-print-only-20261019/`.

## Límites y rollback

Comprobación local, sin nuevo despliegue ni escrituras cloud. Cero llamadas IA de Ayni en esta ronda; no cambia el acumulado de costos. No certifica un nuevo recorrido anual ni todos los documentos de la aplicación. El informe anterior de biblioteca conserva la evidencia de sus guías PDF conjuntas como antecedente; la decisión de producto actual las separa.

Rollback focal: restaurar solo el cambio de destino del PDF y su regla de disponibilidad en `workshop-print.mjs`, `workshop-print-material.mjs`, `WorkshopResources` y los props de edad, ajustando sus pruebas. Sin migraciones ni cambios a los datos. No restaurar todo el checkout ni perder las correcciones documentales/editoriales de las rondas anteriores.
