# Recorrido inicial V2: cierre UX/UI

Fecha: 2026-10-03. Base remota comprobada: `18138c8e1385003e56fc0269edc409662af754d7`, `origin/codex/qa-ayni-v2`. Implementación en `codex/annual-year-map`; publicación autorizada únicamente en staging QA V2. Este informe no autoriza producción.

## Resultado y alcance

Familias → Observar → Matriz → Conversar con Ayni → Preparando Mi año → Mi año existente. Se conserva el teal elegido por el usuario, la mascota oficial y las garantías pedagógicas V2. Las tarjetas, mapa, calendario, feriados, semanas, detalle y navegación de un año generado/confirmado mantienen su implementación. El cambio en el workspace anual integra exclusivamente conversación y preparación.

- Familias: seis preguntas opcionales, chips múltiples y texto literal, dictado visible, progreso por preguntas, respuestas previas navegables, autosave y guardado parcial. La mascota acompaña en tamaño reducido. El guardado espera escrituras en curso y conserva los cambios posteriores. La entrevista confirmada anterior sigue vigente hasta la confirmación de una nueva versión.
- Compartir: enlace de siete días con capacidad aleatoria de 256 bits, solo su hash en almacenamiento. El fragmento URL evita transmitir la capacidad como ruta/query; las peticiones usan un header. Crear otro enlace revoca el anterior. El receptor accede únicamente al nombre de pila y a sus propias respuestas nuevas, nunca a entrevistas previas, fotos, roster u observaciones. La profesora revisa/importa y confirma por separado. No se enviaron enlaces a ninguna familia durante QA.
- Observar: dos caminos explícitos; alumno/foto privada de Mi aula, fecha/momento, texto/dictado y media privada opcional. Sugerir es una acción opcional previa al guardado, con cache y exclusión de requests concurrentes. Guardar confirma atómicamente las cero, una o dos competencias seleccionadas. No dispara otra clasificación. Editar competencia conserva eventos docentes append-only. La lista cuenta y permite leer también registros anteriores/de experiencias; su edición histórica conserva los lectores y módulos existentes.
- Matriz: todas las competencias aplicables, columna de alumnos sticky, scroll nativo visible y controles. Cero vacío, uno amarillo tenue, dos o más teal lleno, con texto accesible y leyenda de cantidad, nunca desempeño. Se puede avanzar con vacíos y registros sin competencia.
- Conversación: Luna recibe `AnnualPlanningBrief/v1` anonimizado, con fuentes, sujetos, negación, incertidumbre, lenguas, cobertura, contexto institucional, currículo aplicable y calendario. Pregunta solo una decisión útil; máximo una aclaración material. Estados `ready`, `needs_clarification`, `insufficient_core_information`. Las decisiones docentes literales siguen siendo preferencias, no observaciones. Persistencia privada, revisión CAS, huella de fuentes y lease; refresh consulta sin IA. Un fallo conserva la conversación y permite reintentar.
- Preparación: cinco checkpoints reales del pipeline existente, mascota oficial, animación discreta respetando reduced-motion, sin porcentaje ficticio. Información y decisiones comparten la etapa real de fuentes. Un fallo de revisión conserva la generación; refresh y reintento retoman la etapa afectada.

## Datos y permisos

Migraciones nuevas: local `0070_student_profile_photo.sql`, Supabase `202610030001_student_profile_photo.sql`. Añaden únicamente `students.profile_photo_path` nullable. No se modificaron migraciones aplicadas, corpus, calendarios ni RLS.

La migración Supabase se aplicó únicamente en el proyecto aislado de staging `ayni-aula-staging` (`eetdkmmspicboijcmnzv`). Una transacción comprobó cantidad de alumnos y hashes completos de planes anuales/entrevistas antes y después. RLS de students continuó activo; se conservó el único plan anual remoto existente. Se verificaron columna y registro de migración. La rama predeterminada de ese proyecto puede mostrar la etiqueta «Production» en Supabase; no corresponde al deployment de producción de Ayni.

