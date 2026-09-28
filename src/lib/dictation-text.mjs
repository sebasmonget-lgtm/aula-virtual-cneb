/** Append dictation without replacing a note the teacher already wrote. */
export function mergeDictationText(currentText, dictatedText, maxLength = 4000) {
  if (typeof currentText !== "string" || typeof dictatedText !== "string" || !Number.isSafeInteger(maxLength) || maxLength < 1)
    throw new TypeError("No se pudo preparar el texto de la grabación.");
  if (!dictatedText.trim()) throw new Error("No se encontró texto en la grabación. Puedes rehacerla o escribir la nota.");
  const combined = [currentText.trim(), dictatedText.trim()].filter(Boolean).join("\n");
  if (combined.length > maxLength) throw new Error(`El texto supera ${maxLength} caracteres. Acórtalo antes de añadir otra grabación.`);
  return combined;
}
