const routes = new Map([
  ["#hoy", "Hoy"], ["#planificar", "Planificar"], ["#aula", "Aula"],
  ["#documentos", "Documentos"], ["#calendario", "Calendario"],
  ["#biblioteca", "Biblioteca"], ["#diagnostico", "Diagnóstico"],
  ["#evaluar", "Evaluar"], ["#perfil", "Perfil"],
]);
const hashes = new Map([...routes].map(([hash, destination]) => [destination, hash]));
export const destinationFromHash = hash => routes.get(String(hash ?? "").toLocaleLowerCase("es-PE")) ?? null;
export const hashForDestination = destination => hashes.get(destination) ?? null;
export const primaryDestination = destination => ["Calendario", "Biblioteca"].includes(destination) ? "Planificar"
  : ["Diagnóstico", "Evaluar"].includes(destination) ? "Aula" : destination;
