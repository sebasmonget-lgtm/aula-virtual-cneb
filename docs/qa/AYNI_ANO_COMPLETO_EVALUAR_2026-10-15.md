# Año completo, actividades y Evaluar — Preview

## Resultado
Base 1c787e5/e9924eb, rama codex/mi-ano-simple-preview. Los años nuevos conservan quince propuestas con sus fechas completas, aunque la preparación comience tarde o el calendario ya haya terminado. Son previsiones anuales: no acreditan ejecución, evidencias ni evaluaciones pasadas. planning_scope=full_year identifica el nuevo contrato; las versiones y checkpoints anteriores conservan su contrato guardado.

Las propuestas pasadas se consultan sin Preparar/Cambiar; pueden reutilizarse mediante una copia identificada en un tramo futuro. El original y sus fuentes quedan intactos; el proyecto desplazado pasa a Biblioteca. La selección navega al bimestre destino. El servidor valida pertenencia, fecha, dos competencias, currículo, snapshot, protecciones y revisión; no admite retirar un proyecto protegido ni colocar la copia en el pasado. Preparación y ejecución rechazan proyectos terminados. No hay migraciones, cambios RLS ni reescritura de datos reales.

Biblioteca: «Otras propuestas» y «Elige otra para los días disponibles. Tu trabajo queda guardado». Cada actividad tiene Ver en Hoy y Ver detalles; ambos consultan sin iniciar. Se elimina el aviso permanente sobre una competencia heredada. Generación inicial, reparación y cambios siguen exigiendo dos competencias con oportunidades completas; aprobación de nuevas tarjetas y nuevas versiones futuras añaden validación del mínimo. Los registros históricos no reciben competencias nominales añadidas por código.

Evaluar conserva los módulos y selector existentes. Cambian su composición, ilustraciones originales y tarjetas verdes, lilas y crema. Los contadores proceden del overview autorizado; la docente confirma las valoraciones. Sin cambios al motor de evaluación ni generación masiva de informes durante QA.

## Comprobaciones ejecutadas
- 70 pruebas distintas PASS, repetidas después del último cambio: año tardío/terminado, contrato y cambios anuales, Biblioteca, creación/intención, preparación completa, ejecución, documentos y selección de período.
- Typecheck independiente, ESLint de fuentes y Next build --webpack PASS. Un import de node:crypto en un módulo compartido causó inicialmente un fallo de build/navegador; corregido a Web Crypto y verificado nuevamente.
- Fixture nueva PGlite con 35 niños ficticios y proveedor local falso: quince propuestas, todas con al menos dos competencias; confirmación anual; intento de preparar pasado rechazado 409; tres actividades futuras publicadas.
- UI: B1 contiene propuestas consultables sin Preparar/Cambiar; dos reutilizaciones en tramos futuros conservan la propuesta original y las quince posiciones. Segunda copia abre B4/proyecto 14 y publica dos actividades el 16 y 17 de noviembre. Pasado original: cero actividades.
- Ver detalles abre Actividad completa · Consulta. Ver en Hoy abre guía con Qué hacer y Desarrollar ahora, conservando la fecha y sin iniciar ejecución. Documento de actividad consultada conserva actual_execution_date=null.
- Evaluar: selección B3→B4, entrada a evaluación, Informe a familias y Consolidado; período conservado. No se generaron informes ni niveles.
- Escritorio 1440×1000 y móvil 390×844, sin overflow horizontal. Inspección por lotes y una confirmación tras corregir la selección del bimestre de la copia.
- Descarga Word anual 12 290 bytes; ZIP/XML contiene quince propuestas, proyecto 1 y 15 y el alcance «solo para consulta». Cero llamadas pagadas y ninguna mutación pedagógica cloud.

Capturas privadas ficticias:
- [Evaluar escritorio](../../.local/annual-full-20261015/evaluation-desktop.jpg)
- [Evaluar móvil](../../.local/annual-full-20261015/evaluation-mobile.jpg)
- [Actividades escritorio](../../.local/annual-full-20261015/activities-desktop.jpg)
- [Actividades móvil](../../.local/annual-full-20261015/activities-mobile.jpg)

## Límites y rollback
IA real, cámara y dictado cloud no probados. No se rellenan ni regeneran automáticamente versiones anuales anteriores; solo los años nuevos usan el contrato completo. No se alteran observaciones para conseguir dos competencias. Rollback: revertir el commit de producto en otro Preview; las versiones full_year mantienen su JSON completo y legible, sin esquema SQL nuevo. No se modifica Producción. Recibo de publicación a continuación tras verificar READY/SHA/smoke.


## Recibo de publicación
Producto 72c8f267fcf0b26b8c11985c38d24aac096212be / https://ayni-aula-staging-inidjd37e-ayni4.vercel.app / dpl_76dHj3ugwPnCfGDWU93f6Kxs1rEH, READY, target null y SHA exacto comprobados. Next cloud y 34 smoke PASS. Producción conserva dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7. Rama publicada en GitHub, sin promoción ni mutaciones pedagógicas cloud. QA local apagado y viewport restaurado. Las correcciones adicionales de Hoy se desarrollarán sobre este commit en otro Preview.
