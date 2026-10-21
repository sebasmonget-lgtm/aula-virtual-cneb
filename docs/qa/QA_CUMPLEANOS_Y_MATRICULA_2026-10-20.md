# Matrícula y cumpleaños en Hoy y Calendario

## Alcance solicitado

Continuación del recorrido QA desde cero. La persona usuaria autoriza añadir diez niños con nombres naturales y generar retratos genéricos para cada uno. Después precisa que los cumpleaños deben aparecer dentro de Calendario con tortita y nombre, y dentro de Hoy con aviso del día y recordatorio del siguiente. No hay un destino nuevo en el menú.

La matrícula del enlace QA tiene diez registros y diez retratos generados íntegramente, comprobados después de recargar. No se utilizaron fotos de niños reales como referencias. Nombres, fechas y procedencia exacta de las imágenes se conservan fuera de Git en `outputs/ayni-recorrido-20261020/registro-ejemplo.json` y `avatares/procedencia.json`. El reloj QA ya estaba en 18 de diciembre de 2026: Mateo cumple ese día y Abril el 19, para verificar ambos casos. No se cambia el reloj para esta función.

Se guardaron tomas completas de la matrícula, con los nombres y fotos, y se abrió el paso Entrevistas y observaciones sin rellenarlo. Las diez entrevistas siguen sin iniciar, sin observaciones ni diagnóstico nuevos. `secuencia.json` distingue las tomas utilizables del siguiente paso pendiente de revisión; todavía no hay video generado. Esta autorización posterior supera la pausa histórica de matrícula registrada en la entrega del logo.

## Implementación

- Proyección determinista desde `students.birth_date`, únicamente de niños activos del aula autorizada. No guarda eventos duplicados ni requiere migración, IA o permisos adicionales.
- `student-birthdays.mjs` comparte la fecha y los nombres entre tablero y calendario. El tablero usa la fecha pedagógica del servidor (Lima o reloj QA); el recordatorio calcula el día siguiente sin desfase de zona horaria. La actualización compacta de matrícula vuelve a calcular los avisos de Hoy.
- El endpoint docente `/api/school-calendar` agrega cumpleaños del año visible y años adyacentes para cubrir semanas que cruzan enero/diciembre. Valida el año y propiedad del aula. `loadEffectiveCalendar`, usado por planificación y contextos de IA, conserva su contrato sin nombres de cumpleaños añadidos.
- Calendario muestra Cake y nombre corto en cada fecha de las vistas Mes/Semana, también en móvil. Al seleccionar el día aparece el nombre completo. No cambia feriados, gestión, días lectivos ni actividades.
- Hoy muestra los nombres completos junto a «Hoy es el cumpleaños de…» o «Mañana es el cumpleaños de…». El bloque se oculta cuando no hay avisos.
- Fechas ausentes o inválidas no producen avisos. Dos niños con igual nombre conservan sus identidades. Los nacidos el 29 de febrero mantienen su fecha original; en años no bisiestos el aviso se recuerda el 28 con aclaración visible. Es una decisión de producto, no una regla del CNEB.

## Validación ejecutada

Dieciséis pruebas PASS: cinco de cumpleaños (fechas, año nuevo, bisiestos, consulta real PGlite, cambios y retiro), dos de frontera HTTP (Auth simulado/PGlite temporal, fecha QA, respuesta docente y aislamiento entre cuentas), siete del calendario y dos de matrícula. No equivale a RLS real o smoke de una nueva Preview.

`tsc --noEmit`, lint, build Vinext y build Next webpack PASS. `git diff --check` PASS. Vinext conserva advertencias de dependencias y tamaño de chunks sin fallo del build.

Capturas de componentes reales con CSS del producto y un API local de solo lectura en `.local/qa-birthdays-20261020/`: escritorio 1440, móvil con viewport 390 (375 de contenido más scrollbar nativo) y ancho habitual del panel 1265. Se verificaron tortita/nombre, ambos avisos y navegación diciembre→enero→Hoy. No hubo desbordamiento horizontal en móvil. Las capturas están en `.impeccable/review/`, se abrieron y revisaron; no se incorporan al video como pantallas ya publicadas. Detector ejecutado una vez sobre los cinco archivos UI: cero hallazgos. Revisión independiente y contraste con el sistema existente se registran en los recibos locales de esta entrega.

## Publicación y rollback

La revisión independiente termina con `disposition: ship`, limitada a esta integración local y las seis capturas. No hay correcciones materiales pendientes dentro de ese alcance. El documentador compara los cinco archivos UI, las capturas y la procedencia de los diez retratos, y preserva el sistema existente. La ausencia previa de `.impeccable/design.json` se registra como drift documental sin crear un sistema nuevo ni modificar `DESIGN.md`. Recibos `finish-review.md` y `documentation-review.md` en `.local/qa-birthdays-20261020/`.

Función validada localmente; pendiente de solicitud expresa de publicación en QA y smoke del despliegue concreto. El enlace QA aún conserva la entrega del logo `fabda4b`. No se ha desplegado esta función ni modificado Producción.

Rollback: revertir exclusivamente la proyección de cumpleaños, sus dos presentaciones y pruebas. Las fechas y retratos de matrícula permanecen guardados; no requiere restauración de datos, borrar niños ni modificar documentos pedagógicos.
