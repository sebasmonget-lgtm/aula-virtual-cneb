# Word de actividades y estado de Unidocencia

Fecha: 23 de octubre de 2026. Continuación local autorizada, sin publicación. Rama `codex/multiedad-local-20261022`, base `26e51f3`; los cambios siguen sin commit. Este recibo completa la descarga individual de actividad y distingue el recorrido local de la preparación para un piloto remoto.

## Cambio terminado

En Hoy, el lector compartido `ActivityReadingView` incorpora el enlace **Descargar Word** junto a Volver a Hoy. Conserva el formato de Ayni, las tres etapas compartidas y los criterios de cada edad. La descarga contiene propósito, inicio/desarrollo/cierre, criterio, posible evidencia y momentos para observar por edad, más los desempeños oficiales referenciados. No incorpora nombres de niños, observaciones, relatos familiares ni valoraciones.

Se amplía únicamente el lector de documentos V2 con `activity`, en JSON y Word. `multi-age-activity-document.mjs` valida propiedad de aula y año en servidor, contrato 2 en actividad y maestro, confirmación, huella del maestro, criterios y vínculo con su criterio padre. Usa la identidad congelada del año confirmado; no reconstruye datos personales con el perfil o matrícula actuales. Los textos oficiales se toman del snapshot anual o del catálogo instalado **solo si coincide exactamente la versión confirmada del criterio**. Si faltan datos históricos o la versión requerida, la descarga se rechaza; nunca se sustituye silenciosamente por otro referente. El renderizador recibe un DTO puro y no consulta IA ni catálogo.

Las actividades actuales no se reescriben ni requieren migración. Se conserva la proyección histórica del año, con su nombre de institución/aula/docente, incluso cuando esos nombres cambian después. Una actividad que no conserva sus fuentes de exportación no se presenta como descargable por compatibilidad inventada. El índice de actividades en Documentos y el Word del maestro de proyecto siguen pendientes; el acceso completado en esta fase está en Hoy.

Permisos: consulta después de autenticación habitual, guard local V2 existente, joins de propietario y RLS del esquema correspondiente; respuesta Word `private, no-store`. Ninguna ruta V1 ni credencial se modifica. La descarga no escribe fuentes, trabajos IA, notas ni documentos duplicados en la base.

## Validación ejecutada

- `npm run test:multiedad:actividad-word`: **16 pruebas PASS**. Incluye documentos anteriores, HTTP persistente completo y cuatro pruebas nuevas de actividad. Comprueba criterios y referentes 3/4/5, ausencia de información individual, propiedad, consulta con aula archivada, identidad congelada, fuentes incompatibles y RLS local del esquema Supabase. Este último no equivale a probar Auth/RLS remoto.
- `node --test --test-concurrency=1 scripts/multi-age-app.test.mjs`: **7 pruebas PASS** adicionales. Verifica gate apagado sin depender del esquema V2, activación expresa, ruta V1 conservada e imposibilidad de convertir un aula existente desde el alta V2. Total de esta fase: **23 pruebas distintas**, sin sumar ejecuciones repetidas.
- HTTP: actividad JSON/Word antes y después del reinicio, XML idéntico; conserva los siete Word previos, observaciones, notas, informes, conversación y lote. También se mantienen las guardas de Origin y rutas heredadas.
- `npx tsc --noEmit`, `npm run lint` y `npm run build`: PASS. Lint conserva una advertencia histórica de dependencias de `useEffect`; Vinext conserva avisos anteriores de PGlite/eval, tamaño de chunks y clasificación estática. `git diff --check` correcto para archivos seguidos.
- Preview existente `areas-smoke-1792781906336`, con IA apagada: descarga de **Averiguamos cuántos bloques queremos usar**, ya preparada con IA real en la fase 13. Estado completo antes/después idéntico; cero llamadas IA nuevas. La prueba de exportación no convierte las actividades manuales de la base en actividades generadas.
- En navegador se abre la actividad y se descarga desde su enlace. Móvil emulado de 390 px, contenido/client width 375 px por scrollbar, sin desborde horizontal; botón visible y navegación de Ayni conservada. Se restablece el viewport. No es una prueba en celular físico.
- Word final de Matemática: tres páginas renderizadas e inspeccionadas completas con la plantilla existente. Se elimina la repetición de IDs dentro de los bloques de criterios que dejaba una referencia aislada en la página siguiente; los IDs y textos oficiales permanecen completos en el apartado de referentes por edad. No se certifica apertura en Microsoft Word nativo ni todo contenido futuro de longitud arbitraria.

