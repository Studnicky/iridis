class CapitalizeOperation {
  static run(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
}

export const capitalize = CapitalizeOperation.run;
