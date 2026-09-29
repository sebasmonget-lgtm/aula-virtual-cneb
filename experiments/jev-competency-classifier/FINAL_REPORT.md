# Resultado final experimental CURRENT / Luna / Jev

CANDIDATO: **V2.3/CURRENT_V2_LUNA_CLEAN**. Seleccionado y congelado en DEV antes de abrir TEST.

## Efectividad completa

Costos de métodos LUNA: mezcla marcada de costo proveedor Jev y cálculo tarifario Luna sobre tokens reales; no factura conjunta verificada. RAW: costo Jev. Cost/1000 es extrapolación. Se detallan origen y tarifas en la sección de costos.

| Método | Primary | Acceptable | False abst. | Overclass. | Privacy FP/FN | Exact decision | Cost/obs | Cost/1000 | Latencia ms |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| DEV V2.3/CURRENT_V1_RAW | 89.71% | 92.65% | 12 | 0 | 0/0 | 91.25% | $0.000211 | $0.211118 | 311 |
| DEV V2.3/CURRENT_V2_RAW | 98.53% | 98.53% | 3 | 0 | 0/0 | 98.75% | $0.000308 | $0.307817 | 322 |
| DEV V2.3/CURRENT_V2_LUNA_CLEAN | 99.51% | 99.51% | 1 | 0 | 0/0 | 99.58% | $0.000372 | $0.371824 | 2009 |
| DEV V2.3/CURRENT_V2_LUNA_INTERPRET | 99.02% | 99.02% | 1 | 0 | 0/0 | 99.17% | $0.000384 | $0.383714 | 1870 |
| TEST CURRENT_RAW histórico | 69.70% | 69.70% | 10 | 3 | 6/0 | 60.71% | $0.000207 | $0.206640 | 316 |
| TEST CURRENT_LUNA histórico | 71.21% | 74.24% | 5 | 4 | 6/0 | 61.90% | $0.000280 | $0.280283 | 1846 |
| TEST candidato, una pasada | 72.73% | 72.73% | 4 | 0 | 0/0 | 71.43% | $0.000392 | $0.391948 | 2367 |

DEV: 204 repeticiones clasificables de 68 casos; TEST: 22 casos clasificables de 28 registros. TEST candidato se ejecutó una vez (una repetición); los baselines históricos tienen tres. Delta de aceptable: 3.03 puntos vs RAW y -1.52 vs LUNA histórico.

### Abstención, secundarias y fallos técnicos

| Variante | Abstenciones correctas | Privacy TP | Secundarias erróneas | Secundarias exigidas ausentes | Fallos proveedor |
|---|---:|---:|---:|---:|---:|
| DEV CURRENT_V1_RAW | 24 | 12 | 6 | 0 | 0 |
| DEV CURRENT_V2_RAW | 24 | 12 | 0 | 0 | 0 |
| DEV CURRENT_V2_LUNA_CLEAN | 24 | 12 | 0 | 0 | 0 |
| DEV CURRENT_V2_LUNA_INTERPRET | 24 | 12 | 0 | 0 | 0 |
| TEST candidato | 6 | 0 | 1 | 4 | 0 |

DEV exige cero secundarias por adjudicación conservadora: la ausencia de secundarias perdidas en DEV no demuestra recall. TEST de una repetición no mide estabilidad técnica; la estabilidad entre tres repeticiones está documentada en DEV_FINAL_REPORT.md.

## Separación de factores

Privacidad: el filtro corregido es común a A/B/C/D DEV. V1 nuevo no equivale al filtro histórico. V2: comparar B−A dentro del mismo DEV. Luna: comparar C−B, D−B y D−C dentro de cada versión. La única corrida TEST del candidato cambia varios factores respecto al historial y no permite atribuir causalmente todo el delta a V2 o Luna.

Casos históricamente bloqueados ahora liberados por el filtro: [{"id":"AG-02","acceptable_primary_correct":true},{"id":"MN-01","acceptable_primary_correct":true}]. Esto identifica oportunidades recuperadas de inferencia, no un efecto aislado de exactitud: su acierto también depende del clasificador elegido.

## Luna

