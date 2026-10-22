# Auditoría de main y versiones publicadas · 22 de octubre de 2026

## Resultado

La revisión funcional más reciente es `34ceb4b0c253b9c06c9ea4d916f4aa901cba7fec`. Tras `git fetch origin`, HEAD y `origin/main` coinciden exactamente en ese commit. La consulta directa al remoto confirma el mismo SHA. No hay diferencias de aplicación sin confirmar ni cambios staged. Los siete checkouts registrados tampoco tienen modificaciones tracked pendientes. No hay commits del 21 o 22 de octubre fuera de la historia de `origin/main` entre los refs disponibles después del fetch.

No fue necesario recuperar, reemplazar ni retroceder código. Esta auditoría y sus reglas preventivas se guardan en un commit documental posterior; el código de aplicación sigue siendo exactamente el revisado en `34ceb4b`.

## Correcciones presentes

| Decisión revisada | Evidencia en main |
| --- | --- |
| Hoy simple, sin accesos redundantes, talleres al final | `b40179d`; TodayHome y TodayEmptyState actuales |
| Identidad común de Observación libre desde el diagnóstico | `b40179d`; FreeObservationButton compartido |
| Abrir y navegar una actividad no inicia ni termina ejecución | `b40179d`, `63ea015`; ActivityRunView conserva solo posición de lectura en sessionStorage |
| Observaciones libres/guiadas y notas históricas conservadas | Servicios canónicos, lector de señales y pruebas de integración; sin migración o eliminación |
| Calendario, Mi año, talleres y evaluación con las mismas señales de observación | `b40179d`, `63ea015`; lectores y proyecciones comunes |
| Conclusiones fuera de la entrada de notas | `34ceb4b`; CompetencyPeriodReview y PeriodEvaluation |
| Conclusiones dentro de Informe a familias con notas pertinentes completas | `34ceb4b`; PeriodFamilyFlow y readiness del servidor recién consultado |
| Recuperar conclusiones e informes guardados sin regenerarlos al navegar | `34ceb4b`; consulta de lotes existentes y guardado explícito |
| Atajo para ocultar el reloj exclusivamente QA | `abfc507`, ancestro de main |
| Revisiones anteriores de documentos, recomendaciones familiares y continuidad | Ancestros comprobados `ee4bfb1`, `5bb2814`, `2620169`, `6736961`, `e7399f5` |

Los diez commits de referencia, incluido el piloto anterior `58b7642`, son ancestros de la revisión auditada. Los 32 archivos de aplicación distintos respecto del piloto antiguo están en main; no son cambios locales pendientes.

## Comprobaciones ejecutadas de nuevo

- TypeScript: `node node_modules/typescript/bin/tsc --noEmit`, PASS.
- Lint: `npm run lint`, PASS con cero errores y la advertencia previa en diagnostic-generation-control.tsx:28.
- Compilación canónica local: `npm run build` (Vinext), PASS; advertencias conocidas de bundles/PGlite y clasificación estática de rutas.
- Compilación usada por Vercel: `node node_modules/next/dist/bin/next build --webpack`, PASS, incluidos TypeScript, generación de páginas y trazas. No es un despliegue ni una prueba de configuración cloud.
- Regresiones: 32 archivos, 211 pruebas PASS, cero fallos, omitidas o canceladas. Incluyen lectura sin ejecución, observaciones, calendario, mapa anual, talleres, evaluación, conclusiones, informes, Word, propiedad, almacenamiento privado y cierres. Proveedores simulados y bases aisladas; no son 211 llamadas IA reales.
- Navegador, componentes actuales y API sintética local: una nota pendiente bloquea conclusiones; notas completas sin lote ofrecen Preparar conclusiones explícito; informes guardados recuperan texto y descarga habilitada; la pantalla de notas no monta el panel de conclusiones. Se observó además un caso con datos persistidos de un ensayo anterior, conservados sin nueva escritura. Cero IA y cero escrituras pedagógicas cloud.

Recibos reproducibles y capturas en `.local/main-audit-20261022/`: typecheck.log, lint.log, build.log, build-next.log, regressions.log, reconciliation.json y ui-checks.json. El informe conserva resultados sin copiar datos privados ni credenciales.

## Lo publicado no coincide todavía con main

Consulta autenticada de solo lectura a Vercel el 22 de octubre:

| Destino | Commit servido | Deployment |
| --- | --- | --- |
| Piloto público: https://project-0w0pq.vercel.app/ | `58b76428111090acde82066ba3f8164c45d1715e` | `dpl_B4ccwivp6ZtpbsiGKLYwPm767fAk` |
| QA: https://ayni-aula-qa-20261019.vercel.app/ | `63ea0153727b9b0310ee87f049b5fa48ca12795f` | `dpl_7wKLPEYG4DNVRqNAAXaqC8sZgWpv` |
| Revisión funcional en main | `34ceb4b0c253b9c06c9ea4d916f4aa901cba7fec` | Aún no desplegada |

Ambos deployments están READY; eso acredita su estado operativo, no que contengan la última revisión. La configuración consultada del proyecto no tiene integración Git (`link` ausente). Un push a main no publica automáticamente el piloto.

## Error y prevención

Síntoma: el enlace entregado como actualizado mostraba Registrar observación libre e Ir al Calendario, mientras las revisiones recientes muestran la identidad común y retiran ese acceso redundante.

Causa: se verificó que el enlace abría Ayni, pero no se contrastó el commit servido con main. Se confundieron tres evidencias distintas: push al repositorio, despliegue READY y revisión funcional más reciente. La documentación histórica de publicación no reemplaza la consulta del deployment actual.

Solución validada en esta auditoría: reconciliación explícita de refs, código y deployments; reejecución de controles; documentación del desfase. El código está consolidado y probado en main. La diferencia del piloto público sigue pendiente de una publicación expresamente autorizada; esta auditoría no la ha corregido mediante despliegue.

Prevención obligatoria al compartir una versión como actualizada: comprobar el commit de main, identificar el deployment que sirve el alias, demostrar que su código de aplicación corresponde a la revisión aprobada y ejecutar el smoke de ese destino. Si hay commits posteriores solo documentales, comparar también las rutas de aplicación; no basta el nombre del dominio, un build local o que abra la página. Comunicar por separado repositorio, QA y piloto. No mostrar un fixture local como evidencia de publicación.

## Alcance, permisos y reversión

Solo lectura de Git/Vercel y ejecución local de controles; modificación de documentación. No se cambian permisos, cuentas, variables cloud, modelos, fuentes pedagógicas o bases remotas. No se publican versiones ni se aplican migraciones.

Las carpetas no rastreadas `.impeccable/critique/` y `output/` contienen material local previo y entregables documentales; se conservan fuera del commit de auditoría. No se declara limpio el working tree completo mientras existan. La aplicación tracked no tiene cambios pendientes.

Rollback: revertir únicamente el commit documental de esta auditoría si se necesitara; no restaurar datos ni revertir las correcciones funcionales aprobadas.
