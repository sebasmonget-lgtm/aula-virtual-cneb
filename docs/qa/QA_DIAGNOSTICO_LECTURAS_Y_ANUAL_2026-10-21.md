# Iteración diagnóstica y lectura del plan anual

Fecha de trabajo: 20 y 21 de octubre de 2026. Cuenta sintética QA autorizada. No es una validación ni certificación del MINEDU.

## Resultado observado

Se confirmaron diez entrevistas con sus ochenta respuestas originales y se conservaron las cincuenta observaciones activas. Se añadieron diez comentarios de revisión docente de demostración, sustentados en esos registros, sin nuevos hechos ni niveles. Los treinta pedidos de preparación/guardado/confirmación de comentarios tardaron entre 711 y 887 ms por niño, excluyendo autenticación inicial y lectura final de conciliación. No consumieron IA.

La conversación anual necesitó dos respuestas docentes y tres llamadas Luna. Se revisaron las quince propuestas del primer resultado anual completo, sus oportunidades, capacidades, apoyos y sustento. Hay retos concretos, decisiones infantiles y oportunidades coherentes de juego, conversación, lectura, escritura propia, construcción, movimiento y exploración. Se conserva la estructura acordada de quince proyectos de dos o tres semanas. La cuenta está simulada al 18 de diciembre: las propuestas pasadas quedan para consulta y solo resta un día para preparación. No modificar fechas de fuentes ni afirmar ejecución para simular un año iniciado en marzo.

El año fue confirmado mediante la interfaz como planificación; sus interpretaciones siguen pendientes de revisión individual y no acreditan niveles. El primer resumen diagnóstico generado se contrastó con sus referencias y se confirmó como muestra de QA tras dos ajustes de redacción docente. Su Word tiene quince páginas, incluida una final vacía. La lectura por competencias del generador anterior repite conteos y frases fijas, aunque la síntesis general de IA sí aporta decisiones concretas.

## Incidencia del servicio y consumo

Mirai: dos intentos anuales cloud (30 y 180 segundos), uno local con error del proveedor y dos intentos diagnósticos (120 segundos) no devolvieron contenido. No hay consumo monetario verificable de esos cinco intentos; ausencia de evento no significa costo cero. La comparación local usa el mismo commit limpio y peticiones autenticadas; no cambia Producción ni asigna identidades locales al servidor de Supabase.

La conexión original, manteniendo Sol 6.1 high, devolvió ID recuperable de la generación anual en unos 3,7 segundos. El resumen diagnóstico terminó en 65,5 segundos incluyendo HTTP y servidor. El año se recuperó por ID sin duplicar la generación. Hasta esos resultados se registran US$0,260661635 estimados, según el ledger y su versión de precios, más los cinco intentos sin costo conocido. La facturación del proveedor no se presenta como equivalente a la estimación. Luna y audio conservan su conexión.

## Cambios de esta iteración

- La propuesta diagnóstica incorpora una lectura breve y un siguiente paso por cada competencia con observaciones recibidas. Conserva alcance individual/subgrupo/falta de información y referencias directas de esa competencia; una entrevista no sustenta una actuación observada.
- El servidor vincula las referencias a IDs de registros autorizados sin enviar esos IDs de base de datos al modelo. La docente puede editar los textos. No puede sustituir referencias por otras ajenas a la propuesta; nuevas fuentes exigen actualizarla. La confirmación conserva una copia, sin reescribir informes anteriores.
- El editor moderno y el anterior muestran el mismo bloque plegable con los componentes y colores existentes. Se incorpora un acceso opcional al diagnóstico desde el resumen de observaciones, conservando el acceso directo a conversar con Ayni.
- Documentos y Word leen la misma interpretación y el mismo siguiente paso. Sin una lectura confirmada, el archivo dice que está pendiente; el conteo no se presenta como análisis. El propósito se refiere al corte real, y un recojo fuera de marzo se identifica como actualización.
- Las futuras planificaciones anuales reciben las lecturas revisadas como interpretación docente, nunca como nuevas observaciones ni niveles. Si su respaldo fue retirado, cambiado o dejó de corresponder a la competencia, no se reutiliza esa interpretación en el nuevo contexto.
- Los extractos literales terminan en una frase o palabra y señalan la omisión. No quedan citas cortadas como si fueran completas.
- El Word anual conserva la portada, tipografía y papelería. Resume nombres de competencias en la vista general y conserva sus nombres y capacidades completos en el desarrollo. Agrupa oportunidades en tablas legibles y conserva solo las fuentes citadas en propuestas/interpretaciones, con su numeración original; todos los registros siguen íntegros en Ayni. Mismo contenido confirmado, sin otra llamada de IA: render inicial de 54 páginas y primera maqueta revisada de 40.
- Se compacta el párrafo vacío autocerrado posterior a la tabla final, que el compactador anterior no retiraba y provocó una página final vacía.
- Se refuerza el prompt anual para que el campo de ajustes no repita fechas, bimestre y avisos que ya presenta el sistema.

No hay migración, cambio de datos curriculares oficiales ni modificación de observaciones originales. La interfaz y las plantillas mantienen el diseño de Ayni.

## Verificación y siguiente paso

Pruebas focales de síntesis, límites de alcance, referencias, guardado, confirmación, históricos, currículo y Word pasan. La prueba integrada rechaza IDs cambiados o de otra docente y conserva la copia confirmada tras abrir otro borrador. Typecheck y lint general pasaron antes del último ajuste de contexto; se repetirán en el checkout limpio de publicación junto al build. La maqueta anual se renderizó; todavía falta inspección visual completa de la versión final, nueva generación diagnóstica con el contrato ampliado y smoke de publicación. No declarar cerrada la auditoría completa: proyectos, actividades, evaluación e informes siguen pendientes.

La modificación concurrente de ai-execution-router-v4.mjs pertenece a otro chat y no forma parte de esta entrega. Rollback: restaurar el deployment QA anterior o revertir estos cambios de proyección/contrato, sin borrar entrevistas, observaciones ni versiones confirmadas. No tocar Producción.

Fuentes: Programa Curricular de Educación Inicial, apartado III; CNEB, evaluación formativa; guía de planificación Inicial 2019, p. 19; guía de proyectos 2019; cartilla de evaluación diagnóstica, pp. 4–7 y 13–24. Copias oficiales verificadas y referencias en QA_ITERACIONES_E2E_2026-10-20.md.
