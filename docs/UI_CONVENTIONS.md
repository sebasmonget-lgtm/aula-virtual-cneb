# Convenciones de interfaz

- Mantener la jerarquía `título → contexto → acción principal → contenido`. Usar `PageIntro` para la cabecera de un área y `.ayni-panel` para contenido agrupado.
- Usar `WorkflowTabs` para secciones: una sola fila, desplazamiento horizontal en anchos estrechos, tab activo visible y navegación con flechas, Inicio y Fin.
- Usar `AsyncButton` en generar, guardar y confirmar. El texto de espera debe decir qué ocurre, sin porcentajes inventados. Deshabilitar acciones duplicadas mientras se espera.
- Mostrar consultas largas con `LoadingState` o `ScreenSkeleton`; resultados con `WorkflowFeedback` persistente. Usar mensajes comprensibles para docentes.
- Usar `EmptyState` cuando falten registros e indicar el siguiente paso. Los registros confirmados se presentan con `ReadOnlyField` cuando sea posible.
- Una tarjeta seleccionable debe tener estados normal, hover, foco y seleccionado; indicar la selección también con borde, marca o texto. Los controles inactivos no llevan cursor de acción.
- Comprobar 320–390 px, tablet y escritorio. Respetar `prefers-reduced-motion` y dejar espacio para la navegación inferior y el área segura del móvil.
