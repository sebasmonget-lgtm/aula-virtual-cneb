# V2.1 — ajuste solo con DEV

Primera corrida cerrada: V1 RAW 92.65%, V2 RAW 91.18%, CLEAN 92.65%, INTERPRET 95.59% de primaria aceptable. Cero sobreclasificación y privacidad FP/FN. V2 RAW: seis falsas abstenciones idénticas en las tres repeticiones (042,043,051,057,059,060), sin errores primarios seleccionados.

Causas observadas: suficiencia baja pese a letras con función de registro; distribución/confianza dividida entre escritura/correspondencia, arte/prueba y motricidad/espacio. La anonimización común también oculta algunos verbos iniciales como posibles nombres; se documenta el daño, no se modifica ese filtro ni se recuperan verbos inventados.

Cambio mínimo autorizado: instrucciones de suficiencia configurables, Motricidad explícita en desambiguación, límites Arte/Indagación y gesto corporal/espacio, escritura emergente con función de identificación/memoria. Ningún ID de caso ni texto exacto de DEV se incrusta en prompts. Evidencia puede mostrarse también cuando una confianza baja causa abstención; reason indica elección/confianza/suficiencia. Sigue siendo selección tipada y breve, sin evaluador adicional.

Se conservan modelos, thresholds 0.50/0.70/0.80, KB, privacidad, topología de dos Jev, V1 y ambos prompts Luna. Gold intacto. Snapshot V2 previo en config/current-study-versions/V2.json; resultados iniciales intactos. Se evalúan de nuevo los cuatro brazos, 80 casos ×3, antes de decidir si este ajuste aporta.
