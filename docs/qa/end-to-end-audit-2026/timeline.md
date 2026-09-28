# Timeline y reproducción

Horas de evidencia en UTC; Lima es UTC−05. No convertir el 28/09 UTC en un día pedagógico diferente para la docente.

| Hora UTC 28/09 | Hito |
| --- | --- |
| 03:03:55 | Baseline de 1,038 archivos; entorno aislado sin identidad QA creada |
| 03:05–03:09 aprox. | Perfil, aula, 15 alumnos y 15 entrevistas por interfaz |
| 03:09–03:11 aprox. | Cinco guiadas, 24 espontáneas y Jev; resultados previos a correcciones conservados |
| 03:13:49 | Inicia propuesta grupal |
| 03:13:59 | Uso OpenAI grupo registrado |
| 03:15:27 | Inicia prioridades |
| 03:15:40 | Uso OpenAI prioridades registrado |
| 03:18:54 | Inicia generación anual |
| 03:19:45 | Uso anual y borrador persistidos |
| 03:20–03:23 aprox. | Editar/confirmar falla; alternativas taller/calendario/Hoy comprobadas |
| 03:23–03:31 aprox. | Barreras de evaluación, Word/Excel y vista móvil |
| 03:33–03:36 | Typecheck, 461 tests, lint, build; dos fallos documentados |
| 03:40 | Cuatro barreras repetidas con períodos completamente cargados |
| Después | Conciliación, revisión documental e informes; sin nuevas generaciones pedagógicas |

## Reproducir el BLOCKER por UI

Abrir QA localhost:5175 → Planificar → Continuar plan anual → Confirmar Mi año. Resultado ya registrado: revisar datos de propuesta 1; plan sigue draft. No introducir proyección de auditoría ni editar JSON/SQL. También ocurre al editar solo propósito de fila 2 y guardar.

## Repetir solo diagnóstico de lectura

Desde la raíz, si API QA sigue activa:

```powershell
node docs/qa/end-to-end-audit-2026/audit-snapshot.mjs checkpoint-revision
node docs/qa/end-to-end-audit-2026/audit-invariants.mjs
node docs/qa/end-to-end-audit-2026/audit-costs.mjs
```

`audit-invariants` y `audit-costs` leen el snapshot final fijo; una nueva auditoría necesita otro snapshot y no debe alterar expectativas originales. `audit-tests.mjs` ejecuta tests aislados sin claves de IA, no crea datos en el recorrido. Sus comandos/logs están en evidencias/tests.

No volver a ejecutar audit-environment, audit-api o audit-web mientras sus servicios estén activos: podría duplicar procesos o chocar con la misma base. Los harnesses son archivos de auditoría, no nuevos servicios de producto. El directorio de datos exclusivo es `.local/qa/end-to-end-audit-2026/pgdata`; no borrar `.local` ni tocar original. Las claves se cargan de archivos locales ignorados existentes y nunca se copiaron a esta carpeta.

## Archivos primarios de evidencia

Snapshots onboarding/observations/group/priorities/annual/final, tablas previas Jev, respuesta UI anterior a intervención docente, DOM de fallos y barreras, docx/xlsx descargados, análisis estructural, captura móvil y screenshot 10 del recorrido bloqueado. Logs operativos brutos en `.local/qa/end-to-end-audit-2026/api-retry.out.log`; el ledger derivado seguro está en esta carpeta. `docx-render.log` conserva la limitación de LibreOffice.
