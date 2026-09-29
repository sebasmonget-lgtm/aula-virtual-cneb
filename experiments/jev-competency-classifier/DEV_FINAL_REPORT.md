# DEV_FINAL_REPORT

## Cierre de optimización DEV

Gold: 3cc4f1f0cc09763bfae90f002d270dfc62d9597df0583e581283b143818ff320. Origen Codex por autorización del usuario, fijado antes de proveedores. 80 registros sintéticos; 68 clasificables, ocho abstenciones, cuatro formatos sensibles ficticios. El test final no se abrió durante DEV.

Candidato: **V2.3/CURRENT_V2_LUNA_CLEAN**. Criterio: primaria aceptable, falsas abstenciones, sobreclasificación, privacidad FP/FN, estabilidad; luego latencia y costo. Exact decision es secundaria. Mayor primaria aceptable observada (203/204); una falsa abstención, cero sobreclasificaciones, Privacy FP/FN y errores secundarios. Se agotaron tres revisiones autorizadas. CLEAN gana por efectividad agregada según el orden acordado; no cumple el indicador previo de evidencia alineada (45 incidencias), no se promueve automáticamente.

V1 conserva instrucciones en cada ciclo. Sus nuevas repeticiones se muestran como controles; para selección se usa la primera medición, evitando escoger un control idéntico por una fluctuación favorable.

## Todas las versiones y variantes (tres repeticiones)

Los costos de brazos LUNA son mixtos: costo Jev del proveedor + cálculo tarifario Luna sobre tokens reales. No son una factura conjunta verificada. RAW usa costo Jev; procedencia y desconocidos se detallan por brazo en la sección de costos.

| Versión / variante | Primary | Acceptable primary | False abst. | Overclass. | Privacy FP/FN | Exact decision | Cost/1000 | Latencia ms | Primarias inestables /80 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| V2/CURRENT_V1_RAW | 89.71% | 92.65% | 12 | 0 | 0/0 | 91.25% | $0.211118 | 323 | 2 |
| V2/CURRENT_V2_RAW | 88.24% | 91.18% | 18 | 0 | 0/0 | 92.50% | $0.212815 | 328 | 0 |
| V2/CURRENT_V2_LUNA_CLEAN | 89.71% | 92.65% | 13 | 0 | 0/0 | 93.75% | $0.273012 | 1856 | 3 |
| V2/CURRENT_V2_LUNA_INTERPRET | 92.65% | 95.59% | 6 | 0 | 0/0 | 96.25% | $0.289304 | 1842 | 2 |
| V2.1/CURRENT_V1_RAW | 90.20% | 93.14% | 10 | 0 | 0/0 | 91.67% | desconocido | 369 | 4 |
| V2.1/CURRENT_V2_RAW | 95.10% | 95.10% | 9 | 0 | 0/0 | 95.83% | desconocido | 364 | 1 |
| V2.1/CURRENT_V2_LUNA_CLEAN | 94.61% | 94.61% | 11 | 0 | 0/0 | 95.42% | $0.325924 | 1799 | 3 |
| V2.1/CURRENT_V2_LUNA_INTERPRET | 98.53% | 98.53% | 3 | 1 | 0/0 | 98.33% | $0.343511 | 1904 | 3 |
| V2.2/CURRENT_V1_RAW | 89.71% | 92.65% | 12 | 0 | 0/0 | 91.25% | $0.211118 | 323 | 2 |
| V2.2/CURRENT_V2_RAW | 98.53% | 98.53% | 3 | 0 | 0/0 | 98.75% | $0.291538 | 321 | 0 |
| V2.2/CURRENT_V2_LUNA_CLEAN | 98.53% | 98.53% | 3 | 0 | 0/0 | 98.75% | $0.349031 | 1778 | 0 |
| V2.2/CURRENT_V2_LUNA_INTERPRET | 98.04% | 98.04% | 4 | 0 | 0/0 | 98.33% | $0.368142 | 2000 | 1 |
| V2.3/CURRENT_V1_RAW | 89.71% | 92.65% | 12 | 0 | 0/0 | 91.25% | $0.211118 | 311 | 0 |
| V2.3/CURRENT_V2_RAW | 98.53% | 98.53% | 3 | 0 | 0/0 | 98.75% | $0.307817 | 322 | 0 |
| V2.3/CURRENT_V2_LUNA_CLEAN | 99.51% | 99.51% | 1 | 0 | 0/0 | 99.58% | $0.371824 | 2009 | 1 |
| V2.3/CURRENT_V2_LUNA_INTERPRET | 99.02% | 99.02% | 1 | 0 | 0/0 | 99.17% | $0.383714 | 1870 | 1 |

Cada accuracy primaria usa 204 repeticiones clasificables (68×3), no 240 casos independientes. Primarias alternativas cuentan como aceptables. Otras decisiones y secundarias se evalúan por separado. El gold conservador tiene cero secundarias exigidas: missing_secondary=0 por construcción, no demuestra recuperación de secundarias. Evidence/reason de V1 no existen; no se inventan explicaciones retrospectivas.

## Estabilidad por versión y brazo

