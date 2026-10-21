# Ajustes acordados en observaciones

## Alcance y decisiones de la usuaria

Se aceptan fecha, aclaración breve de cantidad de registros, lenguaje sencillo general y disponibilidad para la propuesta digital. La competencia permanece vinculada al criterio elegido: no se agrega clasificación, confirmación adicional ni selección de otra competencia. El punto de indagación necesita explicación; no se modifica su recorrido pedagógico en esta ronda. Se conserva expresamente la estética actual de Ayni.

## Implementación local

- El diálogo guiado usa un campo nativo «Fecha de observación» con la fecha del aula como valor inicial, incluido el reloj QA. Guardado obligatorio cuando se abre el formulario nuevo. El servidor valida fecha real y guarda el día elegido en `observed_at` a mediodía de Lima; `created_at` sigue siendo la fecha de registro. Clientes anteriores sin ese campo conservan su comportamiento. Reintentos con la misma solicitud y otra fecha se rechazan sin sobrescribir el registro.
- Las listas, cobertura y datos que alimentan el Word leen el mismo `observed_at`. No se reescriben diagnósticos ya confirmados ni Word descargados. No hay migración ni cambio de permisos/RLS.
- La ayuda queda en una frase: «Puedes repetir estas actividades. Tener registros no significa que ya haya información suficiente para evaluar». El diálogo conserva la distinción entre cantidad y nivel con menos texto.
- «Tengo un celular, tableta o computadora disponible» habilita la experiencia digital en la lista y el ranking. Sin indicarlo, no se recomienda ni se ofrece allí. Se confirma por visita; no se altera el inventario del aula ni se infiere disponibilidad a partir de registros o características familiares. Al retirarlo, una selección digital vuelve a una opción disponible sin eliminar observaciones anteriores. Las instrucciones de uso acompañado siguen intactas.
- Los ejemplos del catálogo y la entrevista usan «escribe a su manera», «líneas» o «lo que escribió». La instrucción común de generación y PRODUCT.md extienden el lenguaje sencillo a textos nuevos de todo Ayni, incluidas conclusiones e informes. No se aplica reemplazo automático a observaciones originales ni citas oficiales. No se ejecutó IA pagada; esta regla no equivale a demostrar que toda generación futura respete el vocabulario.
- Catálogo editorial `diagnostic-v4.7`; IDs, criterios, competencias y referentes por edad conservados. No se cambia el planteamiento de revisión de escritura sin acuerdo adicional.

## Diseño, pruebas y resultado

Se reutilizan el diálogo, campo de fecha nativo, etiquetas, checkbox, colores, fondos, tipografía y medidas de controles existentes. No hay nueva pantalla, ilustración, módulo ni rediseño. Revisión local a 1366×900 y 390×844: sin desbordamiento horizontal; nombres largos, criterio, nota, guardado y fecha legibles. Se comprobó que una fecha vacía deshabilita guardar.

Treinta pruebas PASS: servicio diagnóstico, guías/ranking, cobertura, Word diagnóstico y entrevistas. Comprueban fecha imposible, cambio de fecha en reintento, lectura del día elegido, autoría/permisos, foto privada, correcciones, conservación de histórico y disponibilidad digital sin tocar los registros.

Typecheck PASS; lint global excluyendo artefactos ignorados PASS y lint focal final PASS; build Vinext final PASS y build Next webpack final PASS con su comprobación TypeScript. Vinext mantiene avisos de dependencias PGlite/eval, tamaño de chunks y clasificación estática de rutas; no son fallos nuevos de esta función. `git diff --check` sin errores.

Prueba funcional sobre PGlite nuevo aislado, nunca sobre la cuenta remota: seleccionar/disponibilidad digital/retirar, escribir una observación, elegir 19/10/2026, guardar y recargar. Fecha visible 19/10/2026 y texto exacto conservados. GET diagnóstico y cobertura devuelven ambos `2026-10-19T17:00:00.000Z`, criterio `choice` y estado `observed_without_judgment`. La competencia no cambió y no se asignó nivel. Pruebas de Word conservan la proyección de fechas en Lima; no se creó un diagnóstico nuevo remoto ni se descargó un Word cloud en esta ronda.

Al primer ensayo del formulario, el cambio automatizado del campo no llegó al estado de React y otra edición restauró la fecha inicial. Se incorporó `onInput`, igual que la observación libre, y se verificaron de nuevo el día elegido, el guardado y la recarga. Un error de tipo inferido se corrigió con el tipo de experiencias existente; el build final comprueba TypeScript.

Capturas locales `005a`–`005e` en `outputs/ayni-recorrido-20261020/capturas/`, y fixture/recibos en `.local/qa-guided-changes-20261020/`. Las capturas muestran cambios locales; no presentarlas como versión publicada. Recapturar en QA después de una publicación autorizada antes del montaje promocional.

La consola del fixture mostró avisos de React por `preload` y `unoptimized`: su sustituto local de `next/image` propaga esos atributos a una imagen HTML. No se alteró el componente de imagen del producto para resolver un aviso del harness ni se declara una consola local sin avisos.

## Publicación y rollback

Sin commit, push, despliegue, cambios remotos o modificación de los veinte registros de QA. La rama compartida conserva cambios de otra conversación en `ai-execution-router-v4.mjs`; no se incluyen ni revierten aquí. La publicación necesita solicitud expresa y la secuencia habitual con commit identificable, árbol limpio, staging y smoke.

Rollback: revertir exclusivamente este conjunto de cambios, restaurando formulario/contrato, ranking y catálogo anterior. Los registros conservan su día elegido en `observed_at` y continúan siendo compatibles; no borrarlos ni convertirlos a fecha de captura. No alterar los cambios concurrentes ni las fuentes históricas.
