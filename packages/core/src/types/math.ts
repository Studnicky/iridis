export interface MathPrimitiveInterface {
  readonly name: string;
  apply(...args: readonly unknown[]): unknown;
}