- V2/CURRENT_V1_RAW: accuracy por repetición 92.65% / 94.12% / 91.18%; primaria inestable DEV_005, DEV_046; adicionales incorrectos 6; secundarias ausentes 0; evidencia no alineada 0.
- V2/CURRENT_V2_RAW: accuracy por repetición 91.18% / 91.18% / 91.18%; primaria inestable ninguna; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 3.
- V2/CURRENT_V2_LUNA_CLEAN: accuracy por repetición 92.65% / 91.18% / 94.12%; primaria inestable DEV_043, DEV_051, DEV_057; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 59.
- V2/CURRENT_V2_LUNA_INTERPRET: accuracy por repetición 94.12% / 95.59% / 97.06%; primaria inestable DEV_042, DEV_059; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 99.
- V2.1/CURRENT_V1_RAW: accuracy por repetición 92.65% / 92.65% / 94.12%; primaria inestable DEV_005, DEV_006, DEV_009, DEV_057; adicionales incorrectos 6; secundarias ausentes 0; evidencia no alineada 0.
- V2.1/CURRENT_V2_RAW: accuracy por repetición 95.59% / 95.59% / 94.12%; primaria inestable DEV_005; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 0.
- V2.1/CURRENT_V2_LUNA_CLEAN: accuracy por repetición 94.12% / 95.59% / 94.12%; primaria inestable DEV_028, DEV_035, DEV_038; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 53.
- V2.1/CURRENT_V2_LUNA_INTERPRET: accuracy por repetición 97.06% / 100.00% / 98.53%; primaria inestable DEV_063, DEV_065, DEV_075; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 102.
- V2.2/CURRENT_V1_RAW: accuracy por repetición 92.65% / 91.18% / 94.12%; primaria inestable DEV_005, DEV_046; adicionales incorrectos 6; secundarias ausentes 0; evidencia no alineada 0.
- V2.2/CURRENT_V2_RAW: accuracy por repetición 98.53% / 98.53% / 98.53%; primaria inestable ninguna; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 0.
- V2.2/CURRENT_V2_LUNA_CLEAN: accuracy por repetición 98.53% / 98.53% / 98.53%; primaria inestable ninguna; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 50.
- V2.2/CURRENT_V2_LUNA_INTERPRET: accuracy por repetición 97.06% / 98.53% / 98.53%; primaria inestable DEV_049; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 91.
- V2.3/CURRENT_V1_RAW: accuracy por repetición 92.65% / 92.65% / 92.65%; primaria inestable ninguna; adicionales incorrectos 6; secundarias ausentes 0; evidencia no alineada 0.
- V2.3/CURRENT_V2_RAW: accuracy por repetición 98.53% / 98.53% / 98.53%; primaria inestable ninguna; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 0.
- V2.3/CURRENT_V2_LUNA_CLEAN: accuracy por repetición 100.00% / 98.53% / 100.00%; primaria inestable DEV_057; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 45.
- V2.3/CURRENT_V2_LUNA_INTERPRET: accuracy por repetición 98.53% / 100.00% / 98.53%; primaria inestable DEV_049; adicionales incorrectos 0; secundarias ausentes 0; evidencia no alineada 91.

## Indicadores operativos previos de revisión

Se informan los checks de la fase preparatoria (incluida evidencia alineada); no equivalen a una revisión docente independiente ni habilitan integración automática. La selección autónoma sigue los criterios posteriores del usuario.

```json
{
  "checks": {
    "three_runs": true,
    "primary_improves": true,
    "no_more_false_abstentions": true,
    "no_more_privacy_fp": true,
    "no_significant_overclassification_increase": true,
    "stable_runs": true,
    "no_provider_failures": true,
    "evidence_grounded": false
  },
  "accuracy_range": 0.014705882352941124,
  "indicative_85_percent_target_met": true,
  "eligible_for_human_candidate_review": false,
  "automatic_promotion": false
}
```

## Aporte de Luna y diferencias pareadas

Los conteos de errores corregidos/introducidos excluyen fallos de proveedores. Accuracy y bootstrap miden el flujo completo y cuentan esos fallos como desaciertos. En V2.1 esto cambia el denominador pareado; no atribuir correcciones técnicas a capacidad pedagógica de Luna.

CLEAN e INTERPRET usan prompts Luna distintos y nuevas llamadas: no comparten un mismo texto limpio. D−C compara tratamientos completos (limpieza, interpretación cuando aparece e incertidumbre), no identifica perfectamente el efecto aislado de agregar una frase interpretativa. En DEV075/V2.1 hubo sobreclasificación D con brief_interpretation=null; ese error no prueba sesgo de una interpretación breve.

DEV057/V2.3/r1: CLEAN agregó un verbo contextual ocultado por el filtro y acertó la competencia. El acierto no garantiza conservación de hechos. Evidencia y limitaciones verificadas en docs/current-study/LUNA_INPUT_FAITHFULNESS.md; no se modificaron prompts ni gold por ese hallazgo.

### V2

```json
{
  "v2_vs_v1": {
    "before": "CURRENT_V1_RAW",
    "after": "CURRENT_V2_RAW",
    "corrected_primary": 9,
    "introduced_primary_errors": 12,
    "net_primary_errors_corrected": -3,
    "improved": [
      "DEV_005",
      "DEV_009",
      "DEV_064",
      "DEV_009",
      "DEV_064",
      "DEV_005",
      "DEV_009",
      "DEV_046",
      "DEV_064"
    ],
    "worsened": [
      "DEV_051",
      "DEV_057",
      "DEV_059",
      "DEV_060",
      "DEV_051",
      "DEV_057",
      "DEV_059",
      "DEV_060",
      "DEV_051",
      "DEV_057",
      "DEV_059",
      "DEV_060"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": -0.014705882352941235,
    "incremental_cost_usd": 0.0004072319999999588,
    "incremental_cost_per_1000_usd": 0.0016967999999998318,
    "incremental_latency_ms": 4.320833333333326
  },
  "clean_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_CLEAN",
    "corrected_primary": 3,
    "introduced_primary_errors": 0,
    "net_primary_errors_corrected": 3,
    "improved": [
      "DEV_051",
      "DEV_043",
      "DEV_051"
    ],
    "worsened": [],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.014705882352941235,
    "incremental_cost_usd": 0.014447208000000045,
    "incremental_cost_per_1000_usd": 0.06019670000000013,
    "incremental_latency_ms": 1528.5791666666669
  },
  "interpret_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 9,
    "introduced_primary_errors": 0,
    "net_primary_errors_corrected": 9,
    "improved": [
      "DEV_043",
      "DEV_051",
      "DEV_042",
      "DEV_043",
      "DEV_051",
      "DEV_042",
      "DEV_043",
      "DEV_051",
      "DEV_059"
    ],
    "worsened": [],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.044117647058823595,
    "incremental_cost_usd": 0.018357324000000022,
    "incremental_cost_per_1000_usd": 0.07648885000000008,
    "incremental_latency_ms": 1514.5708333333332
  },
  "interpret_vs_clean": {
    "before": "CURRENT_V2_LUNA_CLEAN",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 6,
    "introduced_primary_errors": 0,
    "net_primary_errors_corrected": 6,
    "improved": [
      "DEV_043",
      "DEV_042",
      "DEV_043",
      "DEV_051",
      "DEV_042",
      "DEV_059"
    ],
    "worsened": [],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.02941176470588236,
    "incremental_cost_usd": 0.003910115999999977,
    "incremental_cost_per_1000_usd": 0.01629214999999995,
    "incremental_latency_ms": -14.00833333333344
  }
}
```

Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):

