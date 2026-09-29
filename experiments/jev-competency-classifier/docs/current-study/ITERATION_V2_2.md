# Iteración V2.2: suficiencia equilibrada y manipulación incidental

## Evidencia DEV previa

V2.1 completo: RAW 95.10%, CLEAN 94.61%, INTERPRET 98.53% de primaria aceptable. RAW se abstuvo en DEV028, DEV065 y DEV067 en las tres repeticiones pese a elección/confianza principal alta; el noul de suficiencia cayó bajo 0.70. CLEAN también perdió lectura emergente. La definición positiva de V2.1 destacaba escritura, arte y motricidad, dejando otras áreas resumidas en «otra competencia».

INTERPRET añadió una clasificación motriz en DEV075 (una sola manipulación de masa, gold abstención). Es una incidencia de sesgo interpretativo observable, no evidencia de que toda interpretación sea perjudicial. Tres llamadas de red sin usage/costo conocido afectaron V1/RAW en la tercera repetición; no se reintentan ni se imputan a US$0. Los conteos pareados de correcciones excluyen fallos; accuracy del flujo y su bootstrap incluyen fallos como decisiones fallidas.

## Cambio mínimo

Solo overlay V2: definición de suficiencia con las nueve áreas de la rúbrica enumeradas bajo una regla común; oral breve y lectura de indicios no exigen desempeño convencional; una ayuda/propuesta observable no exige completar el acuerdo. Motricidad requiere coordinación/control/ajuste específico, no cualquier manipulación aislada. Interpretaciones auxiliares no aportan hechos ausentes de la observación.

No contiene IDs, expected ni texto de casos. No cambia gold, filtro, KB, modelos, thresholds, arquitectura, V1 ni prompts Luna. No usa TEST. Snapshot `config/current-study-versions/V2.2.json`; gold SHA 3cc4f1f0cc09763bfae90f002d270dfc62d9597df0583e581283b143818ff320.

## Evaluación y rollback

Mismos 80 casos y tres repeticiones de A/B/C/D; preservar V2/V2.1 y errores. Restaurar ambos campos del snapshot anterior (prompt y source) si la selección final favorece una versión previa. Costos desconocidos permanecen null con subtotal conocido visible. No hay ajuste docente ni promoción automática.
