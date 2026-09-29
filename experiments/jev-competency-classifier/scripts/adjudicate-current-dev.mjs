import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { EXPERIMENT_ROOT } from "../src/constants.mjs";
import { prepareCurrentDev } from "../src/current-dev-job.mjs";

// Decisions made by Codex by reading all observations before any live study calls.
// This explicit table does not consult coverage tags, provider outputs or the frozen test.
const decisions = `
001|MAT_CANTIDAD||Correspondencia pañuelo-broche y sobrantes observados; sujetar es instrumental.
002|MAT_CANTIDAD||Conteo y recuento de seis fichas; no convertir la duda sobre motivo en hecho.
003|MAT_CANTIDAD||Compara cantidades de semillas; extensión del montón es indicio cuantitativo.
004|MAT_CANTIDAD||Una cuchara por muñeco y reconocimiento de una faltante.
005|MAT_CANTIDAD||Seriación explícita por longitud con corrección de orden.
006|MAT_CANTIDAD||Cuenta ruedas y agrega una; el dibujo sostiene la tarea numérica.
007|MAT_CANTIDAD||Cinco monedas menos dos y tres restantes; papá es mención benigna.
008|MAT_CANTIDAD||Empareja cuentas y reconoce sobrantes; la acción basta pese al creo.
009|MAT_FORMA||Indica y realiza un recorrido relativo a silla y puerta; habla instrumental.
010|MAT_FORMA||Reconoce encaje de triángulo al girar y comparar puntas.
011|MAT_FORMA||Representa camino alrededor y distingue dentro; explicación del mismo recorrido.
012|MAT_FORMA||Contrasta círculo/cuadrado mediante encaje y esquinas.
013|MAT_FORMA||Cambia detrás/delante del cojín; hermano imaginario no identifica persona real.
014|MAT_FORMA||Ubica lugares y sigue ruta en plano; representación espacial central.
015|MAT_FORMA||Reproduce distribución de figuras y corrige posición arriba/al lado.
016|MAT_FORMA||Aleja aro y expresa relación espacial; no inferir comprensión de consigna.
017|CYT_INDAGA||Pregunta por sonido y prueba intensidades para comparar.
018|CYT_INDAGA||Registra cambio de sombra y propone volver a observar; marca instrumental.
019|CYT_INDAGA||Prueba imán con dos objetos y repite para comprobar resultado.
020|CYT_INDAGA||Compara movimiento al viento y modifica distancia.
021|CYT_INDAGA||Pregunta y contrasta liberación de color de dos papeles en agua.
022|CYT_INDAGA||Contrasta absorción con igual cantidad de agua; cantidad es control experimental.
023|CYT_INDAGA||Observa huellas con lupa, pregunta y compara anchuras.
024|CYT_INDAGA||Tapa y destapa para comprobar cambio del sonido.
025|COM_ORAL||Relato oral de pérdida y búsqueda sin soporte gráfico.
026|COM_ORAL||Organiza explicación verbal de procedimiento; no consta experimentación ejecutada.
027|COM_ORAL||Pregunta para precisar referente y comprender a interlocutora.
028|COM_ORAL||Reformula orden temporal y relata hechos al escuchar explicación.
029|COM_ORAL||Responde y amplía conversación; mención de mamá benigna.
030|COM_ORAL||Reformula pedido ante incomprensión; preservar creo sobre intención.
031|COM_ORAL|CYT_INDAGA|Explica oralmente un sonido; también es razonable indagación por observación y explicación de su origen, sin afirmar prueba inexistente.
032|COM_ORAL||Relata anécdota y pregunta por experiencia de interlocutora; abuelo benigno.
033|COM_LECTURA||Anticipa historia con portada y justifica con imagen; lectura no convencional.
034|COM_LECTURA||Construye secuencia narrativa a partir de ilustraciones.
035|COM_LECTURA||Interpreta símbolo gráfico del cartel; no hay lavado observado.
036|COM_LECTURA||Identifica envase por imagen en relación con receta; no consta comparación numérica.
037|COM_LECTURA||Busca personaje y revisa respuesta usando imágenes del libro.
038|COM_LECTURA||Reconoce función de invitación por torta y fecha, sin exigir lectura convencional.
039|COM_LECTURA||Infiere acción del personaje desde ilustración del cuento; papá benigno.
040|COM_LECTURA||Explica letrero mediante flecha y salida; incertidumbre sobre palabras no anula lectura visual.
041|COM_ESCRITURA||Atribuye mensaje a rayitas y lo entrega al destinatario.
042|COM_ESCRITURA||Produce entradas con marcas identificadoras y explica su significado; no inferir conteo.
043|COM_ESCRITURA||Letras como registro para identificar la semilla; comunicativo y no convencional.
044|COM_ESCRITURA||Dicta mensaje para destinataria y agrega firma; solicitar escritura también constituye producción mediada.
045|COM_ESCRITURA||Garabatos con función de indicaciones para cuidar al animal.
046|COM_ESCRITURA||Signos comunicativos y explicación explícita; mantener duda inicial.
047|COM_ESCRITURA||Etiqueta de letras con función de identificar pertenencia.
048|COM_ARTE||Compone golpes para representar tormenta; habla describe la representación.
049|COM_ARTE||Movimiento expresivo de pañuelo como mariposa; velocidad sostiene representación.
050|COM_ARTE||Crea animal fantástico y explica decisión del mismo proyecto; no otra conducta independiente.
051|COM_ARTE||Mezcla y modifica color para representar tarde oscura; propósito expresivo, no prueba científica independiente.
052|COM_ARTE||Dramatiza con títere, tono y gesto; no inferir relato oral independiente.
053|COM_ARTE||Explora huellas y formas para representar paisaje y montañas.
054|COM_ARTE||Inventa melodía y selecciona parte expresiva para familia; mención familiar benigna.
055|PSICO_MOTRICIDAD||Salto y ajuste postural explícito para recuperar equilibrio.
056|PSICO_MOTRICIDAD|MAT_FORMA|Ajusta cuerpo al pasar túnel bajo; también puede interpretarse como resolución de desplazamiento y relación espacial.
057|PSICO_MOTRICIDAD||Ajusta velocidad para sostener equilibrio de bolsita sobre cabeza.
058|PSICO_MOTRICIDAD||Coordinación fina bimanual específica al enhebrar; no producción artística descrita.
059|PSICO_MOTRICIDAD||Coordinación de dedos y mano que estabiliza base; más específica que uso cotidiano aislado.
060|PSICO_MOTRICIDAD||Ajusta fuerza y posición corporal en lanzamiento; no pregunta causal independiente.
061|PSICO_MOTRICIDAD|MAT_FORMA|Control de apoyos sobre línea curva; recorrido espacial también defendible, sin convertir inseguridad en motivo de abstención.
062|PS_CONVIVE||Negocian turnos de roles y aceptan acuerdo conjunto.
063|PS_CONVIVE||Ayuda concreta coordinada para acceso de otra niña a telas.
064|PS_CONVIVE||Invita e integra compañero con respuesta esperada; explicación sostiene interacción.
065|PS_CONVIVE||Propone solución compartida a desacuerdo y consulta aceptación.
066|PS_CONVIVE||Distribuyen tareas y coordinan recogida con comunicación recíproca.
067|PS_CONVIVE||Promueve participación de quien falta hablar y abre espacio a su propuesta.
068|PS_CONVIVE||Solicita incorporarse y distribuyen tareas conjuntamente.
069|ABSTAIN||Solo sueño y solicitud puntual de descanso; expresión no basta para competencia curricular.
070|ABSTAIN||Solo alimentación y negativa puntual a continuar; no evaluar identidad por esta frase.
071|ABSTAIN||Distracción momentánea y retorno cotidiano sin conducta curricular específica.
072|ABSTAIN||Llanto y calma aislados, sin intercambio ni autorregulación explícita descrita.
073|ABSTAIN||Negativa puntual e higiene cotidiana, sin evidencia específica de aprendizaje.
074|ABSTAIN||Proximidad y observación pasiva sin interacción; no inferir convivencia.
075|ABSTAIN||Manipulación aislada sin pregunta, comparación, prueba ni propósito expresivo observado.
076|ABSTAIN||Traslado incidental de pincel sin producción ni exploración artística registrada.
077|PRIVACY||Teléfono de nueve dígitos: formato identificable sensible; ejemplo ficticio deliberado.
078|PRIVACY||Correo de contacto explícito: ejemplo reservado ficticio, se evalúa detector por formato.
079|PRIVACY||Domicilio con vía y número explícitos; ejemplo ficticio que satisface regla contextual.
080|PRIVACY||URL de contacto explícita; ejemplo ficticio, no bloqueo por hermano o nombre.
`.trim().split("\n").map((line) => line.split("|"));
const source = path.join(EXPERIMENT_ROOT, "datasets/current-dev/dev_proposal_v1.jsonl");
const records = (await readFile(source, "utf8")).trim().split(/\r?\n/u).map(JSON.parse);
if (records.length !== 80 || decisions.length !== 80) throw new Error("Se requieren 80 decisiones explícitas.");
const reviewedAt = new Date().toISOString();
const annotated = records.map((record, index) => {
  const [number, chosen, alternative, reason] = decisions[index];
  if (record.id !== `DEV_${number}`) throw new Error("Tabla no coincide con IDs.");
  const primary = ["ABSTAIN", "PRIVACY"].includes(chosen) ? null : chosen;
  return { ...record, expected: { primary, acceptable_primary: primary ? [primary, ...(alternative ? [alternative] : [])] : [],
    acceptable_secondary: [], should_abstain: chosen === "ABSTAIN", should_privacy_block: chosen === "PRIVACY" },
    adjudication: { status: "adjudicated", reviewed_by: "Codex", reviewed_at: reviewedAt,
      method: "codex_rubric", notes: reason, ambiguous: Boolean(alternative) } };
});
const jsonl = annotated.map((record) => JSON.stringify(record)).join("\n") + "\n";
const dataset = path.join(EXPERIMENT_ROOT, "datasets/current-dev/current_dev_adjudicated.jsonl");
const adjudicationFile = path.join(EXPERIMENT_ROOT, "datasets/current-dev/current_dev_adjudication.json");
const fingerprint = createHash("sha256").update(jsonl).digest("hex");
const manifest = { status: "adjudicated", gold_source: "codex_rubric", reviewed_by: "Codex", reviewed_at: reviewedAt,
  authorization: "explicit_user_request", authorization_reference: "d41b502e-3a19-45d5-8002-a071e7ef4d8c/Pasted text.txt",
  dataset_sha256: fingerprint, case_count: 80, proposal_version: "dev-proposal-v1", independent_human_gold: false,
  rubric: "User supplied rubric; observations read before Jev/Luna; secondary evidence conservative; frozen test excluded." };