```json
{
  "v2_vs_v1": {
    "cases": 68,
    "gain": -0.014705882352941176,
    "lower_95": -0.08823529411764706,
    "upper_95": 0.058823529411764705,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "clean_vs_raw": {
    "cases": 68,
    "gain": 0.014705882352941176,
    "lower_95": 0,
    "upper_95": 0.0392156862745098,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_raw": {
    "cases": 68,
    "gain": 0.04411764705882353,
    "lower_95": 0.004901960784313725,
    "upper_95": 0.09313725490196079,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_clean": {
    "cases": 68,
    "gain": 0.02941176470588235,
    "lower_95": 0.004901960784313725,
    "upper_95": 0.06372549019607843,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  }
}
```

- CURRENT_V2_RAW vs CURRENT_V1_RAW: corrige 9, introduce 12, neto -3 errores por caso-repetición; incremento $0.000407; costo incremental/error corregido $0.000045; costo/error neto corregido no definido; Δ falsa abstención 6; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 4 ms.

- CURRENT_V2_LUNA_CLEAN vs CURRENT_V2_RAW: corrige 3, introduce 0, neto 3 errores por caso-repetición; incremento $0.014447; costo incremental/error corregido $0.004816; costo/error neto corregido $0.004816; Δ falsa abstención -5; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1529 ms.

Costo incremental relativo: 28.29%; incremento absoluto $0.060197/1000 observaciones; 24.43 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_RAW: corrige 9, introduce 0, neto 9 errores por caso-repetición; incremento $0.018357; costo incremental/error corregido $0.002040; costo/error neto corregido $0.002040; Δ falsa abstención -12; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1515 ms.

Costo incremental relativo: 35.94%; incremento absoluto $0.076489/1000 observaciones; 57.68 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_LUNA_CLEAN: corrige 6, introduce 0, neto 6 errores por caso-repetición; incremento $0.003910; costo incremental/error corregido $0.000652; costo/error neto corregido $0.000652; Δ falsa abstención -7; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia -14 ms.

Limpiezas, interpretaciones y casos mejorados/empeorados/sin cambio: docs/current-study/current-v2-draft-1/LUNA_EFFECTS.md.

### V2.1

```json
{
  "v2_vs_v1": {
    "before": "CURRENT_V1_RAW",
    "after": "CURRENT_V2_RAW",
    "corrected_primary": 13,
    "introduced_primary_errors": 9,
    "net_primary_errors_corrected": 4,
    "improved": [
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_057",
      "DEV_064",
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064",
      "DEV_042",
      "DEV_043",
      "DEV_064"
    ],
    "worsened": [
      "DEV_028",
      "DEV_065",
      "DEV_067",
      "DEV_028",
      "DEV_065",
      "DEV_067",
      "DEV_028",
      "DEV_065",
      "DEV_067"
    ],
    "compared_classification_repetitions": 202,
    "acceptable_accuracy_gain": 0.019607843137254832,
    "incremental_cost_usd": null,
    "incremental_cost_per_1000_usd": null,
    "incremental_latency_ms": -5.34583333333336
  },
  "clean_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_CLEAN",
    "corrected_primary": 1,
    "introduced_primary_errors": 3,
    "net_primary_errors_corrected": -2,
    "improved": [
      "DEV_028"
    ],
    "worsened": [
      "DEV_035",
      "DEV_035",
      "DEV_038"
    ],
    "compared_classification_repetitions": 203,
    "acceptable_accuracy_gain": -0.004901960784313708,
    "incremental_cost_usd": null,
    "incremental_cost_per_1000_usd": null,
    "incremental_latency_ms": 1435.85
  },
  "interpret_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 7,
    "introduced_primary_errors": 1,
    "net_primary_errors_corrected": 6,
    "improved": [
      "DEV_028",
      "DEV_067",
      "DEV_028",
      "DEV_065",
      "DEV_067",
      "DEV_028",
      "DEV_067"
    ],
    "worsened": [
      "DEV_063"
    ],
    "compared_classification_repetitions": 203,
    "acceptable_accuracy_gain": 0.03431372549019618,
    "incremental_cost_usd": null,
    "incremental_cost_per_1000_usd": null,
    "incremental_latency_ms": 1540.6
  },
  "interpret_vs_clean": {
    "before": "CURRENT_V2_LUNA_CLEAN",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 9,
    "introduced_primary_errors": 1,
    "net_primary_errors_corrected": 8,
    "improved": [
      "DEV_028",
      "DEV_035",
      "DEV_067",
      "DEV_035",
      "DEV_065",
      "DEV_067",
      "DEV_028",
      "DEV_038",
      "DEV_067"
    ],
    "worsened": [
      "DEV_063"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.03921568627450989,
    "incremental_cost_usd": 0.004220886000000035,
    "incremental_cost_per_1000_usd": 0.0175870250000002,
    "incremental_latency_ms": 104.75
  }
}
```

Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):

