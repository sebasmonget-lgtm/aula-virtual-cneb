# QA · recorrido inicial V2 · 2026-10-03

Base consolidada y remoto: 055c77e. Fetch inicial y de cierre sin nuevos commits en origin/codex/annual-year-map. Se preservó y completó el trabajo parcial local del snapshot y personalización.

## Comprobaciones ejecutadas

- Suite focal final de 87 pruebas PASS, incluida la reparación determinística y las 13 pruebas del módulo V2.
- `npx tsc --noEmit`, `npm run lint`, `npm run build`: PASS. El build muestra advertencias existentes de eval en PGlite, chunks grandes y clasificación estática de rutas de vinext; no hubo errores de compilación.
- `git diff --check`: PASS.
- Detector impeccable sobre las tres superficies principales: `[]` (sin incidencias reportadas). No se interpreta como evaluación de calidad pedagógica.

Suite focal: annual-journey, annual-personalization-service, diagnostic-sources-v4, family-interview-redesign, annual-plan-calendar, school-calendar-service, document-word-export, annual-preplan-service, planning-journey, ai-execution-router-v4 y bimester-replan-service.

Casos V2: regresión Astra 172/172; feriados interiores lunes/viernes y excepción institucional; gestión; calendario imposible sin saltos; negaciones, otro, Shipibo-konibo y contradicciones; ocho registros de un niño sin generalización; observación guiada/libre; avance/acompañamiento/ambigüedad y ausencia; cobertura recurrente; IDs nominales rechazados; mensajes sin IA; aplicación contextual y global; integridad manipulada rechazada; refresh sin regenerar; reparación semántica fallida acotada; reparación determinística de una fila; proveedor fallido con preparación preservada; permisos ajenos; revisión stale/CAS; movimiento sin IA; confirmación; contenido Word idéntico en dos exportaciones; copia con activo preservado; propuestas pasadas protegidas y observaciones ordinarias sin competencia inventada.

## Navegador real

Navegación con CUA en localhost:5175, API en 8789, base PGlite nueva en .local/annual-journey-qa-db. Dos niños ficticios, docente e institución ficticias. Proveedor HTTP local simulado; ninguna llamada de pago. No se utilizó la base habitual ni cuentas Supabase/Vercel.

1. Familias mostró seis preguntas. Se guardó una sola respuesta con negación sin completar las restantes.
2. Observar abrió espontánea por defecto. Se guardó una actuación de juego libre sin seleccionar competencia ni nivel.
3. Se avanzó con una observación pendiente de clasificación, sin síntesis, prioridades o confirmación por niño.
4. Mi año mostró reportes, registro, explicación de información desconocida, negación y lengua reportada. Se aportaron ideas docentes opcionales.
5. Preparar creó doce tarjetas y permitió consultar los detalles.
6. Dos indicaciones sobre una tarjeta se guardaron sin regeneración. La actualización explícita de fuentes añadió una intención global; se aplicó el lote y solo se reemplazó una tarjeta, conservando once.
7. Bajar una propuesta cambió el orden sin modelo y el detalle mostró 172/172, cero huecos/solapamientos.
8. Confirmar mostró V1 vigente; se descargó el Word desde el enlace real.

La comprobación HTTP posterior verificó que la versión del calendario y las 172 fechas de la API coinciden con las asignaciones del año confirmado. También comparó el XML pedagógico del Word descargado desde la interfaz con una segunda exportación del mismo plan: contenido idéntico.

La descarga ficticia quedó en Downloads/plan-anual-2026-fd9b9c0b.docx. Evidencia visual local ignorada: .local/annual-journey-confirmed-qa.png. Los nombres/títulos genéricos del proveedor simulado prueban el transporte y los estados; no representan una validación pedagógica del modelo real. Las versiones y elecciones se conservaron en el hash. No se probaron micrófono/cámara ni se enviaron grabaciones.

## Límites y siguiente verificación

No se realizó prueba de proveedor real, evaluación con profesoras, staging, despliegue ni RLS en un servidor Supabase remoto. Permanecen las políticas existentes y se verificó autorización de servidor en PostgreSQL local y regresiones. Falta probar calidad semántica/costo/latencia con casos anonimizados y revisión experta, dictado con consentimiento explícito y smoke de staging antes de publicar. El calendario exige las restricciones de ventanas de dos/tres semanas y límites lectivos lunes/viernes; incompatibilidades se notifican y no se ocultan.
