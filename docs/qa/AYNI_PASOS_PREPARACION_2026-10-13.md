# Pasos clickeables de preparación — 2026-10-13

Base: `cc9db0d`, rama `codex/observaciones-inicial-qa`, árbol limpio antes del cambio. Refina el indicador existente: números, checks y texto son botones nativos; `aria-current`, descripción de completado, hover y foco visible. Alta inicial, padrón, entrevistas, resumen y Mi año usan el mismo componente; configuración ya creada conserva navegación de los cuatro pasos.

## Flujo y permisos

Pasos 1/2/3/4 abren configuración/matrícula/entrevistas/Mi año. Al dejar entrevistas/resumen se espera el flush existente; otros editores conservan el guard de cambios pendientes. Matrícula confirma con el endpoint existente antes de entrar a 3 o 4. Sin aula se mantiene configuración; sin niños/matrícula confirmada se vuelve a 2. Resumen pertenece al paso 3. No cambios de esquema, permisos, RLS, proveedores IA ni datos remotos.

## Validación

- `npx tsc --noEmit`: PASS.
- `npm run lint -- --ignore-pattern .local`: PASS. El comando sin exclusión recorre cachés generadas de pruebas y falla allí; no se ha cambiado configuración de lint.
- `npm run build` (vinext): PASS. `node node_modules/next/dist/bin/next build --webpack`: PASS (compilación, TypeScript y páginas).
- `node --test src/lib/preparation-navigation.test.mjs`: 3/3 PASS.
- Suite adicional `workflow-ui-continuity`: 12/15 PASS, 3 fallos de regex de código fuente ya presentes en HEAD cc9db0d (accesos docentes, dictado, consulta de competencia). Baseline verificado con `git show`, no corregidos por esta solicitud.
- Navegador con TeacherWorkspace real y API/PGlite aislados: 3→1→2→3→4→2; 2→4; 4→3; activación con Enter; creación de aula desde paso 2; avance sin niños bloqueado; perfil sin matrícula vuelve a 2. PASS.
- Respuesta ficticia de entrevista escrita y navegación inmediata 3→1→3: flush y texto recuperado PASS.
- Formulario de matrícula pendiente: cancelar conserva texto/paso; aceptar permite salir. PASS con `window.confirm` sustituido **solo en fixture** por respuesta seleccionada en control QA. El diálogo nativo bloquea la automatización de IAB; su cierre interactivo no se valida.
- Revisión visual: escritorio de 1265px efectivo, móvil dentro de iframe de 390px (viewport de contenido 375px por scrollbar), cuatro botones >=44px y sin overflow horizontal. Tamaño temporal del navegador restablecido. Capturas/recibos privados: `.local/preparation-steps-20261013/` y `.local/preparation-setup-20261013/`.

## Riesgo y rollback

Cambio de navegación de presentación, sin generación de planes ni confirmación pedagógica implícita. Guards y confirmación servidor siguen siendo autoridades. Revertir el commit de UI restaura el indicador estático; registros existentes permanecen compatibles. Sin despliegue por esta solicitud.

Servidores y pestañas QA cerrados al concluir; viewport restablecido.