CLEAN es el mejor tratamiento observado en V2.3: +0.98 puntos de primaria aceptable vs RAW, dos correcciones y cero errores introducidos, ambas correcciones del mismo caso DEV057 en dos de tres repeticiones. IC bootstrap exploratorio 95% [0, 2.94] puntos: no demuestra ganancia poblacional. INTERPRET: +0.49 puntos vs RAW, tres correcciones y dos errores introducidos, peor que CLEAN. No hay evidencia de que la interpretación breve aporte por encima de CLEAN. CLEAN añade US$0.064007/1000 y 1687 ms/obs frente a RAW. La corrección interactúa con un verbo ocultado por anonimización: no equivale a limpieza puramente fiel. No mantener Luna en uso general basándose solo en esta pequeña mejora; someterla a una prueba supervisada con gold docente nuevo.

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

## Costos reales de uso / cálculo tarifario

Jev conserva usage/costo informado por proveedor. Luna conserva tokens reales y costo calculado con tarifa congelada: no factura verificada. /100 y /1000 y meses son extrapolaciones de consumo medido; mezclan ambos orígenes de forma marcada, no se presentan como cobros observados. Desconocidos permanecen null.

TEST: Jev $0.009096, Luna $0.001879, total $0.010975, /100 $0.039195, /1000 $0.391948, llamadas 84, latencia 2367 ms.

Costo/clasificación curricular correcta: $0.000784. Costo/decisión correcta (incluye abstención/privacidad): $0.000549. Llamadas/observación: 3.000.

Costo físico contabilizado de este estudio: DEV desconocido; TEST $0.010975; total desconocido. Incluye todas las iteraciones y cuatro brazos DEV, sin sumar otra vez las proyecciones ni el benchmark histórico. Llamadas físicas: 9204. Procedencia mixta proveedor Jev / cálculo tarifario Luna.

Subtotal conocido del estudio $1.120768; 3 llamadas con costo desconocido. No se presenta el subtotal como factura total.

Tarifas congeladas: Luna entrada US$0.10/M, cacheada US$0.01/M, escritura de caché US$0.125/M, salida US$0.50/M; Jev fallback entrada US$0.042/M, salida US$0/M. Valores centralizados en config/pricing-luna.json y config/pricing-openrouter.json. Tokens ausentes no se sustituyen por supuestos.

Tokens y procedencia TEST:

```json
{
  "tokens": {
    "jev": {
      "input_tokens": {
        "measured": 216565,
        "missing_calls": 0
      },
      "output_tokens": {
        "measured": 13210,
        "missing_calls": 0
      },
      "cached_input_tokens": {
        "measured": 0,
        "missing_calls": 56
      },
      "reasoning_tokens": {
        "measured": 0,
        "missing_calls": 56
      }
    },
    "luna": {
      "input_tokens": {
        "measured": 6168,
        "missing_calls": 0
      },
      "output_tokens": {
        "measured": 2524,
        "missing_calls": 0
      },
      "cached_input_tokens": {
        "measured": 0,
        "missing_calls": 0
      },
      "reasoning_tokens": {
        "measured": 1173,
        "missing_calls": 0
      }
    }
  },
  "jev_provider_cost": 0.009095730000000003,
  "jev_tariff_cost": 0,
  "unknown_cost_calls": 0,
  "effective_models": {
    "typesafe/jev-1.13-20260917": 56,
    "gpt-6-luna": 28
  }
}
```

### Mes: 20 observaciones/día ×20 días

| Profesoras | Obs/mes | V1 RAW DEV | V2 RAW DEV | V2 CLEAN DEV | V2 INTERPRET DEV | Candidato según TEST |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 400 | $0.084447 | $0.123127 | $0.148730 | $0.153486 | $0.156779 |
| 10 | 4000 | $0.844473 | $1.231268 | $1.487297 | $1.534856 | $1.567790 |
| 50 | 20000 | $4.222365 | $6.156339 | $7.436486 | $7.674279 | $7.838950 |
| 100 | 40000 | $8.444730 | $12.312678 | $14.872971 | $15.348558 | $15.677900 |

### Incremento por Luna (vs V2 RAW de su versión)

- CURRENT_V2_LUNA_CLEAN: costo +20.79%; $0.064007 adicionales/1000; 0.98 puntos de accuracy; 15.32 puntos de accuracy por US$1 adicional en un lote de 1000.
- CURRENT_V2_LUNA_INTERPRET: costo +24.66%; $0.075897 adicionales/1000; 0.49 puntos de accuracy; 6.46 puntos de accuracy por US$1 adicional en un lote de 1000.

