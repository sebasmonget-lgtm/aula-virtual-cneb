# Comparación descriptiva tras TEST: separar alcance de privacidad

Análisis offline posterior, sin llamadas ni ajuste de fuentes/gold. No cambia las métricas principales. La comparación histórica usa tres repeticiones; el candidato, una. No es una atribución causal ni una prueba de significancia.

Casos clasificables históricamente bloqueados y ahora permitidos: AG-02, MN-01. Ambos acertaron primaria; AG-02 perdió la secundaria exigida. Esta recuperación pertenece al cambio de acceso por filtro y no demuestra mejora del clasificador en registros siempre permitidos.

| Alcance: casos siempre permitidos históricamente | Aciertos | Denominador | Acceptable primary |
|---|---:|---:|---:|
| CURRENT_RAW histórico | 46 | 60 | 76.67% |
| CURRENT_LUNA histórico | 49 | 60 | 81.67% |
| Candidato final | 14 | 20 | 70.00% |

La pequeña ganancia global respecto a RAW histórico incluye dos oportunidades de inferencia recuperadas por privacidad. En los 20 casos que ya estaban permitidos no se observó mejora. Esto refuerza la decisión de conservar el candidato solo como resultado experimental, sin integrarlo. No se compara un nuevo V2 RAW en TEST: fue prohibido repetir o abrir otra variante tras el cierre.

## Diagnósticos restantes

- Falsas abstenciones: AG-01 (Cantidad frente a otras acciones), MC-03 (Convivencia), TE-02 (representación espacial frente a interacción), TE-03 (relato/secuencia de imágenes).
- Oral frente a Lectura: MN-03, gold Lectura y salida Oral.
- Oral frente a Indagación: SE-01, gold Indagación y salida Oral.
- Secundaria indebida: MAT_FORMA en RO-01.
- Secundarias exigidas ausentes: AG-02, MN-03, TE-02, TE-03.
- Sobreclasificación de los seis no curriculares: ninguna. Falsos Privacy: ninguno. TEST no tiene positivos de privacidad, por lo que no estima sensibilidad.
- Cantidad frente a Forma: no hubo intercambio directo entre esos dos IDs en la salida final; AG-01 fue abstención con Choice Indagación, TE-02 abstención con Choice Convivencia. No convertir esas abstenciones en aciertos retrospectivos.

Datos completos y notas para revisión manual están en el directorio privado del TEST; no se cambian expected ni alternativas.

## Relación costo / efectividad observada en DEV

Entre las cuatro variantes V2.3, RAW ofrece el equilibrio más favorable de desempeño, estabilidad, costo y latencia: 98.53%, tres falsas abstenciones en 204 repeticiones clasificables, cero sobreclasificaciones/errores de privacidad/secundarias, ninguna primaria inestable, US$0.307817/1000 y 322 ms. CLEAN fue el candidato por mayor accuracy acordada (99.51%), pero su +0.98 puntos se concentra en un caso y añade 20.79% de costo y 1687 ms; no acredita mejora generalizable. V1 cuesta menos, pero pierde precisión y añade seis secundarias erróneas en DEV. INTERPRET agrega errores frente a CLEAN sin beneficio comprobado de interpretación breve.

Considerando versiones anteriores, V2.2 RAW alcanzó la misma accuracy agregada de V2.3 RAW (98.53%) por US$0.291538/1000 y sin primarias inestables. Es un punto de equilibrio exploratorio en DEV; no se ejecutó en TEST ni se cambia el candidato seleccionado tras ver ese test. No se recomienda integrar un método no probado externamente por su menor costo.

El cociente de puntos de accuracy por US$1 adicional se normaliza al lote de 1000 y no promete que gastar más eleve linealmente la accuracy del modelo. La recomendación final se apoya en el resultado externo, errores, estabilidad y fidelidad; no únicamente en precio.
