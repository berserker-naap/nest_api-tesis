import {
  MIN_BUDGET_CONFIDENCE,
  calculatePredictionConfidence,
  calculateSavingsRate,
} from './analytics-prediction.util';

describe('analytics prediction confidence', () => {
  it('keeps a single movement below the budget threshold', () => {
    expect(calculatePredictionConfidence([20], 1)).toBeLessThan(0.6);
  });

  it('accepts a stable category with enough history', () => {
    expect(
      calculatePredictionConfidence([100, 105, 98, 102], 8),
    ).toBeGreaterThanOrEqual(MIN_BUDGET_CONFIDENCE);
  });

  it('increases the suggested savings rate with confidence', () => {
    expect(calculateSavingsRate(MIN_BUDGET_CONFIDENCE)).toBeCloseTo(0.05);
    expect(calculateSavingsRate(0.95)).toBeCloseTo(0.15);
  });
});
