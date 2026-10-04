# Mi año: alcance contextual y copia QA recuperable — 2026-10-03

## Cierre actual

Este ajuste conserva el editor de quince tramos de ADR 113 y corrige el alcance de «Cambiar propuesta con Ayni». La presentación de una copia de doce propuestas también identifica explícitamente su contrato anterior para no confundirla con un año nuevo de quince. La fase integral del último archivo solicitado sigue en cola hasta estabilizar este cierre; no se declara implementada ni validada en este informe.

Se mantiene el teal y la biblioteca de ilustraciones. No se añaden migraciones SQL ni permisos RLS. Propiedad docente, CAS, calendario efectivo, trabajo protegido y confirmación docente siguen vigentes. Producción no se modifica.

## Cambios con alcance explícito

El panel de una propuesta filtra sus pendientes por `proposal_id`; agregar y aplicar envían el mismo ID. El servidor selecciona solo esas indicaciones, modifica únicamente esa propuesta y acota la revisión pedagógica al mismo ID. Las demás propuestas quedan protegidas para esa revisión. Si el patch/revisor intenta modificar momentos cotidianos, interpretaciones del aula u otra propuesta, la operación falla sin guardar el cambio fuera de alcance.

«Ajustar Mi año con Ayni» envía `proposalId: null` y muestra/aplica solo indicaciones globales. Los pendientes de otras propuestas o del año no se consumen al aplicar un alcance diferente. El historial registra solo las indicaciones aplicadas; el servidor conserva sus textos docentes originales y prepara la proyección segura para IA por separado.

El helper `scopedAnnualChanges` distingue tres valores: ID = una propuesta; `null` = solo indicaciones del año; `undefined` = compatibilidad con la API anterior de lote completo. La interfaz actual manda ID o `null`, por lo que abrir un panel contextual no autoriza accidentalmente el batch anterior.

La proyección `providerPlan` omite `pending_changes`, preferencias privadas e historial; los pendientes ajenos no viajan al revisor dentro del plan. Si la propuesta seleccionada desaparece al recargar, la vista devuelve una lista vacía sin lanzar una excepción y limpia el alcance obsoleto al actualizar el plan.

Las indicaciones de propuestas retiradas siguen visibles en una sección independiente con «Quitar indicación». No se mezclan con los pendientes globales ni se descartan al limpiar el alcance del panel. Su retirada requiere esa acción explícita.

## Organización y lectura histórica

Los criterios de organización nuevos proceden del contrato estructural: quince tramos después de Acogida, once de dos semanas/cuatro de tres, duración heredada del tramo y feriados separados de días lectivos. No se toma del texto generado una afirmación «Doce» para un editor nuevo. Generar o aplicar cambios a un contrato del editor v3 usa esos criterios determinísticos.

La presentación de un plan anterior explica que conserva doce propuestas y sus fechas originales. El timeline histórico comparte colores semánticos por Proyecto/Unidad, marcadores triangulares de feriado y línea Hoy. Esta mejora visual no convierte el JSON literal ni recalcula fechas de la versión anterior. Un banner distingue la versión de doce del editor de quince; no basta con modernizar la tarjeta para afirmar que se migró el contrato.

Los criterios originales de organización del histórico permanecen visibles y guardados. Solo `editor_version = 3` usa los criterios estructurales nuevos; el banner explicativo no reemplaza el contenido literal anterior.

El upgrade sigue siendo una acción explícita sobre borrador permitido. Conserva trazabilidad de los criterios anteriores y mantiene los bloqueos V2. Tras aplicarlo puede haber posiciones vacías: confirmar exige ocupación completa y cobertura válida. Abrir una versión activa/histórica nunca la convierte automáticamente.

## Preparación autorizada en la misma QA

