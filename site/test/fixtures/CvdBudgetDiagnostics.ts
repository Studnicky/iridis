import { enforceCvdSimulate } from '../../../packages/contrast/dist/tasks/EnforceCvdSimulate.js';

/** Test-only observation of the production CVD search caps. */
export class CvdBudgetDiagnostics {
  private static readonly maximumCandidateScores = 8_000;
  private static readonly maximumWeightedUnits = 48_000;

  public static isWithinNormalHeadroom(usage: { readonly 'candidateScores': number; readonly 'weightedUnits': number }): boolean {
    const isWithinHeadroom = usage.candidateScores <= CvdBudgetDiagnostics.maximumCandidateScores / 2
      && usage.weightedUnits <= CvdBudgetDiagnostics.maximumWeightedUnits / 2;
    return isWithinHeadroom;
  }

  public static observe<Result>(operation: () => Result): {
    readonly 'result': Result;
    readonly 'usage': { readonly 'candidateScores': number; readonly 'weightedUnits': number };
  } {
    enforceCvdSimulate.configureSearchBudgetForTesting(
      CvdBudgetDiagnostics.maximumCandidateScores,
      CvdBudgetDiagnostics.maximumWeightedUnits
    );
    try {
      const result = operation();
      const usage = enforceCvdSimulate.searchBudgetUsageForTesting() ?? {
        'candidateScores': 0,
        'weightedUnits': 0
      };
      return { 'result': result, 'usage': usage };
    } finally {
      enforceCvdSimulate.clearSearchBudgetForTesting();
    }
  }
}
