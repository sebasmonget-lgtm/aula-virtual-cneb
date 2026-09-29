# Instrumentación del estudio autónomo

La primera corrida usa los prompts/thresholds originales de 32e5d01. Durante su ejecución se prepararon solo análisis offline, reportes y un camino de test final protegido; no se modificó ninguna instrucción del clasificador.

`current-study-analysis.mjs` separa errores de primaria aceptable, abstención, privacidad y secundarias. La inestabilidad se calcula por ID a través de repeticiones, distinguiendo principal y decisión completa. Los intervalos de diferencias Luna usan bootstrap pareado por caso: promedio dentro del caso antes de remuestrear, para no tratar tres repeticiones como tres observaciones independientes.

`current-final-test.mjs` exige cierre DEV, versiones de fuente coincidentes, gold DEV intacto y corridas completas de tres repeticiones. Un lock exclusivo se crea **antes de leer gold TEST**. Solo ejecuta la variante seleccionada, una repetición sobre 28 casos. La CLI DEV sigue rechazando el test; no se relaja su guardia. Una segunda llamada final falla antes de leer gold o construir proveedores. Los tests usan fixtures temporales y jamás abren el test real.

Credentials: primera preparación encontró claves repartidas entre .env.local de Ayni y del experimento original. Se leen dos archivos en memoria, únicamente OPENAI_API_KEY y OPENROUTER_API_KEY; no se copian ni imprimen. El primer intento sin ambas claves falló antes de crear proveedor o carpeta de resultados; cero llamadas de ese intento.

Versionado de bytes: .gitattributes preserva LF para JSONL DEV adjudicado y su manifest; evita que checkout Windows invalide su huella al convertir saltos de línea. El test externo original/copia no se altera.

Rollback: revertir commits de instrumentación mantiene el baseline experimental anterior y sus resultados ignorados. Conservar el lock/ledger final fuera del revert para no repetir accidentalmente la evaluación externa.
