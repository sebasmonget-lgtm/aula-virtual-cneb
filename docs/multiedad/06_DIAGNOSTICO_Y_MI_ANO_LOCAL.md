# Diagnóstico y Mi año multiedad · avance local

La siguiente ronda de documentos Word e historial local se registra en [07_DOCUMENTOS_Y_BIBLIOTECA_LOCAL.md](07_DOCUMENTOS_Y_BIBLIOTECA_LOCAL.md). Los pendientes y las cifras de esta página describen el cierre de la ronda anterior.

Continuación autorizada sobre `codex/multiedad-local-20261022`, base `ae38b2c`. Esta ampliación funciona en la prueba temporal de `npm run dev:multiedad`. No activa multiedad en la aplicación principal, convierte aulas, conecta cuentas ni publica. Complementa el [primer flujo vertical](05_AVANCE_LOCAL_FASES_0_A_2.md).

## Recorrido implementado

1. Matricular niños en grupos curriculares confirmados de 3, 4 y 5 años. También se prueban 3–4, 3–5 y 4–5 por servicio. Cumpleaños no mueve al niño de grupo.
2. Abrir el catálogo diagnóstico correspondiente a cada niño. Reutiliza las experiencias existentes, sus instrucciones, aspectos y referentes por edad; no aplica el catálogo de una edad al aula completa.
3. Registrar literalmente qué hizo o dijo y la fecha. Guarda la asignación, revisión, edad y referente de captura. El diagnóstico inicial no se convierte automáticamente en una valoración de período.
4. Guardar opcionalmente un relato familiar textual, separado de la evidencia observada. Es una fuente versionada; no implica entrevista completa del cuestionario actual ni acreditación de logros.
5. Revisar por niño. Cada lectura necesita IDs de observaciones propias de la misma competencia, suficientes para formular esa lectura según la profesora. Un registro marcado como información insuficiente no sostiene una interpretación. No se aceptan relatos familiares como observaciones, IDs ajenos ni campos de nota final. La profesora confirma explícitamente que las competencias restantes quedan pendientes. También puede revisar un niño sin observaciones y dejar todas pendientes.
6. Consultar cantidades por grupo y cobertura niño × competencia: matrícula, fuentes docentes y lecturas confirmadas. Son disponibilidad de información y revisión, nunca porcentajes de logro ni cuotas diagnósticas obligatorias.
7. Guardar Mi año como borrador, editarlo, recuperarlo tras recarga y confirmarlo por separado. Reutiliza el algoritmo instalado: dos semanas iniciales, quince posiciones, once de dos semanas y cuatro de tres, sin vacíos ni solapamientos lectivos. Las fechas y feriados las determina el código.
8. Cada posición conserva una invitación y organización compartidas y oportunidades identificadas por edad y competencia. El validador comprueba cobertura curricular de cada grupo entre propuestas y oportunidades cotidianas. La falta de desempeño específico, por ejemplo escritura a los 3 años, conserva el referente de ciclo y referencias vacías, sin copiar las de otra edad.
9. Preparar una actividad desde Mi año confirmado: conserva el ID y revisión del plan, posición, fechas del proyecto y huella del contenido. Solo admite una fecha lectiva de esa posición y competencias previstas para esa edad. La UI local prepara la primera posición; el servicio admite cualquier posición válida. No duplica proyectos al reintentar.
10. Continuar por los criterios propios del niño, observaciones ordinarias, valoración docente, conclusiones e informes Word del flujo anterior. Las pruebas HTTP recorren todo este circuito con tres niños ficticios.

La pantalla usa un ejemplo editorial claramente identificado. No afirma que ese plan genérico sea una propuesta pedagógica final validada ni que se haya generado mediante IA.

## Fuentes, cambios e historia

Las huellas incluyen matrícula, configuración curricular, aplicabilidad L2/religión, versiones de KB/catálogo, fuentes literales y revisión docente confirmada. La huella anual incluye además el calendario efectivo, roster y revisiones individuales. Una entrevista nueva, otra observación, una matrícula nueva o una revisión distinta obliga a revisar las fuentes antes de confirmar Mi año o preparar otra actividad.

Las versiones confirmadas conservan sus textos. Un borrador no reemplaza automáticamente al plan activo. Una nueva confirmación archiva el anterior solo en la misma aula/año y dentro de la transacción. Si el plan anterior ya tiene proyectos preparados, la reorganización queda bloqueada: todavía se debe implementar la conservación selectiva de posiciones protegidas. El plan y sus proyectos siguen consultables. No se intenta reparar esta situación convirtiendo edades o borrando fuentes.

