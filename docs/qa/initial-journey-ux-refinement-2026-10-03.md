# Ajustes finales del recorrido inicial V2 — 2026-10-03

## Alcance

Baseline remoto e09b16e497ac16b31eb6df720723fbeb9e3463fe, rama QA actualizada antes de editar. Teal elegido, shell y Mi año conservados. Familias: profesora únicamente, regreso superior a alumnos, anterior/siguiente destacado y guardar final con retorno; autoguardado parcial, checks con extractos literales de hasta 48 caracteres. Impresión/adjunto histórico en sección opcional. Enlaces familiares ya emitidos siguen siendo compatibles, sin nuevas acciones de compartir en este flujo.

Observar: escribir no dispara IA; OK consulta Jev. Terminar dictado solicita transcripción literal y consulta la competencia. Micro circular junto al campo también en Familias, editor y conversación. Sugerencia compacta con lápiz y +, máximo dos competencias; guardar sin competencia permanece disponible. Fila con foto del alumno, texto, chips, Cambiar y menú de retirada. Cambiar edita texto y competencias sin IA. Registros históricos de otros módulos siguen con sus lectores originales.

Fotos: entrada máxima 25 MB, normalización JPEG, lado largo máximo 1600 px, calidad adaptativa y salida máxima 1 MB; miniatura 88 × 64 al lado de controles. Sin envío de fotos a IA. Storage y autorización siguen privados. Matriz: pictograma vectorial por competencia, nombre corto, nombre CNEB completo en title/aria, scrollbar y botones de desplazamiento. Chat: cuatro iconos de contexto coloreados. Preparación: misma mascota pensando y pipeline recuperable existente.

## Persistencia y seguridad

Migraciones nuevas 0071 local y 202610030002 Supabase. diagnostic_spontaneous_observation_revisions es un historial inmutable; effective_diagnostic_spontaneous_observations proyecta el último texto y omite retirados. Texto/evidencia original, eventos docentes y planes congelados se conservan. PATCH/DELETE verifica profesora/aula/alumno, IDs aplicables, revisión CAS y lease transaccional; conflicto HTTP 409. Lectores de contexto, cobertura, trayectoria, evaluación y nuevas fuentes anuales usan la misma vista efectiva. Revisión de texto/IDs es atómica. No se modificaron migraciones previas.

Aplicada solo en Supabase ayni-aula-staging/eetdkmmspicboijcmnzv. Guard transaccional comparó cantidad de alumnos y hashes de planes, entrevistas y observaciones originales antes/después, sin diferencias. Verificación: RLS=true, vista security_invoker=true, cero revisiones iniciales, un plan activo conservado y ledger 202610030002. Evidencia privada: .local/ux-refine-staging-migration.jpg. Sin cambios en datos de otras cuentas ni producción.

## Llamadas IA

| Acción | Baseline e09b16e | Ajuste |
| --- | --- | --- |
| Escribir en captura | Cero | Cero; OK explícito |
| Sugerir | Una petición de clasificador genérico, o dos Jev con V2.4 habilitado | Dos peticiones Jev CURRENT_V2_4_RAW/typesafe/jev-1.13 por consulta nueva |
| Repetir idéntica consulta cacheada | Cero nuevas | Cero nuevas; calls=0 y original_calls=2 |
| Dictado de observación | Transcripción y sugerencia solicitada aparte | Una transcripción + dos decisiones Jev al terminar |
| Guardar, editar o retirar | Cero | Cero |
| Conversación | Dos Luna normalmente, tres con aclaración material | Sin cambio |
| Generación/revisión anual | Dos normalmente; reintento solo etapa pendiente | Sin cambio |

La implementación/prompt congelados de Jev mantienen sus hashes. workflow de cache actualizado para evitar reutilizar respuestas del clasificador anterior. Contadores distinguen acción de análisis de peticiones HTTP. E2E local: siete peticiones simuladas, dos Jev, dos Luna, una generación, un fallo de revisión y un reintento de revisión. Guardar/editar/retirar no agregó peticiones. No hubo nuevas peticiones pagadas al proveedor en esta pasada. No se afirma evaluación de precisión de Jev basada en el mock.

## Assets

