# Primer flujo local de matrícula a informe multiedad

Este documento registra la primera ronda. La continuación de diagnóstico y Mi año, todavía dentro de la prueba local, se encuentra en [06_DIAGNOSTICO_Y_MI_ANO_LOCAL.md](06_DIAGNOSTICO_Y_MI_ANO_LOCAL.md).

Implementación local del 22 de octubre de 2026 en `codex/multiedad-local-20261022`, sobre `ae38b2c1317ed3a7ea9e78caf0d48b71835c531a`. El recorrido usa exclusivamente bases PGlite nuevas en memoria y datos ficticios. No convierte aulas actuales, modifica variables o cuentas, conecta con Supabase real ni publica una versión.

## Qué se puede ejecutar

```powershell
npm run dev:multiedad
```

El comando imprime una URL `http://127.0.0.1:PUERTO` en un puerto libre y distinto del servidor habitual. El navegador abre esa URL; no se utiliza el enlace del piloto. El proceso no carga `.env`, no acepta una cadena de conexión ni abre `.local/pgdata`. Los datos se pierden al detener el servidor. No se admite una base persistente o remota en los servicios de escritura de esta fase.

La profesora de prueba puede crear una aula de 3, 4 y 5 años, matricular niños con grupo confirmado y nacimiento opcional, revisar una actividad compartida y sus criterios, registrar hechos, consultar referentes del grupo, elegir las valoraciones, escribir conclusiones y confirmar informes con descarga Word. Las valoraciones de la prueba son decisiones explícitas de quien prueba; no las asigna una IA.

La actividad inicial es un blueprint editorial ficticio, identificado como ejemplo y editable antes de confirmar. No es una generación real del modelo. El período que cubre la prueba es sintético y no reemplaza los cuatro bimestres y el calendario de la aplicación vigente.

## Estado de las fases

| Fase del plan | Alcance implementado | Trabajo que todavía falta |
| --- | --- | --- |
| 0 | Base identificada, inventario de consumidores en los entregables, upgrade con matrícula, criterio y observación V1 de control; comparación de contenido anterior. | Baseline ampliado de cierres, todas las familias documentales y casos de transición. |
| 1 | Migraciones nuevas local/Supabase, asignación individual, criterios por edad, recibos idempotentes, colas físicas sin ejecutores y restricciones de coherencia. Lectores V1/V2 para el recorrido local. | Lectores secundarios de toda la app, corrección versionada de grupo y ensayo de Auth/Storage/RLS en Supabase real antes de cualquier release. |
| 2 | Flujo vertical local completo para las tres edades, reutilizando observación ordinaria, proyección evaluativa, contexto de análisis individual y renderer Word existentes. Pruebas de servicio, HTTP e interfaz. | Integrar el flujo a la navegación principal, preparar recursos específicos y revisar pedagógicamente una muestra con docente multiedad. |
| IA del flujo mínimo | Contexto compartido por edad, schema estricto, adaptador con proveedor inyectado, validación de referencia y paquete de instrucciones separado. Se prueba con proveedor simulado. | Generación real, calidad de contenidos, costos, reparación durable e integración con jobs de preparación. |
| 3 a 6 | Permanecen como fases posteriores del plan. | Diagnóstico y año multiedad, Biblioteca/talleres, lotes completos, consolidado, cierre/reapertura y transición de aulas existentes. |
| Publicación | No realizada ni autorizada en esta ronda. | Nueva solicitud expresa, commit limpio, staging separado, smoke y rollback antes de publicar. |

El flujo mínimo no significa que el resto de las pantallas ya soporte aulas multiedad. Las aulas V2 solo se crean en la prueba separada, evitando exponerlas a lectores antiguos de la app principal.

## Cambios de persistencia

- `0076_multi_age_foundation.sql` y su equivalente `202610220001_multi_age_foundation.sql` agregan composición, versiones, asignaciones y recibos; no rellenan la matrícula individual de aulas V1.
- `0077_multi_age_contracts.sql` y su equivalente `202610220002_multi_age_contracts.sql` permiten edad general NULL exclusivamente en multi V2 y separan la unicidad de criterios V1 de la unicidad por edad V2. Conservan linajes y versiones.
- Cada variante diaria tiene ID propio y referencia explícita a la variante del proyecto. La evidencia apunta al criterio diario, no a la primera fila con la misma competencia.
- La captura ordinaria mantiene su ruta V1. Solo para contrato 2 resuelve asignación, valida criterio/edad y guarda el snapshot curricular dentro de la misma transacción.
- Las mutaciones curriculares y la captura toman el bloqueo de la misma fila de aula. La valoración reconsulta fuentes bajo ese bloqueo y exige una huella vigente.
- Las tablas nuevas de Supabase tienen RLS de lectura propia y permisos de escritura revocados a `anon` y `authenticated`. Los servicios de backend verifican docente, aula y año; los triggers comprueban relaciones, identidad, contexto e inmutabilidad también frente a escrituras directas.

El cambio de grupo y la transición de aulas existentes todavía no tienen un flujo de corrección disponible. La historia confirmada se protege y los registros con contexto incompatible se rechazan; no se simula una corrección cambiando silenciosamente la edad de captura.

Las colas `multi_age_preparation_jobs` y `multi_age_period_jobs` quedan vacías y sin cron. No se registra ningún consumidor ni se amplía concurrencia. Su existencia no se presenta como preparación durable implementada.

## Recorrido comprobado