Los registros diagnósticos V2 no se reescriben por SQL ni por el editor histórico V1. La corrección/retirada versionada y su interfaz completa quedan pendientes; se conserva el original. Las revisiones e entrevistas confirmadas usan las barreras de inmutabilidad existentes.

## Contratos y prompts

Implementación en `multi-age-diagnostic.mjs`, `multi-age-annual.mjs` y `multi-age-planning-generation.mjs`:

| Contrato local | Alcance | Protección |
|---|---|---|
| `AyniDiagnosticContext/v2` | Niño | Edad individual, observaciones propias, familia separada, pendientes explícitos. |
| `multi-age-diagnostic-local-v1` | Propuesta de lectura | Solo lecturas con fuentes; no notas finales ni confirmación implícita. |
| `multi-age-annual-local-v1` | Aula | Quince posiciones, oportunidades por edad, cobertura y organización de una profesora. |
| `AyniAnnualSlotChange/v2` | Una posición | Propuesta acotada; otras posiciones y oportunidades cotidianas conservan igualdad literal. |

Prompts nuevos conservan la distinción entre evidencia, relato familiar y decisión docente; prohíben inventar hechos, generalizar desde un niño o exigir tres acompañamientos exclusivos simultáneos. Los schemas y validadores comprueban estructura, alcance, edades, competencia, fuentes, cobertura y referentes. La viabilidad pedagógica del texto requiere revisión docente; estos controles no equivalen a una evaluación semántica real del modelo.

Se mantiene el router vigente para `diagnostic_individual_assist`, `annual_plan` y `annual_journey_repair`. Los adaptadores solo aceptan proveedor inyectado de prueba, sin credenciales/fábrica por defecto, escritura, retries ni llamada IA automática. La propuesta de cambio de una posición no toca el plan guardado y rechaza posiciones con proyecto preparado. No hay chat de IA conectado en la pantalla ni recuperación de trabajos de un worker todavía.

## Migración, autorización y aislamiento

Se agrega únicamente `0078_multi_age_diagnostic_annual.sql` y su equivalente `202610220003_multi_age_diagnostic_annual.sql`. No se editan 0076/0077 ni migraciones anteriores. Las tablas pedagógicas canónicas siguen siendo las mismas: observaciones diagnósticas, entrevistas, revisiones individuales y planes anuales. Las filas anteriores reciben contrato 1 y conservan sus columnas y textos anteriores; no se crean asignaciones curriculares para ellas.

Los triggers comprueban aula, docente, asignación activa, edad, revisión, grupos y año. Los documentos V2 rechazan escrituras directas de los roles cliente `anon`/`authenticated`; el servidor valida propiedad y usa la transacción con bloqueo de aula y recibo idempotente. Se verifican las políticas RLS existentes con dos docentes y claims/roles sintéticos. Esto no es una prueba contra Supabase Auth/Storage real.

Las migraciones se ejecutaron exclusivamente en PGlite nuevo en memoria, tanto con esquema local como con el esquema Supabase. Los servicios nuevos rechazan otros adaptadores. El servidor mantiene loopback, cookie HttpOnly/SameSite, validación Host/Origin, CSP y errores públicos sin detalles SQL. La entrada anual tiene límite de 2 MiB; las demás operaciones mantienen 64 KiB. No se leen `.env`, base persistente ni recursos privados de las aulas actuales.

## Validación

148 pruebas distintas PASS en esta ronda: 34 del comando multiedad, 113 regresiones existentes y 1 de paridad de esquema. Sin fallos, cancelaciones ni saltos. Los resultados de la ronda anterior permanecen en el documento 05 y no se suman como si todos se hubieran reejecutado ahora.

| Control ejecutado | Resultado |
|---|---|
| `npm run test:multiedad` | 34 PASS. Incluye diagnóstico/año, subconjuntos de dos edades, permisos, SQL/RLS temporal, actualización V1, prompts simulados, HTTP y Word familiar. |
| 13 archivos de regresión existentes, `node --test --test-concurrency=2` | 113 PASS. Diagnóstico/lecturas/fuentes, año/versionado/recuperación/edición/confirmación, observación/evaluación ordinaria e informe familiar. |
| `node --test scripts/database-schema-parity.test.mjs` (ejecutado junto al HTTP) | 1 PASS de paridad. Los tests HTTP repetidos no se cuentan otra vez. |
| `node node_modules/typescript/bin/tsc --noEmit` | PASS. |
| `npm run lint` | PASS, cero errores. Conserva una advertencia histórica de dependencia compleja de `useEffect` en `diagnostic-generation-control.tsx`. |
| `npm run build` | PASS Vinext. Advertencias existentes de PGlite/eval, tamaño de chunks y clasificación estática de rutas. |
| `node --check` de UI/servidor y `git diff --check` | PASS. |

