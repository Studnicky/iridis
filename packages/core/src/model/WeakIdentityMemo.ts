/** Stores values by object identity without extending either key's lifetime. */
class MemoValue<ValueType> {
  readonly 'value': ValueType;

  constructor(value: ValueType) {
    this.value = value;
  }
}

export class WeakIdentityMemo<KeyType extends object, ValueType> {
  readonly #values = new WeakMap<KeyType, MemoValue<ValueType>>();

  get(
    key: KeyType,
    compute: () => ValueType
  ): ValueType {
    const existing = this.#values.get(key);
    if (existing !== undefined) {
      return existing.value;
    }
    const value = compute();
    this.#values.set(key, new MemoValue(value));
    return value;
  }

  static pair<FirstKeyType extends object, SecondKeyType extends object, ValueType>(): WeakIdentityPairMemo<FirstKeyType, SecondKeyType, ValueType> {
    const result = new WeakIdentityPairMemo<FirstKeyType, SecondKeyType, ValueType>();
    return result;
  }
}

class WeakIdentityPairMemo<FirstKeyType extends object, SecondKeyType extends object, ValueType> {
  readonly #values = new WeakMap<FirstKeyType, WeakIdentityMemo<SecondKeyType, ValueType>>();

  get(
    firstKey: FirstKeyType,
    secondKey: SecondKeyType,
    compute: () => ValueType
  ): ValueType {
    const values = this.#values.get(firstKey) ?? new WeakIdentityMemo<SecondKeyType, ValueType>();
    if (!this.#values.has(firstKey)) {
      this.#values.set(firstKey, values);
    }
    const result = values.get(secondKey, compute);
    return result;
  }
}
