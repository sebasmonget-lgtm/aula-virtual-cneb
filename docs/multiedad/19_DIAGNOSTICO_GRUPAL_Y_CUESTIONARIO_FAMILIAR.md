# Diagnóstico grupal y cuestionario familiar de Unidocencia

23 de octubre de 2026. Rama `codex/multiedad-local-20261022`, base `26e51f3`. Implementación exclusivamente local, sin publicación ni cambios remotos.

## Recorrido docente

En **Mi aula → Entrevistas y observaciones**, cada niño ofrece **Cuestionario familiar e historial**. Se reutilizan las ocho preguntas vigentes de Ayni: juegos e intereses, identidad/autonomía, convivencia, comunicación oral, lectura/escritura, matemática, exploración y contexto familiar/expectativas. Se conservan opciones de intereses y lenguas del contrato existente. Las respuestas son opcionales y no se hacen pruebas al niño. Para 3 años se precisa que no se exige escritura ni desempeños de otras edades. Marcar que escucha quechua u otra lengua no cambia automáticamente la aplicabilidad de Castellano L2 del aula.

**Guardar avance** conserva las respuestas en servidor, incluso después de reiniciar. **Confirmar cuestionario guardado** es una acción posterior, con reconocimiento de lo pendiente y motivo cuando existe una entrevista anterior. Se impide confirmar mientras haya cambios de ese formulario sin guardar. El avance no reemplaza el contexto confirmado ni invalida diagnósticos. Una nueva confirmación conserva la entrevista anterior, su texto y edad registrada. Los relatos libres anteriores se muestran en el historial; no se inventan ocho respuestas a partir de ellos. Las preguntas aún sin responder quedan identificadas como pendientes.

**Diagnóstico del grupo** presenta por 3/4/5 la cobertura de registros, lecturas individuales confirmadas y pendientes. La profesora redacta una síntesis por edad/competencia y elige las revisiones que la sustentan. No basta una entrevista familiar: las referencias tienen que ser revisiones individuales vigentes de esa misma edad y competencia. El número de fuentes se muestra explícitamente para evitar atribuir a todos lo observado en un niño. La organización compartida se guarda como intención docente y no como evidencia.

El grupo admite borrador recuperable, confirmación posterior e historial. Para confirmar, cada niño debe tener revisión individual vigente, incluso si reconoce información insuficiente y deja competencias pendientes. No se asignan notas ni se copian desempeños entre edades. Corregir entrevista, observaciones o matrícula vuelve obsoletas las lecturas dependientes; la versión confirmada anterior sigue consultable y descargable. Las correcciones familiares y grupales de versiones previas respetan el bloqueo de bimestres cerrados; los avances pueden conservarse sin aplicarlos.

## Conservación e integración

Se reutilizan las tablas canónicas `student_family_interviews` y `diagnostic_group_reviews`. Los confirmados conservan la inmutabilidad existente; borradores tienen revisión propia y huella para detectar otra pestaña o un cambio de matrícula. Recibos idempotentes y bloqueo de aula acompañan las escrituras. El endpoint anterior de relato libre rechaza saltarse un cuestionario en progreso. No se añade captura de fotos, documentos o audio ni transcripción automática.

La entrevista confirmada aporta texto atribuido a la familia, marcado `context_only`. Nunca se inserta como observación, evidencia curricular o valoración. El diagnóstico grupal congela matrícula, revisiones y cobertura por edad, referencias curriculares, identidad del aula y contextos familiares separados. La descarga histórica no reconstruye estos datos desde el perfil o matrícula actuales. La ausencia de desempeño específico, incluida escritura en 3 años y referencias transversales, conserva el referente de ciclo sin trasladar exigencias de otra edad.

Mi año recibe la síntesis confirmada solo si sigue vigente, con su versión y política de alcance. Una síntesis obsoleta se identifica como histórica y sus lecturas no se envían como actuales. Se mantienen las revisiones individuales como fuente y no se impone una confirmación grupal retroactiva a los planes anteriores. Cuando aún no existe síntesis grupal, se conserva exactamente la huella anual previa. Confirmar otra versión cambia las fuentes de propuestas nuevas; no reescribe proyectos, actividades, notas ni informes. Un trabajo anual encolado con fuentes anteriores se marca obsoleto antes de invocar al proveedor.

En **Documentos → Evaluación diagnóstica** aparecen los diagnósticos individuales y las versiones del diagnóstico grupal. Su Word conserva cobertura, lecturas y sustento individual por edad, organización docente y contexto familiar separado. El Word usa la papelería existente de Ayni. Los nuevos formularios reutilizan sus controles, paneles y estilos del cuestionario; no se modifican el editor familiar ni los flujos V1.

## Migración y autorización

Migraciones nuevas `0086_multi_age_group_diagnostic.sql` y `202610230008_multi_age_group_diagnostic.sql`. Añaden contrato documental a `diagnostic_group_reviews` con valor 1 para compatibilidad y una guarda específica V2 de docente/aula/año/grupos/snapshot. No alteran migraciones aplicadas ni convierten aulas o respuestas actuales. Se aplicaron únicamente en bases temporales de prueba y almacenamientos sintéticos locales.

