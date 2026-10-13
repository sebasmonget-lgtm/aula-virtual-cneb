# Observaciones de Inicial — QA de interfaz, 13/10/2026

Base verificada: `main` / `origin/main`, `a16d162`. `git fetch origin` y comparación remota: cero commits de diferencia; árbol inicialmente limpio. Se trabajó sobre los archivos actuales de matrícula, entrevistas y observaciones. Las capturas del propietario son referencias de diseño, no datos pedagógicos para copiar al producto.

## Resultado

- Retirada la sección «Entrevista en papel», sus botones y carga de archivos. Los respaldos privados históricos siguen consultables; no se borran registros ni archivos.
- Observación libre mantiene el formulario abierto después de la confirmación del servidor. Limpia texto, foto, apoyo, momento, selección/buscador de competencias y controles de dictado/fotografía. Conserva niño y fecha; desde la matriz conserva su competencia explícita. Confirmación breve de cuatro segundos con `aria-live`, foco en el texto para registrar otra. Un fallo conserva el borrador y el UUID del intento.
- Composición de Inicial con bloques azul, verde, rosa y violeta para momento, observación, fotografía/apoyo y competencias; distribución en dos columnas en escritorio y apilada en móvil. Se mantienen edición e historial.
- Selector guiado destacado, número de alternativas y «Recomendada». Ranking calculado con observaciones guardadas por niño activo y competencia: primero proporción sin registros, después proporción con un solo registro. Normalizar por número de competencias evita favorecer experiencias más grandes. Se excluyen registros anulados/insuficientes y sugerencias IA sin confirmación. Dos o más registros dejan de considerarse «pocos» para esta orientación. No se asignan niveles ni dificultades. La selección docente se conserva cuando cambian los registros.
- Experiencias guiadas con bloques azul/verde/ámbar/violeta y una ilustración distinta por experiencia, reutilizada de `public/project-illustrations/`. Siete WebP de 4.238 a 6.136 bytes cada uno; solo se carga la experiencia elegida. No hay nuevas generaciones ni descargas de imágenes.
- «Criterio de observación» mantiene el texto/ID versionado; «Qué debes mirar en este momento» explica actuaciones concretas a partir de los ejemplos de ese criterio. Conserva los 22 momentos, competencias y ejemplos del catálogo.
- Foto de matrícula: la lista se publica tras terminar la petición de foto para evitar nuevas lecturas de avatar durante esa escritura. HTTP 5xx muestra indisponibilidad del servicio; otros errores conservan el mensaje público. Reintento protegido contra doble clic, sin repetir el alta ni reintentar escrituras automáticamente.

## Foto reportada por el propietario

La captura acredita guardado de los datos del niño y fallo separado de la foto, recuperado al reintentar. El `catch` anterior descartaba el detalle. Existe un antecedente documentado de `EMAXCONNSESSION`, pero no se dispone del recibo/log de este intento concreto: **no se confirma la causa remota ni una solución permanente del pooler**. El cambio reduce concurrencia evitable y mejora recuperación/mensaje. No altera backend, Storage, cuentas, RLS, migraciones ni infraestructura.

## Validación ejecutada

- TypeScript: `npx tsc --noEmit`, PASS.
- Lint global de fuente: `npm run lint -- --ignore-pattern .local --ignore-pattern .sites-runtime --ignore-pattern .wrangler`, PASS. Excluye artefactos/cachés locales; lint de archivos modificados también PASS.
- Build de producción: `npx next build --webpack`, PASS.
- 31 pruebas focales: `diagnostic-ui-flow`, `initial-journey`, `family-interview-redesign`, `guided-observation-flow`, `enrollment-workspace`, PASS. Incluyen privacidad, reemplazo/lectura de fotos, idempotencia, aislamiento, ranking, pocas observaciones y ejemplos/ilustraciones. Ocho focales de presentación se repitieron después del ajuste final del formulario, PASS.
- Detector Impeccable sobre UI/CSS modificados: cero hallazgos.
- Navegador local con componentes actuales, APIs/servicios reales y PGlite nuevo aislado: fallo de observación 503 simulado conserva borrador; reintento y dos registros consecutivos PASS. Tercera observación con foto privada PASS: formulario vacío, foto retirada de captura, cero competencias elegidas y foco en texto; evidencia persistida recuperable.
- Registro guiado por niño/criterio y actualización de cobertura PASS. Selector muestra cinco experiencias aplicables y permite cambiar a «Nos movemos y creamos». Texto concreto y WebP cargados, sin cambiar el criterio.
- Alta con foto: 503 simulado, un solo alumno nuevo, reintento PUT 200 y GET privado JPEG 200/no-store, PASS. Recibo HTTP confirma que la lectura del avatar nuevo sucede después de la primera escritura. Se conservan cuatro alumnos ficticios, tres observaciones libres y una guiada en el fixture aislado; cero peticiones IA.
- Capturas de escritorio 1366 y móvil 390, sin desbordamiento horizontal en libre/guiada. Revisión React de hooks, refs de guardado, estado derivado, controles accesibles e imágenes locales sin nueva dependencia.

Artefactos ignorados: `.local/qa-interface-20261013/`: capturas, `http.json`, `functional.json`, arnés y base ficticia independiente. El arnés Vite sustituye únicamente `next/image` por imagen HTML para inspección; la compilación de producción usa Next real. Cámara/micrófono físicos y proveedor IA real no probados en esta ronda. No hubo cambios en datos cloud ni publicación.

## Rollback

Revertir el commit de esta entrega restaura la interfaz anterior. Los registros, fotos privadas, entrevistas, competencias y fechas siguen siendo compatibles: no hay cambios de esquema ni de permisos.

## Publicación autorizada para continuar QA

Solicitud posterior del propietario, 13/10/2026: «haz commit de estos nuevos cambios y sube a Vercel para continuar el QA». Se reutiliza el commit de producto `fb96be10753feebc082d8818c9b7c0c35d57aa43`, rama `codex/observaciones-inicial-qa`; árbol limpio y validación local completa al despachar. Sin modificación posterior de producto.

Preview: https://ayni-aula-staging-4r1fqnohk-ayni4.vercel.app/#planificar?tab=diagnostic&step=2&mode=spontaneous . Deployment `dpl_7WX4wYgnKuinjkcMW81jj26TcKbj`, proyecto `ayni-aula-staging`, READY; API verifica proyecto y SHA esperados y target distinto de Production. Build cloud PASS. Ocho smoke secuenciales PASS: `/`, ilustración `movement.webp`, `/health` y `/api/auth/config` GET 200; sesión, alta de aula y estado familiar GET 401, observación libre POST sin sesión 401. La petición POST rechazada no escribe datos pedagógicos.

Producción conserva `dpl_4hi44yVEoU7xkHfHSZM4GCVkyZFx` / `a16d162e8fe62469699bb84adabecefd7e8ab624`, comprobados por API antes/después. Sin cambios de env, cuenta, reloj, RLS o migraciones. Acceso CLI autorizado usa las credenciales existentes sin copiarlas al repo/logs. Panel de Codex solicitado por herramienta: respuesta `queued`; no se declara navegación/login autenticado remoto validado. La docente continúa QA con el enlace de Preview y su cuenta existente. Recibos privados `.local/observations-preview-20261013/` (`deployment-verified.json`, `smoke.json`, logs de build). Este apartado actualiza el estado «No publicación» de la validación local anterior.