Servidor valida docente, aula activa y alumno activo antes de acceder a media. Fotos JPEG/PNG/WebP hasta 3 MB, normalizadas a JPEG hasta 512 px, límite de píxeles y metadatos retirados. Lectura autenticada privada/no-store; reemplazo con comparación del path previo, limpieza del archivo nuevo si hay conflicto y eliminación del anterior solo tras guardar. Fotos y evidencias no entran al payload de clasificación o conversación. Se conserva la excepción RAW ya autorizada del piloto V2.4 si se activa su flag, sin ampliar su alcance.

Las pruebas funcionales escribieron exclusivamente una base local nueva `.local/ux-v2-qa-db`, tres alumnos ficticios y una foto sintética teal. No se borraron datos de la cuenta QA remota ni se regeneró su plan. Las pruebas de permisos incluyen una segunda docente y denegación de acceso cruzado antes de tocar Storage.

## Verificación ejecutada

- `npx tsc --noEmit`: PASS. No existe script npm `typecheck`.
- `npm run lint`: PASS.
- `npm run build` (vinext): PASS.
- `npx next build`: PASS; conserva warnings existentes de trazado amplio de archivos en onboarding, sin error de compilación.
- 81 pruebas focales PASS en initial-journey, annual-journey/recovery, annual-personalization, annual-plan-version, annual-planning-preferences, family-interview-redesign, request-auth, database-schema-parity, diagnostic-sources, version-integrity y ai-execution-router. Tras el último ajuste de identidad de foto/CAS se repitieron las diez de initial-journey: PASS; no se suman como casos nuevos.
- Regresiones: guardado atómico de 0–2 competencias, idempotencia y rechazo de cambios bajo el mismo UUID, segunda competencia en el lector canónico, clasificación versionada, permisos, familia/capacidad vencida o reemplazada, fotos privadas, negación/procedencia/lenguas, conversación acotada/CAS/fallo, calendario 172/172 sin huecos/solapamientos, versiones y exportación congelada.
- Navegador real: chips múltiples/texto/partial/volver/reabrir; enlace familiar aislado y respuesta separada; selección de niño/foto; sugerencia previa/guardar/edit a dos competencias; segunda nota manual sin IA; matriz y celda con registros; avance con vacíos; chat sin ideas → ready y refresh sin nuevas llamadas; generación → refresh → fallo simulado del revisor → reintento/refresh → confirmación de Mi año V1 con doce propuestas.
- Laptop 1440×1000, móvil 390×844 y tablet 768×1024. Matriz sin overflow del documento, todas las columnas accesibles por scroll. Consola del recorrido inspeccionada: sin errores/warnings. Revisión Impeccable/Web Interface Guidelines/React: labels, botones nativos, foco, cantidad accesible y reduced-motion; detector Impeccable sin hallazgos. No se sustituyó el flujo solicitado por recomendaciones genéricas.
- Dos descargas reales HTTP del Word confirmado: 200, XML `word/document.xml` idéntico entre ambas, cero nuevas llamadas IA. La espera del evento de descarga en Chrome no terminó; la validación del documento fue por API y ZIP, no se declara éxito del diálogo nativo de descarga.

## Llamadas y costo

| Operación | Antes | Después |
| --- | --- | --- |
| Sugerir competencia | Una clasificación después de guardar si se habilitaba | Una antes de guardar, solo al solicitarla; cache repetida cero |
| Guardar/editar clasificación | Decisión docente sin IA, paso separado | Cero IA; confirmación integrada al guardar |
| Guardar sin competencia / selección manual | Cero con clasificador apagado | Cero |
| Conversación | Cero: captura manual de ideas | Normalmente dos Luna (inicio/respuesta), tres con una aclaración |
| Refresh de conversación / añadir idea después de ready | Cero | Cero |
| Generación anual + revisión | Dos normalmente, reparación acotada adicional | Pipeline sin cambio; dos normalmente |
| Refresh / confirmar / Word | Cero | Cero |

