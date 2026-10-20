# Revisión final de Evaluar y cierre del bimestre

## Alcance autorizado

Completar la revisión pendiente en el aula QA: nueva conclusión con lenguaje sencillo, revisión y guardado de informes, descargas Word, comparación del consolidado/Excel y cierre/reapertura con una corrección. Mantener al final el período abierto para continuar QA. No publicar en Producción ni enviar informes a familias.

## Comprobaciones del recorrido

Baseline privado: diez niños, 140 observaciones, 430 asistencias, 120 notas (4 AD, 99 A, 17 B), 120 conclusiones activas y diez nuevas propuestas familiares pendientes de guardar. Se conservaron copias privadas antes de escribir, con aula/propietaria y proyecto QA verificados.

Se revisaron completos los informes de tres niños, con 36 competencias y 36 páginas renderizadas e inspeccionadas; se revisaron además las repeticiones de límites de registro en las diez propuestas. Edición docente de lectura familiar: explicación breve, sin avisos repetidos por fecha/cantidad de registros cuando la información es suficiente, conservando apoyos reales y propuestas futuras. Los campos fuente y notas permanecen intactos. Diez informes guardados y descargados: 120 secciones coinciden con la lectura revisada y cada competencia conserva su salto de página.

Cinco exportaciones Excel comparadas celda por celda con la API: 120 pares completos, doce de un niño, diez de una competencia, cero pendientes y 120 completos. Se verifican nombres, competencias, notas, conclusiones, resúmenes, filtros y paneles fijos. Se detecta un único estilo verde para todas las letras; se corrige a la paleta AD azul/A verde/B amarillo/C rojo. El caso C se cubre en la prueba del exportador, sin inventar una nota C en el aula QA.

Cerrar bimestre desde el navegador guardó un manifiesto vigente con 120 notas. Generación nueva y modificación de notas rechazadas mientras está cerrado; repetir el acuse de un lote ya guardado es una lectura idempotente sin nuevos datos. Reapertura sin motivo rechazada; reapertura desde la interfaz con motivo registrado vuelve a habilitar cambios.

Se prepara y revisa una nueva conclusión de Lectura tras reabrir, desde las observaciones y la nota docente. El párrafo es breve y conserva los hechos. La salida cruda traía `:highlight` en el campo auxiliar caution; se retiene la respuesta cruda y se corrige ese campo en revisión, sin atribuir la corrección al proveedor. Se refuerza el prompt para que caution sea una frase comprensible. Guardar versiona esa conclusión, conserva la anterior e invalida solo el informe del niño afectado; los otros nueve IDs permanecen iguales.

La actualización de ese único informe, el recierre/reapertura final, las descargas posteriores y la conciliación completa deben constar en los recibos finales antes de considerar terminado este recorrido. Recibos privados excluidos de Git: `.local/qa-cierre-final-20261020`. El informe de esta entrega se resume en final.json y release.json; no sustituir esos resultados por los de una entrega anterior.

## Publicación y límites

Solo Preview QA en gru1, con commit limpio y push, comprobaciones estáticas/funcionales y smoke antes de mover el alias. La publicación y su SHA se registran en deploy.json y release.json. Producción conserva el deployment previo. No se afirma cobertura total de Mi aula, Mi año, Hoy, Calendario ni de toda salida futura de IA.

Rollback de código: revertir la entrega o volver al alias Preview anterior registrado en baseline-release.json. Conservar las nuevas versiones docentes y los manifiestos; no borrar ni restaurar tablas a ciegas. Los textos anteriores siguen en el historial. Si se interrumpe una comprobación con el período cerrado, consultar la versión actual y reabrir por la API autorizada con motivo, sin cambiar notas ni evidencias.
