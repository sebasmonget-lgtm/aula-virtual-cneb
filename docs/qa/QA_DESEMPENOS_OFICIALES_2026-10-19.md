# Desempeños oficiales por edad en proyectos y actividades

El pendiente W-05 queda completado en código local: la generación nueva recibe desempeños del MINEDU con IDs estables, cada criterio conserva sus referentes y Word los identifica con su página. Los documentos y registros históricos no se reescriben. No es un despliegue ni una aprobación general de Ayni en Producción.

## Fuente y cobertura

Fuente primaria: [MINEDU, Programa Curricular de Educación Inicial](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf), edición 2016, ciclo II. Se usa el PDF canónico cuya huella ya estaba registrada: `1f5e7330099c894181b82265dccab9478e094b15cc766ef680608468a82c0821`.

Catálogo aditivo `curriculum/official/initial-performances-v1.json`, versión `pci-inicial-2016-performances-v1`. Cada entrada conserva competencia, edad, orden en su columna, página impresa y física del PDF, texto y SHA-256. Los IDs `PCI2016.<competencia>.<edad>.<orden>` pertenecen a Ayni y enlazan el párrafo oficial; no son códigos publicados por el MINEDU.

| Competencia | 3 años | 4 años | 5 años | Páginas impresas |
|---|---:|---:|---:|---|
| Identidad | 5 | 5 | 6 | 78–79 |
| Convivencia | 3 | 4 | 5 | 86–87 |
| Religión | 4 | 4 | 4 | 92–93 |
| Psicomotricidad | 3 | 3 | 3 | 104–105 |
| Comunicación oral | 5 | 5 | 5 | 118–119 |
| Lectura | 3 | 3 | 3 | 124–125 |
| Escritura | 0 | 1 | 2 | 131 |
| Arte | 3 | 3 | 3 | 136–137 |
| Castellano L2 | 0 | 0 | 2 | 146 |
| Cantidad | 3 | 6 | 7 | 174–175 |
| Forma y localización | 3 | 5 | 5 | 180–181 |
| Indagación | 3 | 5 | 5 | 190–191 |
| TIC | 0 | 0 | 2 | 204 |
| Aprendizaje autónomo | 0 | 0 | 3 | 210 |
| **Total** | **35** | **44** | **55** | **134 desempeños** |

La transcripción incluye el párrafo del desempeño y excluye explícitamente ejemplos y llamadas a notas. Normaliza espacios y guiones de final de línea, sin convertir paráfrasis en citas oficiales ni corregir editorialmente el contenido curricular. `scripts/extract-initial-performances.py` verifica el hash del PDF, regiones geométricas fijadas por edad y conteos de cada columna. Compara los 134 párrafos con una extracción independiente pypdf: **134/134 coinciden**, descontando solo tipografía para la comparación.

No se inventan desempeños para edades sin publicación específica. Religión y Castellano L2 conservan las condiciones de aplicabilidad existentes. Cuando no hay desempeño específico se utiliza el referente de ciclo, sin copiar otra edad.

## Implementación vertical

1. `official-performance-references.mjs` comprueba unicidad, edades y huellas; resuelve por ID, sin búsquedas por palabras coincidentes.
2. El lector del KB v4.1 incorpora el suplemento versionado sin modificar su manifiesto ni archivos originales. No declara revisadas las definiciones, estándares ni toda la capa semántica antigua. v4.0 sigue cargable para regresión.
3. Los contextos reciben el catálogo de la competencia/edad. Nuevos criterios generales y diarios seleccionan de uno a tres IDs pertinentes, incluidos los adicionales; lista vacía cuando no hay desempeño específico.
4. El servidor rechaza IDs inventados, repetidos, de otra competencia/edad y vacíos indebidos. La reparación acotada existente conserva decisiones y fechas.
5. Mapa y criterios conservan referencias en JSONB existente. La guía diaria las hereda por código; la confirmación las conserva en `activity_criteria.details`. V3 rechaza cambiarlas o retirarlas individualmente respecto al Master.
6. Word imprime los seleccionados con edad y página. El diario los presenta a todo el ancho, junto a una tabla compacta de criterio/evidencia. Cada desempeño permanece en un párrafo completo. Cachés experience-layout5 y activity-layout7; artefactos previos intactos.
7. Históricos sin selección explícita mantienen la paráfrasis rotulada: no se les atribuye automáticamente un desempeño ni se alteran criterios, evidencias o valoraciones.

