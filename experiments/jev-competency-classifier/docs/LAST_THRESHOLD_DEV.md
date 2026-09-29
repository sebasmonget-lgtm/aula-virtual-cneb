# Threshold — simulación offline DEV

En V2.3 RAW y CLEAN, .45 y .40 reproducen exactamente las decisiones de .50. Todas las falsas abstenciones restantes tienen confianza .95–.96 y suficiencia .61–.63: el gate activo es suficiencia .70, no confianza. No hay beneficio DEV que justifique bajar confianza. En V2 inicial reducir confidence también habilita primarias incorrectas; no usar TEST1 para contradecir la elección DEV.

Replay condicional a outputs ya guardados, no estima cómo cambiará la distribución de confianza al modificar el prompt V2.4. DEV reutilizado y próximo al techo; repeticiones no son casos independientes. No variar suficiencia porque no está autorizado en esta comprobación.

Original: 0.50. Probados: 0.50, 0.45, 0.40. Seleccionado: 0.50. Suficiencia 0.70 y secundaria 0.80 sin cambios. Escala 0–1, comparación inclusiva. Cero llamadas.

| Versión | Brazo | Threshold | Acceptable primary | Falsas abstenciones | Sobreclasificación | Primaria incorrecta | Privacy FP/FN | Fallos proveedor |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| V2 | CURRENT_V2_RAW | 0.50 | 91.18% | 18 | 0 | 0 | 0/0 | 0 |
| V2 | CURRENT_V2_RAW | 0.45 | 92.65% | 13 | 0 | 2 | 0/0 | 0 |
| V2 | CURRENT_V2_RAW | 0.40 | 93.14% | 12 | 0 | 2 | 0/0 | 0 |
| V2 | CURRENT_V2_LUNA_CLEAN | 0.50 | 92.65% | 13 | 0 | 2 | 0/0 | 0 |
| V2 | CURRENT_V2_LUNA_CLEAN | 0.45 | 93.63% | 9 | 0 | 4 | 0/0 | 0 |
| V2 | CURRENT_V2_LUNA_CLEAN | 0.40 | 93.63% | 8 | 0 | 5 | 0/0 | 0 |
| V2.1 | CURRENT_V2_RAW | 0.50 | 95.10% | 9 | 0 | 0 | 0/0 | 1 |
| V2.1 | CURRENT_V2_RAW | 0.45 | 95.10% | 9 | 0 | 0 | 0/0 | 1 |
| V2.1 | CURRENT_V2_RAW | 0.40 | 95.10% | 9 | 0 | 0 | 0/0 | 1 |
| V2.1 | CURRENT_V2_LUNA_CLEAN | 0.50 | 94.61% | 11 | 0 | 0 | 0/0 | 0 |
| V2.1 | CURRENT_V2_LUNA_CLEAN | 0.45 | 94.61% | 11 | 0 | 0 | 0/0 | 0 |
| V2.1 | CURRENT_V2_LUNA_CLEAN | 0.40 | 94.61% | 11 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_RAW | 0.50 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_RAW | 0.45 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_RAW | 0.40 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_LUNA_CLEAN | 0.50 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_LUNA_CLEAN | 0.45 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.2 | CURRENT_V2_LUNA_CLEAN | 0.40 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_RAW | 0.50 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_RAW | 0.45 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_RAW | 0.40 | 98.53% | 3 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_LUNA_CLEAN | 0.50 | 99.51% | 1 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_LUNA_CLEAN | 0.45 | 99.51% | 1 | 0 | 0 | 0/0 | 0 |
| V2.3 | CURRENT_V2_LUNA_CLEAN | 0.40 | 99.51% | 1 | 0 | 0 | 0/0 | 0 |

Denominador curricular por fila: 204 (68 casos × 3). Sobreclasificaciones: 24 oportunidades (8 × 3); Privacy: 12 positivos y 228 negativos. Cuatro ciclos comparten los mismos 80 casos, no 320 independientes. V2.1 RAW tiene un fallo sin respuesta principal; se conserva como fallo, no se inventa confianza ni resultado. Replay original .50 se valida contra cada resultado existente.

## Cambios al bajar threshold

- V2/CURRENT_V2_RAW/0.45: DEV_042 r1 → MAT_CANTIDAD (incorrecta); DEV_051 r1 → COM_ARTE (aceptable); DEV_042 r2 → COM_ESCRITURA (aceptable); DEV_042 r3 → MAT_CANTIDAD (incorrecta); DEV_051 r3 → COM_ARTE (aceptable).
- V2/CURRENT_V2_RAW/0.4: DEV_042 r1 → MAT_CANTIDAD (incorrecta); DEV_051 r1 → COM_ARTE (aceptable); DEV_042 r2 → COM_ESCRITURA (aceptable); DEV_051 r2 → COM_ARTE (aceptable); DEV_042 r3 → MAT_CANTIDAD (incorrecta); DEV_051 r3 → COM_ARTE (aceptable).
- V2/CURRENT_V2_LUNA_CLEAN/0.45: DEV_042 r1 → MAT_CANTIDAD (incorrecta); DEV_051 r2 → COM_ARTE (aceptable); DEV_059 r2 → PSICO_MOTRICIDAD (aceptable); DEV_042 r3 → MAT_CANTIDAD (incorrecta).
- V2/CURRENT_V2_LUNA_CLEAN/0.4: DEV_042 r1 → MAT_CANTIDAD (incorrecta); DEV_042 r2 → MAT_CANTIDAD (incorrecta); DEV_051 r2 → COM_ARTE (aceptable); DEV_059 r2 → PSICO_MOTRICIDAD (aceptable); DEV_042 r3 → MAT_CANTIDAD (incorrecta).

