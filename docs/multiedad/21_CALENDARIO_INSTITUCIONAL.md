# Calendario institucional para otro año

Se conserva como opción predeterminada el calendario nacional instalado de 2026. Al crear un aula V2 se puede elegir un calendario institucional e indicar año, límites del año, referencia del calendario aprobado, cuatro bimestres y excepciones con motivo. La aplicación no infiere fechas oficiales futuras ni traslada feriados entre años.

La definición confirmada se guarda una sola vez en `multi_age_calendars`, con docente y fecha. El servidor valida fechas reales, año, orden, ausencia de solapamientos, excepciones únicas y el mismo distribuidor que usa Mi año. El recorrido vigente exige cuatro bloques de nueve semanas completas de lunes a viernes, dos semanas iniciales de acogida y quince tramos. Las exclusiones reducen los días lectivos sin cambiar la duración de las semanas; no pueden vaciar un tramo. Otros patrones institucionales requieren ampliar el distribuidor y continúan bloqueados con un mensaje de incidencia.

La definición queda asociada al aula/año y se consulta solo en V2. Los bimestres de evaluación, las fechas permitidas de actividades y talleres y el contexto anual usan ese calendario. El Word anual conserva su versión y autoridad institucional. No cambia el calendario ni las huellas de aulas 2026 ya creadas.

Migración aditiva 0089/202610230011. La variante Supabase agrega lectura RLS por docente y dueño del año y no concede escritura directa a usuarios; la variante local no crea roles ni simula Auth. Ninguna definición confirmada se modifica o elimina.

Validación ejecutada: tres pruebas. En ambos esquemas temporales, crear aula ficticia 2027, matricular edades 3/4/5, confirmar diagnóstico con información pendiente explícita, confirmar Mi año y preparar una actividad vinculada. Se verifica año del documento, quince tramos sin huecos, exclusión de un día ficticio, RLS, inmutabilidad y errores de solapamiento/semanas/exclusiones. El calendario 2027 de las pruebas es ficticio y no es una referencia oficial. Revisión visual de la aplicación pendiente por configuración Work.

Rollback: mantener los registros confirmados y deshabilitar la entrada institucional de la interfaz local. El calendario nacional 2026 conserva su camino anterior; no se reescriben planes, días, documentos ni aulas existentes. No se aplicó a cloud ni se publicó.
