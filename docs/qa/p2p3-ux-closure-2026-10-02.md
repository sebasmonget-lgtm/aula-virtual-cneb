# Cierre focal P2/P3 de UX — 2026-10-02

## Alcance y base

Rama codex/annual-year-map; base visual aprobada 904eb8dc064166749dcd610484380d7867e6ee4f; P1 407e833d121a980b1a2cccf279bc0c854701e91f. Fuente: última auditoría delta Impeccable + Web Design Guidelines conservada en stash, sin restaurar sus archivos ni sus datos.

Se aplicaron Impeccable (harden/clarify y craft floor) y Web Design Guidelines (semántica, teclado, URL, recuperación y fechas). Se conserva la identidad y la jerarquía I3/I5 aprobada. No hay cambios de API, esquema, currículo, generación ni reglas de confirmación.

## Lista actualizada

| ID | Estado | Cambio |
| --- | --- | --- |
| I7 | Resuelto en los controles auditados | Biblioteca reutiliza WorkflowTabs; flechas, Home/End, tabIndex, aria-selected y panel asociado. Perfil tiene relación tab/panel. Calendario, versiones anuales y selectores de Evaluación exponen aria-pressed. |
| I8 | Resuelto para semana y versión anual | URL conserva vista, día y cursor de Calendario y annualPlan; fecha civil validada e ID anual limitado a las versiones autorizadas devueltas por API. Se conserva el guard de cambios pendientes. |
| I9 | Resuelto | Hoy dice evidencia de actividad según la fuente real de su contador; el vacío de perfil deja de referirse a una competencia no seleccionada. |
| I10 | Resuelto en el shell y Evaluación | Un main, navegación principal nombrada, salto al contenido antes de la navegación, foco sin reemplazar el hash de trabajo; encabezados consecutivos en período, sustento, cobertura, marco e informe. |
| D3 | Resuelto | Deshacer la última eliminación restaura contenido, ID, mes y posición sin deshacer otras ediciones ni superar diez ideas. Disponible durante la edición montada; no es un historial persistente de papelera. |
| D4 | Resuelto | Retorno local desde detalle a Conclusiones del mismo bimestre; conserva niño/competencia, limpia foco de detalle. Las vistas secundarias también limpian ese foco. |
| M1 | Resuelto | Mis documentos vacío ofrece Ir a Planificar mediante callback existente. |
| M2 | Resuelto | Dirección pasa a Nombre de la directora o del director; dato y guardado idénticos. |
| M3 | Parcial | Dialog compartido dice Cerrar. Un único control principal de Word; alternativa local en Opciones de descarga, explicando destinos distintos. Pendiente contenido de guía pedagógica heredada: requiere fuente curricular/versionada y no corresponde modificarlo por estética. |
| M4 | Resuelto | Aula no repite Sin evidencias de actividad bajo el nombre y en el badge. Conserva estado y Ver perfil. |
| D5 | Resuelto en presentación | Conclusión confirmada muestra texto legible y copy de solo lectura. Informe oculta cautela vacía solo con información suficiente, conservando cualquier nota real y casos insuficientes. Fechas familiares y vínculo de Registro usan displayDate; no cambian fechas almacenadas. Copy anual vigente ya resuelto por I3, sin repetir cambios. |

## Validación focal

Entorno localhost con copia PGlite exclusiva .local/p2p3-ux-2026-10-02/pgdata de la copia visual anterior. Se reutilizaron estados ficticios existentes, sin proveedor IA ni escrituras en datos reales. Eliminar/Deshacer en Ideas fue solo local y dejó exactamente el contenido inicial.

- Calendario desktop y 390 × 844: Semana siguiente, F5, mismo intervalo 5–11 octubre y día 9; feriado 8 visible, aria-pressed correcto, sin overflow de página, un main.
- Mi año desktop: V3 → V2 vigente → F5 conserva V2 y su propuesta; V1 anterior → Atrás recupera V2 con propuesta correspondiente. No se confirma, guarda ni regenera un plan.
- Ideas desktop y móvil: eliminar/restaurar título, explicación y noviembre; estados pendiente/guardado coherentes. Captura local idea-undo-mobile.png.
- Conclusiones móvil: Bimestre 4, conclusión confirmada B, lectura normal; retorno vuelve al listado del mismo período. Captura local conclusion-return-mobile.png.
- Biblioteca móvil: ArrowRight y Home cambian selección/foco; tabIndex 0 solo activo; aria-controls/labelledby apuntan al panel. Foco visible, sin overflow de página. Documento existente muestra principal y alternativa plegada.
- Perfil móvil: End selecciona Diagnóstico, foco y panel asociados, un main y sin overflow. Perfil docente desktop muestra label corregido.
- Informe familiar desktop: fechas españolas y conclusiones disponibles de Bimestre 4; se revisó el vacío de Bimestre 3. No se generó un informe nuevo. El filtro de cautela con informe suficiente se revisó en código; no había informe QA confirmado reutilizable en esta copia.
- Salto con Enter enfoca ayni-main y conserva hash; Tab siguiente a salto lleva a Hoy. Encabezados visibles del período/familia sin saltos de nivel.

33 pruebas PASS: workspace-ux-selection, annual-version-navigation, school-calendar-navigation y workflow-ui-continuity. Los hooks y guard de shell se ejecutan desde código de producción: Cancelar/Descartar, IDs ajenos, espera de carga, navegación histórica, fechas inválidas y deshacer con límite. Typecheck PASS; lint PASS sin avisos; build PASS (avisos existentes de PGlite eval, tamaño de chunks y clasificación vinext). git diff --check PASS.

No se declara lector de pantalla, auditoría completa, E2E completo, QA remoto, descarga Word nueva ni cobertura global de todos los estados vacíos. Las capturas y bases quedan fuera del commit. Los avisos de tamaño de dependencias se dejan fuera de alcance. La advertencia React durante Fast Refresh al cambiar tamaño de dependencias desaparece en F5; no pertenece a una carga nueva de la versión final.

## Diff y rollback

Diff revisado completo: componentes existentes, helper de selección, pruebas focales y documentación. Se excluye el bloque AGENTS.md generado automáticamente por Next dev; no hay archivos QA ni secretos incluidos. Sin migraciones. Rollback: revertir este commit; los parámetros de URL adicionales se ignoran en la versión anterior, y los datos pedagógicos se mantienen.

No push, deploy ni merge en esta fase.
