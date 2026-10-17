# QA editorial de experiencias guiadas — 16 de octubre de 2026

## Alcance y resultado

Base remota verificada: `f501baf63357b6ed1c5e6c7b2c1327cb7372f16b`.
Rama: `codex/guided-editorial-20261016`. Catálogo nuevo: `diagnostic-v4.5`.
Revisión interna de siete experiencias y 22 momentos: cinco generales, castellano L2 y religión
condicionadas a la aplicabilidad del aula. No es certificación externa ni prueba de eficacia con
niños reales. No incluye una nueva auditoría de talleres o actividades generadas de proyectos.

La captura de la usuaria reveló una causa reproducible: `guidedObservationLookFor` concatenaba
los ejemplos y la interfaz repetía el resultado en dos bloques. El catálogo conservaba contenido
`development_fixture`, con orientaciones redundantes y algunos vínculos pedagógicos débiles.

## Correcciones

- JSON como fuente editorial: título del momento, dos acciones prácticas, orientación propia
  y dos ejemplos distintos. Eliminado el segundo mapa de acciones de `diagnostic-ui-flow`;
  fallback legacy de bloques conservado para compatibilidad.
- «Qué observar» aparece una vez; criterio, competencia y botón de registro siguen vinculados.
  Preparación y orientación por edad aparecen al comenzar la experiencia.
- Secuencias ordenadas: movimiento antes de crear; repartir antes de comparar; preguntar y
  probar antes de compartir; leer y contar antes del mensaje escrito opcional.
- Referentes de KB seleccionados por edad, sin editar el dato curricular oficial.
- Escritura intencional diferenciada de dibujo, sin criterio de escritura a los tres años.
  A los cuatro y cinco se acepta escritura no convencional con propósito y destinatario.
  Revisar un mensaje no exige copiar ni corregirlo hacia escritura convencional.
- Exploración segura con objetos grandes/poca agua; movimiento con alternativas accesibles;
  L2 distingue comprensión de expresión y respeta la lengua familiar; religión se vincula a
  prácticas conocidas, con participación voluntaria y sin inferir creencias de acciones aisladas.

Ejemplo de lectura anterior: dos variantes de «dice qué podría hacer un personaje», unidas
artificialmente y repetidas bajo el criterio. Ahora: mirar la portada, preguntar de qué tratará,
escuchar qué detalle apoya su idea sin exigir acertar, con dos actuaciones infantiles distintas.
Los ejemplos orientan a la docente; nunca se guardan como hechos observados.

IDs nuevos para cambios de significado: `write_message`, `read_own_message`,
`gratitude_and_tradition`. Snapshots históricos intactos. Una regresión de base local comprueba
que corregir el texto de una observación v4.4 tampoco reescribe versión/criterio/competencia.
Sin migraciones ni actualizaciones masivas.

## Referencia pedagógica

Se revisó la KB v4 versionada y sus referentes por edad, junto con la referencia oficial del
[Programa Curricular de Educación Inicial del MINEDU](https://www.minedu.gob.pe/curriculo/pdf/programa-curricular-educacion-inicial.pdf).
La consulta web devolvió extractos pertinentes; la apertura del PDF completo no estuvo disponible
por tamaño. No se afirma haber revisado íntegramente ese PDF en esta ronda.
Los textos de mediación son elaboración de Ayni, no citas oficiales. `reviewed` indica revisión
editorial interna, no aprobación del MINEDU ni validación en aula.

## Pruebas ejecutadas

Entorno local nuevo: frontend3411, API3412, PGlite/almacenamiento independientes sin credenciales
cloud ni proveedor IA. Cuenta, institución y tres alumnos ficticios. Alta y matrícula por API;
observación por interfaz real, sin SQL para aparentar guardado docente.

| Comprobación | Resultado |
| --- | --- |
| Validador catálogo | PASS, v4.5, siete experiencias |
| Catálogo, flujo, persistencia, diagnóstico y bloques | 33 tests PASS |
| Fuentes, entrevistas y observación libre | 15 tests PASS |
| TypeScript, lint, builds Vinext y Next webpack | PASS |
| Detector Impeccable, dos archivos UI modificados | Sin hallazgos |
| UI con backend local, siete experiencias/22 momentos, cinco años | PASS |
| UI de consulta por edad: 19 + 21 + 22 momentos | 62 PASS |
| Orientación/acciones/ejemplos en ambos recorridos | Una orientación, dos acciones y dos ejemplos distintos |
| Guardado de observación ficticia y recuperación tras recargar | PASS, un registro |
| Priorización posterior | Bruno y Camila sin registro antes de Ana con uno |
| Escritorio1366 y móvil390 | Sin desbordamiento horizontal observado |
| Observación v4.4 y corrección posterior | Snapshot original conservado |

Regresiones: `node --test --test-concurrency=3` sobre `diagnostic-editorial.test.mjs`,
`diagnostic-ui-flow.test.mjs`, `diagnostic-experiences-v4.test.mjs`,
`diagnostic-assessment-v4.test.mjs`, `guided-observation-flow.test.mjs`,
`pedagogical-blocks.test.mjs` y `diagnostic-sources-v4.test.mjs`.
Typecheck: `npx tsc --noEmit`; lint: `npm run lint -- --ignore-pattern .local`;
builds: `npm run build` y `npx next build --webpack`.
Advertencias de dependencias/tamaño en Vinext no impiden el build.

El fixture por edad monta el componente real sin guardar: no equivale a prueba de persistencia
para tres/cuatro años. Guardado real corresponde al aula de cinco. No se revalidaron hardware
de voz/cámara, RLS cloud ni todos los módulos. **IA: cero llamadas, USD0**.
Capturas y recorridos DOM: `evidence/guiadas-editorial-20261016/`.

## Publicación y rollback

Solo Preview desde commit y árbol limpio; recibo de despliegue/smoke anónimo local sin secretos
en Git. No escrituras pedagógicas cloud: Preview y Producción comparten conexión.
Producción de referencia `9a0920230350cd6b9050f35683a1f35d459e78c7`,
deployment `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`, debe permanecer intacta.
Rollback: Preview previo `https://ayni-aula-staging-ecqdzc3w3-ayni4.vercel.app/` o revertir el
commit de esta rama y publicar otro Preview. No restaurar bases ni reescribir observaciones.
