import { FakeEngineWorker } from './FakeEngineWorker.ts';

class FakeClassList {
  readonly #names: Set<string>;

  public constructor(names: Set<string>) {
    this.#names = names;
  }

  public add(...names: string[]): void {
    names.forEach((name) => { this.#names.add(name); });
  }

  public remove(...names: string[]): void {
    names.forEach((name) => { this.#names.delete(name); });
  }
}

class FakeStyle {
  public writes = 0;
  readonly #variables: Map<string, string>;

  public constructor(variables: Map<string, string>) {
    this.#variables = variables;
  }

  public setProperty(name: string, value: string): void {
    this.writes += 1;
    this.#variables.set(name, value);
  }
}

class FakeCanvasContext {
  public drawImage(): void {
    // Draws nothing.
  }

  public getImageData(): { readonly 'data': Uint8ClampedArray } {
    return { 'data': new Uint8ClampedArray([94, 53, 177, 255, 255, 255, 255, 255, 0, 0, 0, 255, 94, 53, 177, 255]) };
  }
}

class FakeCanvas {
  public height = 0;
  public width = 0;

  public getContext(): FakeCanvasContext {
    return new FakeCanvasContext();
  }
}

/** The document element the page shell writes to. */
class FakeDocument {
  public readonly documentElement: {
    'classList': FakeClassList;
    'dataset': Record<string, string>;
    'style': FakeStyle;
  };

  public constructor(variables: Map<string, string>, names: Set<string>) {
    this.documentElement = { 'classList': new FakeClassList(names), 'dataset': {}, 'style': new FakeStyle(variables) };
  }

  public createElement(tagName: string): FakeCanvas {
    if (tagName !== 'canvas') {
      throw new TypeError(`Unexpected element request: ${tagName}`);
    }
    return new FakeCanvas();
  }
}

/** An `Image` that loads, or fails while `shouldFail` answers true, on the next microtask. */
class FakeBrowserImage {
  public crossOrigin = '';
  public naturalHeight = 2;
  public naturalWidth = 2;
  public onerror: (() => void) | null = null;
  public onload: (() => void) | null = null;

  public constructor(shouldFail: () => boolean) {
    queueMicrotask(() => {
      if (shouldFail()) {
        this.onerror?.();
      } else {
        this.onload?.();
      }
    });
  }
}

/** Installs browser globals (window, document, Image, Worker, blob URLs) over the in-process engine host. */
export class FakeBrowserEnvironment {
  public failImages = false;
  readonly #previous = {
    'document': Reflect.get(globalThis, 'document'),
    'image': Reflect.get(globalThis, 'Image'),
    'revoke': URL.revokeObjectURL,
    'window': Reflect.get(globalThis, 'window'),
    'worker': Reflect.get(globalThis, 'Worker')
  };

  public readonly classNames = new Set<string>();
  public readonly document: FakeDocument;
  public readonly revoked: string[] = [];
  public readonly variables = new Map<string, string>();

  private constructor() {
    this.document = new FakeDocument(this.variables, this.classNames);
  }

  public static install(): FakeBrowserEnvironment {
    const environment = new FakeBrowserEnvironment();
    FakeEngineWorker.reset();
    const revoke = environment.#previous.revoke;
    const environmentImage = class extends FakeBrowserImage {
      public constructor() {
        super(() => {
          const failing = environment.failImages;
          return failing;
        });
      }
    };
    Reflect.set(globalThis, 'window', {});
    Reflect.set(globalThis, 'document', environment.document);
    Reflect.set(globalThis, 'Image', environmentImage);
    Reflect.set(globalThis, 'Worker', FakeEngineWorker);
    URL.revokeObjectURL = (url: string): void => {
      environment.revoked.push(url);
      revoke(url);
    };
    return environment;
  }

  public uninstall(): void {
    Reflect.set(globalThis, 'window', this.#previous.window);
    Reflect.set(globalThis, 'document', this.#previous.document);
    Reflect.set(globalThis, 'Image', this.#previous.image);
    Reflect.set(globalThis, 'Worker', this.#previous.worker);
    URL.revokeObjectURL = this.#previous.revoke;
  }
}
