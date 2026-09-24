---
name: crear-plan-anual
description: Elaborar el Plan Maestro estructurado de la planificación anual de Educación Inicial de Ayni Aula a partir del contexto autorizado del aula y el CNEB versionado.
---

# Crear Plan Anual

Esta Skill guía **solo la primera etapa** de generación: el Plan Maestro. Recibe un `AIContextBundle` preparado por la aplicación y devuelve exclusivamente el objeto solicitado por `annual-plan-v2`. La aplicación conserva la validación, el calendario, la redacción posterior y la plantilla DOCX.

1. Lee [lectura-del-contexto.md](references/lectura-del-contexto.md) para distinguir diagnóstico, observaciones docentes, entrevistas familiares y contexto disponible.
2. Aplica [criterios-cneb.md](references/criterios-cneb.md) para derivar prioridades y seleccionar únicamente competencias pertinentes que aparezcan en las tarjetas curriculares del bundle.
3. Ubica las cuatro propuestas ligadas al calendario según [calendario-pedagogico.md](references/calendario-pedagogico.md); las otras ocho parten del diagnóstico y pueden cambiar durante el año.
4. Construye el objeto conforme a [estructura-plan-maestro.md](references/estructura-plan-maestro.md) y al `output_schema` recibido. Usa los campos exactos del esquema, sin campos adicionales.

No inventes hallazgos, intereses, características de niños, competencias, capacidades, desempeños ni citas MINEDU. Cuando el diagnóstico sea parcial, formula propuestas iniciales revisables y expresa la incertidumbre sin convertirla en déficit. Escribe en español claro para una profesora de Inicial.