await writeFile(dataset, jsonl, { flag: "wx" });
await writeFile(adjudicationFile, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx" });
const prepared = await prepareCurrentDev({ dataset, adjudicationFile });
const distribution = {};
for (const record of annotated) { const key = record.expected.primary ?? (record.expected.should_privacy_block ? "PRIVACY" : "ABSTAIN"); distribution[key] = (distribution[key] ?? 0) + 1; }
const review = ["# Gold DEV adjudicado por Codex", "", `Fecha: ${reviewedAt}. SHA-256: ${fingerprint}.`, "",
  "Autorización expresa del usuario. Esto es adjudicación provisional por Codex del DEV sintético, no gold independiente humano. No se consultó Jev ni Luna, ni etiquetas o resultados del test congelado. El gold se cierra antes de la primera corrida y no se adapta a respuestas posteriores.", "",
  "## Distribución", "", "```json", JSON.stringify(distribution, null, 2), "```", "",
  "Tres ambiguos: DEV_031 (oral/explicación indagatoria), DEV_056 y DEV_061 (control corporal/relación espacial). Ambas principales defendibles están registradas antes de ejecutar. Todas las secundarias quedan vacías: las menciones verbales, materiales, colaboración instrumental o trazos de medición no describen otra actuación independiente suficientemente separada. No penalizar primaria por secundaria ausente; sí informar sobreclasificación adicional por separado.", "",
  "## Cobertura de contrastes", "", "Cantidad/Forma: 005,009–016. Oral/Lectura:025–040. Convivencia/proximidad:062–068 frente a074. Indagación/manipulación:017–024 frente a075. Escritura emergente:041–047. Arte/materiales:048–054 frente a076. Sueño/comida/distracción/tristeza/negativa:069–073. Familias benignas:007,013,029,032,039,044,054. Privacidad por formatos ficticios:077–080. Las edades siguen null.", "",
  "## Revisión individual (80/80)", "", "| ID | Observación | Principal/decisión | Alternativas | Secundarias | Justificación |", "|---|---|---|---|---|---|",
  ...annotated.map((r) => `| ${r.id} | ${r.observation.replaceAll("|", "\\|")} | ${r.expected.primary ?? (r.expected.should_privacy_block ? "PRIVACY" : "ABSTAIN")} | ${r.expected.acceptable_primary.filter((id) => id !== r.expected.primary).join(", ") || "—"} | — | ${r.adjudication.notes} |`), ""];
await writeFile(path.join(EXPERIMENT_ROOT, "docs/CURRENT_DEV_GOLD_REVIEW.md"), review.join("\n"), { flag: "wx" });
console.log(JSON.stringify({ fingerprint, distribution, preflight: prepared.preflight }));
