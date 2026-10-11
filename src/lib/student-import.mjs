import { displayPersonName } from "./person-name.mjs";
const yearPattern = /^\d{4}-\d{2}-\d{2}$/;
const text = (value, maximum) => typeof value === "string" ? value.trim().slice(0, maximum) : "";
const validDate = (value) => yearPattern.test(value ?? "") && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

function parseDelimited(input, separator) {
  const rows = [], row = [];
  let field = "", quoted = false;
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"') { if (quoted && input[index + 1] === '"') { field += '"'; index++; } else if (quoted || !field) quoted = !quoted; else throw new Error("CSV con comillas inválidas."); }
    else if (char === separator && !quoted) { row.push(field); field = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && input[index + 1] === "\n") index++; row.push(field); if (row.some((part) => part.trim())) rows.push([...row]); row.length = 0; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV con comillas sin cerrar.");
  row.push(field); if (row.some((part) => part.trim())) rows.push(row);
  return rows;
}

export function parseStudentCsv(input) {
  if (typeof input !== "string" || input.length > 20_000) throw new Error("El CSV es inválido o demasiado grande.");
  const rows = parseDelimited(input.replace(/^\uFEFF/, ""), input.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",");
  const header = rows.shift()?.map((field) => field.trim().toLowerCase());
  if (!header || !["first_name", "last_name", "preferred_name"].every((field, index) => header[index] === field)
    || ![3, 4].includes(header.length) || (header.length === 4 && header[3] !== "birth_date"))
    throw new Error("El CSV debe comenzar con first_name,last_name,preferred_name y puede añadir birth_date.");
  return rows.map((row) => { if (row.length !== header.length) throw new Error("Cada fila CSV debe tener las columnas del encabezado."); return { firstName: row[0], lastName: row[1], preferredName: row[2], birthDate: row[3] }; });
}

export function validateStudentsForImport(input) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 40) throw new Error("Importa entre 1 y 40 niños por vez.");
  return input.map((row) => {
    const firstName = text(row?.firstName, 80), lastName = text(row?.lastName, 80), preferredName = text(row?.preferredName, 80);
    const birthDate = typeof row?.birthDate === "string" ? row.birthDate.trim() || null : null;
    if (firstName.length < 2 || lastName.length < 2 || [firstName, lastName, preferredName].some((part) => /[\x00-\x1F<>]|^[=+@]/.test(part))) throw new Error("Cada niño requiere nombre y apellido válidos.");
    if (birthDate && (!validDate(birthDate) || birthDate > new Date().toISOString().slice(0, 10) || birthDate < "2000-01-01"))
      throw new Error("La fecha de nacimiento debe ser válida y no futura.");
    return { firstName: displayPersonName(firstName), lastName: displayPersonName(lastName), preferredName: preferredName ? displayPersonName(preferredName) : null, birthDate };
  });
}

