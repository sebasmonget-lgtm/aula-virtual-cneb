# QA integral de IA, UX y costos — 9–10 de octubre de 2026

Resultado: correcciones y recorrido local consolidados; publicación limitada a Preview. **Production BLOQUEADA** hasta completar G2, G3 y G5. No se heredan PASS de rondas anteriores. La petición directa del propietario adopta el recorrido del PDF del 9 de octubre y sus condiciones de publicación.

## Procedencia, datos y rollback

Base 16c1d6fd9e27cbcdd5200d5499c5b802a3069ca5; rama codex/ayni-qa-ia-ux-costos-20261009. Árbol inicial limpio, remotos y ascendencia verificados. Proyecto Vercel ayni4/ayni-aula-staging, Supabase eetdkmmspicboijcmnzv. Production inicial READY: dpl_BQ8jr9TVGXgDjsyu8oNN5bhy3QuH, SHA e2bcd35ed377618fc520f07e00b4bee0f3b84d0f, https://project-0w0pq.vercel.app. Es el deployment de rollback; no promover este trabajo mientras falte un gate. Preview inicial: dpl_HK8tueeKZxiJm6c5YuBhhTisGJcb, SHA de la base.

La limpieza explícitamente autorizada de la cuenta abierta terminó: 481 filas y tres archivos privados, Auth conservado; respaldo privado y verificación de ámbito, otras cuentas y catálogo preservados. No se repite la limpieza. La historia nueva usa bases locales segregadas, entradas naturales y procedencia sintética privada. No se califican personas reales ni se envían evidencias de menores a IA. No se crearon fixtures cloud de esta ronda. Las 82 tablas públicas tienen RLS, con 80 políticas; migraciones y dispatcher remoto inventariados sin modificarlos.

El SHA final y URL/ID READY se registran **después del commit**, sin alterar el commit desplegado, en .local/ayni-qa-integral-20261009/preview-smoke.json y el resumen ejecutivo privado. No confundir el Preview inicial con el final ni una comprobación pública con un recorrido autenticado.

## Historia funcional nueva y segundo QA

| Etapa | Resultado y evidencia |
|---|---|
| Alta y aula | Seis altas naturales, escritorio y móvil; matrícula continua, retiros/restitución y exclusión por docente. Importación CSV focal 3/4 años por API; foto opcional de ilustración sin personas por API. Cámara y flujo UI de foto/importación no aprobados. |
| Fuentes | Cuatro entrevistas confirmadas, una en borrador y una ausente. Observaciones espontáneas/guiadas, doble guardado sin duplicado y corrección con original conservado. Escrituras manuales: cero IA. |
| Diagnóstico | Cinco años aceptado tras reparar pérdida de verbos; citas por fuente, familia separada y niño sin registros sin letra. Focal tres años aceptado; cuatro años rechazado por pérdida de Propuso/Colocó, corregido y aceptado en llamada 51. |
| Mi año | Tres aportes docentes; citas continuas, índices desde cero, contexto recuperable. Sol high produjo quince tramos y 172 fechas válidas; una creación background y 121 consultas, sin nuevas generaciones por F5. Intercambio, retiro/reposición y colocación de tarjeta preservaron las otras catorce y no llamaron IA. |
| Tarjeta y proyecto | Dos turnos y tarjeta propia Sol medium. Dos llamadas de conversación de proyecto y cierre por código. Master aceptado en llamada 18: fundamentación completa de 994 caracteres y ocho días; salidas 15–17 rechazadas conservadas. Confirmar no prepara días automáticamente. |
| Actividades y Hoy | Cinco días preparados individualmente; taller opcional separado, horario único y apertura desde Hoy. Alternativas sin sol y continuidad condicional; el plan no se presenta como hecho observado. Último día preparado mediante CTA principal; volver desde Calendario actualiza Hoy sin F5. |
| Evaluación | Análisis sin familia ni letra IA. Dos letras manuales con sustento delimitado, cuatro niños pendientes sin C automática. Insuficiencia visible también con tres notas. Corrección de nota invalida únicamente fuentes dependientes; confirmación manual de letra conserva el estado del análisis vigente. |
| Conclusiones y familias | Conclusión usa evidencia y letra docente; estado insuficiente conservado literalmente. Familia copia conclusión canónica y solo propone recomendaciones. Ejemplos obligatorios cuando hay actuaciones. Rechazos temporales conservados; introducción final sin intervalo futuro presentado como observación. |
| Cierre e historia | Cierre, reapertura, nota corregida, análisis/conclusión/informe revisados, letra B→A y segundo cierre. V1 inalterada, V2 A/B y cuatro pendientes. Incidente 43 creó cuatro versiones vacías innecesarias: se conserva esa historia y se corrige la reutilización, sin borrar registros para simular éxito. Comparación final preserva los otros cinco informes respecto de ese baseline explícito. |
| Exportaciones finales | Seis Word, ocho páginas renderizadas e inspeccionadas; Excel con seis filas, A/B y cuatro celdas de nivel vacías, inspección visual. Descargas nativas finales IAB Word/Excel iguales al contenido XML canónico. Chrome dejó descarga incompleta: no se cuenta como PASS. |
| UI después del último cambio | Proyecto, Hoy, actividad, Evaluar, consolidado y Calendario comprobados a 1366×900 y 390×844; retorno/F5, carga larga recuperable, errores y vacío. Teclado muestra foco visible. Zoom real 200% no verificado: los intentos de atajo no cambiaron dimensiones/DPR. |

