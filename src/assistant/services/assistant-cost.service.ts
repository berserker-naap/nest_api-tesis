import { Injectable } from '@nestjs/common';

@Injectable()
export class AssistantCostService {
  private readonly inputCostPer1M = Number(
    process.env.GEMINI_INPUT_COST_PER_1M_USD ?? 0,
  );
  private readonly outputCostPer1M = Number(
    process.env.GEMINI_OUTPUT_COST_PER_1M_USD ?? 0,
  );
  private readonly monthlyBudgetUsd = Number(
    process.env.ASSISTANT_MONTHLY_BUDGET_USD ?? 0,
  );

  calculateCostUsd(inputTokens: number, outputTokens: number): number {
    const inputCost = (Math.max(inputTokens, 0) / 1_000_000) * this.inputCostPer1M;
    const outputCost =
      (Math.max(outputTokens, 0) / 1_000_000) * this.outputCostPer1M;
    return Number((inputCost + outputCost).toFixed(8));
  }

  getMonthlyBudgetUsd(): number {
    return Number.isFinite(this.monthlyBudgetUsd) && this.monthlyBudgetUsd > 0
      ? this.monthlyBudgetUsd
      : 0;
  }

  isMonthlyBudgetExceeded(totalSpentUsd: number): boolean {
    const budget = this.getMonthlyBudgetUsd();
    if (!budget) {
      return false;
    }
    return totalSpentUsd >= budget;
  }
}
