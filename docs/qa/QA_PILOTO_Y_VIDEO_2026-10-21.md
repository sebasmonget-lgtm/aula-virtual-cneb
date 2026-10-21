# Candidata para piloto interno y video · 21 de octubre de 2026

## Estado de la candidata

https://ayni-aula-piloto-20261021.vercel.app/ · commit `46a918f46536759f16184c27521799fcfc9f238a` · Preview `dpl_GEHfLmemBk3mh6EXgHejERxFmvLr`, gru1, desde checkout limpio. Misma aplicación que el QA móvil aprobado; esta ronda no modifica código de aplicación, prompts, modelos, plantillas ni datos pedagógicos del aula original. No llama a IA. El reloj de QA está desactivado en servidor/cliente; GET y PUT de `/api/qa/clock` devuelven 404. QA anterior y Producción conservan sus deployments.

**Candidata para ensayo interno, todavía no entorno externo separado.** Comparte la base aislada de QA (`lqrkhdjdxcejyamzrwoi`). La protección de Preview en Vercel sigue activa: solicitud sin autorización recibe 302 hacia Vercel SSO. El navegador autorizado sí muestra el acceso de Ayni, capturado en `piloto-acceso.jpg`. Los checks automatizados usan el acceso de automatización existente además de Auth de Ayni; no se debilitan protecciones. Antes de invitar docentes externas hay que resolver su acceso y separar datos/configuración del piloto respecto de QA. Celular físico queda para probar con la usuaria.

## Validaciones nuevas ejecutadas

- **149 comprobaciones de aislamiento**, dos identidades reales de Supabase Auth: profesora original y una cuenta adicional de QA sin privilegios administrativos. Lecturas/escrituras cruzadas rechazadas; lectura propia válida. **66 tablas** consultadas bajo rol authenticated y claims de la segunda docente: cero filas ajenas o acceso sin privilegio. PostgREST propio, ajeno y escritura directa también probados.
- **13 archivos privados**: accesos público y de otra docente rechazados. Las fotos de `ayni-observation-media` se leen por la ruta autorizada de servidor; deliberadamente no mediante lectura directa del cliente, incluso propietario. Ninguna política se relaja para hacer pasar la prueba.
- **92 comprobaciones de release** en Preview/alias: login, assets, sesión, fuentes, calendario, documentos, tres descargas Word con estructura ZIP, reloj desactivado, datos propios/ajenos, cache privado y origen ajeno. Renovación real cloud mediante cookies firmadas, flags HttpOnly/Secure/SameSite, firma alterada rechazada; logout de la cuenta adicional borra tres cookies y revoca refresh.
- **14 pruebas automatizadas de autenticación/autorización/medios privados** y **65 de evaluación/cierre/recorrido integrado**, PASS. Incluyen casos positivos y guardas de cierre. No se confirma un nuevo cierre en el aula original.
- Typecheck y build canónico Vinext PASS. Lint sin errores y **una advertencia existente** de dependencia compleja de useEffect en `diagnostic-generation-control.tsx:28`; no se agrega una refactorización a la preparación del piloto.
- Hashes finales de **66 tablas del alcance de la profesora original** coinciden, incluido consumo IA. Sus diez niños/documentos siguen intactos. Una cuenta/aula adicional con una niña sintética se usa exclusivamente para aislamiento, sin correos ni cambios de contraseña de la profesora original.

No son pruebas masivas de carga real, una auditoría integral de seguridad, una recertificación pedagógica de todas las salidas ni una repetición de generaciones. Se conservan los resultados y límites de auditorías anteriores.

## Recuperación

Snapshot privado consistente, de solo lectura, de **86 tablas / 770 filas** y **13 archivos**, antes de crear la segunda cuenta. Restauración en PGlite aislado y carpeta local: todos los hashes coinciden. Las tablas Auth/Storage se representan localmente; **no se restauran ni prueban los servicios cloud**, sesiones del proveedor o una política de backups automáticos. Backups/credenciales permanecen en `.local`, fuera de Git y de la entrega.

