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

## Resultados completados

Código 8525fb1 publicado en QA, deployment dpl_9P1Z9b9ajECRuXJakLuTso4fx1jx, región gru1. Checkout limpio y sincronizado para el release; typecheck 3,384 s, lint 29,269 s, build 16,023 s. Nueva comprobación diagnóstica: 14 PASS, incluidas formas futuras singulares con tilde; las 166 pruebas iniciales siguen siendo el conteo de casos de la ronda, no se suman las repeticiones. Preview y alias: 58 comprobaciones PASS en 62,047 s. Publicación Preview: 112,080 s. Hashes de los datos, 13 archivos privados e historial de uso preservados durante el release. Producción no cambió.

Diagnóstico versión 3 confirmado: registros del 15 al 18 de diciembre y recojo inicial previsto del 16 al 27 de marzo, separados. Once lecturas y diez siguientes pasos individuales literales, sin niveles. Intento 5 agotado a los 181,957 s HTTP; se pidió una síntesis más breve sin retirar fuentes ni validadores. Intento 6 válido: 107,337 s HTTP, 104,957 s de proveedor. Guardado 1,426 s; confirmación 3,258 s. No séptimo intento. Sol 6.1 high se conserva: no hay evidencia suficiente para prometer rendimiento estable o atribuir un problema de plantilla a falta de capacidad del modelo.

Dos actividades de la ruta local, en segundo intento total por día: 10,202 y 13,599 s. Indagación conserva anticipación y primer intento; conversación con registros no incorpora agua ni atención a derrames. Son propuestas aisladas revisadas, no sustituciones silenciosas de actividades confirmadas. Otros Word reutilizan contenido confirmado sin nuevas llamadas. En la copia local se confirmaron AD/B/C mediante rutas canónicas y se comprobó que veinte pares sin evidencia siguen pendientes; letras elegidas exclusivamente para prueba técnica. Las treinta A de la cuenta principal no cambiaron y no acreditan suficiencia de una sola actuación para calificar un bimestre.

Tres llamadas nuevas con precio conocido: USD 0,100660345; un intento nuevo con consumo desconocido. Total acumulado: 94 llamadas con precio, USD 0,93990492, más siete intentos sin precio verificable. No son factura ni costo cero para intentos interrumpidos. Catorce descargas remotas completas: 13,350 s acumulados, de 0,424 a 3,480 s por Word. No se midió por separado tiempo humano de revisión o interacción; no equivale a tiempo docente end-to-end. Medición global comenzó a las 06:50:06 de Lima, excluyendo lectura anterior.

Entrega renovada: outputs/Ayni-documentos-validados-2026-10-21-ronda-2, con 25 documentos pedagógicos y reporte. Los trece contenidos remotos distintos del nuevo diagnóstico son idénticos a los anteriores. Se corrigió además un fallo del helper privado de exportación local: pasaba tarjetas curriculares abreviadas; ahora carga la KB completa, como la descarga canónica. No era un cambio de desempeño oficial ni un defecto demostrado de la descarga remota. Nuevas capturas 012a–012f de escritorio/móvil preparadas para el video; no hay montaje de video. Cierre anual sigue abierto por noventa pares sin valoración; no se fabricó información para cerrarlo.

## Cierre de entrega

26 Word: 25 documentos pedagógicos, 187 páginas, más reporte de cuatro páginas. Revisión visual de 191 páginas: 96 idénticas en píxeles a páginas ya revisadas y 95 nuevas/modificadas inspeccionadas. Se limpiaron campos residuales de historias inactivas del reporte sin cambiar sus partes visibles. Sin marcadores de plantilla pendientes. ZIP de 13.741.941 bytes comprobado por CRC y SHA-256 de cada Word, con VERIFICACION.json, LEEME.txt, Costo-IA.json y Tiempos.csv (28 operaciones). La carpeta previa no se sobrescribió.

El reloj de empaquetado registra 52,36 minutos transcurridos desde el inicio de medición; no incluye lectura anterior ni equivale a tiempo docente o a suma de llamadas paralelas. Capturas/guion actualizados con versión 3: reemplazar carátula histórica 010c por 012e/012f cuando no hay asistencia; conservar dictado en español. El commit posterior de documentación no requiere otra publicación: el código servido y comprobado sigue siendo 8525fb1. No se declara estabilidad estadística del diagnóstico ni producción desplegada.