```json
{
  "v2_vs_v1": {
    "cases": 68,
    "gain": 0.019607843137254905,
    "lower_95": -0.049019607843137254,
    "upper_95": 0.09313725490196079,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "clean_vs_raw": {
    "cases": 68,
    "gain": -0.004901960784313725,
    "lower_95": -0.029411764705882353,
    "upper_95": 0.0196078431372549,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_raw": {
    "cases": 68,
    "gain": 0.034313725490196074,
    "lower_95": 0,
    "upper_95": 0.07843137254901962,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_clean": {
    "cases": 68,
    "gain": 0.0392156862745098,
    "lower_95": 0.004901960784313725,
    "upper_95": 0.08333333333333333,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  }
}
```

- CURRENT_V2_RAW vs CURRENT_V1_RAW: corrige 13, introduce 9, neto 4 errores por caso-repetición; incremento desconocido; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención -1; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia -5 ms.

- CURRENT_V2_LUNA_CLEAN vs CURRENT_V2_RAW: corrige 1, introduce 3, neto -2 errores por caso-repetición; incremento desconocido; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención 2; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1436 ms.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_RAW: corrige 7, introduce 1, neto 6 errores por caso-repetición; incremento desconocido; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención -6; Δ sobreclasificación 1; Δ Privacy FP/FN 0/0; Δ latencia 1541 ms.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_LUNA_CLEAN: corrige 9, introduce 1, neto 8 errores por caso-repetición; incremento $0.004221; costo incremental/error corregido $0.000469; costo/error neto corregido $0.000528; Δ falsa abstención -8; Δ sobreclasificación 1; Δ Privacy FP/FN 0/0; Δ latencia 105 ms.

Limpiezas, interpretaciones y casos mejorados/empeorados/sin cambio: docs/current-study/current-v2.1/LUNA_EFFECTS.md.

### V2.2

```json
{
  "v2_vs_v1": {
    "before": "CURRENT_V1_RAW",
    "after": "CURRENT_V2_RAW",
    "corrected_primary": 15,
    "introduced_primary_errors": 3,
    "net_primary_errors_corrected": 12,
    "improved": [
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064",
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_046",
      "DEV_064",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064"
    ],
    "worsened": [
      "DEV_059",
      "DEV_059",
      "DEV_059"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.05882352941176472,
    "incremental_cost_usd": 0.019300679999999966,
    "incremental_cost_per_1000_usd": 0.08041949999999984,
    "incremental_latency_ms": -2.2124999999999773
  },
  "clean_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_CLEAN",
    "corrected_primary": 0,
    "introduced_primary_errors": 0,
    "net_primary_errors_corrected": 0,
    "improved": [],
    "worsened": [],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0,
    "incremental_cost_usd": 0.013798274000000013,
    "incremental_cost_per_1000_usd": 0.05749280833333342,
    "incremental_latency_ms": 1456.7875
  },
  "interpret_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 0,
    "introduced_primary_errors": 1,
    "net_primary_errors_corrected": -1,
    "improved": [],
    "worsened": [
      "DEV_049"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": -0.004901960784313819,
    "incremental_cost_usd": 0.018385030000000024,
    "incremental_cost_per_1000_usd": 0.07660429166666677,
    "incremental_latency_ms": 1679.4166666666667
  },
  "interpret_vs_clean": {
    "before": "CURRENT_V2_LUNA_CLEAN",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 0,
    "introduced_primary_errors": 1,
    "net_primary_errors_corrected": -1,
    "improved": [],
    "worsened": [
      "DEV_049"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": -0.004901960784313819,
    "incremental_cost_usd": 0.004586756000000011,
    "incremental_cost_per_1000_usd": 0.019111483333333346,
    "incremental_latency_ms": 222.62916666666683
  }
}
```

Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):

```json
{
  "v2_vs_v1": {
    "cases": 68,
    "gain": 0.058823529411764705,
    "lower_95": -3.2653618371328133e-18,
    "upper_95": 0.12745098039215685,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "clean_vs_raw": {
    "cases": 68,
    "gain": 0,
    "lower_95": 0,
    "upper_95": 0,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_raw": {
    "cases": 68,
    "gain": -0.004901960784313725,
    "lower_95": -0.014705882352941176,
    "upper_95": 0,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_clean": {
    "cases": 68,
    "gain": -0.004901960784313725,
    "lower_95": -0.014705882352941176,
    "upper_95": 0,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  }
}
```

- CURRENT_V2_RAW vs CURRENT_V1_RAW: corrige 15, introduce 3, neto 12 errores por caso-repetición; incremento $0.019301; costo incremental/error corregido $0.001287; costo/error neto corregido $0.001608; Δ falsa abstención -9; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia -2 ms.

- CURRENT_V2_LUNA_CLEAN vs CURRENT_V2_RAW: corrige 0, introduce 0, neto 0 errores por caso-repetición; incremento $0.013798; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención 0; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1457 ms.

Costo incremental relativo: 19.72%; incremento absoluto $0.057493/1000 observaciones; 0.00 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_RAW: corrige 0, introduce 1, neto -1 errores por caso-repetición; incremento $0.018385; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención 1; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1679 ms.

Costo incremental relativo: 26.28%; incremento absoluto $0.076604/1000 observaciones; -6.40 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_LUNA_CLEAN: corrige 0, introduce 1, neto -1 errores por caso-repetición; incremento $0.004587; costo incremental/error corregido no definido; costo/error neto corregido no definido; Δ falsa abstención 1; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 223 ms.

