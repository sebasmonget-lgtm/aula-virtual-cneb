# F2 reducida: decisión provisional cerrada

## Protocolo y preservación

Amendment autorizado por el usuario por control de costos: 12 casos con A/B completos, una repetición seleccionada por caso, aprovechando datos existentes. 63 salidas válidas originales conservadas sin regeneración. Archivo original SHA-256 `5b39b9ffe663419ac10e4b9b2f0b0028036c6d9401a3b16caadd670e3d622b76`. Solo se completaron los dos A autorizados: `base-5-p4-baseline` (repetición histórica 2) y `hard-holiday` (3). Estos números no significan repeticiones nuevas: se seleccionó una por caso.

Cada A usa preview→dependents→master: dos generaciones completas, seis requests, en dos bloques de tres estimados antes de ejecutar. Sin reintentos nuevos. Gasto medido por usage y precios congelados: **US$0,1416364**, inferior al techo adicional de US$3. Output caps de seguridad: 2048/4096/12000; desviación explícita respecto de las corridas históricas sin ese límite. No se pagaron llamadas de evaluación.

Dos pasadas separadas del agente actual, IDs anonimizados sin método/precios/latencia. Pasada 1 leyó los componentes completos; pasada 2 auditó criterios/evidencias/progresión en orden inverso. Los dos archivos de puntuaciones se congelaron antes de revelar métodos. No son especialistas humanos ni evaluadores independientes; no puede excluirse recuerdo de la primera pasada. Discrepancias: menor puntuación por dimensión y mayor estimación de correcciones. Correcciones son unidades estimadas del agente, **no** minutos ni trabajo observado de docentes. Revisión humana pendiente.

Cobertura: 8 casos de 3 años (P1–P4, dos contextos), 2 de 4 años/P1, 1 de 5 años/P4 y 1 difícil de 4 años/P2 con feriado. Diverso, pero no matriz factorial equilibrada, sin conjunto legacy completo ni especialistas. Selección por disponibilidad, no por calidad. 26 pares históricos completos antes de los dos A; 28 después; 12 seleccionados. Los 153 fallos originales de proveedor/cuota siguen preservados: no se excluyen del registro ni se atribuyen a calidad pedagógica. La validez del subconjunto no estima la tasa de éxito global.

## Resultado medido y provisional

| Métrica | A | B |
| --- | ---: | ---: |
| Salidas seleccionadas válidas en gate común | 12/12 | 12/12 |
| Puntuación provisional ponderada /4 | 3,9542 | 3,6917 |
| Correcciones estimadas, total | 2 | 8 |
| Tokens entrada | 145464 | 51331 |
| Tokens salida, incluido razonamiento facturado | 62424 | 55668 |
| Costo registrado mínimo US$ | 0,7640814 | 0,6023306 |
| Costo mediano registrado US$ | 0,0611598 | 0,0505831 |
| Latencia P50, segundos | 115,746 | 113,773 |
| Latencia P95, segundos | 141,490 | 293,780 |
| Reintentos históricos seleccionados | 0 | 4 |
| Intentos de facturación desconocida | 0 | 4 |

Los costos son medición usage×precio, no conciliación de factura; B es límite inferior por cuatro intentos sin usage. No se los supone gratis. La reducción de mediana registrada es aproximadamente 17,3 %, no 25 %, y no habilita el gate de costo con facturación desconocida. B no reduce P95.

| Caso | A /4 | B /4 | Correcciones A/B |
| --- | ---: | ---: | ---: |
| 3 años P1 sin novedades | 4,00 | 4,00 | 0/0 |
| 3 años P1 nuevo contexto | 4,00 | 4,00 | 0/0 |
| 3 años P2 sin novedades | 4,00 | 3,70 | 0/1 |
| 3 años P2 nuevo contexto | 3,70 | 3,50 | 1/1 |
| 3 años P3 sin novedades | 4,00 | 4,00 | 0/0 |
| 3 años P3 nuevo contexto | 4,00 | 4,00 | 0/0 |
| 3 años P4 sin novedades | 4,00 | 3,50 | 0/1 |
| 3 años P4 nuevo contexto | 3,75 | 2,65 | 1/2 |
| 4 años P1 sin novedades | 4,00 | 3,75 | 0/1 |
| 4 años P1 nuevo contexto | 4,00 | 3,70 | 0/1 |
| 5 años P4 sin novedades | 4,00 | 3,50 | 0/1 |
| Difícil/feriado | 4,00 | 4,00 | 0/0 |

Hallazgos corregibles en borradores: criterios generales demasiado amplios para algunas evidencias diarias, elección de libro evaluada como narración, soporte de lectura sustituido por dibujos/marcas sin asegurar texto escrito, y disponibilidad de soportes poco explícita. No se corrigieron/regeneraron outputs para mejorar puntuaciones. Los originales siguen intactos. Son aspectos que requieren revisión docente antes de confirmar, no evidencias observadas ni calificaciones de niños.

## Regla y decisión

Se conservaron pesos 20/20/20/15/15/10 y umbrales preregistrados: delta ≥0,20/4 sin caída >0,20 de dimensión, o empate ±0,20 con ≥25 % de mejora en P95/costo y sin más edición. Delta B−A = **−0,2625**. Bootstrap pareado, semilla 20260928, 2000 muestras: intervalo descriptivo [−0,4667; −0,1083]. No es evidencia estadística de eficacia docente por selección, tamaño y evaluador único.

Los dos brazos pasan el validador V3 común en los 24 outputs, calendario completo y pares con mismos hashes de input/KB/calendario/retrieval/proveedor/precio/schema. Cero writes a datos reales: riesgo auditado solo en archivos sintéticos aislados, no Supabase/Storage real. El caso difícil no tuvo veto grave; no hay adjudicación experta independiente. Las limitaciones impiden sustituir esto por el gate completo original de 36×3 casos: se usa la excepción provisional autorizada, sin debilitar `decideBakeoff`.

**Decisión de ingeniería: A para F3; B experimental. F2 reducida cerrada, validación humana pendiente.** Sin más generación ni API de revisión. No habilita despliegue.

Reproducción offline: `node evals/project-master/finalize-reduced.mjs`, con resultados y ledger locales presentes. Reviews y lógica están en Git; binarios/resultados extensos locales permanecen ignorados. No ejecutar runners pagados para reproducir la decisión.