Sin migración, almacenamiento paralelo de observaciones, cambio de modelo ni modificación de actividades confirmadas.

## Generación real y revisión pedagógica

Muestra ficticia local de cinco años: «Un rincón para contar nuestras historias», tres días, Lectura, Arte y Comunicación oral. Recursos confirmados: cuento completo de la biblioteca, cartón, crayones y bloques. Se generaron dos Masters completos y una guía diaria de cada uno, sin escribir en cuentas docentes ni cloud.

La primera muestra eligió referentes pertinentes, pero una mediación quedó cortada al alcanzar 500 caracteres. Se conservó la salida. Corrección de fuente: indicaciones breves, holgura hasta 800 caracteres y comprobación de terminación de la frase en nuevas mediaciones. No se aplica a lectura histórica ni es un filtro general de caracteres o textos docentes; tampoco demuestra por sí sola calidad semántica universal.

La segunda muestra mantiene la progresión: disfrutar el cuento íntegro; volver a una ilustración con un propósito nuevo y probar representaciones; retomar y compartir una creación. Lectura utiliza referentes de identificación/opinión, Arte de exploración/representación/socialización y Comunicación oral de expresión/interacción. No confunde representar con escribir ni el producto colectivo con evidencia individual. Conserva materiales y decisiones expresivas propias.

La guía probada integra Arte y Lectura: Lectura se observa en Inicio y Arte en Desarrollo/Cierre, conservando exactamente criterios y referentes del Master. Solo se generó una guía de los tres días por muestra. No se declara probada una secuencia completa de tres guías ni un nuevo recorrido por interfaz en Preview. La pertinencia de las tres filas del Master y de esa guía sí se revisó; un ID válido demuestra procedencia y edad, no garantiza toda interpretación futura.

## Evidencia, tiempos y costos

- **155 regresiones PASS**: catálogo, KB/contexto, selección y reparación, herencia/confirmación PGlite, criterios por momento, observación → Evaluar, documentos/artefactos, permisos existentes, preparación y calendario.
- Comparación independiente del texto fuente **134/134 PASS**, reproducible desde el PDF fijado.
- Word local exportado a PDF en lectura: proyecto de ocho páginas y actividad de cuatro. Las doce páginas finales se revisaron visualmente. Presentar los referentes a todo el ancho reduce el diario de cinco a cuatro páginas sin omitirlos.
- **Typecheck, lint y build PASS**, comprobantes `.local/official-final-*`.
- Cuatro llamadas pagadas, dos Masters y dos guías. Primera muestra: 110,255 s + 12,268 s; segunda: 118,210 s + 10,692 s. Son tiempos dentro del proveedor, no latencia E2E de Preview ni preparación completa de todas las actividades.
- Adicional estimado **USD 0,142981015**, incluyendo las cuatro llamadas, entrada, salida y caché. Acumulado conservador **USD 4,75075397 de 5**; remanente estimado USD 0,24924603. Ledger privado `.local/qa-official-performances-20261019/cost.json`.
- Muestras Word en `outputs/qa-desempenos-oficiales-20261019/`; JSON, comparación antes/después y manifiesto de páginas en la carpeta privada de QA. No son registros reales de una profesora.

## Activación y rollback

Cambios locales sin commit, push, migraciones cloud ni despliegue en esta revisión. La Preview abierta conserva su código anterior. Publicar la rama completa requiere validar el entorno y la migración de cola v2 documentada por la ronda previa; no es un pendiente de mapeo curricular.

Rollback de activación: restaurar generador y renderer anteriores conservando la aceptación aditiva de referencias y el catálogo para leer datos que ya las tengan. No borrar JSONB, criterios ni artefactos. Un rollback total a código antiguo necesita mantener ese lector compatible para no bloquear borradores nuevos. No restaurar bases, ejecutar migraciones antiguas ni revertir el árbol completo, que contiene otras correcciones autorizadas.
