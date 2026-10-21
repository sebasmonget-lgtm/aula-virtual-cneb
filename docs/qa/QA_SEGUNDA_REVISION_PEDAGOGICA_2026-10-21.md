# Segunda revisión pedagógica — 21 de octubre de 2026

## Alcance y decisiones

Revisión de los 25 Word entregados y de los hallazgos compartidos por la usuaria. Se conservan quince proyectos de dos o tres semanas, lenguaje sencillo, diseño existente y decisiones docentes. El diagnóstico ya utiliza Sol 6.1 high: los defectos de fechas, seguimiento y presentación requieren corregir sus fuentes y lectores, no sustituir el modelo sin evidencia.

## Errores, causa y prevención

- Diagnóstico: la carátula reutilizaba el tramo inicial previsto aunque las observaciones eran posteriores. El lector compartido distingue recojo inicial, actualización, registros previos y períodos mezclados por fechas reales en Lima. Nuevas confirmaciones conservan el período inicial en su snapshot. Documentos y Word usan el mismo lector; históricos no se reescriben. La propuesta IA recibe el corte real. Pruebas cubren otro año, mes y cambio de día UTC.
- Seguimiento: el Word repetía una recomendación genérica aunque el comentario confirmado contenía planes individuales. Se muestran literalmente las frases de siguiente paso ya indicadas por la docente, también en Documentos. Si no existen, no se inventan. No se modifica el comentario canónico ni se deduce una recomendación por palabras clave.
- Asistencia: las categorías con cero confundían falta de registro con asistencia observada. Sin días registrados se muestra «Sin información de asistencia registrada», sin gráfica ni ceros; si existen registros los ceros reales se conservan. El denominador de la síntesis parcial son los días registrados. Aplica a interfaz y Word, sin cambiar registros.
- Actividad: apoyos generales del proyecto aparecían como ayuda específica de cualquier día. El Word conserva la mediación real de cada momento y solo añade apoyos propios de la actividad. El prompt exige pertinencia a sus materiales y actuaciones. Los apoyos generales siguen en el proyecto.
- Proyecto: una frase propia exigía conservar rígidamente la secuencia. Se permite ajustar preguntas, tiempo y apoyos; un cambio de lo que harán los niños se revisa con Ayni en el proyecto. Se conserva el flujo existente de secuencia confirmada. Comentarios escritos por docentes no se sustituyen.
- Plan anual: referencias numéricas interrumpían cada propuesta. Se trasladan a un anexo con correspondencia por propuesta, numeración y fuentes literales conservadas. No se regenera contenido pedagógico para un cambio de maquetación.

## Validación de código

56 pruebas de lectores, Word, fuentes, diagnóstico y asistencia; 110 pruebas funcionales de actividad, proyecto, evaluación, informes y aislamiento: PASS. Typecheck, lint y build Vinext: PASS. Se registraron tiempos mediante reloj monotónico y fechas UTC en recibos locales. Las pruebas incluyen AD, A, B, C, sin valoración y evidencia insuficiente; no equivalen a una nueva generación real de IA.

Pendientes al crear este registro: nuevas generaciones reales, revisión visual de Word, publicación y smoke QA, costo incremental, carpeta renovada y reporte final. No se declara Producción validada por esta entrada.

## Permisos y rollback

Sin migraciones, cambios de RLS, nuevas cuentas, envío de evidencias a IA ni publicación en Producción. Solo cuenta sintética autorizada para las comprobaciones remotas; casos adicionales en copia aislada. Rollback de código por reversión del commit; los snapshots confirmados y fuentes se conservan. No se revierten documentos o valoraciones de la docente mediante SQL.
