/** Family reports are context, never teacher-observed competency evidence. */
export const familyInterviewCategories = Object.freeze([
  "family_context", "language_context", "interests", "autonomy_context",
  "communication_emotional_context", "communication_context", "emotional_support_context",
  "social_context", "adaptation_context", "previous_education", "daily_routine_context",
  "family_expectations", "family_expectation", "home_activity_example",
  "family_community_context", "family_community_enjoyed", "participation_support_context",
]);
export const familyInterviewStructuredOptionsVersion = 2;
export const interviewLanguageOptions = Object.freeze([
  { id: "es", label: "Castellano" }, { id: "qu", label: "Quechua" },
  { id: "ay", label: "Aimara" }, { id: "en", label: "Inglés" },
  { id: "other", label: "Otra lengua" },
]);
export const interviewInterestOptions = Object.freeze([
  { id: "animals", label: "Animales" }, { id: "plants", label: "Plantas y naturaleza" },
  { id: "construction", label: "Construcción" }, { id: "vehicles", label: "Vehículos" },
  { id: "stories", label: "Cuentos y libros" }, { id: "drawing", label: "Dibujo" },
  { id: "music", label: "Música y canto" }, { id: "dance", label: "Baile" },
  { id: "cooking", label: "Cocinar" }, { id: "water", label: "Agua" },
  { id: "sports", label: "Deportes" }, { id: "movement", label: "Juegos de movimiento" },
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
  { id: "needs_time", label: "Necesita tiempo para expresarse" }, { id: "other", label: "Otra" },
]);
export const interviewEmotionalSupportOptions = Object.freeze([
  { id: "talk", label: "Conversar con calma" }, { id: "company", label: "Estar cerca de alguien" },
  { id: "space", label: "Tener un momento tranquilo" }, { id: "movement", label: "Moverse o jugar" },
  { id: "anticipation", label: "Saber qué pasará" }, { id: "other", label: "Otra" },
]);
export const interviewSocialPlayOptions = Object.freeze([
  { id: "seeks_others", label: "Busca jugar con otros" }, { id: "alone_sometimes", label: "A veces juega solo/a" },
  { id: "proposes", label: "Propone juegos" }, { id: "follows", label: "Sigue juegos de otros" },
  { id: "takes_time", label: "Necesita tiempo para integrarse" },
  { id: "sharing_waiting", label: "A veces le cuesta esperar o compartir" }, { id: "other", label: "Otra" },
]);
export const interviewHomeActivityOptions = Object.freeze([
  { id: "asks_why", label: "Pregunta cómo o por qué" }, { id: "counts_compares", label: "Cuenta, reparte o compara" },
  { id: "builds", label: "Construye o arma" }, { id: "books", label: "Mira libros o escucha cuentos" },
  { id: "draws_writes", label: "Dibuja o intenta escribir" }, { id: "invents", label: "Inventa historias o juegos" },
  { id: "music_dance", label: "Canta, baila o hace música" }, { id: "explores", label: "Explora la naturaleza u objetos" },
  { id: "notices_details", label: "Observa detalles y los comenta" }, { id: "other", label: "Otra" },
]);
export const interviewCommunityOptions = Object.freeze([
  { id: "agriculture", label: "Chacra o agricultura" }, { id: "animals", label: "Animales" },
  { id: "market", label: "Mercado o comercio" }, { id: "workshop", label: "Taller u oficio" },
  { id: "cooking", label: "Cocina" }, { id: "park", label: "Parque" },
  { id: "music", label: "Música" }, { id: "celebrations", label: "Fiestas y costumbres" },
  { id: "crafts", label: "Tejidos o artesanías" }, { id: "sports", label: "Deportes" },
  { id: "nature", label: "Naturaleza" }, { id: "travel", label: "Viajes" }, { id: "other", label: "Otra" },
]);
export const interviewParticipationSupportOptions = Object.freeze([
  { id: "watch_first", label: "Observar antes de participar" }, { id: "more_time", label: "Tener más tiempo" },
  { id: "quiet", label: "Evitar ciertos ruidos" }, { id: "anticipation", label: "Saber qué pasará" },
  { id: "movement", label: "Poder moverse" }, { id: "other", label: "Otra" },
]);
export const interviewPreviousEducationOptions = Object.freeze([
  { id: "yes", label: "Sí" }, { id: "no", label: "No" }, { id: "unknown", label: "Prefiero no responder" },
]);
export const interviewPreviousEducationTypeOptions = Object.freeze([
  { id: "nursery", label: "Cuna" }, { id: "kindergarten", label: "Jardín" },
  { id: "daycare", label: "Guardería" }, { id: "other", label: "Otro espacio" },
]);
export const familyInterviewQuestionGroups = (name) => [{ title: "La familia nos cuenta", questions: [
  { key: "interests", label: "¿Qué disfruta hacer " + name + "?", hint: "Cuéntanos un ejemplo. También puedes decir qué no le interesa." },
  { key: "social_context", label: "¿Cómo juega, solo/a o con otras personas?" },
  { key: "home_activity_example", label: "¿Qué suele contar, preguntar, construir o explorar?", hint: "Una experiencia concreta nos ayuda a conocerlo mejor." },
  { key: "communication_context", label: "¿Qué lenguas escucha o usa y cómo se comunica?" },
  { key: "family_community_context", label: "¿Qué experiencias, actividades o costumbres de su familia o comunidad son significativas para " + name + "?" },
  { key: "participation_support_context", label: "¿Hay algo más que quieras que la profesora conozca para acompañarlo y ayudarlo a participar?" },
] }];