Herramienta integrada imagegen, editando public/ayni-profesora.webp como referencia de identidad, transparent_background=true. Dos resultados, sin cambiar personaje:

- Entrevista: conservar profesora chibi, cabello castaño ondulado, camisa blanca/tirantes teal/logo; pose escuchando, cuaderno y lápiz; sin texto, sin rediseño, recorte transparente. Asset final public/ayni-interview-v2.webp.
- Pensando: conservar misma identidad/ropa/paleta; mano bajo el mentón, mirada reflexiva amable, tablet; sin texto, sin rediseño, recorte transparente. Asset final public/ayni-thinking-v2.webp.

PNG originales de 1536 × 1024 preservados en .local/ayni-interview-v2-original.png y .local/ayni-thinking-v2-original.png; WebP de 640 px optimizados con Sharp. Catorce pictogramas SVG de public/competencies proceden de iconos vectoriales Lucide, coloreados según área. Son imágenes simples, coherentes con la referencia y ligeras, sin nuevas llamadas de generación. Labels por ID en competency-presentation.ts; nombres/IDs oficiales no se alteran.

## Verificación

Pruebas focales y regresiones del recorrido, versiones, permisos, CAS, fuentes, documentos, contexto, trayectoria, cobertura y paridad de esquema. Nueva regresión comprueba originales inmutables, cambio de huella/contexto, retirada, historial y acceso ajeno denegado; otra cuenta las dos decisiones Jev/cache/guardado y fallo manual recuperable. 123 pruebas únicas PASS (90 del recorrido y 33 de lectores/documentos/Jev; dos fixtures históricos se adaptaron a la vista efectiva antes del PASS). Typecheck y lint ejecutados, sin errores ni warnings. Builds Vinext y Next webpack PASS.

Navegador IAB real con API/PGlite separadas, tres alumnos ficticios y proveedores simulados. Laptop 1440 × 1000 y móvil 390 × 844, sin overflow de documento. Familias: corrección, texto, autoguardado, cinco Siguiente, Guardar final y regreso a listado. Observar: cero llamadas al escribir; OK devuelve COM_ORAL, foto sintética PNG de 18 MB → JPEG 947 457 bytes, 1600 × 1067, miniatura; guardado; Cambiar texto + segunda competencia; retirada confirmada y matriz actualizada sin ese registro. Chat sin ideas llega ready en dos llamadas. Preparación conserva checkpoint ante fallo simulado del revisor y reanuda sin nueva generación al recargar.

Capturas reales de la implementación, datos ficticios, archivos fuera de Git:

- .local/ux-refine-familias-desktop.jpg
- .local/ux-refine-observar-desktop.jpg
- .local/ux-refine-matrix-desktop.jpg
- .local/ux-refine-conversation-desktop.jpg
- .local/ux-refine-preparation-desktop.jpg
- .local/ux-refine-familias-mobile.jpg
- .local/ux-refine-observar-mobile.jpg

Diferencias deliberadas: teal elegido y shell existente; pictogramas SVG en vez de raster pesado; nombres cortos conservan CNEB accesible; 0 vacío/1 amarillo/2+ teal, como QA anterior; etapas corresponden a checkpoints reales. Nuevas poses mantienen la misma profesora. Correcciones no destruyen evidencia original.

Pendiente humano: voz/micrófono físico, cámara y permisos en Android/iOS, calidad pedagógica de sugerencia real y recorrido autenticado/Storage remoto con cuenta QA. Upload local, compresión, preview y persistencia sí se ejecutaron. No se declara validación física de cámara/micrófono.

## Publicación y reversión

Solo staging QA V2 autorizado: commit limpio, push codex/qa-ayni-v2, preview en cuenta aislada ayni4, smoke de páginas/health/auth/permisos antes de alias y verificación SHA. Producción debe conservar 055c77efa63981a95e9b21e03e295e735b713cdf.

Rollback del alias QA al preview e09b16e https://ayni-aula-staging-mktm5gxi8-ayni4.vercel.app. Conservar tabla/vista/revisiones: si ya hay correcciones, mantener lectores efectivos para no reintroducir texto obsoleto ni retirados al revertir código. No DROP, borrado de evidencias ni cambio de planes congelados.
