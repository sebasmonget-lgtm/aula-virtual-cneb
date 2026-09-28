# Revisión iterativa de Jev con el recorrido de Ayni

Fecha: 2026-09-27. Modelo efectivo en todas las llamadas: `typesafe/jev-1.13-20260917` por OpenRouter Decisions API. No se enviaron etiquetas, nombres, fotos, audio ni notas rechazadas por el anonimizador. Los JSON crudos están en `reports/product-path-*.json`, ignorados por Git. Ninguna bandera Jev se activó en Ayni.

## Correcciones previas a la medición

1. El anonimizador conservador sustituyó por `[persona]` palabras de actuación o conectores escritos con mayúscula inicial. Sobre `user-hard-30-v1.jsonl`, antes introducía ese marcador en 28/30 notas; después de ampliar una lista cerrada de vocabulario no identificador, en 3/30. Una nota continuó rechazada por la política de privacidad. Nombres conocidos se neutralizan primero y las palabras capitalizadas desconocidas siguen ocultándose.
2. El flujo principal de `noul` truncaba candidatas en orden de la KB. Ahora ordena por puntuación descendente antes del máximo de cuatro; los empates se resuelven por ID. No se cambió el umbral 0,80.

Pruebas locales cubren ambos defectos, la permanencia de la redacción de nombres y el contrato del adaptador. El rollback de la sugerencia Jev sigue siendo `AYNI_JEV_ENABLED=0`; el experimento y las correcciones de anonimizado no cambian registros confirmados.

## Método

- KB de Ayni v4.1.0 y texto ya procesado por `anonymousDecisionText`, no el texto original del benchmark anterior.
- 30 notas difíciles del usuario: 1 rechazada por privacidad y 2 primarias fuera del catálogo seleccionable para su edad; quedan **27 comparables** (22 con primaria y 5 abstenciones). Las etiquetas del usuario no tienen adjudicación independiente.
- 50 notas sintéticas: 2 rechazadas por privacidad; quedan **48 comparables**, de las cuales 10 esperan dos competencias. Sus etiquetas son provisionales, no expertas.
- *Admisible* en el conjunto difícil: propuesta que incluye la primaria y no añade etiquetas fuera de las secundarias aceptables; en abstenciones, propuesta vacía. *Exacta* en el sintético: conjunto propuesto idéntico al conjunto etiquetado.
- 655 llamadas reales entre el recorrido actual, seis combinaciones experimentales, dos híbridos y repeticiones. 0 fallos de API. Costo informado por OpenRouter: **US$0,10697** en total. Las llamadas repetidas miden variación, no constituyen un conjunto independiente de validación.

## Resultados principales

`C` = `choice`; `P` = un `noul` por competencia; `H` = `choice` y `noul` juntos en una llamada. `r1/r2` son llamadas nuevas separadas. `Choice` propone una sola primaria; por diseño no acierta conjuntos de dos competencias.

| Variante | Difíciles admisibles | Sintéticos exactos | Multicompetencia exacta | Etiquetas extra en sintéticos |
| --- | ---: | ---: | ---: | ---: |
| Flujo Ayni actual, P compacto ≥0,80 | 11/27 | no medido | no medido | no medido |
| C compacto, política 0,50 | 19/27 y 20/27 | 34/48 y 35/48 | 0/10 | 1 por corrida |
| C compacto, sugerencia ≥0,40 simulada | 21/27 y 19/27 | 36/48 en ambas | 0/10 | 1 por corrida |
| C enfocado, política 0,50 | 20/27 en ambas | 34/48 en ambas | 0/10 | 2 por corrida |
| P compacto ≥0,80 experimental | 9/27 | 34/48 | 8/10 | 2 |
| H compacto experimental, una llamada | 19/27 | 41/48 | 8/10 | 4 |
| H con instrucciones del producto, una llamada | 20/27 | 38/48 | 7/10 | 7 |

El híbrido experimental se conservó **solo dentro del experimento**. La simulación que unía dos respuestas de llamadas separadas había dado una cifra mejor, pero la llamada híbrida real no la reprodujo en las notas difíciles. No se promovió el híbrido al flujo principal. Tampoco se bajó el umbral productivo de `noul`: al simular 0,60–0,65 sobre sus respuestas creció la recuperación, pero aparecieron etiquetas extra, particularmente en los casos sintéticos.

## Lectura y siguiente decisión

Para **una competencia principal sugerida a la docente**, `Choice` compacto y enfocado superaron al `noul` productivo en las 27 notas difíciles; el compacto cuesta aproximadamente la mitad que el enfocado. El umbral 0,40 del compacto mejoró una corrida y empeoró otra, por lo que no se fija como política. Para **varias competencias**, los `noul` recuperaron secundarias que `Choice` no puede proponer, pero con más etiquetas extra. No existe un ganador único demostrado para ambos objetivos.

Falta un conjunto nuevo de observaciones reales anonimizadas con dos especialistas que etiqueten independientemente la primaria, todas las secundarias defendibles y la opción de ninguna; una adjudicación debe resolver desacuerdos y casos fuera de la aplicabilidad por edad. Elegir umbrales con estas mismas 27+48 notas y reportar su resultado como precisión futura sería sobreajuste. Mantener la revisión y confirmación docente, sin aceptación automática.
