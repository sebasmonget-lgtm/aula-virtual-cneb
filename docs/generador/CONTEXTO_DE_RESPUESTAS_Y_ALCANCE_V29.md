# Alcance y referencias de respuestas breves — v29, 2026-10-27

## Evidencia y corrección

La usuaria pega los cinco turnos del tercer proyecto. Todos se verifican guardados con chat v25, antes del ajuste v28. La intención original es preparar una comida saludable; el asistente pasa a elegir alimentos de una comida imaginaria y ofrece generar tras aceptar tres experiencias. No se reescriben esas respuestas.

Se precisa el prompt del chat por tramo, ahora `ayni-documents-project-chat-v29`: conservar verbo/intención, distinguir punto de partida y alcance, no deducir proyecto exclusivamente imaginario porque hay juguetes y aclarar modalidad real/juego/combinación si determina el recorrido. Aceptar tres experiencias no equivale a resolver condiciones esenciales ni a disponer de diez actividades; la IA diseña la progresión sin pedir a la docente una lista diaria. Una petición expresa de continuar mantiene la salida voluntaria existente.

Hallazgo adicional: el snapshot transmitía solo textos docentes. «Las tres» llegaba sin la propuesta a la que respondía; tampoco una negación breve podía interpretarse con todo su referente. Para nuevos proyectos se captura opcionalmente `replyContext`: pares del turno anterior de Ayni y la respuesta docente siguiente, identificados por sus IDs y `sourceKind: assistant_proposal_for_reply_context`. `messages` continúa conteniendo únicamente textos docentes. No se incluye la última propuesta sin respuesta posterior.

Los prompts usan estos pares solo para resolver referencias, nunca como hechos o instrucciones. Aceptar una experiencia no confirma automáticamente materiales, acontecimientos, intereses infantiles, salidas o resultados. Negaciones y precisiones docentes prevalecen. Es una referencia con procedencia explícita, no extracción automática de hechos de la respuesta de Ayni.

## Compatibilidad y permisos

`documentProjectConversationSnapshot` conserva su forma previa por defecto; `includeReplyContext` se habilita solo al iniciar proyecto nuevo. Las preparaciones existentes retornan su estado antes de recalcular contexto; capturas anteriores y huellas no se amplían retrospectivamente. Los lotes heredan la captura de su preparación. Sin migraciones ni cambios al contrato público del chat, al anual v25, al maestro v27 o a sus documentos.

La consulta incluye resultados privados del mismo docente/aula/tramo, tras las autorizaciones existentes. Otra docente no puede solicitar ni la forma antigua ni la ampliada. No se agregan nombres de alumnos al contexto, y no se mandan fotos/grabaciones.

## Validación ejecutada

Diecinueve pruebas PASS de flujo documental, preparación, generación y ruta. El caso de integración conserva una pantalla propuesta y expresamente rechazada en un par etiquetado; no aparece en `messages`. Después conserva tres experiencias y «Las tres» con IDs correctos, sin enlazar propuestas posteriores. Comprueba lectura antigua, permiso cruzado, paso al maestro y lotes, ocho actividades e identidad del año sin reescritura.

Una llamada real de chat en base efímera reproduce los cinco turnos problemáticos y agrega una precisión docente ficticia que mantiene preparar comida saludable. La nueva respuesta pregunta si se hará una preparación real sencilla, juego o combinación y deja `ready_to_generate=false`. Una pregunta, respuestas sugeridas claras, sin diagnóstico ni afirmar creación. No se genera año/proyecto/Word de QA. Uso: 5343 tokens de entrada, 220 de salida; coste estimado registrado USD 0.0007778000. Evidencia `output/generador-documentos/chat-alcance-proyecto-v29/`.

La prueba real verifica esa continuación, no todas las variantes de diálogo ni un proyecto completo con esta captura. Los controles léxicos no sustituyen leer el resultado. No se afirma que la generación docente ya iniciada use la corrección nueva: comenzó antes de activarla y se deja concluir sin reemplazarla.

Typecheck y build PASS; lint sin errores, con el aviso React previo de diagnostic-generation-control. Logs privados `.local/project-chat-meaning-v29-*.log`. Se mantiene el almacén docente; la activación se realiza solo sin trabajos activos y compara snapshots antes/después. El estado final y recibo de conservación se registran al cerrar la revisión.

## Reversión

Retirar la opción `includeReplyContext` de preparaciones nuevas vuelve al snapshot anterior sin tocar guardados. Conservar lectores de capturas ampliadas ya existentes. Se pueden volver a las instrucciones v28 sin editar turnos previos. No restaurar una base anterior sobre trabajo docente nuevo.

Cierre de activación: el P03 iniciado por la usuaria termina con 14 de 14 actividades antes del reinicio; se conserva su resultado previo, sin aplicar la captura nueva retrospectivamente. Respaldo posterior a P03 en .local/backups/project-chat-meaning-v29-after-p03. Variante activa launcher 20464, mismo almacén. Workspace, dos planes y tres chats idénticos por comparación exacta después de activar; cuatro alumnos, veinte turnos, dos proyectos y veinticuatro actividades intactos. Web/API HTTP 200. Recibos privados project-chat-meaning-v29-preservation.json y project-chat-meaning-v29-p03-completion.json.
