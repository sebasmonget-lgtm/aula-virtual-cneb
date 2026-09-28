# Pruebas técnicas e integridad

Las pruebas de esta sección NO sustituyen la experiencia de la docente. Se ejecutaron sin claves de proveedor en los procesos de tests, con mocks/fixtures y bases temporales independientes; no se usaron para sembrar ni alterar el aula QA.

| Comprobación | Resultado ejecutado |
| --- | --- |
| Typecheck `tsc --noEmit` | PASS, exit 0 |
| Lint | PASS, exit 0 |
| Build | PASS, exit 0; avisos de chunks >500 kB y clasificación estática Unknown de vinext |
| 98 archivos de test src/lib + scripts | 461 tests: 459 PASS, 2 FAIL, 0 omitidos |
| Subsuite annual-plan-v4 ejecutada antes | 43 PASS; no detectó el defecto del dato enriquecido persistido |
| Reproducción de dato anual ya guardado | FAIL: invalid_row propuesta 1 |
| Proyección estricta SOLO EN MEMORIA | PASS: doce filas; no se aplicó al producto |
| Hash de 1,038 archivos producto contra baseline | Sin cambios, pérdidas ni archivos nuevos fuera de auditoría |
| Huella estable de dashboard original | Sin cambios respecto de primera lectura estable |

Logs y comandos exactos: `evidencias/tests/results.json`, `unit-tests.log`, `lint.log`, `typecheck.log`, `build.log`. Los archivos baselines cubren código/recursos presentes al inicio, incluido el working tree que ya estaba sucio. No se afirma que Git esté limpio ni se hizo reset, commit o despliegue.

## Dos fallos de tests

1. `bimester-replan-service.test.mjs`: esperaba rechazo «comenzó|futura», recibió «Espera a que termine el período». El fixture usa yesterday UTC; la regla usa hoy Lima. En la ventana 00:00–04:59 UTC ambas fechas pueden ser el mismo día de Lima y el período aún no ha terminado para esa regla. Es un fallo reproducido del fixture/assertion dependiente del reloj, no un reajuste pedagógico real fallido en esta aula. H18 MEDIUM.
2. `pilot-readiness.test.mjs`: exportador contiene 68 tablas e importador 67; falta `ai_usage_events` en tableOrder. El importador comprueba tablas desconocidas y rechaza la exportación actual, no migra silenciosamente los costos. H19 HIGH. La migración de esa tabla sí habilita RLS y permisos; esta discrepancia NO demuestra una vulnerabilidad RLS.

## Conservación de datos

La huella estable original se calculó con alumnos/métricas/perfil/actividad. Se excluyó today.now porque cambia aun sin escrituras; un primer hash de todo el dashboard daba una diferencia solo por hora, no una mutación. La huella estable es `29b7c96d36bca81fc781fe36cd9fd9acecb334d468a4f85888454a05ed09a1e9`.

La base original no fue reiniciada ni escrita por el recorrido. Los quince niños, 15 entrevistas, 5 notas guiadas, 24 espontáneas y 49 llamadas están en la identidad aislada QA. Las comprobaciones GET de export/dashboard fueron de solo lectura después de las acciones de UI. Se conservaron los borradores y archivos para reproducir; no se borró el bloqueo ni se parcheó su validación.

QA local: frontend 5175/API 8790; original 5173/API 8788. Solo QA permite export loopback. Los procesos QA y su base se dejaron disponibles; no se publica ningún puerto externamente. El viewport móvil temporal se restableció. La seguridad multiusuario/RLS real de nuevas cuentas Supabase y despliegue en Vercel no se probaron ni se configuraron.

## Documentos y limitaciones de QA

Excel exportado: abierto, inspeccionado y renderizado de solo lectura; una hoja con encabezados, sin filas de evaluación en ámbito vacío. Word: ZIP/XML, 19 tablas y 7 saltos explícitos inspeccionados; los tres campos confirmados coinciden. Render visual/paginación NO PROBADOS por falta de LibreOffice en el runtime. No se declara ausencia de páginas vacías, cortes de tabla o problemas de impresión.

Audio real, conexión móvil real, lector de pantalla, pérdida de red, cuota, cancelación de proveedor, reintentos financieros y ciclo completo de cuatro períodos siguen sin prueba. Estos límites no se convierten en PASS por tener tests de lógica aislada.
