# Dos iteraciones del chat y recorrido local — 2026-10-25

Se trabajó únicamente en la variante `codex/ayni-documentos-pruebas`. Las dos iteraciones hicieron cuatro llamadas reales de conversación en total, sin reintentos ni generación anual pagada. El recorrido visual usó otro almacén y proveedor simulado, identificado en pantalla. No se publica ni se modifica el checkout de Ayni original.

## Iteraciones reales

| Versión | Cambio y prueba | Resultado revisado |
| --- | --- | --- |
| v4 | Reconocer respuestas cortas como «solo salón y cuentos»; ofrecer comienzos viables y continuar desde la elección docente. Dos turnos reales. | Ofrece acogida/convivencia, explorar aula o cuentos. Al elegir acogida/convivencia resume y señala Crear Mi año, sin repetir recursos ni pedir diagnóstico. |
| v5 | Aplicar la última corrección explícita; distinguir aportes familiares tentativos de recursos confirmados; conservar orden vigente. Dos turnos reales. | Inicialmente reconoce «podrían traer» como posibilidad. Tras la corrección excluye patio/huerto, no pide compras ni apoyo familiar y cambia de plantas a acogida seguida de cuentos. Cierra sin más preguntas. |

Las cuatro respuestas pasan los controles acotados y una lectura semántica manual: ninguna pide diagnóstico, inventa logros ni afirma haber generado el documento. La conversación v5 se conserva en v6, que añade el mínimo de dos competencias a la generación anual por petición posterior. La regla de correcciones también pasa al generador anual; no se hizo una nueva evaluación semántica de un año completo con IA real.

Recibos íntegros (solo datos ficticios):

- `output/generador-documentos/generador-iteracion-1-1792974425546/receipt.json`
- `output/generador-documentos/generador-iteracion-2-1792974457386/receipt.json`

Repetición expresa y acotada: `node scripts/iterate-generator-chat-live.mjs --confirm-live --iteration=1|2 --key-env=RUTA_LOCAL`. Cada ejecución permite como máximo dos llamadas, conserva sus salidas y no imprime la clave. El archivo de clave se selecciona localmente; nunca se guarda en el repositorio ni en estos recibos.

## Recorrido visual

Almacén `generador-qa-recorrido-20261025`: entrada → modalidad Unidocencia → colegio y edades 3/4 → matrícula original de Ayni con dos niños ficticios → chat compartido original → Crear Mi año → respuesta lista → revisar → guardar borrador → revisión docente → confirmar → preparar actividad del proyecto → revisar y confirmar → Documentos → lectores y descargas → Biblioteca por edad y búsqueda.

Se descargaron desde botones de la interfaz seis archivos: nómina, año, proyecto, actividad, guía Word y materiales PDF. Los cinco Word son ZIP/XML válidos, llevan el colegio y no tienen marcadores sin resolver. La nómina incluye ambos nombres; año/proyecto/actividad no llevan nombres individuales. La guía filtrada por 4 años incluye solo el alumno de esa edad. El PDF descargado tiene cabecera PDF y 493258 bytes. Esto verifica descarga/contenido estructural, no una nueva inspección página a página en Microsoft Word. Los exportadores no cambiaron; la revisión visual extensa de plantillas permanece en `REVISION_PLANTILLAS_2026-10-25.md`.

Matrícula y Biblioteca se revisaron en escritorio 1440×1000 y móvil 390×844, sin desbordamiento horizontal. Mi año conserva timeline, ilustraciones, vista previa, controles de preparación y confirmación originales. Capturas y recibos: `output/generador-documentos/iteraciones-recorrido/`.

Un segundo almacén nuevo, `generador-qa-alta-final-20261025`, confirmó la corrección de alta: entrando desde Biblioteca, guarda las edades 3/5 con autosave activo y lleva a «Añade a tus niños» (`#aula`), con conversación deshabilitada mientras no haya alumnos. No requiere diagnóstico.

## Fallos corregidos

1. **Edades vacías al guardar:** FormData se construía después de deshabilitar controles y esperar autosave. Ahora se captura al comenzar la acción, antes de `busy`, y se reutiliza en el adaptador.
2. **Salto de matrícula:** el alta conservaba el hash anterior y podía abrir Mi año. El éxito del alta del generador dirige a Mi aula antes de refrescar.
3. **Propuesta ya usada ofrecida otra vez:** el control recuperaba el trabajo listo aun después de guardarlo como borrador. El adaptador pasa el ID persistido del resultado usado; el control conserva su historial y no vuelve a presentarlo como pendiente de revisión. Comprobado tras recargar el año confirmado.
4. **Carpetas vacías del acompañamiento diario:** el árbol original admite ocultar carpetas vacías solo cuando se usa desde el generador. Los formatos opcionales para completar en Word siguen accesibles.
5. **Título del proyecto confundido con actividad 1:** los proyectos nuevos del generador toman título y propósito de su posición anual confirmada; cada actividad conserva su propio título. Prueba de regresión valida los dos documentos. La primera muestra visual se creó antes de esta corrección y conserva honestamente su versión; no se reescriben archivos confirmados. El modo diario mantiene su comportamiento anterior.

