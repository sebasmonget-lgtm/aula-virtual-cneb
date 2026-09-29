export function selectedProjectQuestions(questions, excludedIndexes) {
  const excluded = new Set(excludedIndexes);
  return questions.filter((question, index) => !excluded.has(index) && question.trim());
}