E2E final con proveedor simulado: seis requests (una sugerencia, dos conversación, una generación, un fallo de revisión, un reintento de revisión). Una consulta repetida para las capturas usó cache sin otra llamada. Un intento simulado anterior al arreglo del bloqueo transaccional no forma parte de estos seis. Las pruebas unitarias usan proveedores simulados.

Smoke separado con Luna real: seis respuestas exitosas sobre fuentes ficticias/anonimizadas, 23 948 tokens de entrada y 313 de salida, ninguno cacheado. Cubrió inicio, sin ideas, una idea, varias ideas, ambigüedad material y aclaración. Estimación con el snapshot de precios existente del repositorio (2026-09-27): USD 0,0025513; no es una factura ni comprobación de tarifa vigente. No se hizo generación anual real adicional ni se enviaron fotos a IA. Los intentos fallidos se contabilizan aparte de respuestas exitosas; reintentos explícitos pueden agregar costo.

## Capturas reales

Capturadas en la base local aislada, no en la cuenta remota. Son pantallas implementadas con datos ficticios, no mockups. Archivos privados fuera de Git:

- `.local/ux-v2-familias-laptop.jpg`
- `.local/ux-v2-observar-laptop.jpg`
- `.local/ux-v2-matriz-laptop.jpg`
- `.local/ux-v2-conversar-laptop.jpg`
- `.local/ux-v2-preparando-laptop.jpg` (etapa real del proveedor simulado durante reintento)
- `.local/ux-v2-familias-mobile.jpg`
- `.local/ux-v2-observar-mobile.jpg`

## Diferencias deliberadas y QA humano

Teal y shell actual en lugar del azul y sidebar nuevo de las referencias; Mi año conserva su diseño. Mascota menor en la entrevista, preguntas/opciones reales del contrato en lugar de inventar categorías; respuestas literales. Matriz con nombres curriculares completos y tres estados pedidos (sin medias lunas). Preparación con cinco etapas reales, sin separar artificialmente dos tareas del mismo checkpoint. Conversación contextual, breve y variable, en lugar de ocho preguntas fijas.

Pendiente humano: micrófono/dictado con voz real, cámara y selección física de archivos en Android/iOS; permisos nativos; compartir con una familia real; revisión pedagógica por profesora; recorrido autenticado y Storage del staging en dispositivos reales. En Chrome el file chooser se abrió, pero la extensión no tenía permiso para archivos locales: no se modificaron permisos del usuario. El upload/read/replace/delete se comprobó por API y regresiones. La prueba de recuperación anual usó proveedor simulado, y no sustituye evaluación de contenido de un plan real.

## Publicación y rollback

El cierre requiere commit limpio, push de `HEAD` a `codex/qa-ayni-v2`, preview Vercel bajo la cuenta aislada `ayni4`, smoke antes de apuntar el alias QA y verificación del SHA. URL autorizada: https://ayni-aula-staging-qa-v2-ayni4.vercel.app . La evidencia de deployment y smoke se guarda en `.local/v2-fix-staging-verification.json` y `.local/v2-preview-smoke.json`; el SHA exacto se entrega al usuario. Debe conservarse la producción `055c77efa63981a95e9b21e03e295e735b713cdf`.

Rollback: devolver únicamente el alias QA al preview verificado del baseline `18138c8`, conservar la columna nullable y los archivos/respuestas privados, sin DROP ni borrado pedagógico. Para revertir código, mantener lectores V2 y compatibilidad de los arrays de competencias ya confirmadas; no regresar el guardado a una segunda confirmación obligatoria sobre registros ya decididos. El rollback de presentación no elimina versiones, pendientes o planes.