La autorización posterior del usuario permite usar la misma aula QA con sus datos ficticios. Se preparó una copia recuperable del borrador de doce en esa aula y se añadieron tres alternativas QA a su Biblioteca, sin llamadas IA. El borrador original se archivó y permanece recuperable; el activo V1 y los otros planes se conservaron mediante comparación de hashes. El artefacto `.local/editor-scope-qa-copy.sql` realiza la copia en una transacción, comprueba propiedad, revisión y ausencia de trabajo vinculado, y compara `md5(string_agg(to_jsonb(annual_plans)))` de los planes ajenos antes/después. La salida identifica un nuevo borrador V3 con doce propuestas y tres alternativas; V3 aquí es la versión del plan, no `editor_version = 3`. Esta operación es preparación de datos ficticios, no confirmación de otra versión del año.

La copia V3 borrador está visible por UI en QA. Su upgrade por UI está pendiente de desplegar y verificar el código actual. No se declara que la copia ya tenga quince tramos ni que las tres alternativas estén incorporadas. Ver la copia preparada no equivale a aprobar visualmente el editor final.

## Pruebas y límites

- Suite focal corregida: 68/68 PASS, cero fallos, `.local/editor-scope-focal.txt`. Incluye aislamiento de cambios locales/globales, conservación de pendientes ajenos, rechazo de reparación fuera de alcance y las regresiones de calendario/editor/recuperación/Project Master. La primera selección dio 61 casos y omitió siete de `project-flow-service.test.mjs` por un nombre de archivo equivocado; se corrigió y se ejecutó la selección completa, sin sumar pasadas repetidas.
- Pruebas de recorrido/servidor del ajuste: 16/16 PASS en `.local/editor-scope-tests.txt`; este subconjunto no se suma al focal como casos independientes.
- Pasada final por los ajustes de privacidad, alcance obsoleto, pendientes retirados y criterios históricos: `npx tsc --noEmit`, `npm run lint`, `npx next build` y `npm run build` (Vinext) PASS, todos con exit 0. El comando Next de este cierre se ejecutó sin `--webpack`. Logs `.local/editor-scope-typecheck.txt`, `.local/editor-scope-lint.txt`, `.local/editor-scope-next-build.txt` y `.local/editor-scope-vinext-build.txt`.
- Preparación de la copia y sus tres alternativas QA: cero requests IA; no se ejecutó una generación pedagógica pagada como parte de esa preparación.

No se declara validación visual final, upgrade por UI, incorporación de alternativas, confirmación de quince posiciones ni la fase integral pendiente. Publicación, commit exacto, URL y smoke remoto deben registrarse después de su ejecución.

La revisión de código motivó el ajuste P1 de privacidad de la proyección al proveedor, la recuperación P2 de indicaciones de propuestas retiradas y la conservación de criterios históricos. Están implementados; sus checks finales anteriores no sustituyen la captura/validación visual pendiente.

## Verificación pendiente y reversión

1. Publicar el commit identificable en staging con árbol limpio y checks terminados; comprobar SHA, API/guards y assets antes de asignar el alias.
2. Abrir la copia QA preparada: comprobar banner de doce, presentación histórica y tres alternativas sin mutar el plan activo V1.
3. Ejecutar el upgrade explícito por UI, revisar quince tramos/fechas y colocar alternativas en posiciones permitidas. Verificar que vacío/cobertura/protección siguen bloqueando confirmación cuando corresponde.
4. Agregar pendientes locales en dos propuestas y uno global. Aplicar desde una propuesta: comprobar solo su modificación/historial y conservación de los otros pendientes. Aplicar global: comprobar que los pendientes locales permanecen. Retirar una propuesta con indicación pendiente: comprobar su sección independiente y eliminación únicamente mediante «Quitar indicación». Capturar el resultado y el alcance visible del panel.
5. Completar recapturas y drag genuino pendientes del editor; solo entonces emitir la aprobación visual final. Retomar después la fase integral en cola.

La copia original archivada permite recuperar el borrador anterior; no se debe borrar ni sobrescribir el activo V1 para revertir el ejercicio. Si hay planes de quince persistidos, cualquier rollback de código/alias conserva sus lectores/exportadores, la Biblioteca y slots nullable. Volver a un deployment que únicamente lee doce no es un rollback seguro. No requiere revertir SQL.
