# Reloj oculto para la cuenta de pruebas · 2026-10-22

Solicitud expresa: habilitar en el enlace público un reloj de pruebas oculto, accesible con Ctrl + Alt + L. La usuaria identifica la cuenta docente Marcelo y confirma su identidad con la captura de administración. El permiso queda limitado a su identificador de cuenta en configuración privada de servidor; no se guarda el DNI en el repositorio.

## Cambio mínimo y alcance

- Producción exige opt-in independiente `AYNI_QA_PRODUCTION_CLOCK=1`, un único `AYNI_QA_PRODUCTION_TEACHER_ID` válido y clave de firma; la autorización Preview anterior sigue separada. Otras cuentas y roles reciben 404, incluso con cookie copiada. El atajo no concede permisos.
- El panel comienza oculto en cada carga. Ctrl + Alt + L alterna su visibilidad; Ctrl + Alt + Q deja de hacerlo. Ocultar no detiene una simulación ya aplicada.
- Entrar en producción sin cookie válida conserva el tiempo real, sin trasladar automáticamente al inicio de pruebas de Preview. La API informa fecha real disponible pero inactiva y el cliente no congela su reloj.
- Aplicar conserva la cookie firmada HttpOnly/Secure/SameSite y el contexto pedagógico aislado por petición/cuenta y tareas. Autenticación, facturación, leases y auditoría mantienen sus relojes reales.
- Restablecer reloj elimina la cookie: producción vuelve al tiempo real y Preview a su inicio de prueba existente. No cambia las fechas de registros guardados. Simulación limitada a fechas válidas de 2026.
- No se aplican migraciones ni se transforman observaciones, notas o documentos. Las escrituras pedagógicas posteriores que haga la persona de QA sí conservarán las fechas simuladas; usar solo datos ficticios en esa cuenta.

## Pruebas previas al despliegue

Typecheck PASS; lint cero errores y una advertencia previa en diagnostic-generation-control.tsx:28; build Vinext PASS con advertencias existentes PGlite/bundles; detector de la interfaz `[]`.

12 pruebas PASS en preview-qa-clock.test.mjs, auth-http.test.mjs y project-preparation-http.test.mjs. Incluyen opt-in producción separado, cuenta/rol/clave inválidos, firma y manipulación, cookie copiada, reset con Origin requerido, continuidad de Preview, cambio de día Lima y aislamiento de tareas/peticiones. HTTP de producción antes de onboarding aplica/restaura sin crear configuración pedagógica y rechaza GET/PUT/DELETE de otra cuenta.

Navegador con QAClockControl real y API sintética aislada: oculto inicial, atajo nuevo visible, fecha aplicada recuperada tras recarga pero panel oculto, atajo antiguo sin efecto, restablecer y cuenta denegada sin panel. Captura privada `output/reloj-qa-20261022/panel-prueba-local.png`. El llenado programático del campo fecha cambió su DOM sin notificar a React; se completó la prueba mediante entrada nativa de teclado. No es evidencia de un fallo de edición manual del producto.

## Publicación y reversión

Publicar únicamente desde commit identificable y checkout limpio, primero candidata con configuración de producción y después alias público tras smoke. Repetir guardas de cuenta y verificar fechas/cookie y conservación de fuentes; no crear datos pedagógicos en Marcelo para probar el reloj. Recibos privados en `.local/clock-production-20261022/`. Al escribir este commit, la publicación sigue pendiente; agregar el recibo final después de comprobarla.

Rollback: promover `dpl_GwkzJBptxKv24SM2cRaNjhj3MRTY` (revisión anterior del mismo día, sin reloj de producción). No requiere restauración de datos. Deshabilitar el opt-in o retirar la cuenta permitida hace que cookies anteriores sean ignoradas. Un nuevo despliegue necesita volver a especificar estas variables privadas si se mantiene esta capacidad; no basta el push Git.


### Robustez de la consulta auxiliar

La candidata inicial pasó 53 comprobaciones generales y 25 específicas del reloj. Antes de promover se endurece el cliente: un error de red/servidor al consultar el reloj no sustituye la pantalla de trabajo; se mantiene el reloj deshabilitado hasta recargar. Verificado en navegador con respuesta 500, conservando el contenido y sin panel. Se vuelve a compilar y publicar una candidata del commit final; el recibo inicial no acredita ese nuevo commit.
