# Documentos comunes de Ayni

Fecha: 28 de octubre de 2026. Implementación local; sin publicación ni cambios de cuentas.

El original y el generador usan la misma política editorial y la misma presentación de plan anual, proyecto y actividad. Sus entradas siguen siendo distintas. La evidencia observada del original no se convierte en contexto ficticio ni se exige en el generador.

## Estructura compartida

| Documento | Contenido común |
| --- | --- |
| Plan anual | Datos escolares, calendario y vista general, distribución de competencias, organización, propuestas amplias y oportunidades cotidianas. El detalle diario se desarrolla por proyecto. |
| Proyecto | Situación significativa, reto, propósito, planificación con los niños, ruta breve por día, revisión final, competencias con criterios y evidencias por edad, referentes, enfoques, materiales, organización y apoyos. |
| Actividad | Datos escolares y fecha, propósito y materiales, Inicio, Desarrollo y Cierre con acciones claras, decisiones de los niños, apoyos, competencias con criterios y evidencias, referentes y tabla nominal de observaciones vacías. |

Se conservan los colores, portadas, ilustraciones, tablas y tipografía aprobados. Las capacidades oficiales que ya aprovechaba el original se incorporan al sustento curricular de ambos; no se repiten dentro de los pasos de aplicación. Para una sola edad los apoyos se agrupan con los criterios, evitando una página aislada solo para apoyos. Los tres momentos de una guía breve se mantienen juntos cuando caben.

## Implementación y límites de compatibilidad

- `ayni-planning-document.mjs` adapta las fuentes originales V1 a la proyección estructurada que ya utiliza el generador y llama los mismos layouts. El mismo código está instalado en ambos checkouts, con prueba de equivalencia entre copias.
- `ayni-planning-policy.mjs` aplica las mismas reglas a los proveedores de planificación. El Master original incorpora `document_planning` y cada día `child_decisions`; estos campos se conservan hasta el documento y su actividad. No añade preguntas ni confirmaciones a los flujos existentes.
- Las capacidades proceden de la base oficial local versionada, congelada en `curriculum/official/initial-capacities-v1.json`. Se completan solo cuando coincide la versión oficial; no se inventan desempeños ni se mezclan edades.
- `planningExportRoster` consulta nombres y edades con titularidad de aula/año en servidor. La captura del generador sigue congelada en la fuente; el original captura la nómina autorizada para cada nuevo artefacto. Un cambio de nombre crea otro artefacto sin sobrescribir el anterior.
- Los talleres, fichas y recursos vinculados del original se conservan. Las observaciones y la reflexión realmente guardadas aparecen en un anexo diferenciado; no rellenan las casillas vacías destinadas al trabajo en Word.
- Hoy y la ejecución diaria mantienen sus servicios. Los informes, diagnósticos y cierres no pasan por este adaptador.
- Los contratos históricos sin información estructurada suficiente conservan su lector anterior. En particular, los proyectos/actividades del contrato experimental multiedad V2 sin `documentPlanning`/`activityPlanning` no se presentan como documentos nuevos completos. No se fabrican apartados ausentes para simular equivalencia.
- En el generador, los documentos anteriores a las presentaciones prácticas actuales mantienen su salida histórica. En el original se conservan los artefactos inmutables ya emitidos; una descarga nueva puede usar la presentación común sin modificar la fuente pedagógica.

## Validación ejecutada

Original: suite final de 61 pruebas aprobadas, más la nueva prueba vertical del Master y comprobaciones focalizadas de política/compatibilidad. Incluye Word, biblioteca, artefactos, autorización, contratos de planificación, Hoy y exportaciones multiedad. Typecheck, lint y build aprobados. Lint conserva una advertencia preexistente en `diagnostic-generation-control.tsx`.

Generador: 53 pruebas del módulo documental, seis pruebas comunes y una prueba focalizada del nuevo Master aprobadas. Typecheck, lint y build aprobados; la misma advertencia preexistente.

La prueba nativa V1 normaliza datos escolares, criterios y ruta y compara cada parte descomprimida del Word con la entrada estructurada equivalente. Comprueba referencias de otra edad rechazadas, permiso de descarga, registros reales separados, taller conservado, nombres de alumnos, casillas vacías, caché estable y conservación del artefacto anterior.

Además se reexportó contenido ficticio ya generado con IA real en una prueba anterior: anual de quince propuestas, proyecto de cuatro competencias y actividad inicial para tres edades. Ambas instalaciones produjeron todas las partes Word idénticas. Esto comprueba presentación con contenido real; **esa primera comprobación no incluyó una generación nueva con IA del original**. La prueba posterior sí generó un proyecto y cinco actividades con cada motor; su método, resultados y límites se detallan en `PLANNING_DOCUMENTS_REAL_QA.md`.

Se renderizaron y revisaron las páginas de las muestras comunes: anual 13, proyecto 8 y actividad 5, más el caso técnico de taller vinculado de 3 páginas. Las parejas comparten el mismo contenido OOXML. No se observó texto recortado ni tablas fuera de página. Las muestras técnicas no sustituyen una evaluación de cada futura salida de IA.

Después de reiniciar únicamente la variante local, la comparación por API verificó identidad exacta de planes, workspace y 16 ámbitos de chat: cuatro alumnos, 36 turnos y 75 cuerpos Word conservados. No se generaron ni editaron proyectos de la docente. El original no se desplegó.

## Reversión

Respaldos de los archivos iniciales en `.local/planning-unification-20261028` de cada checkout. Para revertir, retirar exclusivamente el despacho a la presentación común y las adiciones de esta ronda, conservando las modificaciones previas del árbol de trabajo. Los lectores antiguos permanecen disponibles y no hay migraciones de datos. No usar un reset global: ambos checkouts tenían cambios anteriores.

Comprobación adicional de arranque: al consultar `/health` con Next en desarrollo apareció un error de compilación previo en la resolución `new URL('../', import.meta.url)` del factory local multiedad. Se sustituyó por `path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')`, que conserva la raíz de migraciones sin pedir al bundler un directorio como recurso. La portada local y la salud de la API dedicada respondieron 200. Se repiten las pruebas de fábrica/exportación multiedad y los gates después de este cambio; `/health` del frontend de la variante no se usa como prueba de la API dedicada.

Presentación actual: `ayni-planning-common-v2`; política compartida: `ayni-planning-documents-v3`. El cambio de presentación crea una clave de artefacto nueva y conserva los archivos inmutables ya emitidos.
