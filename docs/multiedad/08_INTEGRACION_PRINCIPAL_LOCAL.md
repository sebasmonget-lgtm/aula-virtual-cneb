# Integración local de Unidocencia en Ayni

Continuación: `09_PERSISTENCIA_E_IA_LOCAL.md` incorpora almacenamiento local separado y propuestas recuperables. Las restricciones de memoria/IA manual de este recibo describen la fase 08; no equivalen al estado posterior ni habilitan cloud.

## Estado y base

Implementación local en `codex/multiedad-local-20261022`. La rama se adelantó desde `ae38b2c` hasta `origin/main` **26e51f3**, conservando los tres commits posteriores de QA (`4162301`, `1946e79`, `26e51f3`). El `main` local seguía en `a16d162` del 13 de octubre; no era la referencia reciente. No se modifica ese ref ni se hace push, despliegue o escritura cloud.

El trabajo previo se conservó en un stash propio antes del fast-forward y se recuperó completo. Se resolvieron únicamente los tres conflictos documentales conservando ambas entradas; la captura de observaciones conserva tanto la corrección de main como el contrato V2. El respaldo propio permanece disponible. Se preservan `.impeccable/critique/` y `output/`, anteriores a esta fase.

Esta entrega conecta el recorrido manual a la página y API principales. No equivale a activación persistente ni a soporte completo para producción. Sustituye el límite «sin integración principal» de los recibos 05–07 únicamente para esta ejecución local explícita.

## Elección inicial y conservación de las aulas

En la configuración inicial se elige **Una sola edad** o **Unidocencia**. Solo la segunda permite confirmar dos o tres grupos de 3, 4 y 5 años. El servidor exige la elección explícita `single_teacher_multi_age`, confirmación docente y una cuenta sin aula activa. No deduce la modalidad por cumpleaños, matrícula o cantidad de niños. Las aulas V1 no se convierten.

`/api/curriculum/entry` resuelve el contrato después de la autenticación habitual. Con la función apagada devuelve `enabled:false` sin consultar tablas V2. Un servidor anterior con 404 conserva el recorrido anterior; un error de red muestra recuperación y no elige otra ruta curricular silenciosamente.

El backend habilitado usa exclusivamente una base PGlite nueva en memoria creada por el guard del laboratorio. No abre `.local/pgdata`, acepta conexiones externas ni aplica SQL a Supabase. La activación de prueba se rechaza en producción, Vercel/serverless, Auth Supabase, PostgreSQL o escucha no local. Los workers anteriores no arrancan en este modo; las rutas V1 se bloquean para un aula V2. La identidad llega del contexto autenticado, nunca de un `teacherId` del formulario.

## Interfaz existente, sin otra navegación

La primera adaptación visual introdujo una navegación horizontal distinta y fue rechazada por la usuaria. La versión final reutiliza los componentes de Ayni sobre el main reciente:

- `TeacherWorkspaceFrame`: extracción del JSX existente de barra lateral, cabecera, contenedor principal, datos del aula y navegación móvil. V1 y V2 comparten el componente; los handlers y servicios de V1 se conservan.
- Los cinco destinos de siempre: Mi año, Hoy, Calendario, Evaluar y Documentos. Mi aula permanece en su menú; entrevistas/observaciones se abren dentro del aula.
- `AnnualCompactTimeline`, sus filtros de bimestre, colores y pictogramas existentes. El detalle seleccionado añade las oportunidades por edad.
- `DocumentTree` y `PageIntro`: mismas carpetas por año/aula y tipo, con apertura privada y descarga de la versión elegida.
- `PeriodEvaluationNavigation`: extracción de la navegación existente de Evaluación del bimestre, Informe a familias y Consolidado. Las conclusiones V2 se confirman en Informe a familias, después de las notas, conservando la decisión de `34ceb4b`.
- `ActivityReadingView`, controles Input/Textarea/Button, paneles, pasos de preparación e ilustraciones existentes. No se inventan materiales o actuaciones para rellenar el lector.

La hoja nueva contiene disposición de campos y variantes por edad; se retiraron la cabecera, navegación y paleta alternativas. La configuración V2 utiliza los estilos y pasos de preparación existentes y añade la elección de grupos. Algunas pantallas requieren adaptadores V2: no se entrega un aula multiedad a lectores que esperan una edad escalar.

## Recorrido disponible

