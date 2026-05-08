import type {
  ColorMathRegistryInterface,
  MathPrimitiveInterface,
} from '../model/types.ts';

export class ColorMathRegistry implements ColorMathRegistryInterface {
  private readonly entries = new Map<string, MathPrimitiveInterface>();

  register(primitive: MathPrimitiveInterface): void {
    if (!primitive.name) {
      throw new Error('ColorMathRegistry.register: primitive.name is required');
    }
    this.entries.set(primitive.name, primitive);
  }

  resolve(name: string): MathPrimitiveInterface {
    const found = this.entries.get(name);

    if (!found) {
      throw new Error(`ColorMathRegistry.resolve: no primitive registered with name '${name}'`);
    }

    return found;
  }

  has(name: string): boolean {
    return this.entries.has(name);
  }

  list(): readonly string[] {
    return Array.from(this.entries.keys());
  }

  invoke<TResult = unknown>(name: string, ...args: readonly unknown[]): TResult {
    return this.resolve(name).apply(...args) as TResult;
  }
}
