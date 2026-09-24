import { loadKnowledgeBaseV4 } from "../src/lib/knowledge-base-v4.mjs";
import { loadDiagnosticCatalog, DEFAULT_DIAGNOSTIC_CATALOG_PATH } from "../src/lib/diagnostic-catalog-v4.mjs";

const path = process.argv[2] ?? DEFAULT_DIAGNOSTIC_CATALOG_PATH;
const kb = await loadKnowledgeBaseV4();
const catalog = await loadDiagnosticCatalog(kb.competencyCards, path);
console.log(`Catálogo válido: ${catalog.version} · ${catalog.experiences.length} experiencias · estado ${catalog.status}.`);
if (catalog.status === "development_fixture") console.log("Contenido de desarrollo: requiere revisión editorial antes de uso real.");
