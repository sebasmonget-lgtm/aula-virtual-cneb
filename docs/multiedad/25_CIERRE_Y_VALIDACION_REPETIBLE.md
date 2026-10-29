# Cierre local y validación repetible

25 de octubre de 2026. Continúa la rama local de Unidocencia. Sin publicación ni cambios remotos.

## Informes históricos en Documentos

La consulta anterior solo entregaba los informes activos y la pantalla fijaba su versión en 1. Aunque las descargas antiguas seguían disponibles por ID, faltaba encontrarlas después de una corrección.

El workspace V2 incorpora `reportHistory`, una proyección de informes activos y archivados con su versión real, período, edad, texto e identidad conservada. Usa el mismo resolver de identidad que el Word, incluido el snapshot que protege los informes anteriores a la corrección de matrícula. Documentos los muestra en las carpetas existentes de Ayni, con «Versión anterior» cuando corresponde. El lector muestra la edad del informe, aunque posteriormente se haya corregido el grupo del niño.

`reports` conserva su contrato de informes activos para Evaluar. Un informe archivado no vuelve a participar en decisiones actuales. La consulta valida propiedad del aula/año en servidor y no escribe filas. No hay migración, cambios de datos, regeneración de documentos ni cambios V1. Para revertir esta presentación se puede retirar la proyección y su consumo; conservar todos los registros y snapshots.

Las regresiones de corrección local y del esquema Supabase temporal verifican una versión 1 de 3 años y una nueva versión 2 de 4 años con identidad corregida. La prueba HTTP comprueba seis informes navegables —tres actuales y tres anteriores— tras reiniciar y vuelve a comparar los Word originales. Esto comprueba servicios, API y archivos; no sustituye una prueba de clics.

## Un solo comando de comprobación

```powershell
npm run check:multiedad:local
```

`scripts/check-multi-age-local.mjs` ejecuta todos los archivos `multi-age*.test.mjs` de servicios y API, paridad de esquema y regresiones V1 de observación, atribución, evaluación, cierre, continuidad y onboarding. Después ejecuta TypeScript, ESLint y build con las dependencias nativas instaladas de la aplicación. Un fallo detiene los pasos restantes y devuelve salida distinta de cero.

Cada ejecución escribe logs y recibo en una carpeta nueva dentro de `.local/multi-age-readiness/`. El runner no carga `.env` ni transmite credenciales del entorno de la consola; los casos de prueba usan proveedores simulados, sus propios almacenes ficticios y puertos de API. No consultan el preview existente ni publican. El entorno inicial de cada proceso hijo contiene únicamente variables del sistema operativo y modo de prueba, sin `NODE_OPTIONS` ni las claves/URLs de la consola. El build sigue el perfil local ya configurado y la carga de configuración propia del framework; no equivale a una conexión o aplicación de migraciones remotas.

El recibo registra únicamente comprobaciones locales. La revisión interactiva desktop/móvil y Auth/RLS en staging con cuentas nuevas permanecen como gates separados y no pueden convertirse en PASS por compilar o simular claims SQL.

## Estado de la revisión visual y límites

En esta ronda el inventario del navegador estuvo disponible, pero el intento de acceder a `http://127.0.0.1:5175/` fue rechazado por la política de seguridad del navegador. No se intentó evadir el bloqueo mediante otra superficie o automatización. El detector estático de la superficie modificada no reportó hallazgos; esto tampoco certifica clics, foco, gestos ni disposición móvil.

La versión sigue limitada a desarrollo local y datos ficticios. Para probar Auth/RLS y operación remota hace falta una integración de staging expresamente habilitada con cuentas nuevas: el servidor V2 actual rechaza producción y proveedores remotos deliberadamente. Tener migraciones Supabase y pruebas SQL temporales no equivale a esa integración ni a autorización de despliegue. Se conservan los límites funcionales del entregable 24.

La batería de esta ronda terminó con **216 pruebas PASS, cero fallos**: los 29 archivos V2 y siete archivos adicionales de compatibilidad/paridad. TypeScript, lint y build también terminaron con salida cero. Lint conserva una advertencia anterior en `diagnostic-generation-control.tsx`; build conserva los avisos previos de PGlite, tamaño de chunks y clasificación de rutas de Vinext. El detector estático de `multi-age-workspace.tsx` devolvió una lista vacía.

El preview se reinició en el mismo almacén local separado. La comparación conserva todos sus valores anteriores —incluidas fuentes, notas y referencias—, sus catorce documentos y la huella anual. Mantiene tres niños, dos proyectos, cuatro actividades y tres informes familiares vigentes. El único dato nuevo es `reportHistory`, derivado de los informes existentes sin escritura. Evidencia en `.local/multi-age-final-20261025/preview-preservation.json`; logs de la batería en `.local/multi-age-readiness/2026-10-25T15-14-34.467Z-7859fa59/`.

Durante el cierre, el chat «Crear variante de Ayni generadora» modificó componentes compartidos y el enrutado de modalidad en este mismo checkout. Se conservaron sus cambios. Una comprobación intermedia detectó errores de tipos mientras esa edición estaba en curso; tras sus correcciones, TypeScript, lint y build integrados pasaron. También se repitieron las ocho pruebas de API de entrada V1/V2 y correcciones/historial, todas PASS; son repeticiones, no ocho pruebas distintas adicionales. Evidencias `typecheck-integrated.log`, `lint-integrated.log`, `build-integrated.log` y `api-integrated.log` en `.local/multi-age-final-20261025/`. Los formatos y el recorrido nuevos de esa otra tarea requieren su propia validación; no forman parte de la certificación funcional de esta ronda de Unidocencia.
