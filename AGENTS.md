# Reglas del proyecto Ayni Aula

Estas reglas complementan la especificación funcional y deben revisarse antes de modificar el proyecto.

## Flujo obligatorio

1. Leer `docs/PROJECT_MEMORY.md`, `docs/DECISIONS.md` y `docs/ERRORS_AND_FIXES.md`.
2. Entender la implementación existente antes de reemplazarla.
3. Diseñar el cambio mínimo, sus permisos, pruebas y rollback.
4. Implementar un flujo vertical completo antes de abrir varios módulos.
5. Ejecutar typecheck, lint, build y la prueba funcional aplicable.
6. Actualizar la documentación cuando cambie la arquitectura o aparezca un error relevante.

## Seguridad y datos

- No reutilizar las cuentas actuales de Vercel o Supabase; este proyecto usará cuentas nuevas.
- Nunca guardar claves, tokens ni secretos en el repositorio, logs o memoria de errores.
- Toda autorización de datos pedagógicos se valida en servidor y con RLS; nunca solo en la interfaz.
- Las evidencias de menores son privadas. No enviar fotos o grabaciones a IA por defecto.
- La IA no inventa observaciones ni asigna niveles finales sin confirmación docente.

## Dominio pedagógico

- CNEB es dato oficial versionado y se referencia por IDs estables.
- Evidencia observada y evaluación pedagógica son conceptos diferentes.
- Fichas, tarjetas, recortables y pictogramas son recursos de una actividad, no módulos principales.
- La actividad es la unidad cotidiana; evitar usar “sesión” como término principal.

## Calidad y publicación

- No declarar una validación que no se ejecutó.
- No desplegar sin solicitud expresa, commit identificable, working tree limpio, staging y smoke test.
- No editar migraciones aplicadas; crear una migración nueva.
- Registrar errores relevantes con síntoma, causa raíz, solución validada y prevención.
