# Recuperar propuestas, observar y tomar asistencia — Preview

Fecha: 14 octubre 2026. Base: 0982f27 / eee87d3. Rama codex/mi-ano-simple-preview.

## Alcance

Biblioteca recupera una propuesta para los días disponibles del mismo tramo, conservando todo lo trabajado. El criterio de Hoy vuelve a ofrecer registro guiado antes de iniciar; libre permanece separada. Asistencia opcional al inicio, con fecha corregida y estados recuperados. Evaluar, Calendario y Documentos mantienen navegación/datos con fondos e ilustraciones existentes. Las actividades canceladas no inflan el conteo del calendario.

No hay migraciones, nuevas cuentas, cambios de motor pedagógico ni QA con datos reales. Producción no autorizada.

## Validación ejecutada

- 100 pruebas distintas PASS: annual-year-editor, project-slot-replacement, complete-project-preparation, activity-today-execution, ordinary-observation-service, annual-proposal-preview, annual-journey, period-evaluation, school-calendar-service y school-calendar-navigation. La fixture del chat se adecuó al contrato previo de dos competencias; no se debilitó ese requisito.
- Control de restauración/taller vinculado repetido tras ampliar su protección; PASS. Typecheck, lint y Next build --webpack; resultados privados en .local/restore-attendance-20261014.
- Aula aislada PGlite, 35 alumnos ficticios. UI recuperó Agua desde Biblioteca aun con tres días protegidos; calendario excluyó 20, 21 y 22 octubre. Preparación y publicación: siete actividades, job succeeded/approved_at; tres actividades anteriores activas con sus registros y fechas conservados. Una estaba observada sin ejecución: no se inició por guardar la observación.
- Segunda recuperación y confirmación independiente del año: prepared_current=false para la preparación antigua. No se reutiliza como una preparación nueva.
- UI guardó observación guiada desde el criterio sin iniciar. Captura conserva selector nominal/búsqueda, cámara/archivo privado y acceso libre. No se probó dictado ni cámara física en esta ronda.
- UI guardó asistencia de 35 alumnos y recuperó la falta del primero al reabrir; no altera notas ni observaciones.
- Word de la actividad histórica con observación: descarga HTTP 200 y DOCX conservado; bytes en vertical.json. No se declara una nueva revisión visual del Word.
- Navegación escritorio y móvil 390×844: Hoy, Evaluar, Calendario, Documentos/carpetas y guía/criterio. Anchos de documento <= viewport. No se cambiaron niveles ni se ejecutó IA pagada.

## Capturas locales con datos ficticios

Ruta absoluta de artefactos: C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.local/restore-attendance-20261014/

- restored-desktop.jpg y restore-calendar.jpg: recuperación y disponibilidad protegida.
- criterion-desktop.jpg, criterion-mobile.jpg y observation-mobile.jpg: criterio con CTA y captura nominal.
- today-mobile.jpg: asistencia opcional.
- evaluate-desktop.jpg / evaluate-mobile.jpg: evaluación.
- calendar-desktop.jpg / calendar-mobile.jpg: calendario.
- documents-desktop.jpg / documents-mobile.jpg: carpetas.

## Publicación y rollback

Pendiente recibo del nuevo Preview y SHA del producto. Smoke cloud limitado a recursos públicos y rechazo 401 sin sesión; sin escrituras pedagógicas cloud. QA autenticado con proveedor real pendiente.
Rollback de código: 0982f27. Los registros y versiones no requieren rollback ni migraciones. Producción debe conservar dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf / 9a0920230350cd6b9050f35683a1f35d459e78c7.
