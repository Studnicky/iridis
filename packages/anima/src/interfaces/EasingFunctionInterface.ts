/** Maps normalized animation progress to normalized eased progress. */
export interface EasingFunctionInterface {
  apply(progress: number): number;
}