El servidor resuelve la identidad autenticada y valida propiedad y fuentes. RLS conserva lectura propia y deniega escritura directa del cliente; la prueba con otra identidad no accede ni indicando el ID docente correcto. Las guardas SQL impiden usar un contrato incompatible. El Word de un aula archivada sigue consultable por su propietaria. Se mantienen el gate de Unidocencia y el arranque local aislado; no se usaron cuentas actuales de Supabase/Vercel.

Rutas nuevas: GET `/api/multi-age/diagnostic/questionnaire?studentId=…`, POST de `questionnaire/draft` y `questionnaire/confirm`; GET `/api/multi-age/diagnostic/group?classroomId=…`, POST de `group/draft` y `group/confirm`. El diagnóstico grupal tiene lectura y Word en `/api/multi-age/documents/diagnostic_group_review/:id[.docx]`, privados y sin caché compartida.

## Validación local ejecutada

**97 pruebas distintas PASS**, sin sumar repeticiones:

| Alcance | Pruebas |
| --- | ---: |
| Núcleo grupal/familiar local y Supabase temporal, bimestre cerrado y recorrido HTTP persistente | 14 |
| Word de actividad y proyecto, con historial e índice | 12 |
| Suite general multiedad | 41 |
| API principal/persistencia, cuestionario y diagnóstico V1, paridad SQL | 30 |

`npm run test:multiedad:diagnostico-grupal` final: 14 PASS en 32,3 segundos. `npm run test:multiedad`: 41 PASS. Las otras pruebas se ejecutaron con `node --test --test-concurrency=1`, usando `multi-age-activity-document.test.mjs`, `multi-age-project-document.test.mjs`, `multi-age-app.test.mjs`, `multi-age-persistent-app.test.mjs`, `family-interview-eight.test.mjs`, `family-interview-redesign.test.mjs`, `diagnostic-review-service.test.mjs` y `database-schema-parity.test.mjs`. Se incluyen preguntas vacías, edades/competencias cruzadas, IDs ajenos, doble envío, fuentes obsoletas, aislamiento, versiones inmutables y archivo de aula.

El recorrido HTTP crea una base nueva y confirma dos versiones grupales y dos entrevistas de cada niño. Reinicia con borradores familiares y grupales y después de confirmar. Nueve Word iniciales, la primera síntesis y todas las observaciones originales, actividades, notas, conclusiones e informes permanecen intactos. Las notas siguen vigentes. No hay trabajos IA nuevos, llamadas reales ni escrituras remotas. El proveedor usado por otras regresiones es explícitamente simulado; esta síntesis grupal se redacta y confirma manualmente. No se afirma haber implementado una generación IA grupal o un cuestionario público para que las familias respondan desde su teléfono.

`npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. Lint conserva la advertencia previa de dependencias de `useEffect` en `diagnostic-generation-control.tsx`; build mantiene los avisos anteriores de PGlite/eval, chunks y clasificación estática de rutas. Detector estático de los tres componentes V2 sin hallazgos. `git diff --check` correcto para archivos seguidos.

Se descargó el Word desde la API real local, se renderizó con el runtime autorizado/LibreOffice/Poppler y se inspeccionaron sus seis páginas finales. Se corrigieron cabeceras de tabla demasiado largas y se mantuvieron juntos título de edad, explicación y comienzo de tabla. Encabezados repetidos, filas sin recorte, fuentes y familias separadas. Una nueva ejecución final conserva exactamente el XML del cuerpo inspeccionado, comprobado por SHA-256. La plantilla original y los exportadores V1 permanecen iguales. No se certifica Microsoft Word nativo ni toda longitud posible de contenido futuro.

Work mantiene `Local browser use is disabled in Work settings`: no se realizó interacción ni inspección desktop/móvil de los formularios nuevos. Tipos, build, detector y HTTP no sustituyen esa revisión. No se eludió la configuración con otro automatizador.

## Preview, evidencias y rollback

Preview reiniciado en `http://127.0.0.1:5175/`, con IA apagada y la misma base `planning-b4e7d5c1-2028-4f2f-b0d3-727021910033`. Comparación antes/después: workspace completo, catorce documentos y huella de fuentes anuales idénticos; dos proyectos y cuatro actividades conservados. Los tres cuestionarios se abren con sus ocho preguntas e historia previa, sin crear borradores ni confirmaciones al consultar. No se confirmó un diagnóstico grupal automáticamente en esa base.

La demostración completa está en otra base ficticia, identificada por `.local/multi-age-main-20261023/diagnostico-grupal/receipt.json`. Allí se conservan `state.json`, `diagnostico-grupal-3-4-5.docx` y `render-final/`; `preview-before.json` y `preview.json` acreditan la conservación del preview anterior. Todos son datos sintéticos privados ignorados por Git.

Rollback: ocultar los accesos V2 y detener las escrituras nuevas, conservando lectores del historial y tablas canónicas. No borrar entrevistas, diagnósticos o recibos ni convertir datos a V1. Mantener la columna y guarda ya aplicadas; cualquier corrección posterior exige otra migración aditiva. Continúan pendientes revisión visual habilitada, grabación/transcripción V2, adjuntos/impresión familiar completa, enlace familiar externo, generación IA grupal revisable, talleres, calendario institucional, ingreso tardío, transición anual y staging con cuentas nuevas/Auth/RLS reales. Sin commit, push ni publicación.
