# Mejoras sencillas y aislamiento del generador V9

2026-10-28. Alcance autorizado: conservar la sencillez del generador e incorporar únicamente un mapa anual, un cierre explícito del proyecto y claridad de los momentos de la actividad. No trasladar Hoy, evaluación cotidiana ni tareas nuevas a esta modalidad.

## Cambios mínimos

- Anual nuevo: presentación 2 guardada únicamente si `documentsOnly`. Un mapa usa las competencias oficiales y oportunidades ya congeladas, agrupando edades con los mismos proyectos y señalando continuidad en rutinas, sectores y talleres. P01…P15 remiten al índice existente. No asigna niveles ni inventa oportunidades faltantes.
- Proyecto nuevo procedente del maestro V35: presentación 8. Añade el cierre general que ya tenía el maestro con el título «Cómo revisaremos el proyecto al finalizar». No genera ni resume contenido con IA, ni copia el desarrollo completo de la última actividad. Mantiene el título curricular unido a su primera tabla.
- Actividad nueva: presentación 7. Los títulos de los tres momentos indican «Qué harán los niños y cómo acompañarlos». Los textos, materiales, criterios, evidencias y apoyos se conservan; el registro mantiene la nómina autorizada y las casillas vacías.

El nuevo mapa vive en un módulo exclusivo del generador. No se modifica el renderizador anual del Ayni normal, ningún componente de Hoy ni los prompts o modelos. No hay campos pedagógicos obligatorios nuevos, migraciones, permisos nuevos o llamadas IA. Se reutiliza el contenido ya validado.

## Compatibilidad y datos

Las versiones se fijan al guardar fuentes nuevas en servidor. Los lectores mantienen anual anterior sin marca, proyectos 2/3/4/7 y actividades 2/3/4/5/6. El mapa solo se añade a la presentación anual nueva con exportación práctica; las salidas normales pasan intactas. Proyecto 7 y actividad 6 mantienen exactamente su cuerpo anterior. La matrícula de las actividades nuevas continúa congelándose al confirmar; descargar no consulta nombres actuales.

Las muestras son copias de QA del contenido existente: anual actual y P11, con la nueva presentación; no alteran los documentos guardados de la profesora. Muestras finales: anual 14 páginas, proyecto 9 y actividad inicial 5 (28 en total). Una actividad larga adicional A14 conserva 5 páginas. No se promete un número fijo de páginas para cualquier contenido o cantidad de alumnos.

## Pruebas ejecutadas

- 49 pruebas funcionales y de regresión pasaron: generación completa con proveedor simulado, API una edad/multiedad, ZIP y partes individuales, persistencia de versiones, selección curricular, nómina, permisos, documentos normales y operaciones de Hoy.
- Tras el último ajuste visual, otras ocho pruebas focalizadas volvieron a pasar. Typecheck y lint sin errores; permanece un aviso previo de dependencias de `useEffect` en `diagnostic-generation-control.tsx:28`. Build validado.
- Cuatro láminas de contacto y ampliaciones del mapa, cierre, currículo y las dos guías inspeccionadas. Análisis PDF sin texto fuera de página. Comprobación del texto completo: Inicio/Desarrollo/Cierre de A01 y A14 permanecen juntos en página 2, sin recortar indicaciones.
- Evidencia privada: `.local/simple-v9-final-tests.log`, `.local/simple-v9-layout-final-tests.log`, gates `simple-v9-layout-*`, auditorías bajo `output/generador-documentos/mejoras-sencillas-v9/` y `.local/simple-v9-long/`. No se entrega contexto privado ni logs en el ZIP.

El recorrido funcional usa IA simulada, identificado como tal; esta petición no realiza nuevas llamadas de pago. La revisión visual utiliza contenidos previamente generados, sin reescribirlos. No equivale a una nueva evaluación de calidad de un modelo.

## Fallos encontrados durante la revisión

1. La primera tanda se detuvo por memoria de confirmación insuficiente del equipo (errores de asignación PGlite/V8), antes de completar el flujo. Se detuvo únicamente la variante verificada, se respaldó su almacén cerrado y se ejecutaron pruebas secuenciales; no se tocaron otros programas ni se cambió la lógica para ocultar el fallo. La repetición funcional final pasó.
2. Una prueba nueva exigía imprimir en el proyecto toda la secuencia interna, aunque la plantilla aprobada ya usaba una ruta breve. Se corrigió esa expectativa: conservar secuencia completa de actividades, cierre general del proyecto, criterios y fuentes anteriores, sin duplicar la planificación interna.
3. Un rótulo adicional sobre los momentos desplazaba el cierre de A14. Se incorporó a las bandas existentes sin añadir altura, recuperando los tres momentos completos en una página. Una nota curricular quedaba aislada en el proyecto; ahora se mantiene junto a la primera tabla en la nueva presentación.

## Activación y rollback

Antes de editar se capturaron fuentes y hashes de 75 Word; respaldo cerrado `.local/backups/simple-v9-before-activation/store`. El reinicio usa el ejecutable y argumentos verificados de la variante, mismo almacén, web 5185 y API 8805. La conservación exacta posterior y el smoke se documentan en los recibos locales de activación.

Para revertir, emitir de nuevo las presentaciones anteriores para próximas fuentes, conservando los lectores y renderizadores nuevos para los documentos ya creados. No restaurar ni borrar alumnos, conversaciones, proyectos o actividades para cambiar una plantilla. No se modifica el checkout original ni se publica.

Activación final verificada: PID 21484; workspace y planes idénticos, cuatro alumnos, 36 turnos/dieciséis ámbitos y 75 cuerpos Word iguales antes/después. Recibo .local/simple-docs-v9-activation-preservation.json. Diez descargas complementarias y web HTTP 200 comprobadas tras reiniciar; ocho módulos críticos del checkout original coinciden con HEAD.