Configuración → matrícula individual con grupo confirmado y nacimiento opcional → orientación y observación diagnóstica propias de cada edad → relato familiar textual separado → revisión docente con pendientes explícitos → borrador de Mi año de quince tramos → confirmación → actividad vinculada al plan/tramo/fecha lectiva → criterio individual por edad → observación cotidiana → valoración explícita por niño/competencia/bimestre → conclusión → informe familiar → consulta y Word.

Se conservan cuatro bimestres del calendario instalado de 2026. Las fechas institucionales no se inventan. Si la cuenta vacía ya provisionó su año, se reutiliza únicamente si sus fechas coinciden. Un cumpleaños no reasigna grupo. Un intento de capturar con criterio de otra edad o en otro bimestre falla. La API principal exige vínculo anual para preparar la actividad.

Los borradores se recuperan al recargar mientras el proceso siga abierto. Recibos idempotentes evitan duplicar solicitudes; el navegador conserva huellas e IDs, no textos infantiles. Navegar entre vistas conserva los formularios montados; abandonar o cambiar el destinatario de una observación sin guardar se advierte. Las fuentes cambiadas bloquean confirmación hasta revisión y nunca reescriben una versión histórica.

## Ejecución y verificación

`npm run dev:multiedad:app` abre la aplicación principal en `http://127.0.0.1:5175` y su API en 8795. El backend recibe un entorno local depurado, sin credenciales heredadas ni archivos env. Next en desarrollo puede leer su `.env.local` habitual, pero la URL pública de API se fija explícitamente al backend temporal. No se modifican esos archivos ni variables cloud.

El launcher usa Next con Webpack en Windows. Vinext dev falló con un error interno de su worker; no se cambió la configuración general para evitarlo. El build habitual Vinext pasó. Al detener el proceso se pierden los datos ficticios.

Ronda posterior a incorporar main: **160 pruebas distintas PASS**, sin fallos, cancelaciones o saltos: 41 multiedad, 7 de API principal, 25 de navegación/continuidad y 87 regresiones de los servicios afectados por los commits recientes. No se suman rondas anteriores. Typecheck, lint y build pasan; lint conserva una advertencia histórica en `diagnostic-generation-control.tsx`; build conserva advertencias de PGlite/eval, chunks y clasificación estática.

La API principal se probó desde configuración vacía hasta siete Word reales, con dos caminos de alta: multiedad y una sola edad. Se comprueban origen, identidad, reintentos, aula ajena, edad, período, borrador bloqueado, herencia anual, consulta JSON privada y textos propios en descargas.

Navegador real: recorrido manual completo inicial con tres niños ficticios, recuperación del borrador tras recargar, valoraciones/conclusiones/informes y una descarga nativa. Después de incorporar main y corregir la interfaz, se reinició la base temporal y el mismo recorrido API la pobló de nuevo; se comprobó la navegación original, línea de tiempo, carpetas y lectura anual. No presentar esa segunda preparación por API como otra matrícula manual. Se verificó que la vista de notas no muestra editores de conclusión y que el móvil conserva los cinco destinos.

Evidencias privadas en `.local/multi-age-main-20261023/`. Las capturas `mi-ano-ayni-escritorio.png`, `documentos-ayni-escritorio.png` y `evaluar-ayni-movil.png` corresponden a la interfaz reutilizada. Las capturas sin `ayni` muestran la propuesta inicial descartada y no son la interfaz final. Escritorio 1366 y viewport móvil 390; no celular físico. No se repite en esta fase el render Word completo de 45 páginas de la ronda 07 ni se declara apertura en Microsoft Word nativo.

## Lo que sigue pendiente

IA real/conversación y jobs V2 recuperables; persistencia y activación por cuenta en staging; diagnóstico grupal y cuestionario familiar completo; corrección versionada de notas/diagnósticos; varias actividades por proyecto y preparación con distintas competencias entre grupos; talleres; Word de proyecto/actividad y Excel V2; reorganización preservando proyectos; cierres/reapertura y transición de año; calendario institucional, ingreso tardío y otros años. El ejemplo editorial de Mi año requiere revisión; no es una planificación final generada para una escuela real.

## Rollback

Detener el launcher elimina su base temporal. Con el flag ausente, la aplicación conserva V1 y no consulta el esquema nuevo. Para retirar esta integración, retirar el gate y rutas V2 conjuntamente; los componentes de presentación extraídos pueden permanecer compartidos sin activar multiedad. No modificar ni borrar las migraciones preparadas, fuentes o snapshots para forzar un regreso a edad escalar. Una futura persistencia necesita su propio rollout, lector compatible, migración y smoke antes de cualquier publicación expresa.
