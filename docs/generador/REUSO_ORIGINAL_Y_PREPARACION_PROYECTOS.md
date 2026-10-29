# Reuso del Ayni original y preparación completa — 25 de octubre de 2026

## Fuente comprobada

`git fetch origin` y `git ls-remote origin HEAD refs/heads/main` verificaron `sebasmonget-lgtm/aula-virtual-cneb`: ambos apuntan a `26e51f34954cc7c4dbd01b17338ba526240c9e65` (22 de octubre). El commit anterior de aplicación es `1946e799df0daf2ae6e1fb5d987755c185c387ee`; el último registra la publicación. No se encontró un main remoto posterior.

La tarjeta desplegable independiente «Ver detalle del proyecto» era una adición de la adaptación, no evidencia de un commit anterior. Se retiró. El generador usa directamente `ProjectDetailView`, `AnnualProjectPreview`, `AnnualCompactTimeline`, `ProjectCalendarReview` y `PreparationProgress` del original actual. `AnnualReviewSummary` se extrajo del resumen original para compartirlo. Los lectores/controles originales mantienen su comportamiento por defecto.

El recibo original registra https://project-0w0pq.vercel.app/; la asociación local `.vercel` corresponde a staging. La consulta con la autenticación disponible fue rechazada como inválida: **no se certifica el despliegue que sirve actualmente Vercel**. No se publicó nada ni se cambió el checkout original.

## Flujo y datos

La propuesta se guarda como borrador al abrir «Revisar Mi año», sin otro botón de guardar. Una revisión/confirmación permite continuar al proyecto; el año anterior se conserva. Un proyecto preparado ofrece «Abrir proyecto». Después se usa el calendario original: elegir días y confirmar una sola preparación.

Un adaptador conecta el progreso original con la cola V2. La aceptación abarca todas las actividades de esos días; el servidor aplica cada respuesta validada y continúa en lotes de hasta cinco. La primera actividad crea el maestro con las competencias de la propuesta anual. Sigue con la pestaña cerrada. No se inventan observaciones o niveles.

Sin migraciones nuevas: aceptación/fechas se conservan en la entrada privada de la cola, las aplicaciones usan recibos idempotentes y el final tiene un recibo durable. El JSON público no inyecta esos metadatos internos. Servidor valida modalidad, propiedad, año activo, revisión, fechas y competencias; se mantienen RLS y escritores originales.

Un fallo conserva las actividades guardadas y requiere retomar explícitamente. Consultar/recargar no reintenta. Una interrupción exige aceptar el posible consumo repetido. Cambiar fuentes impide aplicar la respuesta antigua. A diferencia de la publicación atómica V1, esta adaptación V2 conserva avance parcial; solo muestra «listas» cuando están todas las fechas aceptadas. No sustituye silenciosamente los días de una preparación iniciada.

## Conversación y validación

Política v7 reemplaza el cierre prematuro de v5/v6. Recoge entorno/comunidad, espacios, recursos/sectores, intereses reportados, prioridades anuales, familia, jornada y condiciones estacionales. Una pregunta por turno, sin diagnóstico ni repetir lo contestado. Busca contexto suficiente sin número fijo de mensajes; respeta la orden expresa de generar con lo disponible.

Cuatro llamadas reales aisladas: espacios → prioridad breve → contexto amplio pidiendo seguir → cierre expreso. Los tres primeros turnos siguieron preguntando sin invitar a crear; el final sintetizó contexto, recursos, restricciones y prioridades. No se enviaron nombres de niños. No certifica todos los diálogos posibles.

- `npm run test:documentos-generador`: 24 pruebas PASS, incluido HTTP completo, autorización, Word, ocho días, fallo/reintento, idempotencia, interrupción y cambio de año entre generación/aplicación.
- Regresión adicional: `annual-journey.test.mjs` y `multi-age-conversation-activities.test.mjs`, incluidas en una batería de 45 PASS antes de añadir las cinco pruebas del coordinador. No sumar repeticiones.
- `npx tsc --noEmit`, lint y build: salida cero. Conservados avisos previos del efecto diagnóstico, PGlite/eval, chunks y clasificación vinext.
- UI ficticia: año activo + borrador → confirmar y continuar → calendario → ocho actividades listas → descarga Word. Detalle original comprobado en escritorio/móvil. Se oculta el bloque de materiales si el año aún no los contiene, sin inventarlos.
- IA real: cuatro llamadas de chat y dos de actividades; **cero años reales nuevos**. Dos actividades y maestro guardados con mínimo dos competencias; el año de origen era editorial, confirmado solo para QA. Seis eventos de uso; coste registrado estimado USD 0.038899815, no factura.

Recibos en `output/generador-documentos/generador-iteracion-3-1792979206343/receipt.json` y `generador-proyecto-live-1792979639520/receipt.json`. Capturas: `output/generador-documentos/reuso-original-final/`; 06–08 confirman el resultado corregido. 01/02 preceden al asentamiento del viewport y no certifican móvil.

## Entrega y rollback

Preview restaurado en `generador-prueba-limpia`, IA real, web 5185/API 8805: colegio, cuatro alumnos, año activo revisión 3 y borrador revisión 4 intactos; cero proyectos/actividades QA. Conversación previa conservada; el aviso explica que los próximos mensajes profundizan el contexto. No se reescriben respuestas antiguas ni se regenera al consultar.

Solo `codex/ayni-documentos-pruebas`; sin commit, push, despliegue ni datos cloud. Rollback: detener este preview y retirar el adaptador UI/coordinador de la variante; conservar almacenes, cola, recibos y lectores para recuperar avances aceptados. No borrar planes ni resetear el checkout compartido. Continúa como prueba local; no se declara lista para producción.

## Revisión posterior solicitada: sin confirmar Mi año

El paso de revisar/confirmar descrito en este recibo se reemplazó por guardado automático tras la creación, según la petición posterior. Validación por clics en ambas modalidades, errores de navegación/cola corregidos, consumo y límites actuales: [RECORRIDO_MANUAL_SIN_CONFIRMACION.md](RECORRIDO_MANUAL_SIN_CONFIRMACION.md).