Los documentos finales no incorporan salidas pedagógicas críticas rechazadas. Las llamadas 44 y 47 no se guardaron; una edición docente del primer informe se distingue del raw IA. Los grados de esta historia pertenecen exclusivamente a datos sintéticos privados.

## Defectos, regresión y límites

Registro IQ-01 a IQ-21: docs/ERRORS_AND_FIXES.md; decisiones ADR-122/123. Contexto común: base y rama anteriores, fuente PDF del 9 de octubre; el SHA correctivo es el commit que contiene este informe y figura en el recibo posterior. Sin migraciones ni cambios de RLS.

Pruebas finales después de todos los cambios: **775/775 PASS, cero fallos, skips o cancelaciones**. Lint, typecheck, Next webpack y Vinext PASS. Logs/exit codes y hashes en validation-final.json privado. Suite enumerada de src/lib, scripts y evals, concurrencia 2; herramientas privadas LibreOffice excluidas del lint. No ejecutar experimentos históricos sin configuración como si fueran pruebas del producto.

Regresiones: Auth/Origin/ownership entre docentes en harness, CAS/concurrencia, recuperación de trabajo y doble clic, reintento explícito sin creación automática, snapshots, análisis insuficiente, estado manual de letra, lote obsoleto, Word/Excel y preservación del cierre. RED/GREEN específicos para reutilización de familia, autoridad del análisis y costo de ASR; otros defectos tienen reproducción funcional antes/después y focales, sin inventar un RED automatizado.

Micrófono real: autorización específica pendiente; WAV sintético valida ASR, no hardware. Cámara no probada. Zoom 200% bloqueado por falta de operación verificable del navegador. Smoke cloud autenticado de dos docentes sintéticos bloqueado: no hay credenciales utilizables; env pull devuelve secretos SENSITIVE. No se relaja protección, no se reutilizan cuentas reales ni se declara RLS remoto PASS solo por inspección. El smoke público posterior comprueba rutas públicas, rechazo sin sesión y Origin ajeno, pero no sustituye G5.

## IA y costo conciliado

**52 peticiones físicas, 36 aceptadas, 16 rechazadas: USD 0,6705745.** Aceptadas USD 0,389645675; rechazadas USD 0,280928825. Todas devuelven usage, desconocidas cero en este ledger. Tres intentos bloqueados antes del proveedor no son peticiones facturables; 121 polls del año se registran aparte. Los rechazos por contrato no reciben una rúbrica inventada; dimensiones no evaluables quedan vacías con motivo. Calidad aceptada evaluada en ocho dimensiones, separada del contrato JSON.

La estimación inicial USD 0,6733795 permanece intacta. Conciliación posterior usa tokens ASR reales: 300/57 para 30 s = USD 0,000660; 600/57 para 60 s = USD 0,001035; limpieza condicional USD 0,0000553. Los WAV contienen el mismo dictado y silencio hasta su duración; no generalizar esa densidad a todos los audios.

