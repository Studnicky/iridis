class CapitalizeOperation {
  static run(text: string): string {
    const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
    return capitalized;
  }
}

export const capitalize = CapitalizeOperation.run;