Limpiezas, interpretaciones y casos mejorados/empeorados/sin cambio: docs/current-study/current-v2.2/LUNA_EFFECTS.md.

### V2.3

```json
{
  "v2_vs_v1": {
    "before": "CURRENT_V1_RAW",
    "after": "CURRENT_V2_RAW",
    "corrected_primary": 15,
    "introduced_primary_errors": 3,
    "net_primary_errors_corrected": 12,
    "improved": [
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064",
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064",
      "DEV_005",
      "DEV_009",
      "DEV_042",
      "DEV_043",
      "DEV_064"
    ],
    "worsened": [
      "DEV_057",
      "DEV_057",
      "DEV_057"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.05882352941176472,
    "incremental_cost_usd": 0.023207687999999928,
    "incremental_cost_per_1000_usd": 0.09669869999999967,
    "incremental_latency_ms": 10.708333333333371
  },
  "clean_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_CLEAN",
    "corrected_primary": 2,
    "introduced_primary_errors": 0,
    "net_primary_errors_corrected": 2,
    "improved": [
      "DEV_057",
      "DEV_057"
    ],
    "worsened": [],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.009803921568627416,
    "incremental_cost_usd": 0.015361760000000044,
    "incremental_cost_per_1000_usd": 0.06400733333333353,
    "incremental_latency_ms": 1686.6666666666667
  },
  "interpret_vs_v2_raw": {
    "before": "CURRENT_V2_RAW",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 3,
    "introduced_primary_errors": 2,
    "net_primary_errors_corrected": 1,
    "improved": [
      "DEV_057",
      "DEV_057",
      "DEV_057"
    ],
    "worsened": [
      "DEV_049",
      "DEV_049"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": 0.004901960784313708,
    "incremental_cost_usd": 0.01821528200000004,
    "incremental_cost_per_1000_usd": 0.07589700833333357,
    "incremental_latency_ms": 1548.5833333333333
  },
  "interpret_vs_clean": {
    "before": "CURRENT_V2_LUNA_CLEAN",
    "after": "CURRENT_V2_LUNA_INTERPRET",
    "corrected_primary": 1,
    "introduced_primary_errors": 2,
    "net_primary_errors_corrected": -1,
    "improved": [
      "DEV_057"
    ],
    "worsened": [
      "DEV_049",
      "DEV_049"
    ],
    "compared_classification_repetitions": 204,
    "acceptable_accuracy_gain": -0.004901960784313708,
    "incremental_cost_usd": 0.0028535219999999972,
    "incremental_cost_per_1000_usd": 0.011889675000000044,
    "incremental_latency_ms": -138.08333333333348
  }
}
```

Intervalos exploratorios por bootstrap de casos (se promedian tres repeticiones dentro del caso, no se asumen independientes):

```json
{
  "v2_vs_v1": {
    "cases": 68,
    "gain": 0.058823529411764705,
    "lower_95": 0,
    "upper_95": 0.1323529411764706,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "clean_vs_raw": {
    "cases": 68,
    "gain": 0.00980392156862745,
    "lower_95": 0,
    "upper_95": 0.029411764705882353,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_raw": {
    "cases": 68,
    "gain": 0.004901960784313726,
    "lower_95": -0.029411764705882353,
    "upper_95": 0.04411764705882353,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  },
  "interpret_vs_clean": {
    "cases": 68,
    "gain": -0.004901960784313725,
    "lower_95": -0.029411764705882353,
    "upper_95": 0.014705882352941176,
    "iterations": 3000,
    "method": "paired case-cluster bootstrap; 3 repetitions averaged within each case; exploratory synthetic DEV"
  }
}
```

- CURRENT_V2_RAW vs CURRENT_V1_RAW: corrige 15, introduce 3, neto 12 errores por caso-repetición; incremento $0.023208; costo incremental/error corregido $0.001547; costo/error neto corregido $0.001934; Δ falsa abstención -9; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 11 ms.

- CURRENT_V2_LUNA_CLEAN vs CURRENT_V2_RAW: corrige 2, introduce 0, neto 2 errores por caso-repetición; incremento $0.015362; costo incremental/error corregido $0.007681; costo/error neto corregido $0.007681; Δ falsa abstención -2; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1687 ms.

Costo incremental relativo: 20.79%; incremento absoluto $0.064007/1000 observaciones; 15.32 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_RAW: corrige 3, introduce 2, neto 1 errores por caso-repetición; incremento $0.018215; costo incremental/error corregido $0.006072; costo/error neto corregido $0.018215; Δ falsa abstención -2; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia 1549 ms.

Costo incremental relativo: 24.66%; incremento absoluto $0.075897/1000 observaciones; 6.46 puntos de accuracy por US$1 adicional en un lote de 1000. Este cociente depende del tamaño del lote declarado.

- CURRENT_V2_LUNA_INTERPRET vs CURRENT_V2_LUNA_CLEAN: corrige 1, introduce 2, neto -1 errores por caso-repetición; incremento $0.002854; costo incremental/error corregido $0.002854; costo/error neto corregido no definido; Δ falsa abstención 0; Δ sobreclasificación 0; Δ Privacy FP/FN 0/0; Δ latencia -138 ms.

Limpiezas, interpretaciones y casos mejorados/empeorados/sin cambio: docs/current-study/current-v2.3/LUNA_EFFECTS.md.

## Costos medidos y procedencia

Jev: costo del proveedor cuando existe; fallback por tokens separado. Luna: tokens reales y costo calculado por tarifas congeladas, no factura del proveedor. Desconocidos permanecen desconocidos. Proyección usa la mezcla DEV, incluido 5% de bloqueos previos sin llamadas; extrapolación, no tarifa garantizada.

