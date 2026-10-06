import {existsSync,readFileSync} from "node:fs";
import path from "node:path";
const root=process.cwd(),read=p=>readFileSync(path.join(root,p),"utf8"),failures=[];
const route=["app/api/[...path]/route.js","app/api/[...path]/route.ts"].find(p=>existsSync(path.join(root,p)));
if(!route||!read(route).includes("handleServerlessRequest"))failures.push("Falta el puente Next de /api/*.");
const bridge=read("scripts/serverless-bridge.mjs"),server=read("scripts/local-db-server.mjs");
if(!bridge.includes('process.env.AYNI_SERVERLESS = "1"')||!bridge.includes("handleApiRequest"))failures.push("El adaptador debe activar modo serverless antes de cargar la API.");
if(!server.includes('if (process.env.AYNI_SERVERLESS !== "1")'))failures.push("El servidor HTTP persistente debe estar excluido de las funciones.");
const assetsCreation=server.indexOf("await mkdir(assetsDir"),localGuard=server.lastIndexOf('if (dbMode === "local") {',assetsCreation);
if(localGuard<0||assetsCreation-localGuard>300)failures.push("La creación de assets locales debe estar limitada al proveedor local.");
if(!read("src/lib/local-database.ts").includes('process.env.NODE_ENV === "production" ? ""'))failures.push("La API pública debe usar el mismo origen por defecto.");
for(const p of ["next.config.ts","src/lib/private-document-artifact-storage.mjs","src/lib/private-evidence-storage.mjs"]){if(!existsSync(path.join(root,p)))failures.push("Falta recurso de publicación: "+p);}
if(failures.length){console.error("Comprobaciones estáticas cloud fallidas:");for(const item of failures)console.error("- "+item);process.exitCode=1;}else console.log("Puente API, modo serverless y origen HTTPS preparados. Requiere staging y smoke test reales.");
