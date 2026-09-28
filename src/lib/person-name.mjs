const lowerParticles = new Set(["de", "del", "la", "las", "los", "y"]);

/** Display conventional Spanish name casing without changing accents or punctuation. */
export function displayPersonName(value) {
  if (typeof value !== "string") return "";
  let wordIndex = 0;
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-PE")
    .replace(/[\p{L}\p{M}]+/gu, (word) => {
      const capitalized = wordIndex === 0 || !lowerParticles.has(word);
      wordIndex++;
      return capitalized ? word.charAt(0).toLocaleUpperCase("es-PE") + word.slice(1) : word;
    });
}
