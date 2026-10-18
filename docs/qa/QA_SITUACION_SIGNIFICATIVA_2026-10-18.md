# QA — Situación significativa del proyecto — 2026-10-18

## Alcance y entorno

- Rama `codex/planning-recovery-20261018`, base `85bb7c284bfd7c1789bc1ee176bc9f944524c992`, cambios locales sin commit. Se preservan las correcciones anteriores de continuidad y diagnóstico.
- Referencia: pedido de origen contextual del proyecto y reto de exploración. El ejemplo del huerto es hipotético hasta confirmación docente.
- Referencia oficial: [CNEB, orientaciones sobre situaciones significativas](https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-2016-2.pdf), relacionadas con contextos, intereses y necesidades; [guía MINEDU de proyectos de Inicial](https://repositorio.minedu.gob.pe/handle/20.500.12799/6517).
- Pruebas de código y navegador local `127.0.0.1:3465`, sin conexión de datos cloud. Ninguna escritura en Preview/Producción, ningún secreto ni dato real. USD 0 de API.

## Cambio vertical

1. La razón anual breve explica origen y pertinencia; la invitación plantea un reto. Creación/cambio de propuestas reutiliza `JOURNEY_RULES`.
2. El mapa genera `meaningful_situation` junto con los demás campos, sin agregar un workflow. Contexto sustentado, oportunidad y pregunta/reto de edad pertinente; no basta nombrar tema/competencias. Se distingue reporte familiar, observación y propuesta docente; no se generaliza de un niño al grupo ni se inventa un huerto/visita.
3. El servidor exige texto no vacío de hasta 1200 caracteres. La vía moderna conserva su reparación única con las mismas fuentes. Esto valida el contrato, no certifica la veracidad semántica del texto.
4. `projectDetails` persiste la situación en el JSON existente. El adaptador V3 y el contexto diario la transportan sin duplicar el mapa.
5. Detalle de proyecto y Documentos comparten lector; el proyecto preparado muestra la situación antes del propósito. La propuesta sin preparar muestra razón e invitación guardadas. La revisión simple también permite leer la situación.
6. Formalización por código reutiliza la situación; Word la imprime una sola vez y evita unirla con el fundamento. Exportaciones de proyectos históricos conservan el comportamiento anterior. Abrir un histórico solo lee su contexto guardado.

## Verificación ejecutada

| Comprobación | Resultado | Límite |
|---|---|---|
| Proyecto, situación, contexto diario, Word, adaptador/snapshot V3 y año | PASS: 49 pruebas / 7 archivos | Proveedor simulado; Word inspeccionado por XML, no renderizado visualmente |
| Preparación completa, sustitución de tramo, biblioteca, contexto de actividad, biblioteca documental y recuperación del año | PASS: 27 pruebas / 6 archivos | Contratos y datos locales ficticios |
| Typecheck | PASS | Después de Next build |
| ESLint | PASS | Se excluyen `.local` y `outputs`, artefactos privados de QA |
| Next build webpack | PASS | Compilación local |
| Vinext build | PASS | Compilación local |
| Proyecto preparado: origen, reto, dos competencias, propósito y recorrido visibles | PASS escritorio 1366×1000 y móvil 390×844 | Ejemplo editorial ficticio, sin IA |
| Propuesta anual: razón e invitación guardadas | PASS escritorio/móvil | Fixture de lectura |
| Histórico: conserva el contexto breve original | PASS en UI y prueba de no mutación | No mejora automáticamente proyectos ya guardados |
| Desbordamiento móvil | PASS | DOM `clientWidth=scrollWidth=375`, proyecto y propuesta |
| Calidad pedagógica de una nueva salida real de IA | NOT TESTED | No se factura IA en esta ronda |
| Nuevo despliegue Preview / Producción | NOT APPLICABLE | No solicitado; no se publicó |

Logs privados: `.local/planning-recovery-20261018/situation-tests.log` y `.local/project-situation-20261018/{regressions,typecheck,lint,next-build,build}.log`.

Capturas: `outputs/project-situation-20261018/project-desktop.png`, `project-mobile.png`, `proposal-desktop.png`, `proposal-mobile.png`. Todas identifican explícitamente QA ficticio y ejemplo editorial sin IA.

## Integridad y rollback

Sin migraciones, tablas, endpoints ni permisos nuevos. Sin cambio de modelos, número de proyectos, competencias confirmadas, calendario o edición de actividades individuales. Los nuevos textos solo forman parte de nuevas preparaciones/versiones ya autorizadas por el flujo docente. Ninguna reescritura histórica masiva.

Para retirar este cambio, revertir sus hunks de schema/prompt, persistencia, adaptadores/contexto, lectores y Word; preservar los cambios anteriores de continuidad/diagnóstico en el mismo árbol. El campo JSON opcional ya guardado puede permanecer sin afectar lectores previos. Antes de publicar se requiere commit identificable, árbol limpio y smoke en Preview; Producción se conserva.
