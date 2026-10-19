# Preparación de publicación de las correcciones — 19 de octubre de 2026

## Alcance y procedencia

Rama `codex/qa-corrections-20261019`, base `d0260f43fd46e63951bc0edeb67706f48cf7ec8b`. Se comprobó el remoto: `origin/main` es ancestro de esta base; no se sustituyó el trabajo reciente por la rama antigua. La publicación solicitada es exclusivamente Preview. El recibo posterior de Vercel debe identificar SHA, URL, estado READY y smoke real antes de anunciar éxito.

Incluye las correcciones documentadas en IMPLEMENTACION_CORRECCIONES_QA_2026-10-19, QA_CORRECCIONES_PEDAGOGICAS_2026-10-19 y QA_DESEMPENOS_OFICIALES_2026-10-19: contexto docente, preparación recuperable/paralela, progreso estimado, guía práctica y Word, criterios múltiples y desempeños oficiales versionados. No habilita edición individual de actividades confirmadas ni modifica valoraciones/evidencias históricas.

## Aislamiento y conservación

La comprobación detectó que Preview y Producción compartían conexión Supabase y que faltaba la nueva cola. Se preparó un proyecto independiente, dentro de la misma cuenta y una organización gratuita, según autorización previa. No se cambió la conexión ni se escribió en la base original.

- Proyecto QA: `lqrkhdjdxcejyamzrwoi`, «Ayni QA 20261019».
- 77 migraciones aplicadas en la base nueva, incluida `202610190001_isolated_preparation_queue.sql`.
- Copia acotada de la cuenta QA: una identidad Auth, diez alumnos, 704 filas en 81 tablas, once archivos privados. Filas iguales al origen y bytes de todos los archivos con SHA-256 idéntico.
- Sin otras cuentas ni sesiones copiadas, sin correos enviados y sin cambio de contraseña.
- Auth real: UUID conservado y rol docente. RLS: matrícula propia 10, ajena 0; cola propia 1/ajena 0 y escritura de cliente denegada. El registro de prueba de cola se revirtió y la cola quedó vacía.
- Configuración exclusiva del despliegue Preview. El proyecto Vercel no tiene repositorio conectado, por lo que no admite variables por rama. No se cambian las variables generales ni los aliases de Producción o la Preview anterior.

Los registros exportados, sesiones, credenciales y comprobantes detallados permanecen en `.local/`, excluida de Git y del envío a Vercel. Los informes públicos de QA omiten el nombre real de la docente y los apellidos personales usados como ejemplo; los registros canónicos no se cambian.

## Verificación previa al commit

- 155 regresiones PASS en la ampliación curricular anterior; 134/134 párrafos oficiales comparados con la fuente fijada.
- 95 regresiones adicionales PASS: contexto anual, entrevista, recorridos, recuperación, preparación y proveedor.
- Typecheck, lint y build real Next.js 16.3.4 (`next build --webpack`) PASS. Build Vinext previo PASS.
- Word: revisión visual previa de las doce páginas de la muestra final de proyecto/actividad. No se repite una generación pagada para publicar.
- Acumulado estimado de IA USD 4,75075397 de 5; esta publicación no hace llamadas pagadas.

Los grupos de regresiones pueden solaparse; no se presentan como 250 casos independientes. Estas pruebas no certifican todo el recorrido anual ni todas las futuras respuestas de IA. El smoke remoto y la procedencia se comprueban después del despliegue; no se declaran ejecutados en este informe previo.

## Rollback

Mantener accesible la Preview anterior `https://ayni-aula-staging-5t9tbxosy-ayni4.vercel.app/`, con su base y registros originales. No eliminar la base QA nueva ni sus registros posteriores. Volver el alias QA solo a una versión compatible con su esquema/lectura de desempeños y revisar trabajos pendientes antes de cambiar el ejecutor. La reversión de UI no restaura bases ni reescribe datos históricos. Producción conserva el despliegue `dpl_H19YWzRdGjkgh8y72QAd1qBty7Mf`, SHA `9a0920230350cd6b9050f35683a1f35d459e78c7`.
