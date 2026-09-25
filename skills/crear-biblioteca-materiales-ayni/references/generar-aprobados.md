# GENERATE APPROVED

Entra aquí solo si el usuario aprobó explícitamente las propuestas de la fase A. Aplica las excepciones indicadas ficha por ficha; las no aprobadas quedan fuera. Si una excepción impide construir una ficha sin una decisión nueva, pregunta solo por ese punto.

## Salidas y estructura

- `biblioteca-materiales/<edad>-anos/<tipo>/<id>/ficha.pdf` y `material.json` por material aprobado. Crea solo edades/tipos con materiales; estructura preparada para 3, 4 y 5 sin carpetas vacías.
- Un `catalogo.json` ligero para filtrar por edad, competencia, tipo, personaje, mecánica, imprimible y tags, con rutas a PDF y JSON. No dupliques datos en `ficha.json` o `metadata.json`.
- `material.json` es la fuente estructurada completa: ID, título, edad y origen, tipo/subtipo, mecánica, personaje verificado, clasificación extraída (competencias canónicas y noción), uso pedagógico, instrucción del niño, contenido propio/escenas, orientaciones docentes, impresión, trazabilidad por nombre de PDF, versión KB y `curriculum_warning`, estado de aprobación. Marca `inferred: true` en valores inferidos. `talleres_compatibles` es opcional y secundario; nunca `tipo_taller` como clasificación principal.

## Integración y producción

1. Verifica soporte de imágenes existente antes de implementarlo. Reutiliza un proveedor compatible si lo hay; si falta y la generación requiere arquitectura nueva, prepara briefs estructurados y solicita dirección antes de construirla. Usa los PNG oficiales como referencia visual cuando el proveedor lo permita. No cambies rostro, cabello, accesorios ni paleta distintiva del personaje entre fichas.
2. Reutiliza `material_generation` con `age`, `activity_purpose`, `requested_material_type` y, cuando aplique, `competency_id`, `criterion`, `print_constraints` y `available_materials`. Alimenta la referencia curricular de la edad concreta; no dupliques el motor de contexto.
3. Maqueta A4 con fondo blanco, líneas y contraste legibles, poca tinta y recortables utilizables. Normalmente: hoja del niño, orientaciones docentes y páginas extra solo si son necesarias. Las acciones deben distinguirse sin depender de la lectura. Reescribe orientaciones sin perder su significado; no copies arte ni texto extenso de la fuente.
4. Verifica por ficha edad, competencia fuente y ID, mecánica/equivalencia, novedad visual, personaje, ortografía, solución correcta, claridad, impresión, zonas de corte, coherencia entre PDF y JSON, y todas las orientaciones importantes. Renderiza e inspecciona visualmente cada PDF; valida JSON y catálogo. Ejecuta las verificaciones del repositorio pertinentes y registra solo resultados realmente ejecutados.
5. Mantén los PDF fuente fuera de `public/` y del bundle. No publiques, despliegues ni modifiques producción sin solicitud expresa y los requisitos de publicación de `AGENTS.md`.
