export const MIN_BUDGET_CONFIDENCE = 0.72;

export function calculatePredictionConfidence(
  monthlyAmounts: number[],
  movementCount: number,
): number {
  const monthCount = monthlyAmounts.length;
  const monthScore = Math.min(monthCount / 6, 1);
  const movementScore = Math.min(movementCount / 12, 1);
  const mean = monthlyAmounts.reduce((sum, amount) => sum + amount, 0) /
    Math.max(monthCount, 1);

  let stabilityScore = 0;
  if (monthCount > 1 && mean > 0) {
    const variance = monthlyAmounts.reduce(
      (sum, amount) => sum + (amount - mean) ** 2,
      0,
    ) / (monthCount - 1);
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    stabilityScore = Math.max(0, 1 - Math.min(coefficientOfVariation / 1.5, 1));
  }

  let confidence =
    0.15 + 0.4 * monthScore + 0.25 * movementScore + 0.2 * stabilityScore;
  if (monthCount < 3 || movementCount < 3) {
    confidence = Math.min(confidence, 0.59);
  }

  return Number(Math.min(confidence, 0.95).toFixed(2));
}

export function calculateSavingsRate(confidence: number): number {
  const boundedConfidence = Math.max(
    MIN_BUDGET_CONFIDENCE,
    Math.min(confidence, 0.95),
  );
  const confidenceWeight =
    (boundedConfidence - MIN_BUDGET_CONFIDENCE) /
    (0.95 - MIN_BUDGET_CONFIDENCE);
  return 0.05 + confidenceWeight * 0.1;
}
