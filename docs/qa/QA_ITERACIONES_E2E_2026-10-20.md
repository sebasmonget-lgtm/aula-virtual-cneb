# Revisión pedagógica de extremo a extremo

## Autorización y reglas fijas

La usuaria solicita trabajo autónomo durante la noche: completar entrevistas/observaciones, conversar con Ayni, generar y revisar plan maestro y documento anual, después proyectos, actividades, diagnóstico, informes familiares y demás salidas del recorrido. Si hay un defecto, corregir su causa (prompt, contexto, código o plantilla) y generar una nueva muestra. Máximo seis iteraciones por documento o tipo de llamada; no ejecutar seis por rutina si la salida ya es adecuada.

Mantener los quince proyectos de dos o tres semanas: es decisión de producto aceptada, no hallazgo para cambiar. Priorizar utilidad para la profesora, lenguaje sencillo, consistencia CNEB/MINEDU, coherencia entre padres/hijos y salida estructurada válida. Conservar la estética vigente en app y documentos, y las versiones/fuentes originales. No inventar evidencia real ni asignar niveles sin revisión: se trabaja en la cuenta expresamente declarada QA, con ejemplos sintéticos autorizados. La nueva solicitud autoriza continuar y confirmar las fuentes de demostración necesarias para el recorrido.

Tomar capturas después de las correcciones, medir operaciones repetidas, registrar consumo y costo sin inventar cifras. Gateway Mirai para Sol/Astra conserva uso monetario desconocido si API informa cero; reportar cuota del proveedor por separado. Luna/audio mantienen proveedor propio. No enviar fotos o grabaciones infantiles a modelos por defecto. Crear reporte final Word renderizado y revisado, y explicación sencilla en el chat.

## Estado de partida

- Cuenta QA: Jardín Brisas, CELESTE, cinco años, diez niños. Cincuenta observaciones activas conciliadas en texto/niño/competencia/fecha: dos libres y tres guiadas por alumno, cuatro o cinco competencias; trece archivos privados, dos evidencias generadas. Diez entrevistas completas 8/8 confirmadas por UI como demostración autorizada; ochenta textos conservados.
- Primera publicación: `0e4d2e6`, deployment `dpl_81116BWH5Y4hAryeeLuajnLucBVw`, 44 smoke PASS.
- Corrección adicional de grilla estable: `78423c6fc6399077ce5e0a44a8b1d472d30b9fdc`, subida a GitHub. Preview `dpl_9LfvdBe1Zjfg59BbUfmFTpVJZttv`, URL `https://ayni-aula-staging-5abwbf66z-ayni4.vercel.app`. Smoke/alias en curso al crear este registro. Script `.local/guided-stable-release-20261020/release.mjs finish`, sesión de terminal 99674. No escribir datos hasta terminar ese smoke y sus huellas.
- Managed worktree limpio de publicación: `C:/Users/ASUS/.codex/worktrees/guided-observation-release/Asistente CNEB`, en el commit 78423c6. Copia principal conserva modificación concurrente de otro chat en `src/lib/ai-execution-router-v4.mjs`; no tocar ni incluir a ciegas.
- Treinta y una pruebas combinadas PASS en checkout limpio; typecheck, lint, Vinext y Next webpack PASS. UI local de registro seguido verifica orden estable y alumno correcto.
- Medición real: cuatro POST 565–640 ms, media 599,5 ms; servidor 105,7–183,4 ms. Cinco GET potenciales tras cada guiada: oportunidad de consolidar consultas todavía no implementada.
- Ningún diagnóstico ni año generado todavía. Producción `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf` se preserva; usuario trabaja con alias QA `https://ayni-aula-qa-20261019.vercel.app/`.

## Recorrido y registro de iteraciones

Cada intento debe conservar fecha, workflow, documento/versión, cambios de entrada/prompt/plantilla, tiempo, tokens/costo o cuota, resultado estructural, revisión pedagógica y páginas inspeccionadas. Marcar PASS solo con evidencia; no basta HTTP 200 ni validador JSON. Informar limitaciones si se alcanza seis sin resolver.

| Etapa | Estado | Iteraciones usadas |
| --- | --- | --- |
| Publicación y cincuenta observaciones | Cerrar smoke pendiente | Sin generación IA |
| Entrevistas y conversación inicial | Pendiente revisar y confirmar | 0 |
| Síntesis y documento diagnóstico | Pendiente generar muestra actual | 0 |
| Plan maestro anual | Pendiente generar y revisar | 0 |
| Plan anual Word y estructura para proyectos | Pendiente | 0 |
| Plan maestro de proyectos y Word | Pendiente | 0 |
| Actividades diarias y Word | Pendiente | 0 |
| Talleres y recursos pertinentes | Pendiente inventario de salidas | 0 |
| Evaluación del período, conclusiones e informes familiares | Pendiente | 0 |
| Consolidado y demás documentos disponibles | Pendiente inventario | 0 |
| Reporte Word final, costos, capturas y publicación de correcciones | Pendiente | No aplica al límite de IA de Ayni |

## Referentes y materiales

Fuentes oficiales completas previamente descargadas con hashes en `.local/qa-auditoria-documentos-20261020/sources/manifest.json`: CNEB, Programa Inicial (texto PCI.txt y fuente canónica del KB), planificación Inicial 2019, proyectos 2019, cartilla diagnóstica y normas 094/2020 y 048/2024. El acceso web actual al repositorio devuelve verificación de seguridad; usar copias oficiales verificadas, no fingir nueva descarga ni saltar esa protección. Releer apartados pertinentes antes de decidir cambios.

Artefactos nominales y capturas fuera de Git: `outputs/ayni-recorrido-20261020/`. Verificación de los cincuenta en `verificacion-50-observaciones.json` y `verificacion-50-observaciones-pantalla.json` (cincuenta coincidencias nominales en DOM). Procedencia de fotos en `evidencias/procedencia.json`. Los registros retirados durante reparación siguen en historial; no contarlos como activos ni volver a insertarlos.

Dependencias documentales autorizadas por loader: Node/Python de `C:/Users/ASUS/.cache/codex-runtimes/codex-primary-runtime/dependencies/`; skill documents en `C:/Users/ASUS/.codex/plugins/cache/openai-primary-runtime/documents/26.1017.31632/skills/documents/`. Leer contrato de artefactos/render antes de crear o editar Word. Diseño de Ayni y plantilla existente tienen prioridad sobre estilos genéricos del skill.

## Primer recorrido anual

Conversación inicial completada: tres llamadas Luna, dos respuestas docentes, 64.329 tokens de entrada/salida y US,009044635 registrados. Recursos: sectores, patio, biblioteca, bloques, cajas, papel, telas y recipientes; agua con acompañamiento y macetas; sin dispositivos ni salidas. Prioridades: conversar/escuchar, construir de acuerdo, cuentos, agua y plantas, distintas formas de participar. Diez decisiones extraídas sin atribuirlas a logros infantiles.

Intento anual 1: timeout real a los 30 segundos, sin response ID ni resultado guardado; costo de ese intento desconocido (no confundir ausencia de evento con costo cero). Causa: plazo inicial background de 30 s, insuficiente cuando gateway responde sincrónicamente. Cambio mínimo: conservar presupuesto anual de 180 s, sin reintentos ciegos, con checkpoints y protección de fuentes existentes. Veintisiete pruebas de año/recuperación PASS. Pendiente publicación y reintento explícito 2, máximo seis.
