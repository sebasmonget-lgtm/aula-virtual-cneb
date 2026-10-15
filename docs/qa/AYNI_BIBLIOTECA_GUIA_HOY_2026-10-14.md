# Mi año, Biblioteca y guía de Hoy — 14/10/2026

## Alcance y base
Petición del usuario posterior a ec6383f: Biblioteca lateral con competencias, filtros simples, detalle ilustrado, mínimo dos competencias en proyectos nuevos, materiales definidos y guía en Hoy antes del inicio, observación guiada/libre y cierre al último momento. Rama codex/mi-ano-simple-preview; base documental a04b63f. Publicar únicamente Preview. Production y datos reales excluidos del QA.

## Implementación
- Biblioteca lateral responsive con pictogramas/competencias; actividades muestran competencias de sus criterios activos. Principal sin Ver lista. Herramientas internas conservan acceso a organización histórica.
- Detalle separado por parámetro projectDetail, retorno a la misma selección y lector ilustrado compartido con Documentos. Sin nueva generación ni otro catálogo.
- Consulta autorizada expone momentos y criterios guardados. Hoy los muestra antes de ejecutar. Confirmación de actividad fuera de fecha usa Dialog accesible; cancelar no inicia. Iniciar conserva occurs_on/programación y registra ejecución real.
- Materiales visibles y guía en tres áreas con contenido guardado, sin generar explicaciones ni observaciones. Último momento persistido; servidor calcula momentos canónicos, exige avance ordenado y rechaza cierre prematuro bajo lock del aula.
- Captura cotidiana conserva identidad obligatoria, texto literal, correcciones/historial y medios privados. Búsqueda y tarjetas de alumnos con área desplazable, botones Tomar foto/Seleccionar fotografía y vista previa. Fotos no enviadas a IA. Libre source_kind=spontaneous mantiene actividad pero no criterio/momento capturado; sugerencia/revisión curricular existente sin confirmar sola. Solicitud de sugerencia espera la que ya se esté preparando, evitando repetirla al abrir revisión.
- Sin registro cuenta atribuciones docentes vigentes y registros del año, incluso cuando la fecha prevista de la actividad cae en un bimestre posterior. No equivale a falta de logro.
- Generación anual inicial aplica regla de dos competencias con oportunidades completas y reparación localizada; chat conserva validación. Preparación nueva bloquea propuestas legacy incompletas antes de mutar. Replays publicados se conservan. Biblioteca puede recuperar originales para revisarlos; nunca agrega IDs ni reescribe trabajo histórico.
- Generación de proyecto rechaza recursos/materiales por definir/por seleccionar. Para lectura legacy, solo recupera recursos literales de su propio mapa o proyecto. Si proceden del proyecto se indica; si no existen se señala la falta. Ningún inventario se inventa.

## Validación ejecutada
- 83 pruebas focales PASS (annual-journey, annual-year-editor, document-library-service, activity-runner, activity-materials, project-flow-service, activity-today-execution, ordinary-observation-service, annual-proposal-intent, pedagogical-blocks, ordinary-evaluation-adapter, complete-project-preparation).
- 32 pruebas period-evaluation PASS. No sumar reejecuciones: 115 pruebas distintas.
- Typecheck, lint de fuentes y build Next ejecutados; recibo final de build/publicación abajo.
- UI/HTTP con PGlite local persistido y 35 alumnos ficticios, transporte QA local, cero llamadas pagadas. Ninguna petición QA autenticada a datos pedagógicos reales.
- Nominal guiada con foto ficticia guardada, medio recuperado privado; libre sin criterio conserva contexto. Las dos aparecen en Word descargado desde UI móvil (399582 bytes, OOXML con estructura e imágenes de plantilla). No se declara inspección visual nueva del Word.
- Completar en momento 2 devuelve 409. Navegación al momento 3, recarga conserva último momento, cierre explícito vuelve a jornada. Actividad preparada para 20 octubre registra ejecución 14 octubre, sin mover programación.
- Segunda actividad prevista 21 octubre: abrir/recorrer guía y cancelar confirmación no crea ejecución. Confirmar permite guía activa con observación guiada/libre; conserva fecha 21 octubre.
- Sin registro comprobado contra nota nominal de un bimestre anterior: ahora cuenta 1 y muestra Con registro.
- Mi año/Biblioteca/detalle/lista/Hoy/observación revisados en escritorio 1365×900 y móvil 390×844; ancho de contenido igual al viewport efectivo, sin desbordamiento horizontal. Búsqueda llega al alumno 35. Regreso desde detalle conserva selección y URL.

## Capturas locales (datos ficticios)
Carpeta `.local/guide-library-20261014`: year-desktop.jpg, year-mobile.jpg, project-desktop.jpg, project-mobile.jpg, today-preview-desktop.jpg, today-active-desktop.jpg, today-mobile.jpg, observation-mobile.jpg. Evidencia HTTP/Word/regresiones/build en la misma carpeta ignorada; no se sube material al repositorio.

## Límites
No se probó IA real de sugerencias: fixture sin JEV devuelve Sin propuesta y permite revisión docente; no hay atribución ni nivel automático. Permisos de cámara/micrófono y dictado real pendientes de QA humano. Propuestas antiguas con trabajo conservan su competencia histórica: no se transforma una actividad observada en otra competencia. Nueva preparación de propuesta incompleta exige revisión con Ayni. Sin migraciones ni datos reales modificados por QA.

## Publicación y rollback
Producto `0982f27ae7ab8c3563b6c1e214e025cfb196a8c6` publicado desde árbol limpio y subido a GitHub. Preview https://ayni-aula-staging-ejonmj27r-ayni4.vercel.app / `dpl_9tFBDXehzgCWMZpQ3hQWRFMZ7ZpC` READY, target null y SHA exacto. Build Next cloud PASS; 26 smoke PASS por CLI autorizada. Navegador abre el acceso docente Ayni; no se ejecutó QA autenticado sobre datos reales. Typecheck, lint y Next webpack build local PASS (compilación 18.5 s). Production reconsultada al cierre: mismo deployment/SHA indicados abajo. Helper local apagado; viewport restaurado. No se promueve a Production. Rollback: seguir usando el Preview anterior ec6383f (https://ayni-aula-staging-31l6t4dkj-ayni4.vercel.app/); no requiere revertir datos ni migraciones. Production esperada: dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7, https://project-0w0pq.vercel.app.
