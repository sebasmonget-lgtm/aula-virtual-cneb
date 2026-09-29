# Propuesta para adjudicación humana

`dev_proposal_v1.jsonl` contiene 80 registros ficticios independientes, sin etiquetas esperadas. `coverage_tags` expresa objetivos del autor y no determina el gold.

Usar `/current-dev-review.html` y seguir `../../CURRENT_DEV.md`. La persona revisora exporta JSONL adjudicado y manifest SHA-256; conservar los bytes exactos en esta carpeta. Los archivos humanos exportados y borradores están ignorados por Git.

No introducir el test final de 28 casos aquí. La CLI DEV lo rechaza por nombre/huella y no ejecuta propuestas pendientes. El generador usa escritura exclusiva para no sobrescribir una propuesta existente.
