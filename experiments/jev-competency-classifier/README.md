# Experimento Jev–CNEB

Prototipo local para medir si Jev puede asociar observaciones espontáneas ficticias de Educación Inicial con una competencia CNEB aplicable. Lee la KB v4 del repositorio y no modifica Ayni Aula.

Consulta [PLAN.md](PLAN.md) para el contrato, el alcance y las métricas.

## Requisitos

Node 22.13 o superior. No hay dependencias externas ni instalación requerida.

```powershell
cd "experiments/jev-competency-classifier"
npm test
npm run typecheck
npm run lint
npm run build
```

Estas comprobaciones no llaman a TypeSafe.

## Interfaz local

```powershell
Copy-Item .env.example .env.local
# Añadir TYPESAFE_API_KEY solo a .env.local
npm run dev
```

Abrir `http://127.0.0.1:4179`. La clave se conserva en el proceso local; el navegador nunca recibe la clave. Sin clave, la interfaz informa que Jev no está configurado.

## Llamadas reales y costo

Estos comandos pueden consumir API:

```powershell
npm run models
npm run eval:jev -- --max-live-requests 20 --limit 20 --no-cache
```

`models` consulta los alias disponibles para la cuenta. `eval:jev` exige un límite explícito de solicitudes. Antes de repetir una medición, fijar `JEV_MODEL` con el ID versionado que devolvió Jev. La tarifa configurada es una referencia fechada; los reportes calculan gasto desde los tokens `usage` que devuelve la API.

Para comprobar el flujo sin gastar:

```powershell
npm run eval:baseline
```

Los reportes se escriben en `reports/` y la caché en `.cache/`, ambos ignorados por Git. La caché contiene resultados ligados a un hash del texto de la observación; usar únicamente datos ficticios o anonimizados de forma irreversible.

## Dataset

`datasets/development.jsonl` contiene casos ficticios provisionales. No es un golden pedagógico. `datasets/golden.template.jsonl` es una plantilla para casos etiquetados y revisados antes de ejecutar Jev.

El benchmark acepta `.json`, `.jsonl` y `.csv`. Para CSV, `acceptable_secondary_ids` usa IDs separados por `|` y `applicability` contiene JSON.

## Límites actuales

El resultado de una clasificación es una propuesta o una abstención. No es evaluación del niño, nivel de logro, conclusión pedagógica ni decisión que modifique Ayni. Los umbrales iniciales, incluido 0.82, se deben comparar con un golden revisado e independiente antes de cualquier integración.