| Variante | Total | Jev | Luna | Costo/obs | Costo/100 | Costo/1000 | Llamadas |
|---|---:|---:|---:|---:|---:|---:|---:|
| V2/CURRENT_V1_RAW | $0.050668 | $0.050668 | $0.000000 | $0.000211 | $0.021112 | $0.211118 | 456 |
| V2/CURRENT_V2_RAW | $0.051076 | $0.051076 | $0.000000 | $0.000213 | $0.021282 | $0.212815 | 456 |
| V2/CURRENT_V2_LUNA_CLEAN | $0.065523 | $0.051081 | $0.014442 | $0.000273 | $0.027301 | $0.273012 | 684 |
| V2/CURRENT_V2_LUNA_INTERPRET | $0.069433 | $0.051996 | $0.017437 | $0.000289 | $0.028930 | $0.289304 | 684 |
| V2.1/CURRENT_V1_RAW | desconocido | desconocido | $0.000000 | desconocido | desconocido | desconocido | 456 |
| V2.1/CURRENT_V2_RAW | desconocido | desconocido | $0.000000 | desconocido | desconocido | desconocido | 456 |
| V2.1/CURRENT_V2_LUNA_CLEAN | $0.078222 | $0.063509 | $0.014713 | $0.000326 | $0.032592 | $0.325924 | 684 |
| V2.1/CURRENT_V2_LUNA_INTERPRET | $0.082443 | $0.064390 | $0.018053 | $0.000344 | $0.034351 | $0.343511 | 684 |
| V2.2/CURRENT_V1_RAW | $0.050668 | $0.050668 | $0.000000 | $0.000211 | $0.021112 | $0.211118 | 456 |
| V2.2/CURRENT_V2_RAW | $0.069969 | $0.069969 | $0.000000 | $0.000292 | $0.029154 | $0.291538 | 456 |
| V2.2/CURRENT_V2_LUNA_CLEAN | $0.083767 | $0.069977 | $0.013790 | $0.000349 | $0.034903 | $0.349031 | 684 |
| V2.2/CURRENT_V2_LUNA_INTERPRET | $0.088354 | $0.070858 | $0.017496 | $0.000368 | $0.036814 | $0.368142 | 684 |
| V2.3/CURRENT_V1_RAW | $0.050668 | $0.050668 | $0.000000 | $0.000211 | $0.021112 | $0.211118 | 456 |
| V2.3/CURRENT_V2_RAW | $0.073876 | $0.073876 | $0.000000 | $0.000308 | $0.030782 | $0.307817 | 456 |
| V2.3/CURRENT_V2_LUNA_CLEAN | $0.089238 | $0.073888 | $0.015350 | $0.000372 | $0.037182 | $0.371824 | 684 |
| V2.3/CURRENT_V2_LUNA_INTERPRET | $0.092091 | $0.074807 | $0.017284 | $0.000384 | $0.038371 | $0.383714 | 684 |

### Costo por acierto y llamadas medias

Costo/clasificación correcta divide el costo total por decisiones curriculares completas correctas (principal aceptable y secundarias sin error). Costo/decisión correcta incluye también abstenciones y privacidad correctas. Los dos denominadores permanecen separados.

- V2/CURRENT_V1_RAW: clasificación correcta $0.000277; decisión correcta $0.000231; llamadas/obs 1.900.
- V2/CURRENT_V2_RAW: clasificación correcta $0.000275; decisión correcta $0.000230; llamadas/obs 1.900.
- V2/CURRENT_V2_LUNA_CLEAN: clasificación correcta $0.000347; decisión correcta $0.000291; llamadas/obs 2.850.
- V2/CURRENT_V2_LUNA_INTERPRET: clasificación correcta $0.000356; decisión correcta $0.000301; llamadas/obs 2.850.
- V2.1/CURRENT_V1_RAW: clasificación correcta desconocido; decisión correcta desconocido; llamadas/obs 1.900.
- V2.1/CURRENT_V2_RAW: clasificación correcta desconocido; decisión correcta desconocido; llamadas/obs 1.900.
- V2.1/CURRENT_V2_LUNA_CLEAN: clasificación correcta $0.000405; decisión correcta $0.000342; llamadas/obs 2.850.
- V2.1/CURRENT_V2_LUNA_INTERPRET: clasificación correcta $0.000410; decisión correcta $0.000349; llamadas/obs 2.850.
- V2.2/CURRENT_V1_RAW: clasificación correcta $0.000277; decisión correcta $0.000231; llamadas/obs 1.900.
- V2.2/CURRENT_V2_RAW: clasificación correcta $0.000348; decisión correcta $0.000295; llamadas/obs 1.900.
- V2.2/CURRENT_V2_LUNA_CLEAN: clasificación correcta $0.000417; decisión correcta $0.000353; llamadas/obs 2.850.
- V2.2/CURRENT_V2_LUNA_INTERPRET: clasificación correcta $0.000442; decisión correcta $0.000374; llamadas/obs 2.850.
- V2.3/CURRENT_V1_RAW: clasificación correcta $0.000277; decisión correcta $0.000231; llamadas/obs 1.900.
- V2.3/CURRENT_V2_RAW: clasificación correcta $0.000368; decisión correcta $0.000312; llamadas/obs 1.900.
- V2.3/CURRENT_V2_LUNA_CLEAN: clasificación correcta $0.000440; decisión correcta $0.000373; llamadas/obs 2.850.
- V2.3/CURRENT_V2_LUNA_INTERPRET: clasificación correcta $0.000456; decisión correcta $0.000387; llamadas/obs 2.850.

Tarifas congeladas y centralizadas: Luna entrada US$0.10/M, entrada cacheada US$0.01/M, escritura de caché US$0.125/M y salida US$0.50/M (config/pricing-luna.json). Jev fallback entrada US$0.042/M y salida US$0/M (config/pricing-openrouter.json); la suma de costo proveedor y fallback se identifica por separado. No se reprecifica después de medir.

### Tokens y procedencia por variante

