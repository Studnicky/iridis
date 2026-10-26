/** Replaces `document.documentElement.style.setProperty` with a recorder so tests can observe root writes. */
export class RootStyleSpy {
  public readonly writes: string[] = [];
  private previousDocument: unknown = null;

  public install(): void {
    this.previousDocument = Reflect.get(globalThis, 'document');
    Reflect.set(globalThis, 'document', { 'documentElement': { 'style': { 'setProperty': (name: string): void => { this.writes.push(name); } } } });
  }

  public restore(): void {
    Reflect.set(globalThis, 'document', this.previousDocument);
  }
}