El arnés necesitó representar un enum Storage del proveedor en el esquema local y fijar UTC conservando microsegundos para comparar timestamps. El resultado final coincide; los intentos previos eran ajustes del arnés, no defectos de Ayni. La comparación final de 0,754 s corresponde a una copia ya cargada, no al tiempo total de recuperación. Restauración cloud y política operativa quedan para el entorno externo.

## Video y capturas

Entrega en `outputs/Ayni-piloto-y-video-2026-10-21`: tutorial **2:31**, presentación **0:42**, 1920×1080 H.264/AAC, narración sintética local en español, subtítulos integrados y SRT editables. Montaje de catorce capturas, no grabación continua clic por clic ni representación de tiempos reales de generación. `capitulos-y-capturas.json` conserva tiempos/originales. Aviso visible: «Demostración con datos e imágenes generados».

Cobertura: aula/niños, entrevistas y **dictado en español**, observaciones libres/guiadas con foto relacionada, diagnóstico con fechas, chat directo, anual, proyecto desarrollado, actividad, observaciones desde Hoy, evaluación docente, informe familiar y consolidado previo al cierre. Nuevos originales `016a` proyecto y `016b` revisión de cierre.

**La toma de cierre muestra pendientes y el botón deshabilitado, no una confirmación completada.** Hay 90 pares niño–competencia pendientes para el cierre anual actual; no se inventan notas para obtener la toma. Los cierres positivos están cubiertos en pruebas automatizadas, no en esta captura. Las vistas de celular son de navegador redimensionado: no acreditan cámara/micrófono en movimiento, teclado virtual o gestos físicos.

Para encuadrar el contenido vigente se recortan márgenes técnicos QA y un pie obsoleto de una captura histórica; no se cambian valores ni simulan resultados. Pantallas retiradas de síntesis y versiones con errores conocidos quedan excluidas. Revisión final de imágenes/subtítulos, pistas, duración y decodificación completa junto al entregable.

## Tiempos y costos

Mediciones por operación (algunas en paralelo), no duración total sumable:

| Operación | Segundos | Resultado |
| --- | ---: | --- |
| Auth/autorización automatizada, 14 pruebas | 20,318 | PASS |
| Aislamiento real, ejecución final | 59,055 | PASS |
| Evaluación/cierre, 65 pruebas | 76,536 | PASS |
| Typecheck | 17,787 | PASS |
| Lint | 38,075 | 0 errores / 1 advertencia |
| Build Vinext | 27,325 | PASS |
| Despliegue Preview | 82,685 | PASS |
| Smoke/alias, ejecución final | 73,906 | PASS |
| Snapshot/restauración, primer arnés | 35,811 | Ajustar enum local |
| Snapshot/restauración, segundo arnés | 34,065 | Corregir comparación temporal |
| Comparación final de copia ya cargada | 0,754 | PASS |

CSV de entrega incluye también ejecuciones previas del arnés de aislamiento y primer smoke (ruta incorrecta del inventario de aliases). Se corrigen scripts privados de comprobación, sin cambiar permisos o aplicación. No confundir reintentos del arnés con fallos del producto.

Costo IA nuevo **USD 0**, cero generaciones; voz sintetizada localmente. Acumulado previo conservado: **USD 2,63755482 por 111 llamadas con precio y siete intentos históricos sin precio**. No equivale a costo cloud total cero.

## Reversión y pendientes externos

La candidata tiene alias propio: para retirarla, desvincularlo o apuntarlo a otra candidata identificada y verificada. No mover Producción ni QA. Sin migraciones ni código/datos pedagógicos originales que revertir en esta ronda. La cuenta adicional es solo QA.

Antes del piloto externo: separar datos/configuración de QA, resolver acceso de docentes, ensayar backups/recuperación del entorno destinado al piloto y probar celular físico con la usuaria (Android/iOS, cámara, micrófono, teclado, descarga/compartir). Iniciar con grupo pequeño y seguimiento de errores, tiempos y consumo. No afirmar disponibilidad pública, capacidad masiva o ausencia de errores futuros.
