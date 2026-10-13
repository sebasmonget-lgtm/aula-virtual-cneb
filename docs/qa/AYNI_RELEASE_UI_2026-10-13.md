# Publicación de cambios de interfaz — 2026-10-13

Solicitud expresa: «sube estos ultimos cambios a vercel produciony haz commit en github».

## Código y destino

- Rama GitHub: `codex/observaciones-inicial-qa`, subida sin force ni merge de main.
- SHA publicado: `3be0385ac947eea8813b17b3e496d7b59cac4d98`.
- Cambios incluidos: `2f2b9e4` lista compacta/iconos/colores por competencia; `cc9db0d` fondos compartidos y recuadro de criterio; `3be0385` pasos 1–4/checks clickeables con guards y flush existentes.
- Proyecto Vercel: `prj_3GOhE5KykLKbhuULD5rAeXpfbEko` (ayni-aula-staging), equipo ayni4. Enlace del directorio e identidad comprobados con CLI.
- Árbol limpio al crear Preview y Production; builds cloud Next webpack completos.

## Recibos

| Fase | Deployment | URL | Resultado |
| --- | --- | --- | --- |
| Preview | `dpl_6AZFy7KRkssw8oeFfwCVpsaWiay8` | https://ayni-aula-staging-e8bd52l8n-ayni4.vercel.app | READY, SHA correcto, 10 smoke PASS |
| Producción sin dominios | `dpl_9vLYaDxmqZrfrCntrTQEFgGg3Cmw` | https://ayni-aula-staging-ooxk5sozm-ayni4.vercel.app | READY, target production, SHA correcto, 10 smoke PASS antes de promover |
| Producción promovida | `dpl_9vLYaDxmqZrfrCntrTQEFgGg3Cmw` | https://project-0w0pq.vercel.app | Alias/proyecto/SHA comprobados; 10 smoke finales PASS |

Promoción del mismo build Production, sin reconstrucción. El proyecto y el dominio estable resolvieron el mismo deployment al finalizar.

## Alcance de validación

Cada smoke comprobó página inicial, SVG compacto de motricidad, nube guiada WebP, ilustración de movimiento WebP, health y configuración de auth (200), y sesión/setup/status entrevistas/POST observación sin sesión (401). Treinta controles remotos PASS. No se creó evidencia ni se alteraron alumnos, entrevistas, relojes, migraciones, variables o permisos.

Validación local del mismo código ejecutada antes de esta solicitud: typecheck, lint excluyendo cachés .local, builds vinext/Next webpack y navegación real/PGlite aislado PASS. Los informes de cada cambio conservan sus pruebas funcionales y límites. Tres regex antiguas de workflow-ui-continuity ya fallaban en baseline; no se presentan como pruebas superadas. El QA autenticado docente queda a cargo del usuario; no se declara recorrido completo remoto.

Recibos privados ignorados: `.local/latest-ui-release-20261013/`. Contienen solo metadatos de publicación y resultados HTTP; credenciales no incluidas en documentación ni repositorio.

## Rollback

Versión anterior conservada: `dpl_826w5Q1K2p66eNLvj7phjgGxnHxq` / `fb96be10753feebc082d8818c9b7c0c35d57aa43`, URL https://ayni-aula-staging-9btr6bia7-ayni4.vercel.app. Rollback de deployment sin revertir datos o esquema. La documentación de este recibo se confirma en un commit posterior al SHA de código publicado.
