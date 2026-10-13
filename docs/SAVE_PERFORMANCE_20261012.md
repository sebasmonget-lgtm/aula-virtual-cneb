# Guardado de Ayni: intervención focal del 12/10/2026

Código publicado: 2fc3114, únicamente [Preview](https://ayni-aula-staging-aqpfius7c-ayni4.vercel.app), despliegue dpl_CaPsLw1oFEjCYNt2jghADCe3rsCf READY. Comparación contra e91a255 y sus mediciones remotas previas del mismo día. Producción conserva dpl_2KDEnPFk7UqyvPa7At3t1RW7sLqy / d595ffebd05d50a1971c8389f4c3d758f22a39a7. Sin migraciones, cambios de permisos, reloj o llamadas nuevas a IA.

## Comparación desde la acción hasta confirmación visible

Todos los tiempos en segundos. Cada celda contiene promedio / mediana / máximo. Altas y ediciones alcanzan el objetivo en promedio, pero conservan máximos superiores a dos segundos. Las otras cinco operaciones no lo alcanzan todavía.

| Operación | n antes y después | Antes: promedio / mediana / máximo | Después: promedio / mediana / máximo |
| --- | ---: | ---: | ---: |
| Guardar entrevista | 15 | 4.49 / 4.45 / 5.02 | 2.52 / 2.36 / 3.02 |
| Confirmar entrevista | 5 | 3.88 / 3.72 / 4.65 | 2.45 / 2.43 / 2.57 |
| Observación libre | 10 | 5.08 / 5.41 / 5.67 | 3.51 / 3.46 / 3.92 |
| Observación guiada * | 5 | 3.97 / 4.00 / 4.34 | 5.20 / 4.98 / 6.09 |
| Observación con foto | 5 | 7.23 / 6.95 / 7.99 | 6.05 / 6.06 / 6.75 |
| Agregar niño | 5 | 3.18 / 2.94 / 3.75 | 1.66 / 1.52 / 2.29 |
| Editar niño | 5 | 3.13 / 2.97 / 3.78 | 1.54 / 1.37 / 2.21 |

* Guiada: el total observado empeoró y no demuestra mejora de experiencia visible. La automatización tardó aproximadamente 0,99 s en iniciar HTTP y 1,77 s en detectar el cierre del diálogo tras la respuesta, frente a 0,43 / 0,23 s antes. Se cambió la comprobación del cierre durante el diagnóstico del instrumento y hubo un reinicio de su sesión; no es una comparación estrictamente equivalente de latencia visual. Un control adicional después del reinicio, sin cambiar código, dio 3,41 s totales, 3,16 s HTTP y 0,21 s después de HTTP. No se reemplazaron las cinco muestras por ese control favorable. Puede existir demora real de interfaz además del instrumento; estos datos no permiten separarlas con precisión. No se hicieron cambios especulativos a la interfaz.

## Petición HTTP: tramo comparable

El mismo intermediario Node mide envío remoto a Preview hasta lectura completa del cuerpo. Incluye conexión/protección de Vercel, subida, servidor y vuelta; excluye demora deliberada de los controles de errores. No es tiempo puro de Supabase ni del motor SQL.

| Operación | HTTP promedio antes | HTTP promedio después | Reducción HTTP |
| --- | ---: | ---: | ---: |
| Guardar entrevista | 3.49 | 1.59 | 54.5 % |
| Confirmar entrevista | 3.78 | 2.39 | 36.8 % |
| Observación libre | 4.98 | 3.46 | 30.5 % |
| Observación guiada | 3.31 | 2.43 | 26.5 % |
| Observación con foto | 7.11 | 5.52 | 22.4 % |
| Agregar niño | 3.10 | 1.62 | 47.8 % |
| Editar niño | 3.05 | 1.49 | 51.1 % |

## Dónde se concentra la demora después

Promedios en segundos. Conexión DB y consultas son mediciones del servidor mediante Server-Timing. Consultas incluyen espera de red hacia Supabase, ejecución y transferencia; no se midió CPU del motor SQL por separado. Snapshot es un subconjunto de DB y no se suma otra vez. Total servidor contiene autenticación y otras operaciones, por lo que sus componentes no deben sumarse con él.

| Operación | Acción → HTTP | Auth | Conexión DB | Consultas DB | Storage | Servidor total | HTTP menos servidor | HTTP → detección visible |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Guardar entrevista | 0.93 | 0.17 | 0.23 | 0.96 | 0.00 | 1.35 | 0.23 | 0.01 |
| Confirmar entrevista | 0.04 | 0.17 | 0.15 | 1.79 | 0.00 | 2.14 | 0.25 | 0.02 |
| Observación libre | 0.04 | 0.15 | 1.00 | 1.98 | 0.00 | 3.16 | 0.30 | 0.01 |
| Observación guiada | 0.99 | 0.18 | 0.14 | 1.79 | 0.00 | 2.17 | 0.27 | 1.77 |
| Observación con foto | 0.23 | 0.16 | 0.72 | 1.93 | 1.23 | 4.08 | 1.44 | 0.30 |
| Agregar niño | 0.03 | 0.18 | 0.20 | 0.94 | 0.00 | 1.32 | 0.29 | 0.01 |
| Editar niño | 0.04 | 0.16 | 0.14 | 0.93 | 0.00 | 1.24 | 0.25 | 0.01 |

La demora principal de libre está en consultas (~1,98 s) y conexiones DB (~1,00 s); en confirmación, consultas (~1,79 s). El patrón de ~0,12 s por consulta sugiere peso relevante de los viajes a Supabase, pero no prueba cuánto es red o ejecución SQL. El autoguardado conserva su debounce de 900 ms: explica casi todo el tramo acción → HTTP. Una conexión reutilizada puede costar menos de 1 ms; varias conexiones nuevas costaron 0,68–1,40 s. No se amplió el pool ni se quitó autenticación para alcanzar una cifra.

El intermediario se midió directamente en un control final: 0,9 ms antes de enviar y 2,3 ms tras leer la respuesta; no explica segundos de espera por sí solo. El tramo HTTP menos servidor incorpora red, protección/entrada de plataforma, transferencia del cuerpo y medición del intermediario. No permite separar esos factores exactamente. El Server-Timing guiado antiguo comenzaba después de autenticar, mientras el nuevo incluye autenticación: sus totales de servidor no son directamente comparables; HTTP y duración de snapshot sí lo son.

## Cambios concretos

- Alta/importación: UUID estable por intención y recibo SHA-256/IDs en JSON existente del perfil. Recibo y alumnos se confirman en una transacción bajo locks de aula y perfil. Repetir la intención devuelve el mismo alumno; otro UUID admite nombres idénticos. Payload distinto con la misma clave devuelve 409. Inserción agrupada y respuesta compacta de padrón evitan recalcular el dashboard completo.
- Ambos formularios actuales conservan el UUID durante reintentos y lo renuevan tras éxito. La API sigue admitiendo clientes anteriores sin clave para compatibilidad, pero esos clientes no pueden distinguir un reintento de otra alta legítima; la garantía de idempotencia requiere enviar clientRequestId.
- Once lecturas del contexto se agrupan en una única sentencia consistente. Snapshot permanece síncrono y serializado por alumno: promedio guiado de 1,49 s antes a 0.72 s después. No se pasó a segundo plano porque no existe aquí una cola durable que garantice ejecución y frescura.
- Los borradores de entrevista no recalculan contexto confirmado; confirmar reutiliza datos de autorización/borrador ya leídos bajo lock. Se conservan versiones y registros históricos.
- Instrumentación acotada a guardados; sin SQL, IDs ni contenido pedagógico en headers. Compresión y Storage privado se conservan. El éxito completo de matrícula con foto espera la respuesta de foto, y un fallo parcial conserva reintento separado con el ID ya guardado.

## Fotografías

Misma imagen ficticia de la prueba anterior, comprimida a JPEG de 689.604 bytes. Subida a Storage: promedio 1,23 s, mediana 1,01 s, máximo 2,29 s; es duración de fetch en servidor hasta respuesta de Storage. Decodificar en servidor promedió 7,4 ms. El tramo HTTP menos servidor promedió 1,44 s y contiene, entre otros factores, el transporte de la imagen a Preview.

La preparación en navegador, incluyendo interacción del selector de archivos y automatización, dio promedio 0,89 s, mediana 0,34 s, máximo 3,02 s. Antes: promedio/mediana ~0,34 s. La mediana se conserva; el máximo nuevo es un valor atípico del instrumento y no una medición aislada del codec. Los tiempos de guardar foto de la tabla comienzan en Guardar, después de preparar la imagen. No hay instrumentación histórica de Storage para afirmar que la subida por sí sola mejoró; la mejora del guardado completo se explica principalmente por menos trabajo de contexto.

Recuperación autenticada: 200, JPEG idéntico por SHA-256; petición anónima: 401. Replay guiado con foto devuelve el mismo registro y elimina la subida redundante. Sin enviar fotos a IA.

## Pruebas y límites

50 mediciones principales: 15 autoguardados (cinco selección, cinco escritura, cinco texto transcrito), cinco confirmaciones, diez libres (cinco con competencia y cinco sin), cinco guiadas, cinco fotos, cinco altas y cinco ediciones. Cinco mediciones adicionales de preparación de foto. Se reutilizó la transcripción anterior para medir su guardado; no se volvió a ejecutar dictado físico ni una llamada a IA. Selección: promedio 2,36 s; escritura 2,26 s; transcripción insertada 2,95 s. Libre sin competencia: 3,67 s; con competencia: 3,36 s. Conexiones distintas impiden atribuir esa diferencia a la competencia.

Mismo intermediario, navegador y Supabase remoto; aula/cuenta ficticias nuevas, sin usar alumnos QA existentes. Controles de errores y diagnóstico del instrumento quedan fuera de promedios principales, conservados en artefactos. Muestras pequeñas, sin carga concurrente controlada ni percentil 95; tiempos incluyen variaciones de conexión y automatización y no garantizan rendimiento en todos los dispositivos.

Pruebas focales PASS: typecheck, lint de archivos cambiados, build Next webpack local/cloud, servicios de matrícula/contexto/versiones/adapter/almacenamiento privado y seis smoke remotos. Dos POST simultáneos de alta con una clave devolvieron el mismo ID; otra clave con mismo nombre produjo un ID distinto; replay después de editar conservó ID; payload modificado devolvió 409. Doble clic UI produjo un registro. 503 antes de enviar y respuesta perdida después del commit conservaron formulario y reintentaron sin duplicar. Dos observaciones guiadas concurrentes permanecieron en el contexto actual; comprobaciones de todas las fuentes libres/guiadas y entrevistas confirmadas fueron positivas.

Control de indicador: se retuvo una respuesta válida 10 segundos en el intermediario. A los 5,83 segundos, después del commit remoto pero antes de recibirlo el cliente, el botón seguía «Guardando…», deshabilitado y sin éxito. Después de recibir la respuesta apareció una sola fila y desapareció el indicador. Captura privada: .local/save-optimization-20261012/busy-child.png.

Limpieza confirmada: 83 filas exclusivamente de fixture, 12 alumnos, seis objetos de Storage y cuenta temporal retirados. Inventario final: cero filas/fotos del fixture. Credenciales temporales locales retiradas; intermediario detenido y pestaña propia cerrada.

Producción y huella de seguridad/RLS/triggers/constraints permanecen iguales. Padrón, entrevistas, aula y perfil QA conservaron sus huellas. La huella completa de QA no fue idéntica: cambiaron ai_pending_generations, ai_usage_events, diagnostic_experience_observations, diagnostic_group_reviews, diagnostic_spontaneous_observation_decision_events, diagnostic_spontaneous_observations y student_context_snapshots durante la ventana. Todas las escrituras de este ensayo se autenticaron con la cuenta ficticia y su limpieza se limitó a ella. La comparación detecta actividad ajena al fixture, pero no permite atribuirla a un autor; no se declara que todo el historial QA haya permanecido inmutable ni se intenta revertir esos cambios.

Rollback: volver al código anterior conserva esquema y registros; no requiere revertir datos. No se amplió la intervención: quedar por debajo de dos segundos en todas las operaciones exigiría resolver latencia de conexión/consultas o reducir más trabajo transaccional con un diseño aparte. La medición guiada requiere repetir con un instrumento estable antes de concluir sobre latencia visible; no se añadieron ciclos extensos para perseguir el umbral.

Artefactos privados reproducibles: .local/save-performance-20261012/ (antes) y .local/save-optimization-20261012/ (después), ui.json, http.json/http-final.json, results.json, recibos de fiabilidad/contexto/cleanup y deployment-check.json. No contienen credenciales activas del fixture.
