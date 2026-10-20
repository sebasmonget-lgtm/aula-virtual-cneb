# Lenguaje sencillo en evaluación e informes

## Alcance

Se mantiene análisis previo, nota docente y conclusión posterior. Instrucción común de IA: palabras cotidianas, una idea por oración, ayuda concreta y sin frases de trámite. La conclusión conserva la guía flexible de 30–70 palabras. Los nombres/citas oficiales no se simplifican. No se reescriben observaciones ni conclusiones confirmadas al abrir la pantalla.

El informe mantiene la fuente canónica y almacena una lectura para familias en `family_wording` v1. Su huella depende de la competencia, suficiencia, conclusión, ejemplos, apoyos, próximos pasos y cautela originales. Guardar en los dos recorridos vuelve a copiar las fuentes autorizadas y comprueba esa huella. La edición familiar no modifica la conclusión original ni la nota. Interfaz, Documentos y Word comparten el lector; informes históricos sin este objeto conservan su contenido. Actualización de versiones previas mediante botón explícito y nuevo lote. Sin migración ni cambio de RLS.

## Comprobaciones

109 pruebas de evaluación, conclusiones, informes, generación y Word PASS antes de los dos nuevos casos de lectura familiar/Word; 33 pruebas focales PASS con esos casos. Regresión adicional de edición HTTP sin mutar la fuente en tests-integration.log. Typecheck, lint y build Vinext PASS. Detector de UI sin hallazgos. Revisión del componente real con datos locales en escritorio y 390 px, edición familiar y original desplegable.

Prueba real de un informe con doce competencias: Luna medium, 31,4 s, una llamada válida, sin fallback y sin imágenes enviadas. Esto verifica esa muestra, no garantiza toda respuesta futura. Las doce páginas del Word fueron renderizadas e inspeccionadas. Permanece una competencia por hoja y la foto en la primera, a la derecha. Artefacto y recibos privados fuera de Git: `.local/ayni-lenguaje-simple-20261020`.

La publicación Preview, smoke y conciliación de fuentes se registran en deploy.json, smoke.json, data-after.json y release.json de esa carpeta. No considerar publicación completada sin esos recibos. Solo QA aislado, funciones gru1; Producción conserva su deployment.

La prueba cloud de diez informes detectó cinco timeouts del proveedor a los 30 s; cinco propuestas quedaron guardadas. El informe de doce competencias necesita un margen distinto del análisis breve. Se configura 90 s solo para `family_report`, manteniendo override explícito, concurrencia seis, lease 210 s y función 300 s. Reintentar únicamente los pendientes de forma explícita conserva los resultados completos. El tiempo del resto de workflows no cambia. Validación y recuperación efectiva en recibos privados posteriores.

## Referencias pedagógicas

CNEB, apartado de evaluación formativa: conclusiones desde evidencia variada con avances, dificultades y recomendaciones. FAQ Minedu 2024: personalizadas, por competencia, con apoyos/ajustes cuando correspondan. No se encontró extensión obligatoria en los documentos consultados; el rango es propio de Ayni. RVM 048-2024 modifica 094-2020: Inicial ciclo II requiere conclusiones A/B/C; AD a criterio docente. El requisito familiar de contar con un texto por competencia es una decisión del producto y no cambia esa regla de cierre.

- https://www.minedu.gob.pe/curriculo/pdf/curriculo-nacional-de-la-educacion-basica.pdf
- https://repositorio.minedu.gob.pe/bitstream/handle/20.500.12799/10537/Evaluaci%C3%B3n%20de%20competencias%20de%20los%20estudiantes%20preguntas%20frecuentes.pdf?isAllowed=y&sequence=1
- https://www.gob.pe/institucion/minedu/normas-legales/5518274-048-2-24-minedu

## Rollback

Revertir el commit de esta entrega y mover el alias QA al deployment anterior registrado en baseline.json. Los campos canónicos permanecen intactos y un servidor anterior puede seguir leyendo las fuentes del informe. No guardar propuestas nuevas con un servidor antiguo que desconoce `family_wording`; conservarlas para una versión compatible. No borrar datos ni alterar Producción.