| Función / unidad | USD medido | Alcance |
|---|---:|---|
| Chat año / turno | 0,001246425 | Mediana seis llamadas, incluidos dos rechazos |
| Chat tarjeta / turno | 0,000941863 | Mediana dos llamadas |
| Chat proyecto / turno | 0,000178950 | Mediana dos llamadas |
| Diagnóstico cinco años | 0,028881 | Aceptado; ambos intentos 0,060952 |
| Año quince tramos | 0,170111 | Generación única; conversación completa y rechazos 0,1776703 |
| Nueva tarjeta completa | 0,038237225 | Dos turnos + generación |
| Proyecto completo aceptado | 0,073156700 | Chat + Master; con tres rechazos 0,2865751 |
| Actividad / taller | 0,001771675 / 0,000358850 | Mediana de aceptadas; gasto rechazado en CSV |
| Audio 30 s / 60 s + limpieza | 0,000660000 / 0,001090300 | Una muestra por duración |
| Análisis / conclusión / familia | 0,001331363 / 0,001036300 / 0,000989113 | Medianas aceptadas; unidades niño×competencia o niño×bimestre |
| Escritura, letra, Word/Excel, cierre, familia sin conclusión | 0 | Código, cero llamadas IA |

AYNI_COSTOS_ACTUALES.csv contiene n, promedio, mediana, extremos, tokens, caché, latencia, costo aceptado/rechazado y productos completos. p95 no calculado: ninguna función alcanza el umbral declarado n≥30. AYNI_IA_CALL_MATRIX.csv contiene 52 filas y hashes; AYNI_EVIDENCE_INDEX.csv referencia los 104 inputs/outputs íntegros privados, sin publicar payloads ni identidades. Tokens de razonamiento ya incluidos en salida no se suman dos veces; cache write sustituye tarifa de entrada para esos tokens. Fuente oficial consultada el 10 de octubre: [precios OpenAI](https://developers.openai.com/api/docs/pricing), [transcripción](https://developers.openai.com/api/docs/models/gpt-4o-mini-transcribe).

## Proyección explícita, sin factura ficticia

Base: quince tarjetas, diez meses lectivos; preparar 5/10/15 proyectos según uso, 60/120/160 actividades, 0/20/40 talleres, 120/300/600 dictados, 3/6/10 competencias por bimestre y cobertura 50/75/100%; cuatro bimestres. Reintentos 10/20/30%. Variables y fórmulas completas en AYNI_COSTOS_ESCENARIOS.csv; sensibilidad en AYNI_COSTOS_SENSIBILIDAD.csv. Se usan medianas aceptadas, no se suman nuevamente rechazos ya contenidos en una unidad completa.

| Niños | Conservador USD/año | Típico USD/año | Intensivo USD/año |
|---:|---:|---:|---:|
| 6 | 0,9756 | 2,2418 | 3,9955 |
| 20 | 1,2248 | 3,0076 | 5,7912 |
| 25 | 1,3138 | 3,2811 | 6,4325 |

Para veinte niños, típico: USD 0,3008/mes lectivo; intervalo de sensibilidad anual USD 2,5063–4,5114, definido como base sin reintentos a 1,5×escenario con reintentos. No es intervalo estadístico ni costo de suscripción. **Subtotal conocido: API; infraestructura Vercel/Supabase/storage/red no medida; total conocido + importe desconocido de infraestructura, impuestos y margen.** No sustituir desconocido por cero. Historia de precios y arquitectura anterior separada en AI_COST_MODEL.md.

## Gates y publicación

| Gate | Estado | Condición |
|---|---|---|
| G0 Fuente | PASS | Base, cuenta, infraestructura, Production y rollback inventariados |
| G1 IA | PASS local | Historia nueva completa, trazas y salidas críticas rechazadas fuera de datos finales |
| G2 UX/UI | BLOQUEADO | Pantallas y móvil revisados; falta zoom real 200% verificable |
| G3 Regresión | BLOQUEADO parcial | 775 pruebas y checks técnicos PASS; hardware y seguridad/flujo autenticado cloud pendientes |
| G4 Costos | PASS | 52 calls conciliadas, rechazos visibles, escenarios e infraestructura desconocida explícita |
| G5 Preview | BLOQUEADO parcial | Commit/push/READY exactos y smoke público en recibo posterior; falta smoke con cuenta sintética cloud |
| G6 Production | BLOQUEADO | G2/G3/G5 incompletos: autorización condicional del PDF no satisfecha |

No integrar a main ni promover Production para ocultar límites. Rollback de código mediante revert del commit correctivo; no borrar migraciones o datos legítimos. Evidencia reproducible restringida al propietario: paquete privado con manifiesto de hashes, trazas, snapshots, capturas, exportaciones, WAV, logs y recibos sanitizados. Se excluyen secretos, auth, env y bases de datos. Resumen ejecutivo privado ≤2 páginas con SHA y URLs verificadas después de publicar Preview.
