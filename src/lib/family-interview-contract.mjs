/** Context reported by the family, never teacher-observed competency evidence. */
export const familyInterviewCategories = Object.freeze([
  "family_context", "language_context", "interests", "autonomy_context",
  "communication_emotional_context", "social_context", "adaptation_context",
  "previous_education", "daily_routine_context", "family_expectations",
]);

/** Optional parent/teacher-selected tags. Free text is never classified automatically. */
export const familyInterviewStructuredOptionsVersion = 1;
export const interviewLanguageOptions = Object.freeze([
  { id: "es", label: "Castellano" }, { id: "qu", label: "Quechua" },
  { id: "ay", label: "Aimara" }, { id: "en", label: "Inglés" },
  { id: "other", label: "Otra lengua" },
]);
export const interviewInterestOptions = Object.freeze([
  { id: "animals", label: "Animales" }, { id: "construction", label: "Construcción" },
  { id: "drawing", label: "Dibujo" }, { id: "music", label: "Música" },
  { id: "stories", label: "Cuentos" }, { id: "movement", label: "Movimiento" },
  { id: "nature", label: "Naturaleza" }, { id: "pretend_play", label: "Juego simbólico" },
  { id: "vehicles", label: "Vehículos" }, { id: "other", label: "Otro" },
]);
export const interviewPreviousEducationOptions = Object.freeze([
  { id: "yes", label: "Sí" }, { id: "no", label: "No" }, { id: "unknown", label: "Prefiero no responder" },
]);
export const interviewPreviousEducationTypeOptions = Object.freeze([
  { id: "nursery", label: "Cuna" }, { id: "kindergarten", label: "Jardín" },
  { id: "daycare", label: "Guardería" }, { id: "other", label: "Otro espacio" },
]);

export const familyInterviewQuestionGroups = (name) => [
  { title: "Su entorno y día a día", questions: [
    { key: "family_context", label: `¿Quiénes acompañan habitualmente a ${name} y con quién pasa más tiempo?`, placeholder: "Por ejemplo: Su mamá acompaña por las mañanas y su abuela comparte las tardes." },
    { key: "language_context", label: "¿Qué lenguas usa o escucha en casa? ¿Con cuál suele comunicarse más?", placeholder: "Por ejemplo: En casa escucha castellano y quechua; suele hablar más en castellano." },
    { key: "interests", label: "¿Qué le gusta hacer, jugar, explorar o conversar?", placeholder: "Por ejemplo: Le gusta construir con bloques, dibujar y conversar sobre animales." },
    { key: "autonomy_context", label: "¿Qué cosas suele hacer por sí mismo/a?", hint: "Por ejemplo: guardar sus cosas, comer, vestirse, elegir materiales o pedir ayuda.", placeholder: "Por ejemplo: Guarda sus juguetes y elige su ropa; pide ayuda para abotonarse." },
  ] },
  { title: "Cómo se siente y relaciona", questions: [
    { key: "communication_emotional_context", label: "¿Cómo suele expresar que necesita algo, está contento/a, incómodo/a, triste o molesto/a?", placeholder: "Por ejemplo: Suele decir lo que necesita; cuando algo le preocupa busca a un adulto cercano." },
    { key: "social_context", label: "¿Cómo suele relacionarse y jugar con otros niños y adultos?", placeholder: "Por ejemplo: Prefiere jugar en grupos pequeños y se acerca a los adultos para conversar." },
    { key: "adaptation_context", label: "¿Hay alguna rutina o situación que le ayude a sentirse seguro/a y tranquilo/a?", hint: "Por ejemplo: una forma de despedirse, saber quién lo recogerá, anticiparle cambios o llevar un objeto.", placeholder: "Por ejemplo: Le ayuda saber quién vendrá a recogerle y anticipar los cambios de actividad." },
  ] },
  { title: "Lo que sería útil conocer", questions: [
    { key: "previous_education", label: "¿Ha tenido experiencias anteriores en cuna, jardín u otros espacios con niños? ¿Cómo fueron?", placeholder: "Por ejemplo: Asistió a un jardín el año pasado y disfrutaba los juegos al aire libre." },
    { key: "daily_routine_context", label: "¿Hay algo de sus rutinas de alimentación, descanso o cuidado diario que sea útil que conozcamos durante la jornada?", placeholder: "Por ejemplo: Suele almorzar temprano y le ayuda tener agua disponible durante el juego." },
    { key: "family_expectations", label: `¿Qué espera la familia para ${name} este año y hay algo más que quisiera que conozcamos para acompañarlo/a mejor?`, placeholder: "Por ejemplo: Esperamos que se sienta a gusto con el grupo y disfrute aprender jugando." },
  ] },
];