Regresiones ejecutadas: `diagnostic-experiences-v4`, `diagnostic-sources-v4`, `diagnostic-student-review-v4`, `diagnostic-review-service`, `annual-journey`, `annual-journey-recovery`, `annual-planning-confirmation`, `annual-plan-version-service`, `annual-year-editor`, `annual-context-sources`, `ordinary-observation-service`, `ordinary-evaluation-adapter` y `family-report-v4`, todos sus archivos `.test.mjs`.

El HTTP comprueba fuentes por edad, familia separada, revisión, borrador recuperado, confirmación, actividad vinculada, tres observaciones/valoraciones/conclusiones e informes Word con textos y edades propios. Además verifica un borrador anual válido de más de 64 KiB y el aviso de calendario no soportado sin perder la matrícula. Se prueban rechazo de fuentes desactualizadas/IDs cruzados, referencias de otra edad, edad omitida, cobertura faltante, fechas inventadas, dobles envíos y protección de un plan con proyectos ante un reemplazo fallido.

Navegador real local: tres niños matriculados; orientaciones de 3/4/5; una observación y lectura sustentada para Ana, revisión con información explícitamente pendiente para Bruno y Clara; guardado, recarga y confirmación de Mi año; edición docente de tres criterios y confirmación de actividad vinculada. La captura muestra sus tres textos independientes. No se generaron notas automáticamente. Vista capturada de 1265 × 712; no se declara prueba en celular físico ni adaptación visual validada a todos los tamaños.

Evidencias locales no versionadas: `.local/multi-age-20261022/phase3-multiedad.tap`, `diagnostic-annual-regressions.tap`, `phase3-build.log`, `mi-ano-criterios-confirmados.png` y `mi-ano-tres-edades.png`. El proceso de navegador se inició antes de los últimos refuerzos de huellas/límite HTTP; la ronda HTTP final sí levanta el código final desde cero en cada prueba. La pantalla servida se recargó con el último JavaScript. Para revisar íntegramente el código final, iniciar una instancia nueva con `npm run dev:multiedad`; los datos de esa instancia comienzan vacíos.

## Límites y siguiente trabajo

- El entorno anual de prueba usa únicamente el calendario 2026 instalado y exige que el año del aula contenga sus posiciones completas. Calendario institucional, incidencias, ingreso tardío y preparación solo desde una fecha de incorporación requieren conectar la autoridad de calendario de la aplicación principal. El recorrido ficticio puede usar fechas de marzo aunque el reloj actual esté en octubre; no acredita ejecución pasada.
- Integración en las rutas/pantallas actuales, onboarding V2 persistente, conversión explícita de aulas y transición entre años pendientes. No activar estos servicios en producción ni aplicar SQL a un aula real como parte de este avance.
- El resumen grupal ofrece fuentes y cobertura por edad. La síntesis pedagógica grupal con fuentes trazables y la conversación libre no se sustituyen por contadores; faltan sus lectores/editor y trabajos recuperables V2.
- Falta adaptar y renderizar Word de diagnóstico/Mi año, Excel, biblioteca e históricos V2. Se verificó el Word familiar del recorrido completo; no se declara validación de los otros documentos.
- Falta edición de competencias/referentes y oportunidades cotidianas desde UI; hoy se validan por servicio y se muestran para revisión. La UI edita textos de las posiciones y su organización, guarda/recupera borrador y confirma.
- No hay IA real ni evaluación semántica del proveedor. El ejemplo no reemplaza planificación docente ni validación de calidad pedagógica.
- La base dura lo que dure el proceso local. Guardar permite recargar dentro de esa ejecución; no ofrece persistencia al apagar/reiniciar ni offline completo. Los campos aún no guardados no tienen autosave.
- Talleres, lotes/colas, cierre y reorganización de planes con proyectos preparados siguen en las fases posteriores. La fase 3 está implementada como recorrido local parcial, no como activación completa en la aplicación principal.

## Rollback

Detener el proceso de `dev:multiedad` elimina su base temporal. Conservar el diff y la documentación para revisión; no hay que revertir datos reales ni alias publicados. Si se retira este experimento del código, retirar conjuntamente sus servicios/UI y migraciones nuevas solo mientras no se hayan aplicado en un entorno persistente. Tras una futura aplicación persistente, cualquier reversión necesitará migración nueva y un lector V2; nunca quitar columnas o devolver registros multiedad a lectores de una edad.