- V2/CURRENT_V1_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1206390,"missing_calls":0},"output_tokens":{"measured":98527,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.050668379999999964,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.050668379999999964,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2/CURRENT_V2_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1216086,"missing_calls":0},"output_tokens":{"measured":106744,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.051075612000000034,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.051075612000000034,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2/CURRENT_V2_LUNA_CLEAN: {"tokens":{"jev":{"input_tokens":{"measured":1216210,"missing_calls":0},"output_tokens":{"measured":106790,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":49095,"missing_calls":0},"output_tokens":{"measured":19065,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":9214,"missing_calls":0}}},"jev_provider":0.05108082,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.06552281999999995,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2/CURRENT_V2_LUNA_INTERPRET: {"tokens":{"jev":{"input_tokens":{"measured":1238008,"missing_calls":0},"output_tokens":{"measured":106711,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":80331,"missing_calls":0},"output_tokens":{"measured":18807,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":3410,"missing_calls":0}}},"jev_provider":0.051996336000000004,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.06943293599999999,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.1/CURRENT_V1_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1201098,"missing_calls":2},"output_tokens":{"measured":98092,"missing_calls":2},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.050446115999999964,"jev_tariff":0,"unknown_cost_calls":2,"known_cost_subtotal_usd":0.050446115999999964,"effective_models":{"typesafe/jev-1.13-20260917":454,"not_reported":2},"missing_latency_observations":0}
- V2.1/CURRENT_V2_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1508356,"missing_calls":1},"output_tokens":{"measured":106556,"missing_calls":1},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.06335095200000003,"jev_tariff":0,"unknown_cost_calls":1,"known_cost_subtotal_usd":0.06335095200000003,"effective_models":{"typesafe/jev-1.13-20260917":455,"not_reported":1},"missing_latency_observations":0}
- V2.1/CURRENT_V2_LUNA_CLEAN: {"tokens":{"jev":{"input_tokens":{"measured":1512113,"missing_calls":0},"output_tokens":{"measured":106869,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":49095,"missing_calls":0},"output_tokens":{"measured":19607,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":9736,"missing_calls":0}}},"jev_provider":0.063508746,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.07822174600000013,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.1/CURRENT_V2_LUNA_INTERPRET: {"tokens":{"jev":{"input_tokens":{"measured":1533096,"missing_calls":0},"output_tokens":{"measured":106685,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":80331,"missing_calls":0},"output_tokens":{"measured":20039,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":4736,"missing_calls":0}}},"jev_provider":0.064390032,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.08244263200000006,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.2/CURRENT_V1_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1206390,"missing_calls":0},"output_tokens":{"measured":98525,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.050668379999999964,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.050668379999999964,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2.2/CURRENT_V2_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1665930,"missing_calls":0},"output_tokens":{"measured":106770,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.06996905999999997,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.06996905999999997,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2.2/CURRENT_V2_LUNA_CLEAN: {"tokens":{"jev":{"input_tokens":{"measured":1666127,"missing_calls":0},"output_tokens":{"measured":106818,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":49095,"missing_calls":0},"output_tokens":{"measured":17761,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":7908,"missing_calls":0}}},"jev_provider":0.06997733399999996,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.08376733399999996,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.2/CURRENT_V2_LUNA_INTERPRET: {"tokens":{"jev":{"input_tokens":{"measured":1687095,"missing_calls":0},"output_tokens":{"measured":106776,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":80331,"missing_calls":0},"output_tokens":{"measured":18926,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":3685,"missing_calls":0}}},"jev_provider":0.07085799000000005,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.08835408999999998,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.3/CURRENT_V1_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1206390,"missing_calls":0},"output_tokens":{"measured":98527,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.050668379999999964,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.050668379999999964,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2.3/CURRENT_V2_RAW: {"tokens":{"jev":{"input_tokens":{"measured":1758954,"missing_calls":0},"output_tokens":{"measured":106770,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":0,"missing_calls":0},"output_tokens":{"measured":0,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":0,"missing_calls":0}}},"jev_provider":0.07387606799999998,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.07387606799999998,"effective_models":{"typesafe/jev-1.13-20260917":456},"missing_latency_observations":0}
- V2.3/CURRENT_V2_LUNA_CLEAN: {"tokens":{"jev":{"input_tokens":{"measured":1759234,"missing_calls":0},"output_tokens":{"measured":106882,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":49095,"missing_calls":0},"output_tokens":{"measured":20881,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":10999,"missing_calls":0}}},"jev_provider":0.07388782799999996,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.08923782799999984,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}
- V2.3/CURRENT_V2_LUNA_INTERPRET: {"tokens":{"jev":{"input_tokens":{"measured":1781125,"missing_calls":0},"output_tokens":{"measured":106728,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":456},"reasoning_tokens":{"measured":0,"missing_calls":456}},"luna":{"input_tokens":{"measured":80331,"missing_calls":0},"output_tokens":{"measured":18502,"missing_calls":0},"cached_input_tokens":{"measured":0,"missing_calls":0},"reasoning_tokens":{"measured":3111,"missing_calls":0}}},"jev_provider":0.07480724999999994,"jev_tariff":0,"unknown_cost_calls":0,"known_cost_subtotal_usd":0.09209135,"effective_models":{"typesafe/jev-1.13-20260917":456,"gpt-6-luna":228},"missing_latency_observations":0}

### Proyección mensual: 20 observaciones/día ×20 días

Se proyectan las cuatro variantes de la versión seleccionada; el consumo de versiones anteriores permanece en las tablas de costos.

| Profesoras | Obs/mes | V2.3/CURRENT_V1_RAW | V2.3/CURRENT_V2_RAW | V2.3/CURRENT_V2_LUNA_CLEAN | V2.3/CURRENT_V2_LUNA_INTERPRET |
|---:|---:|---:|---:|---:|---:|
| 1 | 400 | $0.084447 | $0.123127 | $0.148730 | $0.153486 |
| 10 | 4000 | $0.844473 | $1.231268 | $1.487297 | $1.534856 |
| 50 | 20000 | $4.222365 | $6.156339 | $7.436486 | $7.674279 |
| 100 | 40000 | $8.444730 | $12.312678 | $14.872971 | $15.348558 |

### Escenarios adicionales de 10 y 40 observaciones/día ×20 días

| Profesoras | Obs/día por profesora | Obs/mes totales | V2.3/CURRENT_V1_RAW | V2.3/CURRENT_V2_RAW | V2.3/CURRENT_V2_LUNA_CLEAN | V2.3/CURRENT_V2_LUNA_INTERPRET |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 10 | 200 | $0.042224 | $0.061563 | $0.074365 | $0.076743 |
| 1 | 40 | 800 | $0.168895 | $0.246254 | $0.297459 | $0.306971 |
| 10 | 10 | 2000 | $0.422237 | $0.615634 | $0.743649 | $0.767428 |
| 10 | 40 | 8000 | $1.688946 | $2.462536 | $2.974594 | $3.069712 |
| 50 | 10 | 10000 | $2.111183 | $3.078169 | $3.718243 | $3.837140 |
| 50 | 40 | 40000 | $8.444730 | $12.312678 | $14.872971 | $15.348558 |
| 100 | 10 | 20000 | $4.222365 | $6.156339 | $7.436486 | $7.674279 |
| 100 | 40 | 80000 | $16.889460 | $24.625356 | $29.745943 | $30.697117 |

Costo físico contabilizado de todas las corridas DEV (mixto: proveedor Jev + tarifa Luna): desconocido. Las dos modalidades Luna se invocaron separadamente en cada ciclo.

Subtotal conocido DEV: $1.109794; llamadas sin costo conocido: 3. Es un subtotal, no un total completo ni costo cero para intentos fallidos.

## Errores por categoría y trazabilidad

- V2 / CURRENT_V1_RAW: docs/current-study/current-v2-draft-1/CURRENT_V1_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/comparison.md.
- V2 / CURRENT_V2_RAW: docs/current-study/current-v2-draft-1/CURRENT_V2_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/comparison.md.
- V2 / CURRENT_V2_LUNA_CLEAN: docs/current-study/current-v2-draft-1/CURRENT_V2_LUNA_CLEAN.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/comparison.md.
- V2 / CURRENT_V2_LUNA_INTERPRET: docs/current-study/current-v2-draft-1/CURRENT_V2_LUNA_INTERPRET.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-dev-2026-09-29T04-52-16-894Z-81d4fee8/comparison.md.
- V2.1 / CURRENT_V1_RAW: docs/current-study/current-v2.1/CURRENT_V1_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/comparison.md.
- V2.1 / CURRENT_V2_RAW: docs/current-study/current-v2.1/CURRENT_V2_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/comparison.md.
- V2.1 / CURRENT_V2_LUNA_CLEAN: docs/current-study/current-v2.1/CURRENT_V2_LUNA_CLEAN.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/comparison.md.
- V2.1 / CURRENT_V2_LUNA_INTERPRET: docs/current-study/current-v2.1/CURRENT_V2_LUNA_INTERPRET.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-12-18-668Z-46e6e4f9/comparison.md.
- V2.2 / CURRENT_V1_RAW: docs/current-study/current-v2.2/CURRENT_V1_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/comparison.md.
- V2.2 / CURRENT_V2_RAW: docs/current-study/current-v2.2/CURRENT_V2_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/comparison.md.
- V2.2 / CURRENT_V2_LUNA_CLEAN: docs/current-study/current-v2.2/CURRENT_V2_LUNA_CLEAN.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/comparison.md.
- V2.2 / CURRENT_V2_LUNA_INTERPRET: docs/current-study/current-v2.2/CURRENT_V2_LUNA_INTERPRET.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-32-39-991Z-091f0284/comparison.md.
- V2.3 / CURRENT_V1_RAW: docs/current-study/current-v2.3/CURRENT_V1_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/comparison.md.
- V2.3 / CURRENT_V2_RAW: docs/current-study/current-v2.3/CURRENT_V2_RAW.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/comparison.md.
- V2.3 / CURRENT_V2_LUNA_CLEAN: docs/current-study/current-v2.3/CURRENT_V2_LUNA_CLEAN.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/comparison.md.
- V2.3 / CURRENT_V2_LUNA_INTERPRET: docs/current-study/current-v2.3/CURRENT_V2_LUNA_INTERPRET.md; ledger: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/raw-results.json; detalle de los 80 casos en tres repeticiones y cuatro brazos: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier/results/current-dev-2026-09-29T05-51-53-054Z-5ee378a1/comparison.md.

## Límites y paso al test

DEV fue creado y adjudicado por Codex, es sintético y no representa prevalencias reales. Tres repeticiones evalúan variabilidad técnica, no amplían el tamaño pedagógico. El 85% es orientativo; no se ajustan etiquetas ni thresholds para alcanzarlo. Los criterios previos de revisión humana se informan, pero esta selección autónoma fue autorizada posteriormente. No hay promoción automática a Ayni.

Privacidad corregida común permite aislar V2/Luna dentro de DEV. El delta con el baseline histórico del test incluye cambios de privacidad: una sola evaluación final de un candidato no permite repartir causalmente ese delta entre filtro, V2 y Luna. El test fue usado en el benchmark histórico y permanece cerrado durante este ajuste; no se describe como un conjunto jamás observado.

El cierre registra fuente/modelos/tarifas y candidato antes de abrir el test final. Una sola pasada de 28 casos; ningún prompt, threshold ni gold se cambiará después de ver TEST.