Evidencias privadas: `.local/multi-age-main-20261023/actividad-word/receipt.json`, `document.json`, `actividad-tres-edades.docx`, `render-final/page-1.png` a `page-3.png` y `lector-mobile.png`. Python/Node/Poppler del runtime de la aplicación; en Windows, LibreOffice portable ya extraído para las fases anteriores en `.local/qa-tools/libreoffice/program`, sin instalación ni descarga nuevas y sin usar la instalación personal de escritorio. Intermedios de QA, no publicaciones.

Dos intentos de la nueva prueba negativa tropezaron con protecciones válidas: la base impide modificar un criterio confirmado y no permite duplicar la posición 1. Se corrige el fixture para comprobar la inmutabilidad y sembrar una copia incompleta en posición 2 exclusivamente en memoria. No se desactivan triggers ni se relajan guardas para acomodar las pruebas. La ejecución final completa pasa.

## Preparación para piloto

La estimación comunicada es **alrededor del 75 % para una versión de piloto**. Es un juicio de alcance, no un porcentaje calculado a partir de pruebas ni una fecha prometida. No se incrementa por contar llamadas o tests repetidos. El recorrido central local es utilizable con fuentes ficticias, pero todavía no equivale a toda la funcionalidad de Ayni disponible en producción.

| Recorrido | Estado comprobado |
| --- | --- |
| Elección explícita Unidocencia, matrícula y grupo 3/4/5 | Local, separado de V1; nacimiento opcional y grupo confirmado |
| Diagnóstico individual y contexto familiar separado | Local; propuestas IA y confirmación docente, pendientes explícitos |
| Mi año de quince tramos | Local, criterios/oportunidades propios por edad y fuentes conservadas |
| Conversación y preparación de varias actividades o lotes | Persistente local; maestro inmutable, revisión y confirmación atómica |
| Uso de IA real | Muestras acotadas documentadas en fases 09, 10, 12 y 13; no cobertura de todo el currículo |
| Registro, valoración, conclusión e informe por niño | Recorrido local, con decisiones docentes y criterios de su edad |
| Word anual, diagnósticos, familias y actividad individual | Local; actividad completada en esta fase |
| Interfaz Ayni y consulta tras reiniciar | Local; componentes compartidos y bases ficticias aisladas |

Orden de trabajo pendiente, sin iniciar varias áreas simultáneamente:

1. Consolidado/Excel V2 y cierre, reapertura y recierre con manifiestos e historia; comprobar que cada niño solo aporte su grupo y fuentes pertinentes.
2. Correcciones versionadas de matrícula, observaciones, diagnósticos y valoración/conclusión; edición del maestro y reorganización del año conservando proyectos preparados. Evitar sobrescrituras silenciosas.
3. Word del maestro de proyecto e índice de actividades en Documentos; completar diagnóstico grupal/cuestionario familiar, talleres y flujos cotidianos pendientes, calendario institucional, ingreso tardío y transición de año. La voz V2 sigue pendiente.
4. Ampliar revisión pedagógica de IA a otras competencias, materiales/contextos y lotes de cinco, con aceptación docente; repetir recorrido en celular físico.
5. Preparar y validar staging con **cuentas propias nuevas**, Auth/RLS reales, activación por cuenta, preservación V1 y recuperación de datos. No usar las cuentas existentes ni aplicar migraciones remotas como consecuencia de esta autorización local.

La publicación requiere una solicitud expresa posterior y los gates del proyecto. No hay commit, push, cambios cloud, migración nueva ni publicación en esta fase.

## Rollback

Retirar el enlace y las dos variantes de ruta `activity`, el despacho del lector V2 y la rama de renderizado de actividad. El lector nuevo y sus fixtures/pruebas se pueden retirar juntos. No hay datos que revertir, backfill ni migración que deshacer; maestros, actividades y registros existentes permanecen iguales. El gate global V2 sigue apagado por defecto fuera del comando local propio.
