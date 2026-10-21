/** Family reports are context, never teacher-observed competency evidence. */
export const familyInterviewCategories = Object.freeze([
  "family_context", "language_context", "interests", "autonomy_context",
  "communication_emotional_context", "communication_context", "emotional_support_context",
  "social_context", "adaptation_context", "previous_education", "daily_routine_context",
  "family_expectations", "family_expectation", "home_activity_example",
  "family_community_context", "family_community_enjoyed", "participation_support_context",
  "identity_autonomy_context", "literacy_context", "mathematics_context", "exploration_context",
]);
export const familyInterviewStructuredOptionsVersion = 2;
export const interviewLanguageOptions = Object.freeze([
  { id: "es", label: "Castellano" }, { id: "qu", label: "Quechua" },
  { id: "ay", label: "Aimara" }, { id: "en", label: "Inglés" },
  { id: "other", label: "Otra lengua" },
]);
/** Keep the family's own language name when «Otra lengua» was selected. */
export function interviewLanguageLabel(id, otherLanguageText = "") {
  return id === "other" && typeof otherLanguageText === "string" && otherLanguageText.trim()
    ? otherLanguageText.trim() : interviewLanguageOptions.find(option => option.id === id)?.label ?? "";
}
export const interviewInterestOptions = Object.freeze([
  { id: "animals", label: "Animales" }, { id: "plants", label: "Plantas y naturaleza" },
  { id: "construction", label: "Construcción" }, { id: "vehicles", label: "Vehículos" },
  { id: "stories", label: "Cuentos y libros" }, { id: "drawing", label: "Dibujo" },
  { id: "music", label: "Música y canto" }, { id: "dance", label: "Baile" },
  { id: "cooking", label: "Cocinar" }, { id: "water", label: "Agua" },
  { id: "sports", label: "Juegos deportivos" }, { id: "movement", label: "Correr, saltar o trepar" },
  { id: "nature", label: "Naturaleza" }, { id: "pretend_play", label: "Juego de imaginar" },
  { id: "other", label: "Otro" },
]);
export const interviewAutonomyOptions = Object.freeze([
  { id: "eating", label: "Comer" }, { id: "dressing", label: "Vestirse" },
  { id: "bathroom", label: "Ir al baño" }, { id: "tidying", label: "Ordenar sus cosas" },
  { id: "choosing", label: "Elegir qué hacer" }, { id: "helping", label: "Ayudar en casa" },
]);
export const interviewAutonomyLevels = Object.freeze([
  { id: "alone", label: "Lo hace solo/a" }, { id: "sometimes", label: "A veces pide ayuda" },
  { id: "much_help", label: "Necesita bastante ayuda" },
]);
export const interviewCommunicationOptions = Object.freeze([
  { id: "converses", label: "Conversa con facilidad" }, { id: "quiet_initially", label: "Habla poco al inicio" },
  { id: "short_phrases", label: "Usa frases cortas" }, { id: "gestures", label: "Usa gestos además de palabras" },
  { id: "needs_time", label: "Necesita tiempo para expresarse" }, { id: "other", label: "Otra forma de comunicarse" },
]);
export const interviewEmotionalSupportOptions = Object.freeze([
  { id: "talk", label: "Conversar con calma" }, { id: "company", label: "Estar cerca de alguien" },
  { id: "space", label: "Tener un momento tranquilo" }, { id: "movement", label: "Moverse o jugar" },
  { id: "anticipation", label: "Saber qué pasará" }, { id: "other", label: "Otra" },
]);
export const interviewSocialPlayOptions = Object.freeze([
  { id: "seeks_others", label: "Busca jugar con otros" }, { id: "alone_sometimes", label: "A veces juega solo/a" },
  { id: "proposes", label: "Propone juegos" }, { id: "follows", label: "Se suma a juegos de otros" },
  { id: "takes_time", label: "Necesita tiempo para integrarse" },
  { id: "sharing_waiting", label: "Está aprendiendo a esperar y compartir" }, { id: "other", label: "Otra forma de jugar" },
]);
export const interviewHomeActivityOptions = Object.freeze([
  { id: "asks_why", label: "Pregunta cómo o por qué" }, { id: "counts_compares", label: "Cuenta, reparte o compara" },
  { id: "builds", label: "Construye o arma" }, { id: "books", label: "Mira libros o escucha cuentos" },
  { id: "draws_writes", label: "Dibuja o intenta escribir" }, { id: "invents", label: "Inventa historias o juegos" },
  { id: "music_dance", label: "Canta, baila o hace música" }, { id: "explores", label: "Explora la naturaleza u objetos" },
  { id: "notices_details", label: "Observa detalles y los comenta" }, { id: "other", label: "Otra experiencia en casa" },
]);
export const interviewCommunityOptions = Object.freeze([
  { id: "agriculture", label: "Chacra o agricultura" }, { id: "animals", label: "Animales" },
  { id: "market", label: "Mercado o comercio" }, { id: "workshop", label: "Taller u oficio" },
  { id: "cooking", label: "Cocina" }, { id: "park", label: "Parque" },
  { id: "music", label: "Música" }, { id: "celebrations", label: "Fiestas y costumbres" },
  { id: "crafts", label: "Tejidos o artesanías" }, { id: "sports", label: "Deportes" },
  { id: "nature", label: "Naturaleza" }, { id: "travel", label: "Viajes" }, { id: "other", label: "Otra experiencia familiar" },
]);
export const interviewParticipationSupportOptions = Object.freeze([
  { id: "watch_first", label: "Observar antes de participar" }, { id: "more_time", label: "Tener más tiempo" },
  { id: "quiet", label: "Evitar ciertos ruidos" }, { id: "anticipation", label: "Saber qué pasará" },
  { id: "movement", label: "Poder moverse" }, { id: "other", label: "Otro apoyo" },
]);
export const interviewPreviousEducationOptions = Object.freeze([
  { id: "yes", label: "Sí" }, { id: "no", label: "No" }, { id: "unknown", label: "Prefiero no responder" },
]);
export const interviewPreviousEducationTypeOptions = Object.freeze([
  { id: "nursery", label: "Cuna" }, { id: "kindergarten", label: "Jardín" },
  { id: "daycare", label: "Guardería" }, { id: "other", label: "Otro espacio" },
]);
export const familyInterviewQuestionnaireVersion = 3;
export const familyInterviewQuestionGroups = (name, version = familyInterviewQuestionnaireVersion) => [{ title: version === 2 ? "La familia nos cuenta" : "Preguntas para la familia", questions: version === 2 ? [
  { key: "interests", label: "¿Qué le gusta hacer a " + name + " y qué temas le interesan?", hint: "Marca solo lo que cuente la familia. Puedes añadir un ejemplo o comentar lo que no le gusta." },
  { key: "social_context", label: "¿Cómo suele jugar " + name + ", a solas y con otras personas?", hint: "Puedes señalar distintas formas de jugar; no hace falta elegir una sola." },
  { key: "home_activity_example", label: "¿Qué has visto hacer a " + name + " mientras juega o explora en casa?", hint: "Aquí interesa una situación concreta: qué hizo, dijo o intentó." },
  { key: "communication_context", label: "¿Qué lenguas escucha o usa " + name + " en casa y cómo se hace entender?", hint: "Puedes marcar una lengua aunque todavía no la hable, si la escucha en casa." },
  { key: "family_community_context", label: "¿Qué actividades, lugares o costumbres comparte " + name + " con su familia o comunidad?", hint: "Las opciones son temas o lugares. Puedes contar qué hace allí o con quién comparte esa experiencia." },
  { key: "participation_support_context", label: "¿Qué ayuda a " + name + " a sentirse a gusto y participar?", hint: "Comparte lo que ayude a acompañarle. No necesitas incluir información privada." },
] : [
  { key: "interests", title: "Juegos e intereses", label: "¿Qué juegos o actividades disfruta más su hijo o hija? ¿Qué suele hacer cuando juega libremente?", hint: "Marca solo lo que cuente la familia. Puedes añadir un ejemplo o comentar lo que no le gusta." },
  { key: "identity_autonomy_context", title: "Identidad y autonomía", label: "¿Cómo expresa sus emociones cuando está alegre, triste o molesto? ¿Qué cosas suele hacer por sí mismo?", hint: "Puedes contar una situación cotidiana y qué hace sin ayuda o con acompañamiento." },
  { key: "social_context", title: "Convivencia", label: "¿Cómo se relaciona con otros niños o familiares? ¿Qué hace cuando tiene que compartir o surge algún desacuerdo?", hint: "Cuenta lo que suele ocurrir; no hay respuestas correctas o incorrectas." },
  { key: "communication_context", title: "Comunicación oral", label: "¿Qué cosas suele contar o preguntar en casa? ¿Cómo expresa sus ideas o necesidades y en qué lengua o lenguas se comunica?", hint: "Puedes marcar las lenguas y añadir qué cuenta, pregunta o cómo se hace entender." },
  { key: "literacy_context", title: "Lectura y escritura", label: "¿Cómo se interesa por los cuentos, libros o imágenes? ¿Intenta dibujar o escribir a su manera para comunicar algo?", hint: "Cuenta lo que has visto. Distingue cuándo dibuja y cuándo intenta escribir; todavía no necesita hacerlo como un adulto." },
  { key: "mathematics_context", title: "Matemática", label: "Cuando juega o ayuda en casa, ¿suele contar, agrupar, repartir, comparar o construir con objetos? ¿Puede contar algún ejemplo?", hint: "Describe un juego o una tarea cotidiana, sin proponerle una prueba." },
  { key: "exploration_context", title: "Curiosidad y exploración", label: "¿Qué cosas despiertan su curiosidad? Cuando quiere saber cómo funciona algo, ¿qué suele hacer para descubrirlo?", hint: "Puedes contar qué le llamó la atención y qué hizo para averiguarlo." },
  { key: "family_context", title: "Contexto familiar y expectativas", label: "¿Qué considera importante que la profesora conozca sobre su hijo o hija? ¿Qué le gustaría que aprenda o desarrolle durante este año?", hint: "Comparte solo información útil para acompañarle. Todas las respuestas son opcionales." },
] }];

/** Existing answers remain in their original questionnaire until explicitly corrected. */
export function familyInterviewVersionFor(details = {}) {
  return details?.questionnaire_version === 3 || !hasFamilyInterviewAnswers(details) ? 3 : 2;
}

/** A version marker, whitespace and empty lists are not family answers. */
export function hasFamilyInterviewAnswers(details) {
  return Object.entries(details ?? {}).some(([key, value]) => key !== "structured_options_version" &&
    (typeof value === "string" ? Boolean(value.trim()) : Array.isArray(value) && value.length > 0));
}
