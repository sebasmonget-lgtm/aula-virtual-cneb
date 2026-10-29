# Prueba desde cero con IA real

La usuaria solicitó una cuenta o prueba limpia y autorizó expresamente usar la misma clave de texto del otro Ayni, limitando la comprobación a pocas llamadas. Esta autorización posterior permite seleccionar esa clave para esta prueba; no autoriza reutilizar sus conexiones de base de datos ni cuentas de despliegue.

## Entrada y datos

- Abrir `http://127.0.0.1:5185/` y pulsar **Preparar mis documentos**.
- Elegir una edad o Unidocencia, completar colegio/aula y registrar alumnos antes de conversar.
- Se preparó el almacén nuevo `generador-desde-cero`, con otra identidad docente local y sin aula, alumnos, planes o modalidad precargados.
- Es una prueba local con acceso automático. No se creó una cuenta pública de Auth ni se inventó una contraseña.
- La demostración anterior permanece en `generador-documentos` con sus tres alumnos y cinco documentos. Se cambia únicamente qué almacén usa el launcher; no se borra ni se transforma el anterior.

## Clave y ejecución

`scripts/dev-document-generator.mjs` acepta `--from-zero` para abrir el nuevo almacén persistente y `--key-env=...` para seleccionar expresamente un archivo local de configuración. Lee únicamente la clave de texto que necesita, sin copiar el archivo ni heredar sus demás variables. El servidor recibe esa clave para los motores de una edad y multiedad; el proceso web no recibe claves de IA. Los registros no contienen su valor. Sin selección explícita sigue admitiendo la variable propia `AYNI_DOCUMENT_GENERATOR_OPENAI_API_KEY`; no adopta automáticamente una clave genérica heredada.

Para reabrir esta misma prueba, desde el worktree independiente:

```powershell
node scripts/dev-document-generator.mjs --from-zero '--key-env=C:/Users/ASUS/Documents/ChatGPT/Asistente CNEB/.env.local'
```

El comando contiene una ruta, no una clave. No guarda la credencial en código. Detener antes el launcher que usa esos mismos puertos. `--from-zero` conserva el progreso al reiniciar; no vacía el almacén en cada ejecución. Omitir ese argumento vuelve a la demostración anterior, con la modalidad de IA seleccionada por sus argumentos. Para simulación explícita, usar `--simulate-ai` y no se pasan claves a los procesos.

## Validación

13 pruebas automatizadas correctas: apertura/configuración de una edad y multiedad, instrumentos, permisos, año sin diagnóstico, separación de almacenes y filtrado de credenciales. Tipos, lint y build correctos con la advertencia histórica de lint y avisos previos de build. La nueva entrada se comprobó en navegador y quedó sin completar para la usuaria. Evidencia bajo `output/generador-documentos/desde-cero/`.

`scripts/smoke-document-generator-live.mjs` ejecuta una comprobación separada con fuentes ficticias y un máximo de tres generaciones, sin reintentos automáticos: conversación, año y primera actividad/proyecto. El proveedor tiene `maxRetries: 0`. Sus resultados y consumo registrados quedan en `output/generador-documentos/generador-smoke-real-*/receipt.json`; las fuentes y documentos del smoke no se insertan en la prueba limpia.

Resultado ejecutado: `generador-smoke-real-1792968160156`, PASS. Exactamente tres generaciones, las tres listas en un intento cada una: conversación, año de quince temas distintos y primera actividad con criterios de las tres edades. Se confirmó el año y la actividad de QA, generando tres Word válidos de año/proyecto/actividad. El año real se titula «Un año de cuentos, plantas y juegos compartidos» y recoge los recursos/ideas ficticios del mensaje confirmado. Su generación tardó aproximadamente 217 segundos; no es instantánea ni una promesa de latencia. La prueba no certifica calidad pedagógica de todas las respuestas posibles. Después del smoke se repitió la comprobación: la prueba de la usuaria sigue sin aula ni documentos y con el proveedor real configurado.

No se publicó ni se editó la carpeta del Ayni original. Para rollback, detener este launcher y volver al perfil anterior; conservar los datos de esta prueba si se necesitan. No hay migraciones nuevas.