## Errores restantes

- AG-01: false_abstention; gold MAT_CANTIDAD; respuesta {"status":"unclassified","primary":null,"secondary":[]}.
- AG-02: missed_secondary; gold COM_ARTE; respuesta {"status":"review","primary":"COM_ARTE","secondary":[]}.
- MC-03: false_abstention; gold PS_CONVIVE; respuesta {"status":"unclassified","primary":null,"secondary":[]}.
- MN-03: wrong_primary, missed_secondary; gold COM_LECTURA; respuesta {"status":"review","primary":"COM_ORAL","secondary":[]}.
- RO-01: unnecessary_secondary; gold CYT_INDAGA; respuesta {"status":"review","primary":"CYT_INDAGA","secondary":["MAT_FORMA"]}.
- SE-01: wrong_primary; gold CYT_INDAGA; respuesta {"status":"review","primary":"COM_ORAL","secondary":[]}.
- TE-02: false_abstention, missed_secondary; gold MAT_FORMA; respuesta {"status":"unclassified","primary":null,"secondary":[]}.
- TE-03: false_abstention, missed_secondary; gold COM_ORAL; respuesta {"status":"unclassified","primary":null,"secondary":[]}.

Detalle privado con observación, gold, respuesta, evidence y reason: C:\Users\ASUS\.codex\worktrees\jev-luna-benchmark\Asistente CNEB\experiments\jev-competency-classifier\results\current-final-2026-09-29T11-59-24-143Z/errors.md. Ledger íntegro: raw-results.json del mismo directorio. Casos con evidencia no alineada: MA-02, MC-01, MC-02, MN-02, MN-03, RO-01, RO-02, SE-02, SE-03, SE-04.

## Confianza y siguiente paso

Confianza baja para generalización. DEV seleccionado 99.51% (203/204 repeticiones de 68 casos sintéticos) cayó a 72.73% (16/22 casos clasificables) en el test final único. Exact decision TEST 71.43% (20/28); cuatro falsas abstenciones, dos principales incorrectas, una secundaria indebida y cuatro esperadas ausentes. El test no contiene positivos de privacidad: Privacy FN=0 no valida sensibilidad allí. No se demuestra que el ajuste DEV generalice ni que Luna CLEAN mejore en TEST frente a RAW de la misma versión, que no se evaluó de nuevo. El baseline histórico Luna fue 74.24% con tres repeticiones; la diferencia observada pequeña no establece superioridad o inferioridad estadística. DEV sintético y test pequeño/históricamente observado limitan la inferencia.

No recomiendo pasar esta versión a una prueba integrada en Ayni todavía. No superó al histórico Luna y no confirmó el alto desempeño DEV; persisten errores de primaria, abstención, secundarias y citas. Mantenerla en el programa separado para revisión manual de errores, fidelidad de Luna y pérdida de verbos por anonimización. Una futura fase debe partir de evidencia y gold docente nuevo, bajo una solicitud aparte. No se optimiza ni se repite este TEST, no se integra ni despliega.

Fuentes, prompts, thresholds y gold no se cambiaron después de TEST. Lock de evaluación única conservado. Test original de 28 casos intacto. Versiones, métricas, costos y comparación completa en DEV_FINAL_REPORT.md. No se modificó Ayni, BD ni routing.

## Comparación de alcance tras privacidad

Detalle descriptivo adicional: [FINAL_COMPARISON_SCOPE.md](docs/current-study/FINAL_COMPARISON_SCOPE.md). En los 20 casos históricamente permitidos: RAW 76.67%, LUNA 81.67%, candidato 70.00%. No es una comparación causal ni estadísticamente concluyente.

## Relación costo / efectividad

En DEV V2.3, RAW ofrece el mejor equilibrio observado (98.53%, cero sobreclasificación/Privacy/secundarias erróneas, estable, US$0.307817/1000 y 322 ms); CLEAN ganó la selección por accuracy superior, con una mejora pequeña y no generalización demostrada. V2.2 RAW obtuvo el mismo 98.53% con menor costo, pero no se evaluó en TEST ni se sustituye el candidato después. Detalle en FINAL_COMPARISON_SCOPE.md. No integrar esta versión todavía.