La prueba de servicios conserva primero una matrícula V1, un criterio y una observación con texto original antes del upgrade. Después comprueba sus campos anteriores y ausencia de asignaciones individuales inventadas. La ruta de compatibilidad proyecta `legacy_inherited` sin escribir una confirmación docente.

Para V2 se guardan tres niños, una actividad y tres variantes de Oralidad con referencias `PCI2016.COM_ORAL.3.03`, `.4.03` y `.5.03`. Se registra una observación por niño. El servidor y SQL rechazan una variante de 5 años para el niño de 3. Los contextos individuales contienen referentes únicamente de su edad y omiten nacimiento completo.

La docente elige la valoración; una huella obsoleta o una confirmación ausente se rechazan. Las conclusiones esperan las valoraciones pertinentes y los informes esperan las conclusiones. El contenido familiar copia el texto confirmado por código. El lector documental usa el grupo guardado en el informe.

Se comprueban tres Word por contenido XML y grupo, y tres descargas HTTP de DOCX. El recorrido de navegador registra a Ana Ficticia de 3, Bruno Ficticio de 4 y Clara Ficticia de 5, guarda sus tres observaciones, valoraciones y conclusiones, y llega a los tres enlaces de informe. La recarga conserva el estado del proceso temporal.

La interfaz se inspeccionó en el panel de navegador disponible de aproximadamente 691 por 654 píxeles. No se acredita prueba de celular físico ni vista de escritorio 1366. Capturas privadas de datos ficticios en `.local/multi-age-20261022/recorrido-desktop.png` e `informes-locales.png`; el primer nombre es un identificador de archivo y no una acreditación de viewport de escritorio.

## Validación automatizada

```powershell
npm run test:multiedad
node --test scripts/database-schema-parity.test.mjs src/lib/ordinary-evaluation-adapter.test.mjs src/lib/evidence-capture-v4.test.mjs src/lib/official-performance-references.test.mjs src/lib/classroom-continuity.test.mjs src/lib/assessment-brief.test.mjs src/lib/period-assessment-closure.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run lint
npm run build
```

La ejecución conjunta de los cuatro archivos nuevos y las siete suites existentes relacionadas produjo 55 pruebas PASS, cero fallos, omisiones o cancelaciones. Incluye combinaciones 3–4, 3–5 y 4–5, nacimiento opcional, ausencia de desempeño específico de escritura a los 3, idempotencia, referencias cruzadas rechazadas, aislamiento HTTP y restricciones SQL con dos identidades docentes.

Una segunda ejecución con concurrencia 2 pasó 127 regresiones adicionales en nueve archivos existentes, sin duplicar los archivos de la primera suite: valoración, configuración del aula, conclusiones, diagnóstico guiado, elegibilidad familiar, informes, atribución ordinaria, captura ordinaria y evaluación del período. Total de ambas ejecuciones finales: 182 pruebas PASS, cero fallos. Log de esa segunda ejecución en `.local/multi-age-20261022/regressions.tap`; solo contiene fixtures y resultados locales.

La paridad aplica todos los esquemas en SQL temporal. La prueba de políticas usa `SET ROLE authenticated` y claims sintéticos en PGlite; no equivale a probar Supabase Auth, gateway o Storage reales. PGlite ya aporta UUID y la fixture omite únicamente la declaración de extensión `pgcrypto`, como la prueba existente de paridad.

Typecheck, lint y build Vinext terminaron con exit 0. Lint conserva la advertencia histórica de dependencia compleja de `useEffect` en `diagnostic-generation-control.tsx`; build conserva avisos de PGlite, tamaño de chunks y clasificación de rutas. `node --check` de interfaz y servidor local también pasó. No se ha ejecutado ni aprobado la matriz completa de 43 casos del plan; los casos que dependen de fases posteriores permanecen pendientes.

## Seguridad de la interfaz local

El servidor se vincula únicamente a `127.0.0.1`, verifica Host, exige cookie HttpOnly/SameSite y Origin exacto para mutar, limita JSON y no permite seleccionar docente desde el cliente. No ofrece CORS. La CSP restringe scripts, estilos y conexiones al propio origen; nombres y textos se muestran con nodos de texto, sin HTML de usuario.

La interfaz conserva la clave de idempotencia en reintentos inciertos usando un hash del contenido y un ID de solicitud en `sessionStorage`; no almacena allí el texto observado. Los recibos se confirman junto con el resultado. Si falló la actualización de pantalla después del guardado, se informa del guardado y se conserva la clave para reconciliar.

No se envían medios, nacimiento o datos a un proveedor. El adaptador de generación carece de proveedor por defecto y solo produce una propuesta sin confirmar. El router vigente se conserva; las pruebas inyectan un proveedor simulado que no usa red ni cobra tokens.

## Rollback de este avance

Detener el proceso local elimina solo la base temporal; las aulas actuales no están en ella. El código de prueba puede quedar deshabilitado simplemente sin ejecutar `dev:multiedad`. No se han aplicado estas migraciones a `.local/pgdata` ni a una base cloud.

Para retirar cambios de código se revisa el diff de esta rama y se preservan los cuatro entregables y cambios previos de documentación según corresponda. No se borra ni resetea el trabajo anterior. Si en otra fase se aplican migraciones o guardan datos V2 persistentes, el rollback exigirá lectores V2 compatibles y el procedimiento del entregable 4; esta prueba temporal no demuestra ese rollback de producción.
