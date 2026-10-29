# Ayni Generador de documentos

Variante local de prueba solicitada el 25 de octubre de 2026. Reutiliza la interfaz y los motores de Ayni, en una copia de trabajo independiente. El objetivo es configurar el colegio y los alumnos, conversar sobre el contexto del grupo, preparar el año y los proyectos y descargar documentos editables sin registrar actuaciones diariamente.

## Aislamiento

- Carpeta propia: `C:/Users/ASUS/.codex/worktrees/ayni-generador-documentos/Asistente CNEB`.
- Rama: `codex/ayni-documentos-pruebas`, basada en `26e51f34954cc7c4dbd01b17338ba526240c9e65`, incorporando una copia de la implementación local multiedad existente.
- Web: `http://127.0.0.1:5185`. API: `http://127.0.0.1:8805`.
- Base exclusiva: `.local/multi-age-stores/generador-documentos`, dentro de esta copia. No se copia la base original, sus alumnos, archivos ni credenciales.
- El launcher conserva solo variables básicas del sistema; descarta conexiones Supabase, Vercel, Mirai y claves heredadas. Las dependencias instaladas se comparten mediante una junction de `node_modules`; código, base y salidas pertenecen a esta carpeta.
- No hay commit, push, despliegue, migración remota ni cambio de cuentas publicadas. La rama original conserva su trabajo anterior. Se retiraron solo los cambios de este generador de la carpeta original, con cotejo del contenido restaurado de 12 archivos y typecheck correcto.

## Recorrido

Entrada Generador de documentos → una edad o Unidocencia → colegio y aula → nombres y grupo curricular de los alumnos → conversación sobre Mi año → propuesta revisable → confirmación docente → proyectos y actividades → descarga.

La navegación ofrece Mi año, Documentos y Biblioteca. Mi aula permite corregir nombres y matrícula. No se exige registrar entrevistas ni observaciones individuales. Los aportes del chat son contexto o decisiones docentes, nunca evidencia observada. En multiedad se conserva la elección explícita de las indicaciones del chat que orientarán la planificación.

Los motores existentes preparan y conservan las versiones del año, proyectos y actividades. Los Word de planificación mantienen sus plantillas actuales. En Documentos se agregan siete instrumentos: nómina, diagnóstico del aula, observaciones, evaluación, conclusiones, informe familiar y asistencia. Se rellenan colegio, docente, aula, año, alumnos y competencias por edad. Notas, actuaciones observadas y conclusiones quedan vacías. La biblioteca reutiliza el catálogo y sus adaptaciones por edad, con guía Word y materiales PDF cuando existen.

El formato diagnóstico también incluye el contexto vigente del chat como información aportada por la profesora para planificar, claramente separado de resultados de evaluación. Una edad usa el contexto editable actual, sin recuperar ideas retiradas; multiedad usa solo las indicaciones seleccionadas expresamente. No se reutilizan respuestas del asistente como hechos.

## Ejecutar

Desde esta carpeta, `npm run dev:documentos:qa` abre el entorno local con simulación explícita del motor multiedad. Las respuestas simuladas sirven para comprobar el recorrido y no acreditan calidad de IA real ni contenido listo para un aula.

`npm run dev:documentos` permite la preparación manual. Para probar IA real, suministrar únicamente la variable de entorno propia `AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY` antes de ejecutar ese comando. No se almacena en archivos ni se envía al proceso del navegador. En una sola edad se conserva el motor de IA de Ayni, que requiere esa clave propia; el launcher no simula ese motor. No usar claves de las cuentas actuales. Esta entrega no hizo llamadas reales nuevas ni verificó facturación o latencia.

La prueba usa identidad local y datos ficticios. No es un registro público de cuentas ni una publicación. Se conserva el alta de cuentas existente para una futura integración con un entorno de Auth propio. Unidocencia conserva su restricción de desarrollo local; no se habilita en cloud.

## Permisos y persistencia

La modalidad se guarda en `profiles.preferences.ayni_product_mode`, sin migración. La identidad proviene de la autenticación de la solicitud. Las preferencias restantes se conservan y una cuenta con aula existente no se convierte. El servidor autoriza colegio, año, alumnos y documentos por docente y aula, además de las políticas RLS existentes. Se rechazan alumnos ajenos y edades no atendidas. No se aceptan rutas de archivos ni URLs de recursos del cliente.

Los instrumentos se descargan sin escribir observaciones, valoraciones, notas, asistencia o informes confirmados. Las tareas largas y las confirmaciones de planificación reutilizan recibos, fuentes, versiones y colas existentes. No se envían fotos ni grabaciones de menores a IA.

## Comprobaciones y límites

`npm run test:documentos-generador` verifica modalidad, aislamiento, selección de alumnos y bimestre, los siete Word, contenido de talleres, APIs de una edad y multiedad, conversación guardada y año/actividad multiedad sin diagnóstico. Generación simulada, no IA real.

Regresión ejecutada: 58 pruebas de año, fuentes del chat, diagnóstico multiedad, adaptación de prompts, documentos y talleres. Typecheck, lint y build Vinext ejecutados; lint conserva una advertencia histórica de `diagnostic-generation-control.tsx`. Las advertencias de PGlite y tamaño de chunks del build son previas.

La revisión de navegador usa datos ficticios y anchos de escritorio/móvil. Evidencias bajo `output/generador-documentos/ui`; Word de QA bajo `output/generador-documentos/word`. No es una prueba en teléfono físico.

Cierre ejecutado: 11 pruebas del generador y 58 regresiones relacionadas correctas. Typecheck, lint y build finales correctos, con la advertencia histórica de lint y advertencias de dependencias/build indicadas. El selector muestra Ana Prueba, Luis Prueba y Sofía Prueba en sus grupos 3/4/5. La guía de lectura de cinco años se descargó desde la interfaz y tiene un DOCX válido de 11 831 bytes. Tras detener y volver a iniciar exclusivamente el API/web de esta variante, se conservaron el mismo ID de aula, los tres ID de alumnos y la modalidad documents. Se repitió el cotejo de los doce archivos restaurados de la carpeta original sin diferencias. La captura final de la web está en `output/generador-documentos/ui/documentos-final.png`.

En la primera entrega faltaba `soffice.exe`, por lo que la paginación quedó pendiente. La revisión posterior extrajo un convertidor verificado exclusivamente para QA y renderizó 18 DOCX (87 páginas), con revisión visual y correcciones de orientación, continuidad y edad. Se comprobaron también 252 variantes de talleres y 90 materiales PDF. Detalle y límites en [REVISION_PLANTILLAS_2026-10-25.md](REVISION_PLANTILLAS_2026-10-25.md). La comprobación usa LibreOffice y no acredita paginación idéntica en Microsoft Word.

Se conserva el calendario nacional instalado de 2026; las fechas de otro año no se inventan. Unidocencia admite calendario institucional explícito según sus restricciones existentes. Falta probar el recorrido completo de una sola edad con IA real, Auth/RLS remoto en cuentas nuevas y revisión pedagógica de documentos reales.

## Rollback

Detener `dev:documentos` o `dev:documentos:qa` detiene exclusivamente sus dos procesos. La base de prueba se conserva en esta copia. La carpeta original no depende de esta rama. Para abandonar la variante, conservar primero los datos o documentos de prueba necesarios y archivar su worktree mediante el gestor; no borrar la carpeta original ni su base. No hay migraciones que revertir en cuentas publicadas.