## Verificación y límites

- `npm run test:documentos:chat`: 28 PASS.
- `npm run test:documentos-generador`: 19 PASS, incluida la regresión de título y el aislamiento del almacén QA.
- `npm run test:multiedad:proyecto-word`: 9 PASS, con versiones y reinicios en ambos esquemas temporales.
- `npx tsc --noEmit`, lint, build y `git diff --check`: salida cero. Lint conserva un aviso previo en `diagnostic-generation-control.tsx`; build conserva los avisos previos de PGlite/eval, chunks y clasificación de rutas de vinext. Recibo: `output/generador-documentos/iteraciones-recorrido/validacion-final.json`.

La prueba de la usuaria se restauró con IA real: aula `7339ad51-809b-4123-bead-c11bbc136004`, cuatro alumnos, una actividad, tres documentos y los cinco trabajos previos, ninguno pendiente. Los cuatro turnos nuevos de esta ronda pertenecen únicamente a los almacenes sintéticos.

## Petición posterior: carga visible, prueba limpia y dos competencias

La pantalla original «Ayni está preparando tu año» aparece desde el clic, mientras se guardan indicaciones y se encola el trabajo, y continúa durante queued/running. No se agrega una demora ficticia ni se muestra un año antes de recibirlo. Se comprobó el clic real en la prueba simulada: estado «En curso», mascota, avance estimado y revisión al terminar; captura `08-carga-inmediata.png`. Sus quince proyectos tienen dos competencias distintas por edad (`dos-competencias.json`); la vista previa muestra ambos chips (`09-dos-competencias.png`).

El servidor rechaza guardar una propuesta del generador con menos de dos competencias por edad. El nuevo maestro del proyecto conserva todas las competencias de su posición anual aunque la primera actividad seleccione solo una; una regresión comprueba esa diferencia y sus documentos. El modo de una edad reutiliza la validación de dos competencias del Ayni original. El primer selector de actividades del generador comienza con todas las oportunidades del proyecto; las siguientes actividades pueden seleccionar un foco. La conversación del proyecto también recibe documentsOnly.

Se crea `generador-prueba-limpia` con el colegio y cuatro alumnos de la prueba anterior, mediante los servicios originales, sin copiar planes, proyectos, actividades, chats ni trabajos de IA. La fuente queda intacta. `prepare-clean-generator-trial.mjs --confirm-local` valida destino sin aula propia y rechaza sobrescribirlo. `npm run dev:documentos:desde-cero` ahora selecciona esta prueba limpia; para la clave de texto se sigue necesitando la selección local explícita habitual. No hereda cuentas remotas. La demostración de carga y sus proyectos simulados se conserva exclusivamente en el almacén QA, separado de esta prueba limpia.

Cierre de esta ampliación: 19 pruebas del generador, 28 de chat, 9 de proyectos/Word y 20 del año original PASS (con solapamientos); typecheck, lint y build PASS. Se mantienen los avisos previos indicados arriba. La aplicación queda ejecutándose con `--from-zero --clean-start`, IA real y cero proyectos/planes/actividades/documentos/jobs en la prueba limpia, con sus cuatro alumnos. Estado verificado por API en `estado-prueba-limpia.json`. No se hicieron más llamadas reales; las cuatro de chat pertenecen a las dos iteraciones iniciales.

No se certifica un flujo de autenticación cloud: se usa identidad docente local. No se aplican migraciones ni se crean observaciones, notas o conclusiones de niños. Los historiales previos se conservan; los mensajes antiguos no se reescriben. Los cuatro turnos reales son una muestra acotada y el recorrido simulado no acredita calidad semántica del año real.

Rollback: volver la política a v3 y retirar los adaptadores opcionales de esta ronda; conservar almacenes, recibos y documentos confirmados. No regenerar ni borrar datos automáticamente. La referencia de método sigue siendo [OpenAI: Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering), aplicada mediante escenarios concretos, sin cambiar modelo o proveedor.

## Revisión posterior: contexto amplio y reuso exacto del original

La valoración anterior del cierre después de dos respuestas breves queda superada por la política v7 y la petición posterior de mayor personalización. Se retiró el acordeón propio, se reutilizaron detalle/calendario/progreso originales, y se probó preparar todas las actividades del proyecto. Evidencia vigente, límites y rollback: [REUSO_ORIGINAL_Y_PREPARACION_PROYECTOS.md](REUSO_ORIGINAL_Y_PREPARACION_PROYECTOS.md).
